export interface ContainerSummary {
  id: string;
  name?: string;
  image: string;
  status: string;
  created: number;
}

export interface ContainerDetails extends Omit<ContainerSummary, "created"> {
  created: string;
  running: boolean;
  startedAt: string;
  finishedAt: string;
}

export interface DockerStatus {
  connected: boolean;
  message: string;
  containers: number;
  running: number;
}

export interface CpuStats {
  cpuPercentage: string;
}

export interface MemoryStats {
  memoryUsage: string;
  memoryLimit: string;
  memoryPercentage: string;
}

export interface NetworkStats {
  networkReceived: string;
  networkTransmitted: string;
}

export interface ContainerLogs {
  logs: string;
}

export interface ContainerActionResult {
  message: string;
}
