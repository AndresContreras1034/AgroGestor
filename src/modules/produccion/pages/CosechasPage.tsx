import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Badge, type TonoBadge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { RegistrarCosechaDialog } from "../components/RegistrarCosechaDialog";
import { listarCamas } from "../services/camas.service";
import { listarCosechas } from "../services/cosechas.service";
import { listarLotes } from "../services/lotes.service";
import { listarSiembras } from "../services/siembras.service";
import {
  CALIDADES_COSECHA,
  type CalidadCosecha,
  type Cama,
  type Cosecha,
  type Siembra,
} from "../types";
import { formatearFechaISO } from "../utils/fechas";
import "./camas.css";
import "./siembras.css";

type Lotes = Awaited<ReturnType<typeof listarLotes>>;

const TONO: Record<CalidadCosecha, TonoBadge> = {
  primera: "ok",
  segunda: "neutro",
  descarte: "neutro",
};

const ETIQUETAS: Record<CalidadCosecha, string> = Object.fromEntries(
  CALIDADES_COSECHA.map(({ valor, etiqueta }) => [valor, etiqueta]),
) as Record<CalidadCosecha, string>;

function mensajeDeError(cause: unknown, porDefecto: string): string {
  if (cause instanceof ApiError && cause.noConnection) {
    return "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos.";
  }
  return cause instanceof Error ? cause.message : porDefecto;
}

export function CosechasPage() {
  const [cosechas, setCosechas] = useState<Cosecha[]>([]);
  const [siembras, setSiembras] = useState<Siembra[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [lotes, setLotes] = useState<Lotes>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calidad, setCalidad] = useState<CalidadCosecha | "todas">("todas");
  const [lote, setLote] = useState("todos");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [cosechasRespuesta, siembrasRespuesta, camasRespuesta, lotesRespuesta] =
        await Promise.all([
          listarCosechas(signal),
          listarSiembras(signal),
          listarCamas(signal),
          listarLotes(signal),
        ]);
      setCosechas(cosechasRespuesta);
      setSiembras(siembrasRespuesta);
      setCamas(camasRespuesta);
      setLotes(lotesRespuesta);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(mensajeDeError(cause, "No se pudieron cargar las cosechas."));
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const codigoCama = useMemo(() => new Map(camas.map((item) => [item.id, item.codigo])), [camas]);
  const codigoLote = useMemo(() => new Map(lotes.map((item) => [item.id, item.codigo])), [lotes]);
  const lotesAbiertos = useMemo(() => lotes.filter((item) => item.estado === "abierto"), [lotes]);
  const siembrasActivas = useMemo(
    () => siembras.filter((item) => item.estado === "activa"),
    [siembras],
  );

  const visibles = useMemo(
    () =>
      cosechas.filter(
        (item) =>
          (calidad === "todas" || item.calidad === calidad) &&
          (lote === "todos" ||
            (lote === "sin_lote" ? item.lote_id === null : item.lote_id === Number(lote))),
      ),
    [cosechas, calidad, lote],
  );

  const totalTallos = useMemo(
    () => visibles.reduce((suma, item) => suma + item.tallos, 0),
    [visibles],
  );

  async function alRegistrar() {
    setDialogoAbierto(false);
    await cargar();
  }

  return (
    <section className="camas">
      <header className="camas-header">
        <div>
          <h1>Cosechas</h1>
          <p className="camas-subtitle">
            {cosechas.length} registradas, {siembrasActivas.length} siembras por cosechar
          </p>
        </div>
        <div className="siembras-actions">
          <Button onClick={() => void cargar()} disabled={cargando}>Actualizar</Button>
          <Button onClick={() => setDialogoAbierto(true)} disabled={cargando}>
            Registrar cosecha
          </Button>
        </div>
      </header>

      {error && <p role="alert" className="camas-error">{error}</p>}

      <div className="camas-filters">
        <label>
          Calidad
          <select
            value={calidad}
            onChange={(event) => setCalidad(event.target.value as CalidadCosecha | "todas")}
          >
            <option value="todas">Todas</option>
            {CALIDADES_COSECHA.map((item) => (
              <option key={item.valor} value={item.valor}>{item.etiqueta}</option>
            ))}
          </select>
        </label>
        <label>
          Lote
          <select value={lote} onChange={(event) => setLote(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="sin_lote">Sin lote</option>
            {lotes.map((item) => (
              <option key={item.id} value={item.id}>{item.codigo}</option>
            ))}
          </select>
        </label>
        <span className="camas-count">
          {visibles.length} mostradas · {totalTallos.toLocaleString("es-CO")} tallos
        </span>
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="camas-table-wrap">
          <table className="camas-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cama</th>
                <th scope="col">Siembra</th>
                <th scope="col">Lote</th>
                <th scope="col">Tallos</th>
                <th scope="col">Calidad</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((item) => (
                <tr key={item.id}>
                  <td>{formatearFechaISO(item.fecha)}</td>
                  <td><strong>{codigoCama.get(item.cama_id) ?? `#${item.cama_id}`}</strong></td>
                  <td>#{item.siembra_id}</td>
                  <td>
                    {item.lote_id === null
                      ? "—"
                      : (codigoLote.get(item.lote_id) ?? `#${item.lote_id}`)}
                  </td>
                  <td>{item.tallos.toLocaleString("es-CO")}</td>
                  <td>
                    <Badge tono={TONO[item.calidad]}>{ETIQUETAS[item.calidad]}</Badge>
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="camas-empty">
                    {cosechas.length === 0
                      ? "Aún no hay cosechas registradas."
                      : "Ninguna cosecha coincide con el filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogoAbierto && (
        <RegistrarCosechaDialog
          siembras={siembrasActivas}
          codigoCama={codigoCama}
          lotes={lotesAbiertos}
          onCerrar={() => setDialogoAbierto(false)}
          onRegistrada={() => void alRegistrar()}
        />
      )}
    </section>
  );
}
