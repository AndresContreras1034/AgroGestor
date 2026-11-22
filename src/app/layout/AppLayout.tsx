import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const { pathname } = useLocation();
  const esPlano = pathname.startsWith("/plano");

  return (
    <div className={`app-shell${esPlano ? " app-shell-plano" : ""}`}>
      <Sidebar />
      <div className={`app-content${esPlano ? " app-content-plano" : ""}`}>
        <Topbar />
        <main className={`page-content${esPlano ? " page-content-plano" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
