import { getHealth } from "../../shared/api/client";
import { usePolling } from "../../shared/hooks/usePolling";

export function Topbar() {
  const { data, error, loading } = usePolling(getHealth, 5_000);
  const connectionLabel = loading
    ? "Conectando con la API…"
    : error
      ? "API sin conexión"
      : data?.database === "connected"
        ? "API y PostgreSQL conectadas"
        : "PostgreSQL sin conexión";
  const connectionState = error
    ? "offline"
    : data?.database === "connected"
      ? "online"
      : "checking";

  return (
    <header className="topbar">
      <p className="farm-summary">Finca Santandersito · 25 camas</p>
      <span className={`connection-status ${connectionState}`} role="status" aria-live="polite">
        {connectionLabel}
      </span>
    </header>
  );
}
