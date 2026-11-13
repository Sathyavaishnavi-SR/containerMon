import { useCallback, useEffect, useRef, useState } from "react";
import ContainerDetails from "../components/ContainerDetails";
import ContainerTable, {
  type ContainerAction,
  type ContainerFilter,
} from "../components/ContainerTable";
import Header, { type AppPage } from "../components/Header";
import LogsPanel from "../components/LogsPanel";
import { api } from "../services/api";
import type {
  ContainerDetails as ContainerDetailsType,
  ContainerSummary,
  CpuStats,
  DockerStatus,
  MemoryStats,
  NetworkStats,
} from "../types/container";

interface Notice {
  kind: "success" | "error";
  message: string;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function Dashboard() {
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [dockerStatus, setDockerStatus] = useState<DockerStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState("Checking Docker connection");
  const [page, setPage] = useState<AppPage>("containers");
  const [selected, setSelected] = useState<ContainerSummary | null>(null);
  const [details, setDetails] = useState<ContainerDetailsType | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cpu, setCpu] = useState<CpuStats | null>(null);
  const [memory, setMemory] = useState<MemoryStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [resourceErrors, setResourceErrors] = useState<
    Partial<Record<"cpu" | "memory" | "network", string>>
  >({});
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyRunning, setOnlyRunning] = useState(false);
  const [filter, setFilter] = useState<ContainerFilter>("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const selectedRef = useRef<ContainerSummary | null>(null);
  const refreshingRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshCallbackRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const actionLockRef = useRef(false);
  const detailRequestRef = useRef(0);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((nextNotice: Notice) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(nextNotice);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadLogs = useCallback(async (containerId: string) => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const result = await api.getContainerLogs(containerId);
      if (selectedRef.current?.id === containerId) setLogs(result.logs);
    } catch (error) {
      if (selectedRef.current?.id === containerId) {
        setLogs(null);
        setLogsError(errorMessage(error, "Unable to fetch container logs."));
      }
    } finally {
      if (selectedRef.current?.id === containerId) setLogsLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (container: ContainerSummary) => {
    const requestId = ++detailRequestRef.current;
    setDetailsLoading(true);
    setDetails(null);
    setCpu(null);
    setMemory(null);
    setNetwork(null);
    setResourceErrors({});
    setDetailsError(null);

    try {
      const result = await api.getContainerDetails(container.id);
      if (requestId !== detailRequestRef.current) return;
      setDetails(result);
      if (!result.running) return;

      const [cpuResult, memoryResult, networkResult] = await Promise.allSettled([
        api.getCpuStats(container.id),
        api.getMemoryStats(container.id),
        api.getNetworkStats(container.id),
      ]);
      if (requestId !== detailRequestRef.current) return;

      const errors: Partial<Record<"cpu" | "memory" | "network", string>> = {};
      if (cpuResult.status === "fulfilled") setCpu(cpuResult.value);
      else errors.cpu = errorMessage(cpuResult.reason, "CPU statistics unavailable.");
      if (memoryResult.status === "fulfilled") setMemory(memoryResult.value);
      else errors.memory = errorMessage(memoryResult.reason, "Memory statistics unavailable.");
      if (networkResult.status === "fulfilled") setNetwork(networkResult.value);
      else errors.network = errorMessage(networkResult.reason, "Network statistics unavailable.");
      setResourceErrors(errors);
    } catch (error) {
      if (requestId === detailRequestRef.current) {
        setDetailsError(errorMessage(error, "Unable to load container details."));
      }
    } finally {
      if (requestId === detailRequestRef.current) setDetailsLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async (queueIfBusy = false) => {
    if (refreshingRef.current) {
      if (queueIfBusy) refreshQueuedRef.current = true;
      return;
    }
    refreshingRef.current = true;
    setLoading(true);

    try {
      const [statusResult, containersResult] = await Promise.allSettled([
        api.getDockerStatus(),
        api.getContainers(),
      ]);

      if (statusResult.status === "fulfilled") {
        setDockerStatus(statusResult.value);
        setStatusMessage(statusResult.value.message);
      } else {
        const message = errorMessage(statusResult.reason, "Unable to check Docker connection.");
        setDockerStatus({ connected: false, message, containers: 0, running: 0 });
        setStatusMessage(message);
      }

      if (containersResult.status === "fulfilled") {
        const nextContainers = containersResult.value;
        setContainers(nextContainers);
        setListError(null);

        const currentSelection = selectedRef.current;
        const updatedSelection = currentSelection
          ? nextContainers.find((container) => container.id === currentSelection.id) ?? currentSelection
          : null;
        if (updatedSelection && updatedSelection !== currentSelection) {
          selectedRef.current = updatedSelection;
          setSelected(updatedSelection);
        }
      } else {
        setListError(errorMessage(containersResult.reason, "Unable to fetch containers."));
      }

      setLastUpdated(new Date());
      const currentSelection = selectedRef.current;
      if (currentSelection) await loadDetails(currentSelection);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        window.setTimeout(() => void refreshCallbackRef.current(), 0);
      }
    }
  }, [loadDetails]);
  refreshCallbackRef.current = () => refreshDashboard();

  useEffect(() => {
    void refreshDashboard();
    const intervalId = window.setInterval(() => void refreshDashboard(), 5000);
    return () => {
      window.clearInterval(intervalId);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      detailRequestRef.current += 1;
    };
  }, [refreshDashboard]);

  const selectContainer = useCallback((container: ContainerSummary) => {
    selectedRef.current = container;
    setSelected(container);
    setLogs(null);
    setLogsError(null);
    setLogsLoading(false);
    void loadDetails(container);
  }, [loadDetails]);

  const openDetails = useCallback((container: ContainerSummary) => {
    selectContainer(container);
    setPage("monitoring");
    void loadLogs(container.id);
  }, [loadLogs, selectContainer]);

  const openLogs = useCallback((container: ContainerSummary) => {
    selectContainer(container);
    setPage("monitoring");
    void loadLogs(container.id);
    window.setTimeout(() => document.getElementById("container-logs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [loadLogs, selectContainer]);

  const navigate = useCallback((nextPage: AppPage) => {
    setPage(nextPage);
    const currentSelection = selectedRef.current;
    if (nextPage === "monitoring" && currentSelection) {
      void loadLogs(currentSelection.id);
    }
  }, [loadLogs]);

  const handleAction = useCallback(async (id: string, action: ContainerAction) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionId(id);
    const actionFn = {
      start: api.startContainer,
      stop: api.stopContainer,
      restart: api.restartContainer,
    }[action];

    try {
      const result = await actionFn(id);
      showNotice({ kind: "success", message: result.message });
      await refreshDashboard(true);
    } catch (error) {
      showNotice({ kind: "error", message: errorMessage(error, `Unable to ${action} container.`) });
    } finally {
      setActionId(null);
      actionLockRef.current = false;
    }
  }, [refreshDashboard, showNotice]);

  const runningCount = containers.filter((container) => container.status.toLowerCase() === "running").length;

  return (
    <div className="app-shell">
      <Header
        page={page}
        dockerStatus={dockerStatus}
        statusMessage={statusMessage}
        isRefreshing={loading}
        lastUpdated={lastUpdated}
        onNavigate={navigate}
        onRefresh={() => void refreshDashboard(true)}
      />
      <main className="workspace">
        {page === "containers" && (
          <>
            <div className="page-heading">
              <div>
                <h1>Containers</h1>
                <p>Manage containers on your local Docker Engine.</p>
              </div>
              {runningCount === 0 && !loading && (
                <span className="no-running-note">No containers are currently running</span>
              )}
            </div>
            {notice && (
              <div className={`toast toast-${notice.kind}`} role="status">
                <span>{notice.kind === "success" ? "✓" : "!"}</span>
                {notice.message}
                <button onClick={() => setNotice(null)} aria-label="Dismiss message">×</button>
              </div>
            )}

            <ContainerTable
              containers={containers}
              selectedId={selected?.id ?? null}
              search={search}
              onlyRunning={onlyRunning}
              filter={filter}
              actionId={actionId}
              loading={loading}
              error={listError}
              onSearch={setSearch}
              onOnlyRunning={setOnlyRunning}
              onFilter={setFilter}
              onDetails={openDetails}
              onLogs={openLogs}
              onAction={(id, action) => void handleAction(id, action)}
              onRefresh={() => void refreshDashboard(true)}
            />
          </>
        )}

        {page === "monitoring" && (
          <section className="monitoring-view">
            <div className="page-heading">
              <div>
                <button className="back-link" onClick={() => navigate("containers")}>← Containers</button>
                <h1>Container details</h1>
                <p>{selected?.name ?? "Select a container from the Containers page."}</p>
              </div>
              {selected && (
                <button className="compact-button" onClick={() => void loadDetails(selected)} disabled={detailsLoading}>
                  <span className={detailsLoading ? "spin" : ""}>↻</span> Refresh stats
                </button>
              )}
            </div>
            <div className="details-panel">
              <ContainerDetails
                selected={selected}
                details={details}
                cpu={cpu}
                memory={memory}
                network={network}
                loading={detailsLoading}
                detailsError={detailsError}
                resourceErrors={resourceErrors}
              />
            </div>
            <LogsPanel
              logs={logs}
              loading={logsLoading}
              error={logsError}
              onRefresh={() => {
                if (selected) void loadLogs(selected.id);
              }}
            />
          </section>
        )}

        {page === "about" && (
          <section className="about-view">
            <h1>About ContainerMon</h1>
            <p>A compact local dashboard for container lifecycle management and live Docker statistics.</p>
            <dl>
              <div><dt>Backend</dt><dd>{import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}</dd></div>
              <div><dt>Refresh interval</dt><dd>5 seconds</dd></div>
              <div><dt>Docker status</dt><dd>{statusMessage}</dd></div>
            </dl>
          </section>
        )}

        <footer className="workspace-footer">
          <span>ContainerMon</span>
          <span>{lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString()}` : "Waiting for backend"}</span>
        </footer>
      </main>
    </div>
  );
}
