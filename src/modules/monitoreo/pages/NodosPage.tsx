import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listarCamas } from "../../produccion/services/camas.service";
import type { Cama } from "../../produccion/types";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ModuleSubnav } from "../../../shared/ui/ModuleSubnav";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { actualizarNodo, crearNodo, listarNodos } from "../services/monitoreo.service";
import type { Nodo } from "../types";
import "./monitoreo.css";

export function NodosPage() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [camaCodigo, setCamaCodigo] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [firmware, setFirmware] = useState("1.4.2");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [nodosRespuesta, camasRespuesta] = await Promise.all([
        listarNodos(signal),
        listarCamas(signal),
      ]);
      setNodos(nodosRespuesta);
      setCamas(camasRespuesta);
      const disponible = camasRespuesta.find((cama) =>
        nodosRespuesta.every((nodo) => nodo.cama_id !== cama.id),
      );
      if (disponible) setCamaCodigo((actual) => actual || disponible.codigo);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los nodos.");
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearNodo(camaCodigo, identificador, firmware || null);
      setIdentificador("");
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el nodo.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(nodo: Nodo, estado: Nodo["estado"]) {
    setError(null);
    try {
      await actualizarNodo(nodo.identificador, estado, nodo.firmware);
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el nodo.");
    }
  }

  const camasSinNodo = camas.filter((cama) => nodos.every((nodo) => nodo.cama_id !== cama.id));

  return (
    <section className="monitoreo">
      <header className="monitoreo-header">
        <div>
          <span className="monitoreo-eyebrow">Infraestructura simulada</span>
          <h1>Nodos IoT</h1>
          <p>{nodos.length} nodos asignados sobre 25 camas</p>
        </div>
        <Button onClick={() => void cargar()} disabled={cargando}>Actualizar</Button>
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

      <div className="monitoreo-resumen">
        <article><span>Activos</span><strong>{nodos.filter((nodo) => nodo.estado === "activo").length}</strong></article>
        <article><span>Con alerta</span><strong>{nodos.filter((nodo) => nodo.estado === "alerta").length}</strong></article>
        <article><span>Sin conexión</span><strong>{nodos.filter((nodo) => nodo.estado === "offline").length}</strong></article>
        <article><span>Camas disponibles</span><strong>{camasSinNodo.length}</strong></article>
      </div>

      <div className="monitoreo-layout">
        <section className="monitoreo-panel">
          <div className="monitoreo-panel-header"><h2>Asignaciones por cama</h2></div>
          {cargando ? <div className="monitoreo-estado"><Spinner etiqueta="Cargando nodos" /></div> : (
            <div className="monitoreo-table-wrap">
              <table className="monitoreo-table">
                <thead><tr><th>Cama</th><th>Zona</th><th>Identificador</th><th>Estado</th><th>Última conexión</th><th>Acción</th></tr></thead>
                <tbody>
                  {nodos.map((nodo) => (
                    <tr key={nodo.id}>
                      <td><strong>{nodo.cama_codigo}</strong></td>
                      <td>{nodo.zona}</td>
                      <td><code>{nodo.identificador}</code></td>
                      <td><Badge tono={nodo.estado === "activo" ? "ok" : nodo.estado === "alerta" ? "riesgo" : "neutro"}>{nodo.estado}</Badge></td>
                      <td>{nodo.ultima_conexion ? formatearFechaHora(nodo.ultima_conexion) : "Nunca"}</td>
                      <td>
                        {nodo.estado !== "activo" && <Button onClick={() => void cambiarEstado(nodo, "activo")}>Activar</Button>}
                        {nodo.estado === "activo" && <Button onClick={() => void cambiarEstado(nodo, "offline")}>Poner offline</Button>}
                      </td>
                    </tr>
                  ))}
                  {nodos.length === 0 && <tr><td colSpan={6} className="monitoreo-empty">No hay nodos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="monitoreo-panel monitoreo-form-panel">
          <div className="monitoreo-panel-header"><h2>Asignar nodo</h2></div>
          <form className="monitoreo-form" onSubmit={crear}>
            <label>Cama<select value={camaCodigo} onChange={(event) => setCamaCodigo(event.target.value)} required>
              <option value="">Seleccionar</option>
              {camasSinNodo.map((cama) => <option key={cama.id} value={cama.codigo}>{cama.codigo} — Zona {cama.zona}</option>)}
            </select></label>
            <label>Identificador<input value={identificador} onChange={(event) => setIdentificador(event.target.value)} placeholder="ESP32-A-10" maxLength={64} required /></label>
            <label>Firmware<input value={firmware} onChange={(event) => setFirmware(event.target.value)} maxLength={32} /></label>
            <Button variante="primario" type="submit" disabled={guardando || !camaCodigo || !identificador.trim()}>{guardando ? "Asignando…" : "Asignar nodo"}</Button>
          </form>
        </aside>
      </div>
    </section>
  );
}
