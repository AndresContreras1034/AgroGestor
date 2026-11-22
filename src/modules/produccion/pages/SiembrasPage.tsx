import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Badge, type TonoBadge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { NuevaSiembraDialog } from "../components/NuevaSiembraDialog";
import { listarCamas } from "../services/camas.service";
import { cancelarSiembra, listarSiembras } from "../services/siembras.service";
import { ESTADOS_SIEMBRA, type Cama, type EstadoSiembra, type Siembra } from "../types";
import { formatearFechaISO } from "../utils/fechas";
import "./camas.css";
import "./siembras.css";

const TONO: Record<EstadoSiembra, TonoBadge> = {
  activa: "ok",
  cosechada: "neutro",
  cancelada: "neutro",
};

const ETIQUETAS: Record<EstadoSiembra, string> = Object.fromEntries(
  ESTADOS_SIEMBRA.map(({ valor, etiqueta }) => [valor, etiqueta]),
) as Record<EstadoSiembra, string>;

function mensajeDeError(cause: unknown, porDefecto: string): string {
  if (cause instanceof ApiError && cause.noConnection) {
    return "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos.";
  }
  return cause instanceof Error ? cause.message : porDefecto;
}

export function SiembrasPage() {
  const [siembras, setSiembras] = useState<Siembra[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSiembra | "todos">("todos");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [siembrasRespuesta, camasRespuesta] = await Promise.all([
        listarSiembras(signal),
        listarCamas(signal),
      ]);
      setSiembras(siembrasRespuesta);
      setCamas(camasRespuesta);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(mensajeDeError(cause, "No se pudieron cargar las siembras."));
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const codigoPorCama = useMemo(
    () => new Map(camas.map((cama) => [cama.id, cama.codigo])),
    [camas],
  );

  const camasSembrables = useMemo(
    () => camas.filter((cama) => cama.estado === "disponible" || cama.estado === "en_descanso"),
    [camas],
  );

  const visibles = useMemo(
    () => siembras.filter((siembra) => estado === "todos" || siembra.estado === estado),
    [siembras, estado],
  );

  const activas = useMemo(
    () => siembras.filter((siembra) => siembra.estado === "activa").length,
    [siembras],
  );

  async function cancelar(siembra: Siembra) {
    const cama = codigoPorCama.get(siembra.cama_id) ?? `#${siembra.cama_id}`;
    const confirmado = window.confirm(
      `¿Cancelar la siembra de la cama ${cama}? La cama volverá a quedar disponible.`,
    );
    if (!confirmado) return;

    setCancelandoId(siembra.id);
    setError(null);
    try {
      await cancelarSiembra(siembra.id);
      await cargar();
    } catch (cause) {
      setError(mensajeDeError(cause, "No se pudo cancelar la siembra."));
    } finally {
      setCancelandoId(null);
    }
  }

  async function alCrear() {
    setDialogoAbierto(false);
    await cargar();
  }

  return (
    <section className="camas">
      <header className="camas-header">
        <div>
          <h1>Siembras</h1>
          <p className="camas-subtitle">
            {siembras.length} registradas, {activas} activas
          </p>
        </div>
        <div className="siembras-actions">
          <Button onClick={() => void cargar()} disabled={cargando}>
            Actualizar
          </Button>
          <Button onClick={() => setDialogoAbierto(true)} disabled={cargando}>
            Nueva siembra
          </Button>
        </div>
      </header>

      {error && (
        <p role="alert" className="camas-error">
          {error}
        </p>
      )}

      <div className="camas-filters">
        <label>
          Estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoSiembra | "todos")}
          >
            <option value="todos">Todos</option>
            {ESTADOS_SIEMBRA.map((item) => (
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
                <th scope="col">Siembra</th>
                <th scope="col">Cosecha estimada</th>
                <th scope="col">Plantas</th>
                <th scope="col">Estado</th>
                <th scope="col">Observaciones</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((siembra) => (
                <tr key={siembra.id}>
                  <td>
                    <strong>{codigoPorCama.get(siembra.cama_id) ?? `#${siembra.cama_id}`}</strong>
                  </td>
                  <td>{formatearFechaISO(siembra.fecha_siembra)}</td>
                  <td>{formatearFechaISO(siembra.fecha_estimada_cosecha)}</td>
                  <td>{siembra.plantas_sembradas.toLocaleString("es-CO")}</td>
                  <td>
                    <Badge tono={TONO[siembra.estado]}>{ETIQUETAS[siembra.estado]}</Badge>
                  </td>
                  <td>{siembra.observaciones ?? "—"}</td>
                  <td>
                    {siembra.estado === "activa" && (
                      <Button
                        onClick={() => void cancelar(siembra)}
                        disabled={cancelandoId === siembra.id}
                      >
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="camas-empty">
                    {siembras.length === 0
                      ? "Aún no hay siembras registradas."
                      : "Ninguna siembra coincide con el filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogoAbierto && (
        <NuevaSiembraDialog
          camas={camasSembrables}
          onCerrar={() => setDialogoAbierto(false)}
          onCreada={() => void alCrear()}
        />
      )}
    </section>
  );
}
