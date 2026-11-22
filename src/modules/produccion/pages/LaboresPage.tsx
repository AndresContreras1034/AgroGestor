import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import type { Gestor } from "../../../shared/types/gestor";
import { listarCamas } from "../services/camas.service";
import { crearLabor, listarLabores, listarSiembrasActivas } from "../services/labores.service";
import { TIPOS_LABOR, type Cama, type Labor, type Siembra, type TipoLabor } from "../types";
import "./camas.css";
import "./lotes.css";

const ACTOR: Gestor = "proyecto";
type Modo = "cama" | "siembra";

const ETIQUETAS: Record<TipoLabor, string> = Object.fromEntries(
  TIPOS_LABOR.map(({ valor, etiqueta }) => [valor, etiqueta]),
) as Record<TipoLabor, string>;

function mensajeError(cause: unknown, porDefecto: string): string {
  if (cause instanceof ApiError && cause.noConnection) {
    return "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos.";
  }
  return cause instanceof Error ? cause.message : porDefecto;
}

function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function hoyLocal(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function LaboresPage() {
  const [labores, setLabores] = useState<Labor[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [siembras, setSiembras] = useState<Siembra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<TipoLabor | "todos">("todos");
  const [camaFiltro, setCamaFiltro] = useState("todas");
  const [formAbierto, setFormAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("cama");
  const [camaForm, setCamaForm] = useState("");
  const [siembraForm, setSiembraForm] = useState("");
  const [tipo, setTipo] = useState<TipoLabor>("riego");
  const [fecha, setFecha] = useState(hoyLocal);
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [laboresRespuesta, camasRespuesta, siembrasRespuesta] = await Promise.all([
        listarLabores(signal),
        listarCamas(signal),
        listarSiembrasActivas(signal),
      ]);
      setLabores(laboresRespuesta);
      setCamas(camasRespuesta);
      setSiembras(siembrasRespuesta.filter((siembra) => siembra.estado === "activa"));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(mensajeError(cause, "No se pudieron cargar las labores."));
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

  const visibles = useMemo(
    () =>
      labores.filter(
        (labor) =>
          (tipoFiltro === "todos" || labor.tipo === tipoFiltro) &&
          (camaFiltro === "todas" || labor.cama_codigo === camaFiltro),
      ),
    [labores, tipoFiltro, camaFiltro],
  );

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorForm(null);
    if (modo === "cama" && camaForm === "") {
      setErrorForm("Selecciona una cama.");
      return;
    }
    if (modo === "siembra" && siembraForm === "") {
      setErrorForm("Selecciona una siembra activa.");
      return;
    }

    setGuardando(true);
    try {
      const texto = descripcion.trim();
      await crearLabor(
        {
          ...(modo === "cama" ? { cama: camaForm } : { siembra_id: Number(siembraForm) }),
          tipo,
          fecha,
          descripcion: texto === "" ? null : texto,
        },
        ACTOR,
      );
      setDescripcion("");
      setFormAbierto(false);
      await cargar();
    } catch (cause) {
      setErrorForm(mensajeError(cause, "No se pudo registrar la labor."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="camas">
      <header className="camas-header">
        <div>
          <h1>Labores</h1>
          <p className="camas-subtitle">{labores.length} labores registradas</p>
        </div>
        <div className="lotes-acciones">
          <Button onClick={() => void cargar()} disabled={cargando}>Actualizar</Button>
          <Button onClick={() => { setErrorForm(null); setFormAbierto((abierto) => !abierto); }}>
            {formAbierto ? "Cancelar" : "Registrar labor"}
          </Button>
        </div>
      </header>

      {error && <p role="alert" className="camas-error">{error}</p>}

      {formAbierto && (
        <form className="lotes-form" onSubmit={(event) => void enviar(event)}>
          <fieldset>
            <legend>Registrar sobre</legend>
            <label>
              <input type="radio" name="modo" checked={modo === "cama"} onChange={() => setModo("cama")} /> Una cama
            </label>
            <label>
              <input type="radio" name="modo" checked={modo === "siembra"} onChange={() => setModo("siembra")} /> Una siembra activa
            </label>
          </fieldset>

          {modo === "cama" ? (
            <label>
              Cama
              <select value={camaForm} onChange={(event) => setCamaForm(event.target.value)}>
                <option value="">Selecciona…</option>
                {camas.map((cama) => (
                  <option key={cama.id} value={cama.codigo}>{cama.codigo}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Siembra
              <select value={siembraForm} onChange={(event) => setSiembraForm(event.target.value)}>
                <option value="">Selecciona…</option>
                {siembras.map((siembra) => (
                  <option key={siembra.id} value={siembra.id}>
                    #{siembra.id} · {codigoPorCama.get(siembra.cama_id) ?? `#${siembra.cama_id}`} · {formatearFecha(siembra.fecha_siembra)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Tipo
            <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoLabor)}>
              {TIPOS_LABOR.map((item) => (
                <option key={item.valor} value={item.valor}>{item.etiqueta}</option>
              ))}
            </select>
          </label>

          <label>
            Fecha
            <input type="date" value={fecha} max={hoyLocal()} required onChange={(event) => setFecha(event.target.value)} />
          </label>

          <label>
            Descripción {tipo === "otra" ? "" : "(opcional)"}
            <textarea
              value={descripcion}
              maxLength={500}
              rows={3}
              required={tipo === "otra"}
              onChange={(event) => setDescripcion(event.target.value)}
            />
          </label>

          {errorForm && <p role="alert" className="camas-error">{errorForm}</p>}
          <div className="lotes-acciones">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar labor"}
            </Button>
          </div>
        </form>
      )}

      <div className="camas-filters">
        <label>
          Tipo
          <select
            value={tipoFiltro}
            onChange={(event) => setTipoFiltro(event.target.value as TipoLabor | "todos")}
          >
            <option value="todos">Todos</option>
            {TIPOS_LABOR.map((item) => (
              <option key={item.valor} value={item.valor}>{item.etiqueta}</option>
            ))}
          </select>
        </label>
        <label>
          Cama
          <select value={camaFiltro} onChange={(event) => setCamaFiltro(event.target.value)}>
            <option value="todas">Todas</option>
            {camas.map((cama) => (
              <option key={cama.id} value={cama.codigo}>{cama.codigo}</option>
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
                <th scope="col">Fecha</th>
                <th scope="col">Cama</th>
                <th scope="col">Siembra</th>
                <th scope="col">Tipo</th>
                <th scope="col">Descripción</th>
                <th scope="col">Registrada por</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((labor) => (
                <tr key={labor.id}>
                  <td>{formatearFecha(labor.fecha)}</td>
                  <td><strong>{labor.cama_codigo}</strong></td>
                  <td>{labor.siembra_id == null ? "—" : `#${labor.siembra_id}`}</td>
                  <td>{ETIQUETAS[labor.tipo]}</td>
                  <td>{labor.descripcion ?? "—"}</td>
                  <td>{labor.registrado_por}</td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="camas-empty">Ninguna labor coincide con el filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
