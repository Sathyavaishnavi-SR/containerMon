import type { DockerStatus } from "../types/container";
import ThemeToggle from "./ThemeToggle";

export type AppPage = "containers" | "monitoring" | "about";

interface HeaderProps {
  page: AppPage;
  dockerStatus: DockerStatus | null;
  statusMessage: string;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onNavigate: (page: AppPage) => void;
  onRefresh: () => void;
}

const navigation: { id: AppPage; label: string; icon: string }[] = [
  { id: "containers", label: "Containers", icon: "▰" },
  { id: "monitoring", label: "Monitoring", icon: "⌁" },
  { id: "about", label: "About", icon: "ⓘ" },
];

export default function Header({
  page,
  dockerStatus,
  statusMessage,
  isRefreshing,
  lastUpdated,
  onNavigate,
  onRefresh,
}: HeaderProps) {
  const connected = dockerStatus?.connected === true;
  const updated = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <header className="topbar">
      <a className="app-brand" href="#containers" onClick={(event) => { event.preventDefault(); onNavigate("containers"); }}>
        <span className="app-mark" aria-hidden="true">▰</span>
        <strong>Container<span>Mon</span></strong>
      </a>
      <nav className="top-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            className={`top-nav-item ${page === item.id ? "top-nav-active" : ""}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={page === item.id ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div className="topbar-controls">
        <span className={`docker-connection ${connected ? "connection-up" : dockerStatus ? "connection-down" : "connection-checking"}`} title={statusMessage}>
          <i />{connected ? "Docker connected" : dockerStatus ? "Disconnected" : "Connecting"}
        </span>
        {updated && <span className="last-updated">Updated {updated}</span>}
        <ThemeToggle />
        <button className="toolbar-refresh topbar-refresh" onClick={onRefresh} disabled={isRefreshing} title="Refresh now" aria-label="Refresh now">
          <span className={isRefreshing ? "spin" : ""} aria-hidden="true">↻</span>
        </button>
      </div>
    </header>
  );
}
