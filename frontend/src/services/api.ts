import type {
  ContainerActionResult,
  ContainerDetails,
  ContainerLogs,
  ContainerSummary,
  CpuStats,
  DockerStatus,
  MemoryStats,
  NetworkStats,
} from "../types/container";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 8000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expectObject<T>(
  value: unknown,
  requiredKeys: string[],
  endpoint: string,
): T {
  if (
    !isRecord(value) ||
    requiredKeys.some((key) => !(key in value))
  ) {
    throw new Error(`The backend returned an unexpected response for ${endpoint}.`);
  }
  return value as T;
}

async function request<T>(path: string, method = "GET"): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
    });

    const body = await response.text();
    let payload: unknown;

    if (body.length > 0) {
      try {
        payload = JSON.parse(body);
      } catch {
        throw new Error(
          response.ok
            ? "The backend returned invalid JSON."
            : `The backend request failed (${response.status}).`,
        );
      }
    }

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : `Request failed (${response.status}).`;
      throw new Error(message);
    }

    if (payload === undefined) {
      throw new Error("The backend returned an empty response.");
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`The backend request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the backend at ${API_BASE_URL}. Check that it is running and accessible from this browser.`,
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const containerPath = (id: string) =>
  `/api/containers/${encodeURIComponent(id)}`;

async function actionRequest(path: string, label: string) {
  const result = expectObject<ContainerActionResult>(
    await request<unknown>(path, "POST"),
    ["message"],
    label,
  );
  if (typeof result.message !== "string") {
    throw new Error(`The backend returned an invalid ${label} response.`);
  }
  return result;
}

function validContainer(value: unknown): value is ContainerSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.image === "string" &&
    typeof value.status === "string" &&
    typeof value.created === "number" &&
    (value.name === undefined || typeof value.name === "string")
  );
}

export const api = {
  async getDockerStatus() {
    const result = await request<unknown>("/api/docker/status");
    const status = expectObject<DockerStatus>(
      result,
      ["connected", "message", "containers", "running"],
      "/api/docker/status",
    );
    if (
      typeof status.connected !== "boolean" ||
      typeof status.message !== "string" ||
      typeof status.containers !== "number" ||
      typeof status.running !== "number"
    ) {
      throw new Error("The backend returned an invalid Docker status response.");
    }
    return status;
  },
  async getContainers() {
    const result = await request<unknown>("/api/containers");
    if (!Array.isArray(result) || !result.every(validContainer)) {
      throw new Error("The backend returned an invalid container list.");
    }
    return result;
  },
  async getContainerDetails(id: string) {
    const result = await request<unknown>(containerPath(id));
    const details = expectObject<ContainerDetails>(
      result,
      ["id", "name", "image", "created", "status", "running", "startedAt", "finishedAt"],
      containerPath(id),
    );
    if (
      typeof details.id !== "string" ||
      typeof details.name !== "string" ||
      typeof details.image !== "string" ||
      typeof details.created !== "string" ||
      typeof details.status !== "string" ||
      typeof details.running !== "boolean" ||
      typeof details.startedAt !== "string" ||
      typeof details.finishedAt !== "string"
    ) {
      throw new Error("The backend returned invalid container details.");
    }
    return details;
  },
  async getCpuStats(id: string) {
    const result = await request<unknown>(`${containerPath(id)}/cpu`);
    const stats = expectObject<CpuStats>(result, ["cpuPercentage"], "CPU statistics");
    if (typeof stats.cpuPercentage !== "string") {
      throw new Error("The backend returned invalid CPU statistics.");
    }
    return stats;
  },
  async getMemoryStats(id: string) {
    const result = await request<unknown>(`${containerPath(id)}/stats`);
    const stats = expectObject<MemoryStats>(
      result,
      ["memoryUsage", "memoryLimit", "memoryPercentage"],
      "memory statistics",
    );
    if (
      typeof stats.memoryUsage !== "string" ||
      typeof stats.memoryLimit !== "string" ||
      typeof stats.memoryPercentage !== "string"
    ) {
      throw new Error("The backend returned invalid memory statistics.");
    }
    return stats;
  },
  async getNetworkStats(id: string) {
    const result = await request<unknown>(`${containerPath(id)}/network`);
    const stats = expectObject<NetworkStats>(
      result,
      ["networkReceived", "networkTransmitted"],
      "network statistics",
    );
    if (
      typeof stats.networkReceived !== "string" ||
      typeof stats.networkTransmitted !== "string"
    ) {
      throw new Error("The backend returned invalid network statistics.");
    }
    return stats;
  },
  async startContainer(id: string) {
    return actionRequest(`${containerPath(id)}/start`, "start container");
  },
  async stopContainer(id: string) {
    return actionRequest(`${containerPath(id)}/stop`, "stop container");
  },
  async restartContainer(id: string) {
    return actionRequest(`${containerPath(id)}/restart`, "restart container");
  },
  async getContainerLogs(id: string) {
    const result = await request<unknown>(`${containerPath(id)}/logs`);
    const logs = expectObject<ContainerLogs>(
      result,
      ["logs"],
      "container logs",
    );
    if (typeof logs.logs !== "string") {
      throw new Error("The backend returned invalid container logs.");
    }
    return logs;
  },
};
