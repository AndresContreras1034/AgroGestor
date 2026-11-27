import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../shared/api/client";
import {
  COLOR,
  ETIQUETA_ESTADO,
  HISTORIAL,
  MIN_POR_TICK,
  POS_SENSORES,
  VARIABLES,
  ZONAS,
  CAMA,
  formato,
  type Estado,
  type Rango,
} from "./motor/config";
import {
  alternarFallaRiego,
  crearSim,
  diaSimulado,
  fertirriego,
  horaSimulada,
  iniciarLluvia,
  iniciarOlaDeCalor,
  lloviendo,
  olaDeCalor,
  paso,
  promedioCama,
  promedioNodo,
  regar,
  repararSondas,
  resumenZona,
  tratarFoco,
  tratarTodos,
  type CamaApi,
  type DatosIniciales,
  type IncidenciaApi,
  type LecturaApi,
  type NodoApi,
  type Sim,
  type UmbralApi,
} from "./motor/motor";
import {
  ajustar,
  sondasEncendidas,
  xEscaneo,
  centroCama,
  desplazar,
  detectar,
  dibujar,
  enMinimapa,
  enfocar,
  puntoCama,
  zoomEn,
  type Camara,
  type Objetivo,
  type Vista,
} from "./motor/lienzo";
import "./simulacion.css";

const VELOCIDADES = [
  { valor: 1, etiqueta: "1×", ayuda: "15 min por segundo" },
  { valor: 4, etiqueta: "4×", ayuda: "1 h por segundo" },
  { valor: 16, etiqueta: "16×", ayuda: "4 h por segundo" },
];

type ZonaAccion = "todas" | "A" | "B" | "C";

/** Secuencia de arranque: escaneo de sondas y luego anuncio de inicio. */
const DURACION_ESCANEO = 2600;
const DURACION_TOTAL = 3900;

interface Arranque {
  progreso: number;
  t: number;
  reinicio: boolean;
}

async function cargarDatos(signal: AbortSignal): Promise<{ datos: Partial<DatosIniciales>; real: boolean }> {
  const intentos = await Promise.allSettled([
    api.get<CamaApi[]>("/api/produccion/camas", signal),
    api.get<NodoApi[]>("/api/monitoreo/nodos", signal),
    api.get<LecturaApi[]>("/api/monitoreo/lecturas?limite=500", signal),
    api.get<UmbralApi[]>("/api/monitoreo/umbrales", signal),
    api.get<IncidenciaApi[]>("/api/calidad/incidencias", signal),
  ]);
  const valor = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
  const [camas, nodos, lecturas, umbrales, incidencias] = intentos;
  return {
    datos: {
      camas: valor(camas),
      nodos: valor(nodos),
      lecturas: valor(lecturas),
      umbrales: valor(umbrales),
      incidencias: valor(incidencias),
    },
    real: intentos.some((r) => r.status === "fulfilled"),
  };
}

function hora(d: Date) {
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fecha(d: Date) {
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function Punto({ estado }: { estado: Estado }) {
  return <span className="sim-dot" style={{ background: COLOR[estado] }} aria-label={ETIQUETA_ESTADO[estado]} />;
}

function Sparkline({ datos, rango }: { datos: number[]; rango: Rango }) {
  const validos = datos.filter((v) => Number.isFinite(v));
  if (validos.length < 2) return <svg className="sim-spark" viewBox="0 0 120 28" />;
  const min = Math.min(...validos, rango.min_alerta);
  const max = Math.max(...validos, rango.max_alerta);
  const span = max - min || 1;
  const y = (v: number) => 26 - ((v - min) / span) * 24;
  const x = (i: number) => (i / (HISTORIAL - 1)) * 120;
  const off = HISTORIAL - datos.length;
  let d = "";
  datos.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const prev = datos[i - 1];
    d += `${i === 0 || !Number.isFinite(prev) ? "M" : "L"}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`;
  });
  return (
    <svg className="sim-spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y={y(rango.max_alerta)} width="120" height={Math.max(0, y(rango.min_alerta) - y(rango.max_alerta))} className="sim-spark-banda" />
      <path d={d} />
    </svg>
  );
}

export function SimulacionPage() {
  const simRef = useRef<Sim | null>(null);
  const camRef = useRef<Camara>({ x: 0, y: 0, zoom: 1, min: 0.5, max: 60 });
  const vistaRef = useRef<Vista>({ w: 800, h: 560 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const envolturaRef = useRef<HTMLDivElement | null>(null);
  const sucioRef = useRef(true);
  const hoverRef = useRef<Objetivo | null>(null);
  const publicadosRef = useRef(0);
  const seleccionRef = useRef<Objetivo | null>(null);
  const arranqueRef = useRef<{ inicio: number; reinicio: boolean } | null>(null);
  const datosRef = useRef<{ datos: Partial<DatosIniciales>; real: boolean } | null>(null);

  const [, setVersion] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [velocidad, setVelocidad] = useState(4);
  const [corriendo, setCorriendo] = useState(false);
  const [seleccion, setSeleccion] = useState<Objetivo | null>(null);
  const [zonaAccion, setZonaAccion] = useState<ZonaAccion>("todas");
  const [publicar, setPublicar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arranque, setArranque] = useState<Arranque | null>(null);

  const refrescar = useCallback(() => {
    sucioRef.current = true;
    setVersion((v) => v + 1);
  }, []);

  const iniciarArranque = useCallback((reinicio: boolean) => {
    arranqueRef.current = { inicio: performance.now(), reinicio };
    setCorriendo(false);
    setArranque({ progreso: 0, t: 0, reinicio });
    sucioRef.current = true;
  }, []);

  // Carga inicial desde la API
  useEffect(() => {
    const c = new AbortController();
    cargarDatos(c.signal).then(({ datos, real }) => {
      if (c.signal.aborted) return;
      datosRef.current = { datos, real };
      simRef.current = crearSim(datos, real);
      ajustar(camRef.current, vistaRef.current);
      setCargando(false);
      iniciarArranque(false);
      refrescar();
    });
    return () => c.abort();
  }, [refrescar, iniciarArranque]);

  /** Reinicia desde cero: día 1, 06:00, sin focos ni historial, con secuencia de arranque. */
  const reiniciar = useCallback(() => {
    const base = datosRef.current;
    if (!base || arranqueRef.current) return;
    hoverRef.current = null;
    setSeleccion(null);
    setAviso(null);
    publicadosRef.current = 0;
    simRef.current = crearSim(base.datos, base.real, true);
    ajustar(camRef.current, vistaRef.current);
    iniciarArranque(true);
    refrescar();
  }, [iniciarArranque, refrescar]);

  // Bucle de simulación
  useEffect(() => {
    if (!corriendo || cargando) return;
    const id = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      paso(sim);
      if (publicar && sim.minuto % 60 === 0) void publicarLecturas(sim);
      refrescar();
    }, 1000 / velocidad);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corriendo, cargando, velocidad, publicar, refrescar]);

  async function publicarLecturas(sim: Sim) {
    const camas = sim.camas.filter((c) => !c.nodoOffline);
    try {
      for (const c of camas) {
        const p = promedioNodo(sim, c);
        if (Object.values(p).some((v) => !Number.isFinite(v))) continue;
        await api.post(
          "/api/monitoreo/ingesta",
          {
            identificador: c.nodo,
            temperatura: Number(p.temperatura.toFixed(2)),
            humedad_relativa: Number(p.humedad_relativa.toFixed(2)),
            humedad_suelo: Number(p.humedad_suelo.toFixed(2)),
            ph: Number(p.ph.toFixed(2)),
            conductividad_electrica: Number(p.conductividad_electrica.toFixed(2)),
          },
          "proyecto",
        );
        publicadosRef.current++;
      }
    } catch (causa) {
      setPublicar(false);
      setAviso(`Se detuvo la publicación a la API: ${causa instanceof Error ? causa.message : "error desconocido"}`);
    }
  }

  // Canvas: tamaño, dibujo e interacción
  useEffect(() => {
    const canvas = canvasRef.current;
    const envoltura = envolturaRef.current;
    if (!canvas || !envoltura) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let dpr = window.devicePixelRatio || 1;
    let primera = true;

    const redimensionar = () => {
      dpr = window.devicePixelRatio || 1;
      const r = envoltura.getBoundingClientRect();
      vistaRef.current = { w: r.width, h: r.height };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      if (primera && simRef.current) {
        ajustar(camRef.current, vistaRef.current);
        primera = false;
      }
      sucioRef.current = true;
    };
    const ro = new ResizeObserver(redimensionar);
    ro.observe(envoltura);
    redimensionar();

    let raf = 0;
    let ultimoAviso = 0;
    const cuadro = () => {
      const sim = simRef.current;
      let progreso: number | null = null;
      const a = arranqueRef.current;
      if (a) {
        const t = performance.now() - a.inicio;
        progreso = Math.min(1, t / DURACION_ESCANEO);
        sucioRef.current = true;
        if (t >= DURACION_TOTAL) {
          arranqueRef.current = null;
          progreso = null;
          setArranque(null);
          setCorriendo(true);
        } else if (t - ultimoAviso > 40) {
          ultimoAviso = t;
          setArranque({ progreso: progreso ?? 1, t, reinicio: a.reinicio });
        }
      } else {
        ultimoAviso = 0;
      }
      if (sim && sucioRef.current) {
        if (primera) {
          ajustar(camRef.current, vistaRef.current);
          primera = false;
        }
        sucioRef.current = false;
        dibujar(ctx, {
          sim,
          cam: camRef.current,
          vista: vistaRef.current,
          dpr,
          hover: hoverRef.current,
          seleccion: seleccionRef.current,
          arranque: progreso !== null && progreso < 1 ? progreso : null,
        });
      }
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);

    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      zoomEn(camRef.current, vistaRef.current, p.x, p.y, Math.exp(-e.deltaY * 0.0015));
      sucioRef.current = true;
    };
    let arrastrando = false;
    let movido = 0;
    let lx = 0;
    let ly = 0;
    const abajo = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const p = local(e);
      const mm = enMinimapa(vistaRef.current, p.x, p.y);
      if (mm) {
        camRef.current.x = mm.x;
        camRef.current.y = mm.y;
        sucioRef.current = true;
        return;
      }
      arrastrando = true;
      movido = 0;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const mover = (e: PointerEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      if (arrastrando) {
        desplazar(camRef.current, e.clientX - lx, e.clientY - ly);
        movido += Math.hypot(e.clientX - lx, e.clientY - ly);
        lx = e.clientX;
        ly = e.clientY;
        sucioRef.current = true;
        return;
      }
      const p = local(e);
      const obj = detectar(sim, camRef.current, vistaRef.current, p.x, p.y);
      const clave = JSON.stringify(obj);
      if (clave !== JSON.stringify(hoverRef.current)) {
        hoverRef.current = obj;
        sucioRef.current = true;
      }
      canvas.style.cursor = obj ? "pointer" : "grab";
    };
    const arriba = (e: PointerEvent) => {
      if (!arrastrando) return;
      arrastrando = false;
      canvas.style.cursor = "grab";
      if (movido < 4 && simRef.current) {
        const p = local(e);
        const obj = detectar(simRef.current, camRef.current, vistaRef.current, p.x, p.y);
        setSeleccion(obj);
        sucioRef.current = true;
      }
    };
    const salir = () => {
      hoverRef.current = null;
      sucioRef.current = true;
    };
    canvas.addEventListener("wheel", rueda, { passive: false });
    canvas.addEventListener("pointerdown", abajo);
    canvas.addEventListener("pointermove", mover);
    canvas.addEventListener("pointerup", arriba);
    canvas.addEventListener("pointercancel", arriba);
    canvas.addEventListener("pointerleave", salir);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", rueda);
      canvas.removeEventListener("pointerdown", abajo);
      canvas.removeEventListener("pointermove", mover);
      canvas.removeEventListener("pointerup", arriba);
      canvas.removeEventListener("pointercancel", arriba);
      canvas.removeEventListener("pointerleave", salir);
    };
  }, [cargando]);

  useEffect(() => {
    seleccionRef.current = seleccion;
    sucioRef.current = true;
  }, [seleccion]);

  const zoomCentro = (factor: number) => {
    zoomEn(camRef.current, vistaRef.current, vistaRef.current.w / 2, vistaRef.current.h / 2, factor);
    sucioRef.current = true;
  };
  const vistaGeneral = () => {
    ajustar(camRef.current, vistaRef.current);
    sucioRef.current = true;
  };

  const reiniciarRef = useRef(reiniciar);
  reiniciarRef.current = reiniciar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "Escape") setSeleccion(null);
      if (e.key === "r" || e.key === "R") reiniciarRef.current();
      if (e.key === "0") vistaGeneral();
      if (e.key === "+" || e.key === "=") zoomCentro(1.25);
      if (e.key === "-") zoomCentro(1 / 1.25);
      if (e.key === " ") {
        e.preventDefault();
        setCorriendo((v) => !v);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const sim = simRef.current;
  const accion = (fn: (s: Sim) => void) => {
    if (!simRef.current) return;
    fn(simRef.current);
    refrescar();
  };

  if (cargando || !sim) {
    return (
      <section className="sim sim-cargando">
        <p>Cargando el gemelo digital de la finca…</p>
        <div className="sim-mundo" ref={envolturaRef}><canvas ref={canvasRef} /></div>
      </section>
    );
  }

  const alertas = sim.sensores
    .filter((s) => s.estado === "crit" || s.estado === "warn")
    .sort((a, b) => (a.estado === b.estado ? a.idx - b.idx : a.estado === "crit" ? -1 : 1))
    .slice(0, 8);
  const ahora = horaSimulada(sim);
  const totales = { ok: 0, warn: 0, crit: 0, off: 0 } as Record<Estado, number>;
  sim.sensores.forEach((s) => totales[s.estado]++);
  const zonaSel = zonaAccion;

  const irA = (obj: Objetivo) => {
    setSeleccion(obj);
    if (obj.tipo === "sensor") {
      const s = sim.sensores[obj.idx];
      const q = puntoCama(sim.camas[s.camaIdx], s.pos);
      enfocar(camRef.current, q.x, q.y);
    } else if (obj.tipo === "cama") {
      const q = centroCama(sim.camas[obj.idx]);
      enfocar(camRef.current, q.x, q.y);
    }
    sucioRef.current = true;
  };

  return (
    <section className="sim">
      <header className="sim-barra">
        <div className="sim-titulo">
          <strong>AgroGestor Ruscus · Simulador de finca</strong>
          <span>
            Día {diaSimulado(sim)} · {fecha(ahora)} · <b>{hora(ahora)}</b>
            {lloviendo(sim) && " · 🌧 Lluvia"}
            {olaDeCalor(sim) && " · 🔥 Ola de calor"}
          </span>
        </div>
        <div className="sim-controles">
          <button type="button" className="sim-btn sim-btn-fuerte" onClick={() => setCorriendo((v) => !v)} disabled={!!arranque}>
            {corriendo ? "Pausar" : "Reanudar"}
          </button>
          <div className="sim-segmento" role="group" aria-label="Velocidad">
            {VELOCIDADES.map((v) => (
              <button key={v.valor} type="button" title={v.ayuda} className={velocidad === v.valor ? "activo" : ""} onClick={() => setVelocidad(v.valor)}>
                {v.etiqueta}
              </button>
            ))}
          </div>
          <button type="button" className="sim-btn" onClick={() => accion(paso)} disabled={corriendo}>+15 min</button>
          <button type="button" className="sim-btn" onClick={vistaGeneral}>Vista general</button>
          <button type="button" className="sim-btn" onClick={() => zoomCentro(1 / 1.25)} aria-label="Alejar">−</button>
          <button type="button" className="sim-btn" onClick={() => zoomCentro(1.25)} aria-label="Acercar">+</button>
          <button
            type="button"
            className="sim-btn sim-btn-reiniciar"
            onClick={reiniciar}
            disabled={!!arranque}
            title="Vuelve al día 1 a las 06:00 sin focos ni historial (tecla R)"
          >
            <span aria-hidden="true">⟳</span> Reiniciar simulación
          </button>
        </div>
      </header>

      <div className="sim-escenarios">
        <label>
          Aplicar en
          <select value={zonaSel} onChange={(e) => setZonaAccion(e.target.value as ZonaAccion)}>
            <option value="todas">Toda la finca</option>
            {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => accion((s) => regar(s, zonaSel))}>💧 Regar 1 h</button>
        <button type="button" onClick={() => accion((s) => fertirriego(s, zonaSel, false))}>🌱 Fertirriego</button>
        <button type="button" onClick={() => accion((s) => fertirriego(s, zonaSel, true))}>⚠ Exceso de fertilizante</button>
        <span className="sim-sep" />
        <button type="button" onClick={() => accion((s) => iniciarLluvia(s, 6))}>🌧 Aguacero 6 h</button>
        <button type="button" onClick={() => accion((s) => iniciarOlaDeCalor(s, 12))}>🔥 Ola de calor 12 h</button>
        <span className="sim-sep" />
        <button type="button" onClick={() => accion(repararSondas)}>🔧 Reparar sondas</button>
        <button type="button" onClick={() => accion(tratarTodos)} disabled={!sim.focos.length}>🧪 Tratar todos los focos</button>
        <label className="sim-check">
          <input type="checkbox" checked={sim.riegoAuto} onChange={() => accion((s) => { s.riegoAuto = !s.riegoAuto; })} />
          Riego programado (06:00 y 14:00)
        </label>
        <label className="sim-check" title="Envía cada hora simulada el promedio de cada cama al endpoint /api/monitoreo/ingesta. Escribe lecturas reales en la base.">
          <input type="checkbox" checked={publicar} onChange={(e) => { setPublicar(e.target.checked); setAviso(null); }} />
          Publicar en la API{publicadosRef.current ? ` (${publicadosRef.current})` : ""}
        </label>
      </div>
      {aviso && <p className="sim-aviso" role="alert">{aviso}</p>}

      <div className="sim-cuerpo">
        <aside className="sim-lateral">
          <section className="sim-card">
            <h3>Sondas de la finca</h3>
            <p className="sim-muted">{sim.camas.length} camas × {POS_SENSORES.length} sondas · 5 variables c/u</p>
            <div className="sim-totales">
              {(["ok", "warn", "crit", "off"] as Estado[]).map((e) => (
                <div key={e}><Punto estado={e} /><strong>{totales[e]}</strong><span>{ETIQUETA_ESTADO[e]}</span></div>
              ))}
            </div>
            {!sim.fuenteReal && <p className="sim-muted">Sin conexión con la API: valores de referencia.</p>}
          </section>

          {ZONAS.map((z) => {
            const r = resumenZona(sim, z.id);
            return (
              <section key={z.id} className="sim-card sim-zona">
                <header>
                  <Punto estado={r.estado} />
                  <div>
                    <h3>{z.nombre}</h3>
                    <p className="sim-muted">{z.apodo} · {r.camas} camas · {r.sensores} sondas</p>
                  </div>
                </header>
                <ul className="sim-kv">
                  <li><span>Temperatura</span><strong>{formato(r.t, 1)} °C</strong></li>
                  <li><span>Humedad relativa</span><strong>{formato(r.hr, 0)} %</strong></li>
                  <li><span>Humedad del suelo</span><strong>{formato(r.suelo, 0)} %</strong></li>
                  <li><span>CE</span><strong>{formato(r.ce, 2)} dS/m</strong></li>
                </ul>
                <p className="sim-chips">
                  <span style={{ color: COLOR.warn }}>{r.warn} alerta</span>
                  <span style={{ color: COLOR.crit }}>{r.crit} críticas</span>
                  <span style={{ color: COLOR.off }}>{r.off} sin señal</span>
                  <span style={{ color: "#b3261e" }}>{r.focos} focos</span>
                </p>
              </section>
            );
          })}

          <section className="sim-card">
            <h3>Sondas en alerta</h3>
            {alertas.length === 0 ? <p className="sim-muted">Todas las sondas dentro de rango.</p> : (
              <ul className="sim-alertas">
                {alertas.map((s) => {
                  const malas = VARIABLES.filter((v) => s.estados[v.key] === "crit" || s.estados[v.key] === "warn");
                  return (
                    <li key={s.idx}>
                      <button type="button" onClick={() => irA({ tipo: "sensor", idx: s.idx })}>
                        <Punto estado={s.estado} />
                        <span><b>{s.codigo}</b> {malas.map((v) => `${v.corta} ${formato(s.valores[v.key], v.dec)}`).join(" · ")}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="sim-card">
            <h3>Bitácora</h3>
            <ul className="sim-bitacora">
              {sim.eventos.slice(0, 12).map((e, i) => (
                <li key={`${e.minuto}-${i}`}>
                  <Punto estado={e.nivel} />
                  <span><b>{hora(new Date(sim.inicio + e.minuto * 60_000))}</b> {e.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className={`sim-mundo${arranque ? " sim-mundo-arrancando" : ""}`} ref={envolturaRef}>
          <canvas ref={canvasRef} aria-label="Plano interactivo de invernaderos, camas y sondas" />
          <div className="sim-leyenda">
            {(["ok", "warn", "crit", "off"] as Estado[]).map((e) => <span key={e}><Punto estado={e} /> {ETIQUETA_ESTADO[e]}</span>)}
            <span><i className="sim-foco" /> Planta enferma</span>
            <span className="sim-muted">Rueda: zoom · arrastrar: mover · acércate para ver cada sonda</span>
          </div>
          {arranque && <PantallaArranque sim={sim} arranque={arranque} />}
          {seleccion && !arranque && <Ficha sim={sim} obj={seleccion} cerrar={() => setSeleccion(null)} ir={irA} refrescar={refrescar} />}
        </div>
      </div>
    </section>
  );
}

function PantallaArranque({ sim, arranque }: { sim: Sim; arranque: Arranque }) {
  const total = sim.sensores.length;
  const listo = arranque.t > DURACION_ESCANEO;
  const encendidas = listo ? total : sondasEncendidas(sim, arranque.progreso);
  const x = xEscaneo(arranque.progreso);
  const ahora = horaSimulada(sim);
  return (
    <div className={`sim-arranque${listo ? " sim-arranque-listo" : ""}`} aria-live="polite">
      {!listo ? (
        <div className="sim-arranque-panel">
          <span className="sim-arranque-eyebrow">Gemelo digital · AgroGestor Ruscus</span>
          <strong>{arranque.reinicio ? "Reiniciando simulación" : "Iniciando simulación"}</strong>
          <div className="sim-arranque-barra"><i style={{ width: `${(encendidas / total) * 100}%` }} /></div>
          <p>
            Conectando sondas <b>{encendidas}</b> / {total}
          </p>
          <ul>
            {ZONAS.map((z) => {
              const ok = x >= z.cx + CAMA.largo / 2 - 1.25; // última sonda de la cama
              return (
                <li key={z.id} className={ok ? "ok" : ""}>
                  <span>{ok ? "✓" : "…"}</span> {z.nombre} · {z.camas * 10} sondas
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="sim-arranque-go">
          <span className="sim-arranque-play">▶</span>
          <strong>Simulación en marcha</strong>
          <p>
            Día {diaSimulado(sim)} · {hora(ahora)} · {total} sondas en línea
          </p>
        </div>
      )}
    </div>
  );
}

function Ficha({ sim, obj, cerrar, ir, refrescar }: {
  sim: Sim;
  obj: Objetivo;
  cerrar: () => void;
  ir: (o: Objetivo) => void;
  refrescar: () => void;
}) {
  if (obj.tipo === "foco") {
    const f = sim.focos.find((x) => x.id === obj.id);
    if (!f) return null;
    const c = sim.camas[f.camaIdx];
    const sev: Estado = f.severidad > 60 ? "crit" : f.severidad > 30 ? "warn" : "ok";
    const vecinas = sim.camas.filter((x) => x.zona === c.zona && Math.abs(x.slot - c.slot) === 1).map((x) => x.codigo);
    const riesgo = promedioCama(sim, c, "humedad_relativa") > 88 || f.severidad > 60 ? "Alto" : f.severidad > 30 ? "Medio" : "Bajo";
    return (
      <aside className="sim-ficha sim-ficha-foco">
        <header><strong>Planta enferma {f.codigo}</strong><button type="button" onClick={cerrar} aria-label="Cerrar">✕</button></header>
        <p className="sim-meta">Cama {c.codigo} · {ZONAS[c.zonaIdx].nombre} · Posición {formato(f.pos, 1)} m</p>
        <table>
          <tbody>
            <tr><td>Enfermedad / plaga</td><td className="val">{f.nombre}<br /><small>{f.tipo === "plaga" ? "Plaga" : "Enfermedad"}{f.real ? " · incidencia registrada en Calidad" : " · detectada en la simulación"}</small></td></tr>
            <tr><td>Severidad</td><td className="val"><Punto estado={sev} /> {Math.round(f.severidad)} / 100</td></tr>
            <tr><td>Días de infección</td><td className="val">{f.dias}</td></tr>
            <tr><td>Riesgo de contagio</td><td className="val">{riesgo}<br /><small>Vecinas: {vecinas.join(", ") || "—"}</small></td></tr>
          </tbody>
        </table>
        <button type="button" className="sim-btn-accion" onClick={() => { tratarFoco(sim, f.id); cerrar(); refrescar(); }}>Aplicar tratamiento</button>
        <button type="button" className="sim-btn-secundario" onClick={() => ir({ tipo: "cama", idx: c.idx })}>Ver cama {c.codigo}</button>
      </aside>
    );
  }

  if (obj.tipo === "sensor") {
    const s = sim.sensores[obj.idx];
    const c = sim.camas[s.camaIdx];
    const off = s.estado === "off";
    return (
      <aside className="sim-ficha">
        <header><strong>Sensor {s.codigo}</strong><button type="button" onClick={cerrar} aria-label="Cerrar">✕</button></header>
        <p className="sim-meta">Cama {c.codigo} · {ZONAS[c.zonaIdx].nombre} · Posición {formato(s.pos, 2)} m · Nodo {c.nodo}</p>
        <p className="sim-meta">Estado: <Punto estado={s.estado} /> {off ? (c.nodoOffline ? "Sin señal (nodo offline)" : "Sin señal (sonda)") : s.estado === "ok" ? "Activo" : ETIQUETA_ESTADO[s.estado]}</p>
        <table>
          <tbody>
            {VARIABLES.map((v) => {
              const r = sim.umbrales[v.key];
              return (
                <tr key={v.key}>
                  <td>
                    {v.etiqueta}
                    <br /><small>Óptimo: {formato(r.min_alerta, v.dec)} – {formato(r.max_alerta, v.dec)} {v.unidad}</small>
                    <Sparkline datos={s.hist[v.key]} rango={r} />
                  </td>
                  <td className="val">{off ? "—" : `${formato(s.valores[v.key], v.dec)} ${v.unidad}`}</td>
                  <td><Punto estado={s.estados[v.key]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="sim-nav">
          <button type="button" disabled={s.orden === 0} onClick={() => ir({ tipo: "sensor", idx: s.idx - 1 })}>← Anterior</button>
          <button type="button" onClick={() => ir({ tipo: "cama", idx: c.idx })}>Cama {c.codigo}</button>
          <button type="button" disabled={s.orden === POS_SENSORES.length - 1} onClick={() => ir({ tipo: "sensor", idx: s.idx + 1 })}>Siguiente →</button>
        </div>
        <small className="sim-muted">Historial de las últimas 12 h simuladas · banda verde = rango óptimo</small>
      </aside>
    );
  }

  const c = sim.camas[obj.idx];
  const focos = sim.focos.filter((f) => f.camaIdx === c.idx);
  return (
    <aside className="sim-ficha">
      <header><strong>Cama {c.codigo}</strong><button type="button" onClick={cerrar} aria-label="Cerrar">✕</button></header>
      <p className="sim-meta">{ZONAS[c.zonaIdx].nombre} · 25 m × 1,2 m · Estado: {c.estadoCama.replace("_", " ")}</p>
      <p className="sim-meta">Nodo {c.nodo} · firmware {c.firmware} · {c.nodoOffline ? "offline" : "en línea"}{c.riego > 0 ? " · regando" : ""}</p>
      <table className="sim-matriz">
        <thead>
          <tr><th>Sonda</th>{VARIABLES.map((v) => <th key={v.key}>{v.corta}</th>)}</tr>
        </thead>
        <tbody>
          {c.sensores.map((i) => {
            const s = sim.sensores[i];
            return (
              <tr key={i} onClick={() => ir({ tipo: "sensor", idx: i })}>
                <td><Punto estado={s.estado} /> {s.orden + 1} <small>({formato(s.pos, 1)} m)</small></td>
                {VARIABLES.map((v) => (
                  <td key={v.key} className={`sim-celda sim-${s.estados[v.key]}`}>
                    {s.estado === "off" ? "—" : formato(s.valores[v.key], v.dec)}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="sim-promedio">
            <td>Promedio</td>
            {VARIABLES.map((v) => <td key={v.key}>{formato(promedioCama(sim, c, v.key), v.dec)}</td>)}
          </tr>
        </tbody>
      </table>
      {focos.length > 0 && <p className="sim-meta" style={{ color: "#b3261e" }}>{focos.length} focos: {[...new Set(focos.map((f) => f.nombre.split(" (")[0]))].join(", ")}</p>}
      <div className="sim-nav">
        <button type="button" onClick={() => { c.riego = 4; refrescar(); }}>💧 Regar esta cama</button>
        <button type="button" onClick={() => { alternarFallaRiego(sim, c); refrescar(); }}>
          {c.fallaRiego ? "🔧 Reparar riego" : "⚠ Simular falla de riego"}
        </button>
      </div>
      <small className="sim-muted">Clic en una sonda para ver su ficha. Tick = {MIN_POR_TICK} min simulados.</small>
    </aside>
  );
}
