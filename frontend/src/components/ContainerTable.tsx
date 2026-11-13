import type { ContainerSummary } from "../types/container";

export type ContainerFilter = "all" | "running" | "stopped";
export type ContainerAction = "start" | "stop" | "restart";

interface ContainerTableProps {
  containers: ContainerSummary[];
  selectedId: string | null;
  search: string;
  onlyRunning: boolean;
  filter: ContainerFilter;
  actionId: string | null;
  loading: boolean;
  error: string | null;
  onSearch: (value: string) => void;
  onOnlyRunning: (value: boolean) => void;
  onFilter: (filter: ContainerFilter) => void;
  onDetails: (container: ContainerSummary) => void;
  onLogs: (container: ContainerSummary) => void;
  onAction: (id: string, action: ContainerAction) => void;
  onRefresh: () => void;
}

function isRunning(container: ContainerSummary) {
  return container.status.toLowerCase() === "running";
}

export default function ContainerTable({
  containers,
  selectedId,
  search,
  onlyRunning,
  filter,
  actionId,
  loading,
  error,
  onSearch,
  onOnlyRunning,
  onFilter,
  onDetails,
  onLogs,
  onAction,
  onRefresh,
}: ContainerTableProps) {
  const query = search.trim().toLowerCase();
  const visibleContainers = containers.filter((container) => {
    const matchesSearch =
      (container.name ?? "").toLowerCase().includes(query) ||
      container.id.toLowerCase().includes(query) ||
      container.image.toLowerCase().includes(query);
    const running = isRunning(container);
    const matchesFilter =
      filter === "all" || (filter === "running" ? running : !running);
    return matchesSearch && matchesFilter && (!onlyRunning || running);
  });

  return (
    <section className="container-section" id="containers">
      <div className="container-toolbar">
        <label className="search-control">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search containers"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            aria-label="Search containers by name, ID, or image"
          />
          {search && (
            <button type="button" onClick={() => onSearch("")} aria-label="Clear search">×</button>
          )}
        </label>
        <label className="running-toggle">
          <input
            type="checkbox"
            checked={onlyRunning}
            onChange={(event) => onOnlyRunning(event.target.checked)}
          />
          <span className="toggle-track"><i /></span>
          Running only
        </label>
        <label className="status-filter">
          <span>Status</span>
          <select
            value={filter}
            onChange={(event) => onFilter(event.target.value as ContainerFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
        </label>
        <span className="container-count">{visibleContainers.length} of {containers.length}</span>
        <button className="toolbar-refresh" onClick={onRefresh} disabled={loading} title="Refresh containers" aria-label="Refresh containers">
          <span className={loading ? "spin" : ""} aria-hidden="true">↻</span>
        </button>
      </div>

      {error && <div className="request-error" role="alert"><span>!</span>{error}</div>}

      <div className="table-scroll">
        <table className="container-table">
          <thead>
            <tr>
              <th className="status-column">STATUS</th>
              <th className="name-column">NAME</th>
              <th className="id-column">CONTAINER ID</th>
              <th className="image-column">IMAGE</th>
              <th className="actions-column">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {visibleContainers.map((container) => {
              const running = isRunning(container);
              const status = container.status.toLowerCase();
              const statusClass = running
                ? "status-running"
                : status === "created" || status === "restarting" || status === "paused"
                  ? "status-warning"
                  : status === "dead" || status === "error"
                    ? "status-error"
                    : "status-stopped";
              const busy = actionId !== null;
              const pending = actionId === container.id;
              return (
                <tr
                  key={container.id}
                  className={selectedId === container.id ? "selected-row" : ""}
                  onClick={() => onDetails(container)}
                >
                  <td className="status-column">
                    <span className={`status-badge ${statusClass}`} title={container.status}>
                      <i aria-hidden="true" />
                      {container.status}
                    </span>
                  </td>
                  <td className="name-column">
                    <button className="table-name" onClick={(event) => { event.stopPropagation(); onDetails(container); }}>
                      <span className="container-icon" aria-hidden="true">▰</span>
                      <span>{container.name || "Unnamed container"}</span>
                    </button>
                  </td>
                  <td className="id-column mono-cell">{container.id}</td>
                  <td className="image-column image-cell" title={container.image}>{container.image}</td>
                  <td className="actions-column">
                    <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                      {running ? (
                        <>
                          <button className="mini-action" disabled={busy} onClick={() => onAction(container.id, "stop")} title="Stop container" aria-label={`Stop ${container.name ?? container.id}`}>■</button>
                          <button className="mini-action" disabled={busy} onClick={() => onAction(container.id, "restart")} title="Restart container" aria-label={`Restart ${container.name ?? container.id}`}>↻</button>
                        </>
                      ) : (
                        <button className="mini-action mini-action-start" disabled={busy} onClick={() => onAction(container.id, "start")} title="Start container" aria-label={`Start ${container.name ?? container.id}`}>▶</button>
                      )}
                      <button className="mini-action" onClick={() => onDetails(container)} title="View details" aria-label={`View details for ${container.name ?? container.id}`}>ⓘ</button>
                      <button className="mini-action" onClick={() => onLogs(container)} title="View logs" aria-label={`View logs for ${container.name ?? container.id}`}>≡</button>
                      {pending && <span className="action-progress" role="status">Working</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && containers.length === 0 && !error && (
          <div className="table-empty"><strong>No containers found</strong><span>Docker returned an empty container list.</span></div>
        )}
        {!loading && containers.length > 0 && visibleContainers.length === 0 && (
          <div className="table-empty"><strong>No matching containers</strong><span>Adjust the search or status filters.</span></div>
        )}
        {loading && containers.length === 0 && (
          <div className="table-empty"><span className="loading-ring" />Loading containers…</div>
        )}
      </div>
      <div className="table-footer">
        <span>{containers.filter(isRunning).length} running <span className="separator-dot">·</span> {containers.length - containers.filter(isRunning).length} stopped</span>
        <span>Refreshes every 5 seconds</span>
      </div>
    </section>
  );
}
