import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ModuleSubnav } from "../../../shared/ui/ModuleSubnav";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { ingresarLectura, listarLecturas, listarNodos } from "../services/monitoreo.service";
import type { Lectura, Nodo } from "../types";
import "./monitoreo.css";

const SENSORES = [
  { clave: "temperatura", etiqueta: "Temperatura", unidad: "°C" },
  { clave: "humedad_relativa", etiqueta: "Humedad relativa", unidad: "%" },
  { clave: "humedad_suelo", etiqueta: "Humedad del suelo", unidad: "%" },
  { clave: "ph", etiqueta: "pH", unidad: "pH" },
  { clave: "conductividad_electrica", etiqueta: "Conductividad", unidad: "dS/m" },
] as const;

export function LecturasPage() {
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [cama, setCama] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulando, setSimulando] = useState(false);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [lecturasRespuesta, nodosRespuesta] = await Promise.all([
        listarLecturas(cama, 100, signal),
        listarNodos(signal),
      ]);
      setLecturas(lecturasRespuesta);
      setNodos(nodosRespuesta);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las lecturas.");
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, [cama]);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    const intervalo = window.setInterval(() => void cargar(), 30000);
    return () => {
      controller.abort();
      window.clearInterval(intervalo);
    };
  }, [cargar]);

  async function simular() {
    const nodo = nodos.find((item) => cama === "todas" || item.cama_codigo === cama);
    if (!nodo) return;
    setSimulando(true);
    setError(null);
    try {
      await ingresarLectura({
        identificador: nodo.identificador,
        temperatura: Number((22 + (Math.random() - 0.5) * 5).toFixed(2)),
        humedad_relativa: Number((70 + (Math.random() - 0.5) * 18).toFixed(2)),
        humedad_suelo: Number((48 + (Math.random() - 0.5) * 24).toFixed(2)),
        ph: Number((6.2 + (Math.random() - 0.5) * 0.8).toFixed(2)),
        conductividad_electrica: Number((1.35 + (Math.random() - 0.5) * 0.5).toFixed(2)),
      });
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la lectura.");
    } finally {
      setSimulando(false);
    }
  }

  const ultimaPorCama = useMemo(() => {
    const mapa = new Map<string, Lectura>();
    lecturas.forEach((lectura) => {
      if (!mapa.has(lectura.cama_codigo)) mapa.set(lectura.cama_codigo, lectura);
    });
    return mapa;
  }, [lecturas]);

  const ultima = lecturas[0] ?? null;
  const camas = Array.from(new Set(nodos.map((nodo) => nodo.cama_codigo))).sort();

  return (
    <section className="monitoreo">
      <header className="monitoreo-header">
        <div><span className="monitoreo-eyebrow">Datos de sensores</span><h1>Lecturas</h1><p>Últimas mediciones recibidas por ingesta HTTP</p></div>
        <div className="monitoreo-actions">
          <select aria-label="Filtrar por cama" value={cama} onChange={(event) => setCama(event.target.value)}>
            <option value="todas">Todas las camas</option>
            {camas.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
          </select>
          <Button variante="primario" onClick={() => void simular()} disabled={simulando || nodos.length === 0}>{simulando ? "Enviando…" : "Enviar simulación"}</Button>
        </div>
      </header>

      <ModuleSubnav
        label="Secciones de Monitoreo"
        items={[
          { to: "/monitoreo/nodos", label: "Nodos" },
          { to: "/monitoreo/lecturas", label: "Lecturas" },
          { to: "/monitoreo/umbrales", label: "Umbrales" },
        ]}
      />

      {error && <p className="monitoreo-error" role="alert">{error}</p>}

      {ultima && (
        <div className="sensor-grid">
          {SENSORES.map((sensor) => (
            <article className="sensor-card" key={sensor.clave}>
              <span>{sensor.etiqueta}</span>
              <strong>{ultima[sensor.clave].toFixed(sensor.clave === "ph" ? 2 : 1)} <small>{sensor.unidad}</small></strong>
              <p>{ultima.cama_codigo} · {formatearFechaHora(ultima.leido_en)}</p>
            </article>
          ))}
        </div>
      )}

      <section className="monitoreo-panel">
        <div className="monitoreo-panel-header">
          <div><h2>Histórico reciente</h2><p>{lecturas.length} registros</p></div>
        </div>
        {cargando ? <div className="monitoreo-estado"><Spinner etiqueta="Cargando lecturas" /></div> : (
          <div className="monitoreo-table-wrap">
            <table className="monitoreo-table">
              <thead><tr><th>Fecha</th><th>Cama</th><th>Nodo</th><th>Temp.</th><th>HR</th><th>Suelo</th><th>pH</th><th>CE</th></tr></thead>
              <tbody>
                {lecturas.map((lectura) => (
                  <tr key={lectura.id}>
                    <td>{formatearFechaHora(lectura.leido_en)}</td>
                    <td><strong>{lectura.cama_codigo}</strong></td>
                    <td><code>{lectura.nodo_identificador}</code></td>
                    <td>{lectura.temperatura.toFixed(1)} °C</td>
                    <td>{lectura.humedad_relativa.toFixed(1)} %</td>
                    <td>{lectura.humedad_suelo.toFixed(1)} %</td>
                    <td>{lectura.ph.toFixed(2)}</td>
                    <td>{lectura.conductividad_electrica.toFixed(2)} dS/m</td>
                  </tr>
                ))}
                {lecturas.length === 0 && <tr><td colSpan={8} className="monitoreo-empty">No hay lecturas para el filtro seleccionado.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ultimaPorCama.size > 0 && (
        <section className="monitoreo-panel">
          <div className="monitoreo-panel-header"><h2>Estado por cama</h2></div>
          <div className="camastatus-grid">
            {Array.from(ultimaPorCama.values()).slice(0, 12).map((lectura) => (
              <article key={lectura.cama_codigo}>
                <strong>{lectura.cama_codigo}</strong>
                <span>{lectura.temperatura.toFixed(1)} °C</span>
                <small>{lectura.humedad_suelo.toFixed(1)} % suelo</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
