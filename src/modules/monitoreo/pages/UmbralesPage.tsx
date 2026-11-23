import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ModuleSubnav } from "../../../shared/ui/ModuleSubnav";
import { actualizarUmbral, listarUmbrales } from "../services/monitoreo.service";
import type { Umbral } from "../types";
import "./monitoreo.css";

const ETIQUETAS: Record<Umbral["variable"], string> = {
  temperatura: "Temperatura",
  humedad_relativa: "Humedad relativa",
  humedad_suelo: "Humedad del suelo",
  ph: "pH",
  conductividad_electrica: "Conductividad eléctrica",
};

export function UmbralesPage() {
  const [umbrales, setUmbrales] = useState<Umbral[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      setUmbrales(await listarUmbrales(signal));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los umbrales.");
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  function cambiar(variable: Umbral["variable"], campo: keyof Omit<Umbral, "variable">, valor: string) {
    setUmbrales((actuales) => actuales.map((umbral) =>
      umbral.variable === variable
        ? { ...umbral, [campo]: campo === "unidad" ? valor : Number(valor) }
        : umbral,
    ));
  }

  async function guardar(event: FormEvent, umbral: Umbral) {
    event.preventDefault();
    setGuardando(umbral.variable);
    setError(null);
    try {
      await actualizarUmbral(umbral.variable, umbral);
      await cargar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el umbral.");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <section className="monitoreo">
      <header className="monitoreo-header">
        <div><span className="monitoreo-eyebrow">Reglas de operación</span><h1>Umbrales</h1><p>Rangos normales, de alerta y críticos para cada variable</p></div>
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
      {cargando ? <div className="monitoreo-estado"><Spinner etiqueta="Cargando umbrales" /></div> : (
        <div className="umbrales-grid">
          {umbrales.map((umbral) => (
            <form className="monitoreo-panel umbral-card" key={umbral.variable} onSubmit={(event) => void guardar(event, umbral)}>
              <div className="monitoreo-panel-header">
                <div><h2>{ETIQUETAS[umbral.variable]}</h2><p>{umbral.unidad}</p></div>
                <input className="unidad-input" aria-label={`Unidad de ${ETIQUETAS[umbral.variable]}`} value={umbral.unidad} onChange={(event) => cambiar(umbral.variable, "unidad", event.target.value)} />
              </div>
              <div className="rango-track">
                <span className="rango-critico">Crítico</span>
                <span className="rango-alerta">Alerta</span>
                <span className="rango-normal">Normal</span>
                <span className="rango-alerta">Alerta</span>
                <span className="rango-critico">Crítico</span>
              </div>
              <div className="umbral-fields">
                <label>Crítico mín.<input type="number" step="0.01" value={umbral.min_critico} onChange={(event) => cambiar(umbral.variable, "min_critico", event.target.value)} /></label>
                <label>Alerta mín.<input type="number" step="0.01" value={umbral.min_alerta} onChange={(event) => cambiar(umbral.variable, "min_alerta", event.target.value)} /></label>
                <label>Alerta máx.<input type="number" step="0.01" value={umbral.max_alerta} onChange={(event) => cambiar(umbral.variable, "max_alerta", event.target.value)} /></label>
                <label>Crítico máx.<input type="number" step="0.01" value={umbral.max_critico} onChange={(event) => cambiar(umbral.variable, "max_critico", event.target.value)} /></label>
              </div>
              <Button type="submit" variante="primario" disabled={guardando === umbral.variable}>{guardando === umbral.variable ? "Guardando…" : "Guardar rangos"}</Button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
