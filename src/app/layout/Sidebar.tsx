import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { NAVIGATION_GROUPS } from "../navigation";

export function Sidebar() {
  const [hora, setHora] = useState(() =>
    new Intl.DateTimeFormat("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date()),
  );

  useEffect(() => {
    const reloj = window.setInterval(() => {
      setHora(
        new Intl.DateTimeFormat("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    }, 1000);

    return () => window.clearInterval(reloj);
  }, []);

  return (
    <nav className="sidebar" aria-label="Módulos">
      <Link to="/" className="sidebar-brand">
        <svg
          className="sidebar-brand-mark"
          viewBox="0 0 48 48"
          role="img"
          aria-label="AgroGestor"
        >
          <defs>
            <linearGradient id="agrogestor-brand" x1="8" y1="6" x2="40" y2="44">
              <stop stopColor="#67ad79" />
              <stop offset="1" stopColor="#287449" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="11" fill="url(#agrogestor-brand)" />
          <path d="M24 39c-1-10 1-18 7-25" fill="none" stroke="#edf5df" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M29 16c7-6 12-4 14-3-2 7-8 10-14 3Z" fill="#b8d69b" stroke="#edf5df" strokeWidth="1.2" />
          <path d="M24 23c-7-7-14-5-16-4 2 8 9 11 16 4Z" fill="#d0e4b6" stroke="#edf5df" strokeWidth="1.2" />
          <path d="M25 31c6-5 11-3 12-2-2 6-7 8-12 2Z" fill="#a7ca8c" stroke="#edf5df" strokeWidth="1.2" />
        </svg>
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
        <div className="sidebar-footer-status">
          <span className="sidebar-footer-mark" aria-hidden="true" />
          <span>Aplicación de escritorio</span>
          <time dateTime={hora}>{hora}</time>
        </div>
        <span className="sidebar-footer-license">MIT License · v0.1.0</span>
      </footer>
    </nav>
  );
}
