import { Link, useLocation } from "react-router-dom";
import "./not-found.css";

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <section className="not-found" role="alert">
      <div className="not-found-code" aria-hidden="true">404</div>
      <div>
        <span className="not-found-eyebrow">Ruta no encontrada</span>
        <h1>Esta sección no existe</h1>
        <p>
          No hay una página registrada para <code>{pathname}</code>.
        </p>
        <Link to="/" replace>Volver al inicio</Link>
      </div>
    </section>
  );
}
