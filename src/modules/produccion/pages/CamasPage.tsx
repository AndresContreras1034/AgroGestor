import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api/errors";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { Badge, type TonoBadge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ESTADOS_CAMA, type EstadoCama } from "../../../shared/types/cama";
import type { ZonaResumen } from "../../../shared/types/zona";
import { listarCamas, listarZonas } from "../services/camas.service";
import type { Cama } from "../types";
import "./camas.css";

const TONO: Record<EstadoCama, TonoBadge> = {
  disponible: "neutro",
  sembrada: "ok",
  cosechada: "neutro",
  en_descanso: "neutro",
};

const ETIQUETAS: Record<EstadoCama, string> = Object.fromEntries(
  ESTADOS_CAMA.map(({ valor, etiqueta }) => [valor, etiqueta]),
) as Record<EstadoCama, string>;

export function CamasPage() {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [zonas, setZonas] = useState<ZonaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zona, setZona] = useState("todas");
  const [estado, setEstado] = useState<EstadoCama | "todos">("todos");

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [camasRespuesta, zonasRespuesta] = await Promise.all([
        listarCamas(signal),
        listarZonas(signal),
      ]);
      setCamas(camasRespuesta);
      setZonas(zonasRespuesta);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      setError(
        cause instanceof ApiError && cause.noConnection
          ? "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos."
          : cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las camas.",
      );
    } finally {
      if (!signal?.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const visibles = useMemo(
    () =>
      camas.filter(
        (cama) =>
          (zona === "todas" || cama.zona === zona) &&
          (estado === "todos" || cama.estado === estado),
      ),
    [camas, zona, estado],
  );

  return (
    <section className="camas">
      <header className="camas-header">
        <div>
          <h1>Camas</h1>
          <p className="camas-subtitle">
            {camas.length} camas en {zonas.length} zonas
          </p>
        </div>
        <Button onClick={() => void cargar()} disabled={cargando}>
          Actualizar
        </Button>
      </header>

      {error && (
        <p role="alert" className="camas-error">
          {error}
        </p>
      )}

      <div className="camas-zones">
        {zonas.map((item) => (
          <article key={item.codigo} className="zone-card" style={{ borderLeftColor: item.color }}>
            <h2>{item.nombre}</h2>
            <p>
              {item.camas} de {item.camas_esperadas} camas
            </p>
            <small>
              {item.hectareas == null ? "Hectáreas sin registrar" : `${item.hectareas} ha`}
            </small>
          </article>
        ))}
      </div>

      <div className="camas-filters">
        <label>
          Zona
          <select value={zona} onChange={(event) => setZona(event.target.value)}>
            <option value="todas">Todas</option>
            {zonas.map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoCama | "todos")}
          >
            <option value="todos">Todos</option>
            {ESTADOS_CAMA.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <span className="camas-count">{visibles.length} mostradas</span>
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="camas-table-wrap">
          <table className="camas-table">
            <thead>
              <tr>
                <th scope="col">Cama</th>
                <th scope="col">Zona</th>
                <th scope="col">N.º</th>
                <th scope="col">Estado</th>
                <th scope="col">Observaciones</th>
                <th scope="col">Actualizada</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((cama) => (
                <tr key={cama.id}>
                  <td>
                    <strong>{cama.codigo}</strong>
                  </td>
                  <td>{cama.zona}</td>
                  <td>{cama.numero}</td>
                  <td>
                    <Badge tono={TONO[cama.estado]}>{ETIQUETAS[cama.estado]}</Badge>
                  </td>
                  <td>{cama.observaciones ?? "—"}</td>
                  <td>{formatearFechaHora(cama.actualizado_en)}</td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="camas-empty">
                    Ninguna cama coincide con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
