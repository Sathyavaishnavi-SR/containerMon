import Docker from "dockerode";
const docker = new Docker({
  socketPath:process.env.DOCKER_SOCKET ||"//./pipe/docker_engine"
});
export async function getAllContainers() {
  const containers=await docker.listContainers({
    all: true
  });
  return containers.map((container)=>({
    id:container.Id.substring(0, 12),
    name:container.Names[0]?.replace("/", ""),
    image:container.Image,
    status:container.State,
    created:container.Created
  }));
}
export async function getContainerById(id: string) {
  const container = docker.getContainer(id);
  const details = await container.inspect();
  return {
    id: details.Id.substring(0, 12),
    name: details.Name.replace("/", ""),
    image: details.Config.Image,
    created: details.Created,
    status: details.State.Status,
    running: details.State.Running,
    startedAt: details.State.StartedAt,
    finishedAt: details.State.FinishedAt
  };
}

export async function startContainer(id: string) {
  const container = docker.getContainer(id);

  await container.start();

  return {
    message: "Container started successfully"
  };
}

export async function stopContainer(id: string) {
  const container = docker.getContainer(id);

  await container.stop();

  return {
    message: "Container stopped successfully"
  };
}

export async function restartContainer(id: string) {
  const container = docker.getContainer(id);

  await container.restart();

  return {
    message: "Container restarted successfully"
  };
}
export async function getContainerLogs(id: string) {
  const container = docker.getContainer(id);

  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail: 100,
    timestamps: true
  });

  return logs.toString();
}