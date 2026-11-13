import type {
  ContainerDetails as ContainerDetailsType,
  ContainerSummary,
  CpuStats,
  MemoryStats,
  NetworkStats,
} from "../types/container";

interface ContainerDetailsProps {
  selected: ContainerSummary | null;
  details: ContainerDetailsType | null;
  cpu: CpuStats | null;
  memory: MemoryStats | null;
  network: NetworkStats | null;
  loading: boolean;
  detailsError: string | null;
  resourceErrors: Partial<Record<"cpu" | "memory" | "network", string>>;
}

function isRealDate(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > 0;
}

function formatDate(value: string) {
  return isRealDate(value) ? new Date(value).toLocaleString() : "—";
}

function formatUptime(startedAt: string) {
  if (!isRealDate(startedAt)) return "—";
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const days = Math.floor(elapsed / 86400);
  const hours = Math.floor((elapsed % 86400) / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${elapsed}s`;
}

interface ValueProps {
  label: string;
  value: string;
  muted?: boolean;
}

function DetailValue({ label, value, muted = false }: ValueProps) {
  return (
    <div className="detail-value">
      <span>{label}</span>
      <strong className={muted ? "detail-unavailable" : ""}>{value}</strong>
    </div>
  );
}

export default function ContainerDetails({
  selected,
  details,
  cpu,
  memory,
  network,
  loading,
  detailsError,
  resourceErrors,
}: ContainerDetailsProps) {
  if (!selected) {
    return (
      <div className="details-empty">
        Select a container to view its overview, current stats, and logs.
      </div>
    );
  }

  const running = details?.running === true;
  const detailsLoading = loading && details === null && !detailsError;
  const statsLoading = loading && running;

  return (
    <div className="details-content">
      {detailsError && <div className="request-error" role="alert"><span>!</span>{detailsError}</div>}
      {detailsLoading && <div className="details-loading"><span className="loading-ring" />Loading container details…</div>}
      <section className="details-section">
        <h2>Overview</h2>
        <div className="detail-grid overview-grid">
          <DetailValue label="NAME" value={details?.name ?? selected.name ?? "Unnamed container"} />
          <DetailValue label="CONTAINER ID" value={selected.id} />
          <DetailValue label="IMAGE" value={details?.image ?? selected.image} />
          <DetailValue label="STATUS" value={details?.status ?? selected.status} />
          <DetailValue label="CREATED" value={details ? formatDate(details.created.toString()) : formatDate(new Date(selected.created * 1000).toISOString())} />
          <DetailValue label="STARTED" value={details ? formatDate(details.startedAt) : "—"} />
          <DetailValue label="UPTIME" value={details ? running ? formatUptime(details.startedAt) : "—" : "—"} />
        </div>
      </section>
      <section className="details-section">
        <h2>Current stats <span>{running ? "LIVE · 5S" : "NOT RUNNING"}</span></h2>
        <div className="detail-grid stats-grid">
          <DetailValue
            label="CPU"
            value={running ? cpu?.cpuPercentage ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.cpu)}
          />
          <DetailValue
            label="MEMORY USAGE"
            value={running ? memory?.memoryUsage ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.memory)}
          />
          <DetailValue
            label="MEMORY LIMIT"
            value={running ? memory?.memoryLimit ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.memory)}
          />
          <DetailValue
            label="MEMORY PERCENT"
            value={running ? memory?.memoryPercentage ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.memory)}
          />
          <DetailValue
            label="NETWORK RECEIVED"
            value={running ? network?.networkReceived ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.network)}
          />
          <DetailValue
            label="NETWORK TRANSMITTED"
            value={running ? network?.networkTransmitted ?? (statsLoading ? "Loading…" : "—") : "—"}
            muted={Boolean(resourceErrors.network)}
          />
        </div>
        {(resourceErrors.cpu || resourceErrors.memory || resourceErrors.network) && (
          <div className="stats-note">
            Some statistics are unavailable:
            {[resourceErrors.cpu, resourceErrors.memory, resourceErrors.network].filter(Boolean).join(" · ")}
          </div>
        )}
      </section>
    </div>
  );
}
