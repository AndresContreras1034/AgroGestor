import { Link } from "react-router-dom";
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

const COSECHA_CALIDAD = [
  { etiqueta: "Primera", valor: 68, tallos: "1.240" },
  { etiqueta: "Segunda", valor: 24, tallos: "440" },
  { etiqueta: "Descarte", valor: 8, tallos: "146" },
];

const SEMANA = [
  { dia: "Lun", valor: 38 },
  { dia: "Mar", valor: 52 },
  { dia: "Mié", valor: 44 },
  { dia: "Jue", valor: 68 },
  { dia: "Vie", valor: 56 },
  { dia: "Sáb", valor: 74 },
  { dia: "Dom", valor: 47 },
];

export function DashboardPage() {
  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Santandercito · Operación agrícola</span>
          <h1>Inicio</h1>
          <p>Resumen productivo y flujo operativo del cultivo de Ruscus.</p>
        </div>
        <span className="dashboard-reference">Datos de referencia</span>
      </header>

      <div className="dashboard-kpis">
        <article className="dashboard-kpi">
          <span>Camas registradas</span>
          <strong>31</strong>
          <small>25 disponibles · 6 campo abierto</small>
        </article>
        <article className="dashboard-kpi">
          <span>Siembras activas</span>
          <strong>18</strong>
          <small>58 % del área sembrada</small>
        </article>
        <article className="dashboard-kpi">
          <span>Cosecha de referencia</span>
          <strong>1.826</strong>
          <small>tallos registrados</small>
        </article>
        <article className="dashboard-kpi">
          <span>Lotes abiertos</span>
          <strong>4</strong>
          <small>Listos para trazabilidad</small>
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

          <div className="dashboard-bar-chart" aria-label="Cosecha referencial de los últimos siete días">
            {SEMANA.map((item) => (
              <div className="dashboard-bar-column" key={item.dia}>
                <span className="dashboard-bar-value">{item.valor * 10}</span>
                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
                    style={{ height: `${item.valor}%` }}
                    aria-hidden="true"
                  />
                </div>
                <small>{item.dia}</small>
              </div>
            ))}
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
            {COSECHA_CALIDAD.map((item) => (
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
