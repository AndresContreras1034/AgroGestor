import { Link, NavLink } from "react-router-dom";
import { NAVIGATION_GROUPS } from "../navigation";

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Módulos">
      <Link to="/" className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden="true">AG</span>
        <span>
          <strong>AgroGestor</strong>
          <small>Gestión agrícola</small>
        </span>
      </Link>
      <div className="sidebar-navigation">
        {NAVIGATION_GROUPS.map((group) => (
          <section className="sidebar-group" key={group.label}>
            <h2>{group.label}</h2>
            <ul>
              {group.items.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                  >
                    <span className="sidebar-link-indicator" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="sidebar-footer">
        <span className="sidebar-footer-mark" aria-hidden="true" />
        Aplicación de escritorio
      </footer>
    </nav>
  );
}
