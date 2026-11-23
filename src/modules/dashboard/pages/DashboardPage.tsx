import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerProduccionAnalitica, obtenerResumenAnalitico } from "../../analitica/services/analitica.service";
import type { ProduccionSerie, ResumenAnalitico } from "../../analitica/types";
import { listarCosechas } from "../../produccion/services/cosechas.service";
import type { Cosecha } from "../../produccion/types";
import "./dashboard.css";

const ETAPAS_RUSCUS = [
  {
    numero: "01",
    titulo: "Preparación",
    texto: "Suelo, camas y riego",
    simbolo: "◫",
    clase: "etapa-preparacion",
  },
  {
    numero: "02",
    titulo: "Siembra",
    texto: "Trasplante y registro",
    simbolo: "↟",
    clase: "etapa-siembra",
  },
  {
    numero: "03",
    titulo: "Crecimiento",
    texto: "Riego y labores",
    simbolo: "♧",
    clase: "etapa-crecimiento",
  },
  {
    numero: "04",
    titulo: "Cosecha",
    texto: "Corte de tallos",
    simbolo: "✂",
    clase: "etapa-cosecha",
  },
  {
    numero: "05",
    titulo: "Poscosecha",
    texto: "Lavado y selección",
    simbolo: "◉",
    clase: "etapa-poscosecha",
  },
  {
    numero: "06",
    titulo: "Despacho",
    texto: "Empaque y lote",
    simbolo: "↗",
    clase: "etapa-despacho",
  },
];

export function DashboardPage() {
  const [resumen, setResumen] = useState<ResumenAnalitico | null>(null);
  const [produccion, setProduccion] = useState<ProduccionSerie[]>([]);
  const [cosechas, setCosechas] = useState<Cosecha[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      obtenerResumenAnalitico(controller.signal),
      obtenerProduccionAnalitica(controller.signal),
      listarCosechas(controller.signal),
    ])
      .then(([resumenRespuesta, produccionRespuesta, cosechasRespuesta]) => {
        setResumen(resumenRespuesta);
        setProduccion(produccionRespuesta);
        setCosechas(cosechasRespuesta);
      })
      .catch(() => {
        setResumen(null);
        setProduccion([]);
        setCosechas([]);
      });
    return () => controller.abort();
  }, []);

  const calidadCosecha = useMemo(() => {
    const etiquetas = [
      { clave: "primera" as const, etiqueta: "Primera" },
      { clave: "segunda" as const, etiqueta: "Segunda" },
      { clave: "descarte" as const, etiqueta: "Descarte" },
    ];
    const total = cosechas.reduce((suma, cosecha) => suma + cosecha.tallos, 0);
    return etiquetas.map(({ clave, etiqueta }) => {
      const tallos = cosechas
        .filter((cosecha) => cosecha.calidad === clave)
        .reduce((suma, cosecha) => suma + cosecha.tallos, 0);
      return {
        etiqueta,
        tallos,
        valor: total === 0 ? 0 : Math.round((tallos / total) * 100),
      };
    });
  }, [cosechas]);

  const maximoProduccion = Math.max(...produccion.map((item) => item.tallos), 1);

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Santandercito · Operación agrícola</span>
          <h1>Inicio</h1>
          <p>Resumen productivo y flujo operativo del cultivo de Ruscus.</p>
        </div>
        <span className="dashboard-reference">Datos operativos</span>
      </header>

      <div className="dashboard-kpis">
        <article className="dashboard-kpi">
          <span>Camas registradas</span>
          <strong>{resumen?.camas ?? "—"}</strong>
          <small>{resumen ? `${resumen.siembras_activas} siembras activas` : "Cargando datos"}</small>
        </article>
        <article className="dashboard-kpi">
          <span>Siembras activas</span>
          <strong>{resumen?.siembras_activas ?? "—"}</strong>
          <small>{resumen ? `${resumen.incidencias_abiertas} incidencias abiertas` : "Cargando datos"}</small>
        </article>
        <article className="dashboard-kpi">
          <span>Cosecha registrada</span>
          <strong>{resumen?.tallos_cosechados.toLocaleString("es-CO") ?? "—"}</strong>
          <small>{resumen ? `${resumen.lecturas_24h} lecturas en 24 h` : "Cargando datos"}</small>
        </article>
        <article className="dashboard-kpi">
          <span>Lotes abiertos</span>
          <strong>{resumen?.lotes_abiertos ?? "—"}</strong>
          <small>{resumen ? `${resumen.clientes_activos} clientes activos` : "Cargando datos"}</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card dashboard-flow-card">
          <header className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">Proceso productivo</span>
              <h2>Flujo del Ruscus</h2>
            </div>
            <Link to="/produccion/siembras">Gestionar siembras</Link>
          </header>

          <div className="dashboard-flow" aria-label="Flujo productivo del Ruscus">
            {ETAPAS_RUSCUS.map((etapa, index) => (
              <div className="dashboard-flow-step" key={etapa.numero}>
                <article className={`dashboard-flow-node ${etapa.clase}`}>
                  <div className="dashboard-flow-node-top">
                    <span>{etapa.numero}</span>
                    <b aria-hidden="true">{etapa.simbolo}</b>
                  </div>
                  <h3>{etapa.titulo}</h3>
                  <p>{etapa.texto}</p>
                </article>
                {index < ETAPAS_RUSCUS.length - 1 && (
                  <span className="dashboard-flow-arrow" aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="dashboard-flow-detail">
            <p>
              <strong>Cómo se hace:</strong> preparar las camas, sembrar o trasplantar,
              mantener el cultivo con riegos y labores, cosechar los tallos, clasificarlos
              por calidad y asociarlos a un lote para el despacho.
            </p>
          </div>
        </section>

        <section className="dashboard-card">
          <header className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">Actividad semanal</span>
              <h2>Cosecha de tallos</h2>
            </div>
            <Link to="/produccion/cosechas">Ver cosechas</Link>
          </header>

          <div className="dashboard-bar-chart" aria-label="Cosecha registrada por día">
            {produccion.map((item) => (
              <div className="dashboard-bar-column" key={item.fecha}>
                <span className="dashboard-bar-value">{item.tallos}</span>
                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
                    style={{ height: `${Math.max(8, (item.tallos / maximoProduccion) * 100)}%` }}
                    aria-hidden="true"
                  />
                </div>
                <small>{item.fecha.slice(5)}</small>
              </div>
            ))}
            {produccion.length === 0 && (
              <small className="dashboard-bar-empty">Sin cosechas recientes</small>
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <header className="dashboard-card-header">
            <div>
              <span className="dashboard-card-eyebrow">Calidad</span>
              <h2>Distribución de cosecha</h2>
            </div>
          </header>

          <div className="dashboard-quality">
            {calidadCosecha.map((item) => (
              <div className="dashboard-quality-row" key={item.etiqueta}>
                <div>
                  <span>{item.etiqueta}</span>
                  <strong>{item.tallos} tallos</strong>
                </div>
                <div className="dashboard-quality-track">
                  <div
                    className={`dashboard-quality-fill calidad-${item.etiqueta.toLowerCase()}`}
                    style={{ width: `${item.valor}%` }}
                  />
                </div>
                <b>{item.valor}%</b>
              </div>
            ))}
          </div>

          <Link className="dashboard-card-action" to="/produccion/cosechas">
            Abrir registro de cosechas
          </Link>
        </section>
      </div>
    </section>
  );
}
