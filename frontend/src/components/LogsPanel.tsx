interface LogsPanelProps {
  logs: string | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function readableLogs(logs: string) {
  const bytes = new TextEncoder().encode(logs);
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let offset = 0;

  while (offset + 8 <= bytes.length) {
    const streamType = bytes[offset];
    if (
      (streamType !== 1 && streamType !== 2) ||
      bytes[offset + 1] !== 0 ||
      bytes[offset + 2] !== 0 ||
      bytes[offset + 3] !== 0
    ) {
      return logs;
    }

    const frameLength = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset + 4,
      4,
    ).getUint32(0);
    const frameEnd = offset + 8 + frameLength;
    if (frameEnd > bytes.length) return logs;
    chunks.push(decoder.decode(bytes.subarray(offset + 8, frameEnd)));
    offset = frameEnd;
  }

  return offset === bytes.length && chunks.length > 0 ? chunks.join("") : logs;
}

export default function LogsPanel({ logs, loading, error, onRefresh }: LogsPanelProps) {
  const output = logs === null ? null : readableLogs(logs);

  return (
    <section className="logs-panel" id="container-logs">
      <div className="logs-heading">
        <div>
          <h2>Logs</h2>
          <span>Recent container output · last 100 lines</span>
        </div>
        <button className="compact-button" onClick={onRefresh} disabled={loading}>
          <span className={loading ? "spin" : ""} aria-hidden="true">↻</span>
          Refresh logs
        </button>
      </div>
      <div className="terminal" aria-live="polite">
        <div className="terminal-bar">
          <span className="terminal-dot" />
          <span>stdout / stderr</span>
          {loading && <span className="terminal-fetching">FETCHING</span>}
        </div>
        <div className="terminal-body">
          {error ? (
            <div className="terminal-message terminal-error">{error}</div>
          ) : loading && logs === null ? (
            <div className="terminal-message"><span className="loading-ring" />Fetching recent output…</div>
          ) : logs === null ? (
            <div className="terminal-message">Select a container and choose View logs.</div>
          ) : output?.trim().length === 0 ? (
            <div className="terminal-message">No recent logs are available for this container.</div>
          ) : (
            <pre>{output}</pre>
          )}
        </div>
      </div>
    </section>
  );
}
