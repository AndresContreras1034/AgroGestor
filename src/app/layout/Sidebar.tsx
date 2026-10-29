import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/plano", label: "Plano" },
  { to: "/produccion/camas", label: "Producción" },
  { to: "/monitoreo", label: "Monitoreo IoT" },
  { to: "/calidad", label: "Calidad" },
  { to: "/trazabilidad", label: "Trazabilidad" },
  { to: "/comercial", label: "Comercial" },
];

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Módulos">
      <div className="sidebar-brand">AgroGestor</div>
      <ul>
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
