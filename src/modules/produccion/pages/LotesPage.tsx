import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api/errors";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { Badge, type TonoBadge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import type { Gestor } from "../../../shared/types/gestor";
import { cerrarLote, crearLote, listarLotes } from "../services/lotes.service";
import type { EstadoLote, Lote } from "../types";
import "./camas.css";
import "./lotes.css";

const ACTOR: Gestor = "proyecto";

const TONO: Record<EstadoLote, TonoBadge> = {
  abierto: "ok",
  cerrado: "neutro",
};

const ETIQUETAS: Record<EstadoLote, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
};

function mensajeError(cause: unknown, porDefecto: string): string {
  if (cause instanceof ApiError && cause.noConnection) {
    return "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos.";
  }
  return cause instanceof Error ? cause.message : porDefecto;
}

export function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoLote | "todos">("todos");
  const [formAbierto, setFormAbierto] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [cerrandoId, setCerrandoId] = useState<number | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      setLotes(await listarLotes(signal));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(mensajeError(cause, "No se pudieron cargar los lotes."));
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const visibles = useMemo(
    () => lotes.filter((lote) => estado === "todos" || lote.estado === estado),
    [lotes, estado],
  );

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      const texto = observaciones.trim();
      await crearLote({ observaciones: texto === "" ? null : texto }, ACTOR);
      setObservaciones("");
      setFormAbierto(false);
      await cargar();
    } catch (cause) {
      setErrorForm(mensajeError(cause, "No se pudo crear el lote."));
    } finally {
      setGuardando(false);
    }
  }

  async function cerrar(id: number) {
    setCerrandoId(id);
    setError(null);
    try {
      const actualizado = await cerrarLote(id, ACTOR);
      setLotes((previos) => previos.map((lote) => (lote.id === id ? actualizado : lote)));
      setConfirmandoId(null);
    } catch (cause) {
      setError(mensajeError(cause, "No se pudo cerrar el lote."));
    } finally {
      setCerrandoId(null);
    }
  }

  return (
    <section className="camas">
      <header className="camas-header">
        <div>
          <h1>Lotes</h1>
          <p className="camas-subtitle">{lotes.length} lotes registrados</p>
        </div>
        <div className="lotes-acciones">
          <Button onClick={() => void cargar()} disabled={cargando}>Actualizar</Button>
          <Button
            onClick={() => {
              setErrorForm(null);
              setFormAbierto((abierto) => !abierto);
            }}
          >
            {formAbierto ? "Cancelar" : "Nuevo lote"}
          </Button>
        </div>
      </header>

      {error && <p role="alert" className="camas-error">{error}</p>}

      {formAbierto && (
        <form className="lotes-form" onSubmit={(event) => void enviar(event)}>
          <p className="lotes-form-ayuda">
            El código <strong>RSC-AAAA-NNN</strong> se genera automáticamente.
          </p>
          <label>
            Observaciones (opcional)
            <textarea
              value={observaciones}
              maxLength={500}
              rows={3}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </label>
          {errorForm && <p role="alert" className="camas-error">{errorForm}</p>}
          <div className="lotes-acciones">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Creando…" : "Crear lote"}
            </Button>
          </div>
        </form>
      )}

      <div className="camas-filters">
        <label>
          Estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoLote | "todos")}
          >
            <option value="todos">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </label>
        <span className="camas-count">{visibles.length} mostrados</span>
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="camas-table-wrap">
          <table className="camas-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Año</th>
                <th scope="col">Estado</th>
                <th scope="col">Observaciones</th>
                <th scope="col">Creado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((lote) => (
                <tr key={lote.id}>
                  <td><strong>{lote.codigo}</strong></td>
                  <td>{lote.anio}</td>
                  <td><Badge tono={TONO[lote.estado]}>{ETIQUETAS[lote.estado]}</Badge></td>
                  <td>{lote.observaciones ?? "—"}</td>
                  <td>{formatearFechaHora(lote.creado_en)}</td>
                  <td>
                    {lote.estado === "cerrado" ? (
                      "—"
                    ) : confirmandoId === lote.id ? (
                      <span className="lotes-acciones">
                        <Button
                          onClick={() => void cerrar(lote.id)}
                          disabled={cerrandoId === lote.id}
                        >
                          {cerrandoId === lote.id ? "Cerrando…" : "Confirmar cierre"}
                        </Button>
                        <Button
                          onClick={() => setConfirmandoId(null)}
                          disabled={cerrandoId === lote.id}
                        >
                          No
                        </Button>
                      </span>
                    ) : (
                      <Button onClick={() => setConfirmandoId(lote.id)}>Cerrar</Button>
                    )}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="camas-empty">
                    Ningún lote coincide con el filtro.
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
