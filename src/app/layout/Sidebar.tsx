import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/plano", label: "Plano" },
  { to: "/produccion/camas", label: "Camas" },
  { to: "/produccion/siembras", label: "Siembras" },
  { to: "/produccion/labores", label: "Labores" },
  { to: "/produccion/cosechas", label: "Cosechas" },
  { to: "/produccion/lotes", label: "Lotes" },
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
