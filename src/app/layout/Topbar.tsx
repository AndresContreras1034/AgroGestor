import { useLocation } from "react-router-dom";
import { getHealth } from "../../shared/api/client";
import { usePolling } from "../../shared/hooks/usePolling";
import { getNavigationContext } from "../navigation";

export function Topbar() {
  const { pathname } = useLocation();
  const context = getNavigationContext(pathname);
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
      <div className="topbar-context">
        <span className="topbar-group">{context.group}</span>
        <span className="topbar-separator" aria-hidden="true">/</span>
        <strong className="topbar-module">{context.label}</strong>
        <span className="topbar-farm">Finca Santandercito · 25 camas</span>
      </div>
      <span className={`connection-status ${connectionState}`} role="status" aria-live="polite">
        {connectionLabel}
      </span>
    </header>
  );
}
