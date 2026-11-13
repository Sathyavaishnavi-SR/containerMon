
import Docker from "dockerode";

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET ||"//./pipe/docker_engine"
});

export async function getMemoryStats(id: string) {
  const container = docker.getContainer(id);

  const stats = await container.stats({
    stream: false
  });

  const usage = stats.memory_stats.usage;
  const limit = stats.memory_stats.limit;

  const memoryUsageMB = usage / (1024 * 1024);
  const memoryLimitMB = limit / (1024 * 1024);

  const memoryPercentage = limit > 0
    ? (usage / limit) * 100
    : 0;

  return {
    memoryUsage: memoryUsageMB.toFixed(2) + " MB",
    memoryLimit: memoryLimitMB.toFixed(2) + " MB",
    memoryPercentage: memoryPercentage.toFixed(2) + "%"
  };
}
export async function getCPUStats(id: string) {
  const container = docker.getContainer(id);

  const stats = await container.stats({
    stream: false
  });

  // Current CPU usage
  const cpuUsage = stats.cpu_stats.cpu_usage.total_usage;

  // Previous CPU usage
  const previousCPUUsage = stats.precpu_stats.cpu_usage.total_usage;

  // Current and previous system CPU usage
  const systemUsage = stats.cpu_stats.system_cpu_usage ?? 0;
  const previousSystemUsage = stats.precpu_stats.system_cpu_usage ?? 0;

  // Calculate differences
  const cpuDelta = cpuUsage - previousCPUUsage;
  const systemDelta = systemUsage - previousSystemUsage;

  // Get number of CPUs
  const onlineCPUs =
    stats.cpu_stats.online_cpus ??
    stats.cpu_stats.cpu_usage.percpu_usage?.length ??
    1;

  // Calculate CPU percentage
  const cpuPercentage =
    systemDelta > 0 && cpuDelta >= 0
      ? (cpuDelta / systemDelta) * onlineCPUs * 100
      : 0;

  return {
    cpuPercentage: cpuPercentage.toFixed(2) + "%"
  };
}
export async function getNetworkStats(id: string) {
  const container = docker.getContainer(id);

  const stats = await container.stats({
    stream: false
  });

  const networks = Object.values(stats.networks ?? {});

  let receivedBytes = 0;
  let transmittedBytes = 0;

  for (const network of networks) {
    receivedBytes += network.rx_bytes;
    transmittedBytes += network.tx_bytes;
  }

  return {
    networkReceived: (receivedBytes / (1024 * 1024)).toFixed(2) + " MB",
    networkTransmitted: (transmittedBytes / (1024 * 1024)).toFixed(2) + " MB"
  };
}