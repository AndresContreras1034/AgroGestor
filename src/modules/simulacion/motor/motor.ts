import {
  CAMA,
  HISTORIAL,
  MIN_POR_TICK,
  POS_SENSORES,
  UMBRALES_DEFECTO,
  VARIABLES,
  ZONAS,
  type Estado,
  type Rango,
  type VarKey,
} from "./config";

// ------------------------------------------------------------------ datos de entrada (API)

export interface CamaApi { codigo: string; zona: string; numero: number; estado: string }
export interface NodoApi { cama_codigo: string; identificador: string; estado: string; firmware: string | null }
export interface LecturaApi {
  cama_codigo: string; leido_en: string; temperatura: number; humedad_relativa: number;
  humedad_suelo: number; ph: number; conductividad_electrica: number;
}
export interface UmbralApi extends Rango { variable: string }
export interface IncidenciaApi { cama_codigo: string; nombre: string; tipo: string; severidad: string; estado: string; detectada_en: string }

export interface DatosIniciales {
  camas: CamaApi[];
  nodos: NodoApi[];
  lecturas: LecturaApi[];
  umbrales: UmbralApi[];
  incidencias: IncidenciaApi[];
}

// ------------------------------------------------------------------ modelo

type Valores = Record<VarKey, number>;
type Estados = Record<VarKey, Estado>;

export interface Sensor {
  idx: number;
  codigo: string;
  camaIdx: number;
  orden: number;
  pos: number;
  sesgo: Valores;
  fallaHasta: number;
  valores: Valores;
  estados: Estados;
  estado: Estado;
  hist: Record<VarKey, number[]>;
}

export interface Foco {
  id: number;
  codigo: string;
  camaIdx: number;
  pos: number;
  nombre: string;
  tipo: string;
  severidad: number; // 0..100
  dias: number;
  real: boolean; // proviene de una incidencia abierta en la base
}

export interface Cama {
  idx: number;
  codigo: string;
  zona: "A" | "B" | "C";
  zonaIdx: number;
  slot: number;
  estadoCama: string;
  nodo: string;
  firmware: string;
  nodoOffline: boolean;
  sueloIni: number;
  sueloFin: number;
  ph: number;
  ce: number;
  pulsoCE: number;
  pulsoPH: number;
  offsetT: number;
  riego: number; // ticks de riego restantes
  fallaRiego: boolean;
  sensores: number[];
  estado: Estado;
}

export interface Evento { minuto: number; texto: string; nivel: Estado }

export interface Sim {
  inicio: number; // epoch ms de la hora simulada 0
  minuto: number;
  camas: Cama[];
  sensores: Sensor[];
  focos: Foco[];
  umbrales: Record<VarKey, Rango>;
  lluviaHasta: number;
  calorHasta: number;
  riegoAuto: boolean;
  eventos: Evento[];
  seq: number;
  rng: () => number;
  fuenteReal: boolean;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ruido = (rng: () => number) => rng() + rng() + rng() - 1.5;
const limitar = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export function estadoDe(valor: number, r: Rango): Estado {
  if (valor >= r.min_alerta && valor <= r.max_alerta) return "ok";
  if (valor >= r.min_critico && valor <= r.max_critico) return "warn";
  return "crit";
}

const RANGO: Record<Estado, number> = { off: -1, ok: 0, warn: 1, crit: 2 };
export const peor = (a: Estado, b: Estado): Estado => (RANGO[a] >= RANGO[b] ? a : b);

const SEVERIDAD: Record<string, number> = { baja: 22, media: 45, alta: 68, critica: 85 };

/** `desdeCero`: día 1 a las 06:00, sin focos heredados ni historial. */
export function crearSim(datos: Partial<DatosIniciales>, fuenteReal: boolean, desdeCero = false): Sim {
  const rng = mulberry32(20260414);
  const umbrales = { ...UMBRALES_DEFECTO };
  for (const u of datos.umbrales ?? []) {
    if (u.variable in umbrales) umbrales[u.variable as VarKey] = u;
  }

  const ultima = new Map<string, LecturaApi>();
  for (const l of datos.lecturas ?? []) {
    const previa = ultima.get(l.cama_codigo);
    if (!previa || previa.leido_en < l.leido_en) ultima.set(l.cama_codigo, l);
  }
  const tMedia = ultima.size
    ? [...ultima.values()].reduce((s, l) => s + l.temperatura, 0) / ultima.size
    : 18;

  const camas: Cama[] = [];
  const sensores: Sensor[] = [];
  ZONAS.forEach((zona, zonaIdx) => {
    for (let slot = 0; slot < zona.camas; slot++) {
      const codigo = `${zona.id}-${String(slot + 1).padStart(2, "0")}`;
      const api = datos.camas?.find((c) => c.codigo === codigo);
      const nodo = datos.nodos?.find((n) => n.cama_codigo === codigo);
      const l = ultima.get(codigo);
      const cama: Cama = {
        idx: camas.length,
        codigo,
        zona: zona.id,
        zonaIdx,
        slot,
        estadoCama: api?.estado ?? "sembrada",
        nodo: nodo?.identificador ?? `ESP32-${codigo}`,
        firmware: nodo?.firmware ?? "1.6.1",
        nodoOffline: nodo?.estado === "offline",
        sueloIni: l ? limitar(l.humedad_suelo + 3, 25, 75) : 50 + ruido(rng) * 6,
        sueloFin: l ? limitar(l.humedad_suelo - 3, 22, 72) : 46 + ruido(rng) * 6,
        ph: l ? l.ph : 6.2 + ruido(rng) * 0.15 - (zona.id === "C" ? 0.2 : 0),
        ce: l ? limitar(l.conductividad_electrica - 0.1, 0.7, 1.8) : 1.1 + ruido(rng) * 0.1,
        pulsoCE: 0,
        pulsoPH: 0,
        offsetT: zona.offsetT + (l ? limitar((l.temperatura - tMedia) * 0.4, -1.2, 1.2) : ruido(rng) * 0.4),
        riego: 0,
        fallaRiego: false,
        sensores: [],
        estado: "ok",
      };
      camas.push(cama);
      POS_SENSORES.forEach((pos, orden) => {
        const sesgo = {} as Valores;
        sesgo.temperatura = ruido(rng) * 0.35;
        sesgo.humedad_relativa = ruido(rng) * 1.8;
        sesgo.humedad_suelo = ruido(rng) * 2.5;
        sesgo.ph = ruido(rng) * 0.08;
        sesgo.conductividad_electrica = ruido(rng) * 0.06;
        const hist = {} as Record<VarKey, number[]>;
        for (const v of VARIABLES) hist[v.key] = [];
        const s: Sensor = {
          idx: sensores.length,
          codigo: `S-${zona.id}${String(slot + 1).padStart(2, "0")}-${String(orden + 1).padStart(2, "0")}`,
          camaIdx: cama.idx,
          orden,
          pos,
          sesgo,
          fallaHasta: rng() < 0.012 ? Number.POSITIVE_INFINITY : 0,
          valores: {} as Valores,
          estados: {} as Estados,
          estado: "ok",
          hist,
        };
        cama.sensores.push(s.idx);
        sensores.push(s);
      });
    }
  });

  const ahora = new Date();
  if (desdeCero) ahora.setHours(6, 0, 0, 0);
  else ahora.setMinutes(Math.floor(ahora.getMinutes() / 15) * 15, 0, 0);
  const sim: Sim = {
    inicio: ahora.getTime(),
    minuto: 0,
    camas,
    sensores,
    focos: [],
    umbrales,
    lluviaHasta: 0,
    calorHasta: 0,
    riegoAuto: true,
    eventos: [],
    seq: 1,
    rng,
    fuenteReal,
  };

  for (const inc of desdeCero ? [] : datos.incidencias ?? []) {
    if (inc.estado === "resuelta") continue;
    const cama = camas.find((c) => c.codigo === inc.cama_codigo);
    if (!cama) continue;
    const n = inc.severidad === "alta" || inc.severidad === "critica" ? 3 : 2;
    for (let i = 0; i < n; i++) {
      crearFoco(sim, cama, inc.nombre, inc.tipo, (SEVERIDAD[inc.severidad] ?? 30) + ruido(rng) * 8, true,
        Math.max(1, Math.round((Date.now() - Date.parse(inc.detectada_en)) / 86_400_000)));
    }
  }

  for (let i = 0; i < (desdeCero ? 1 : 8); i++) medir(sim); // historial inicial
  if (desdeCero) {
    registrar(sim, `Simulación reiniciada desde cero: día 1, 06:00. ${sensores.length} sondas en ${camas.length} camas, sin focos ni historial.`, "ok");
    return sim;
  }
  registrar(sim, fuenteReal
    ? `Gemelo digital iniciado con datos de la base: ${ultima.size} camas con lectura reciente y ${sim.focos.length} focos activos.`
    : "Simulación iniciada sin conexión con la API: se usan valores de referencia.", "ok");
  return sim;
}

function crearFoco(sim: Sim, cama: Cama, nombre: string, tipo: string, severidad: number, real: boolean, dias = 0) {
  const pos = 1 + sim.rng() * (CAMA.largo - 2);
  sim.focos.push({
    id: sim.seq,
    codigo: `T-${cama.codigo.replace("-", "")}-${String(sim.focos.filter((f) => f.camaIdx === cama.idx).length + 1).padStart(2, "0")}`,
    camaIdx: cama.idx,
    pos,
    nombre,
    tipo,
    severidad: limitar(severidad, 5, 100),
    dias,
    real,
  });
  sim.seq++;
}

export function registrar(sim: Sim, texto: string, nivel: Estado) {
  sim.eventos.unshift({ minuto: sim.minuto, texto, nivel });
  if (sim.eventos.length > 60) sim.eventos.pop();
}

export function diaSimulado(sim: Sim) {
  return Math.floor(sim.minuto / 1440) + 1;
}

export function horaSimulada(sim: Sim) {
  return new Date(sim.inicio + sim.minuto * 60_000);
}

function horaDelDia(sim: Sim) {
  const d = horaSimulada(sim);
  return d.getHours() + d.getMinutes() / 60;
}

export const lloviendo = (sim: Sim) => sim.minuto < sim.lluviaHasta;
export const olaDeCalor = (sim: Sim) => sim.minuto < sim.calorHasta;

/** Avanza 15 minutos simulados. */
export function paso(sim: Sim) {
  sim.minuto += MIN_POR_TICK;
  const h = horaDelDia(sim);
  const dt = MIN_POR_TICK / 60;
  const lluvia = lloviendo(sim) ? 1 : 0;
  const calor = olaDeCalor(sim) ? 1 : 0;
  const diurno = Math.sin((2 * Math.PI * (h - 9)) / 24);

  for (const c of sim.camas) {
    const activa = c.estadoCama === "sembrada" ? 1 : 0.55;
    const tAire = 18.2 + c.offsetT + (5 - 2 * lluvia) * diurno + calor * (4 + 4 * Math.max(0, diurno));
    const evap = (0.32 + 0.09 * Math.max(0, tAire - 17)) * activa * (1 + 0.8 * calor) * (1 - 0.7 * lluvia);
    c.sueloIni -= evap * dt;
    c.sueloFin -= evap * dt * 1.08;
    if (lluvia) {
      c.sueloIni += 1.4 * dt;
      c.sueloFin += 1.4 * dt;
    }
    if (c.riego > 0) {
      c.riego--;
      c.sueloIni += 5.5;
      if (!c.fallaRiego) c.sueloFin += 5;
    }
    c.sueloIni = limitar(c.sueloIni, 8, 92);
    c.sueloFin = limitar(c.sueloFin, 8, 92);
    c.pulsoCE *= Math.exp(-dt / 14);
    c.pulsoPH *= Math.exp(-dt / 30);
  }

  // Riego programado 06:00 y 14:00
  const minDia = Math.round(h * 60);
  if (sim.riegoAuto && (minDia === 360 || minDia === 840)) {
    const regadas = sim.camas.filter((c) => (c.sueloIni + c.sueloFin) / 2 < 55 && c.riego === 0);
    regadas.forEach((c) => (c.riego = 4));
    if (regadas.length) registrar(sim, `Riego programado: ${regadas.length} camas con humedad de suelo < 55 %.`, "ok");
  }

  // Fallas aleatorias de sondas
  for (const s of sim.sensores) {
    if (s.fallaHasta !== Number.POSITIVE_INFINITY && s.fallaHasta <= sim.minuto && sim.rng() < 0.00035) {
      s.fallaHasta = sim.minuto + (2 + Math.floor(sim.rng() * 10)) * 60;
      registrar(sim, `La sonda ${s.codigo} dejó de transmitir.`, "off");
    }
  }

  // Focos: progresan con humedad alta, aparecen con HR > 92 % sostenida
  for (const f of sim.focos) {
    const c = sim.camas[f.camaIdx];
    const hr = promedioCama(sim, c, "humedad_relativa");
    f.severidad = limitar(f.severidad + (hr > 88 ? 0.35 : 0.05) * (f.tipo === "plaga" && calor ? 3 : 1), 0, 100);
    if (minDia === 0) f.dias++;
  }
  if (minDia % 60 === 0) {
    for (const c of sim.camas) {
      const hr = promedioCama(sim, c, "humedad_relativa");
      const vecinoEnfermo = sim.focos.some((f) => Math.abs(sim.camas[f.camaIdx].idx - c.idx) === 1 && sim.camas[f.camaIdx].zona === c.zona && f.severidad > 55);
      const p = (hr > 92 ? 0.012 : 0) + (calor ? 0.004 : 0) + (vecinoEnfermo ? 0.006 : 0);
      if (c.estadoCama === "sembrada" && sim.rng() < p) {
        const [nombre, tipo] = calor
          ? ["Ácaro rojo (Tetranychus urticae)", "plaga"]
          : hr > 92
            ? ["Moho gris (Botrytis cinerea)", "enfermedad"]
            : ["Trips (Frankliniella occidentalis)", "plaga"];
        crearFoco(sim, c, nombre, tipo, 10 + sim.rng() * 10, false);
        registrar(sim, `Nuevo foco de ${nombre.split(" (")[0].toLowerCase()} en la cama ${c.codigo}.`, "warn");
      }
    }
  }

  medir(sim);
}

function medir(sim: Sim) {
  const h = horaDelDia(sim);
  const lluvia = lloviendo(sim) ? 1 : 0;
  const calor = olaDeCalor(sim) ? 1 : 0;
  const diurno = Math.sin((2 * Math.PI * (h - 9)) / 24);
  const r = sim.rng;

  for (const c of sim.camas) {
    let estadoCama: Estado = "ok";
    let activos = 0;
    for (const i of c.sensores) {
      const s = sim.sensores[i];
      const t = s.pos / CAMA.largo;
      const v = s.valores;
      v.temperatura = 18.2 + c.offsetT + (5 - 2 * lluvia) * diurno + calor * (4 + 4 * Math.max(0, diurno))
        + 0.6 * (t - 0.5) + s.sesgo.temperatura + ruido(r) * 0.25;
      v.humedad_relativa = limitar(78 + 14 * lluvia - (13 - 5 * lluvia) * diurno - 14 * calor
        + s.sesgo.humedad_relativa + ruido(r) * 1.2, 30, 99.5);
      v.humedad_suelo = limitar(c.sueloIni + (c.sueloFin - c.sueloIni) * t + s.sesgo.humedad_suelo + ruido(r) * 0.6, 5, 98);
      v.ph = c.ph - c.pulsoPH + s.sesgo.ph + ruido(r) * 0.02;
      v.conductividad_electrica = Math.max(0.05, c.ce + c.pulsoCE + (50 - v.humedad_suelo) * 0.006
        + s.sesgo.conductividad_electrica + ruido(r) * 0.03);

      const offline = c.nodoOffline || s.fallaHasta > sim.minuto;
      let estado: Estado = "ok";
      for (const def of VARIABLES) {
        const e = estadoDe(v[def.key], sim.umbrales[def.key]);
        s.estados[def.key] = offline ? "off" : e;
        if (!offline) estado = peor(estado, e);
        const hist = s.hist[def.key];
        hist.push(offline ? Number.NaN : v[def.key]);
        if (hist.length > HISTORIAL) hist.shift();
      }
      const anterior = s.estado;
      s.estado = offline ? "off" : estado;
      if (s.estado === "crit" && anterior !== "crit" && anterior !== undefined && sim.minuto > 0) {
        const malas = VARIABLES.filter((d) => s.estados[d.key] === "crit").map((d) => d.corta).join(", ");
        registrar(sim, `Sonda ${s.codigo} (cama ${c.codigo}) en estado crítico: ${malas}.`, "crit");
      }
      if (!offline) {
        activos++;
        estadoCama = peor(estadoCama, s.estado);
      }
    }
    c.estado = activos === 0 ? "off" : estadoCama;
  }
}

export function promedioCama(sim: Sim, c: Cama, key: VarKey) {
  let suma = 0;
  let n = 0;
  for (const i of c.sensores) {
    const s = sim.sensores[i];
    if (s.estado === "off" || s.valores[key] === undefined) continue;
    suma += s.valores[key];
    n++;
  }
  return n ? suma / n : Number.NaN;
}

export function resumenZona(sim: Sim, zona: string) {
  const camas = sim.camas.filter((c) => c.zona === zona);
  const sensores = camas.flatMap((c) => c.sensores.map((i) => sim.sensores[i]));
  const vivos = sensores.filter((s) => s.estado !== "off");
  const prom = (k: VarKey) => (vivos.length ? vivos.reduce((a, s) => a + s.valores[k], 0) / vivos.length : Number.NaN);
  return {
    camas: camas.length,
    sensores: sensores.length,
    ok: sensores.filter((s) => s.estado === "ok").length,
    warn: sensores.filter((s) => s.estado === "warn").length,
    crit: sensores.filter((s) => s.estado === "crit").length,
    off: sensores.filter((s) => s.estado === "off").length,
    focos: sim.focos.filter((f) => sim.camas[f.camaIdx].zona === zona).length,
    estado: camas.reduce<Estado>((e, c) => (c.estado === "off" ? e : peor(e, c.estado)), "ok"),
    t: prom("temperatura"),
    hr: prom("humedad_relativa"),
    suelo: prom("humedad_suelo"),
    ce: prom("conductividad_electrica"),
  };
}

// ------------------------------------------------------------------ acciones del operador

const camasDe = (sim: Sim, zona: string | "todas") =>
  sim.camas.filter((c) => zona === "todas" || c.zona === zona);

export function regar(sim: Sim, zona: string | "todas") {
  const cs = camasDe(sim, zona);
  cs.forEach((c) => (c.riego = 4));
  registrar(sim, `Riego manual de 1 h en ${zona === "todas" ? "toda la finca" : `el invernadero ${zona}`} (${cs.length} camas).`, "ok");
}

export function fertirriego(sim: Sim, zona: string | "todas", exceso: boolean) {
  const cs = camasDe(sim, zona);
  cs.forEach((c) => {
    c.pulsoCE += exceso ? 1.6 : 0.45;
    c.pulsoPH += exceso ? 0.35 : 0.1;
    c.riego = Math.max(c.riego, 2);
  });
  registrar(
    sim,
    exceso
      ? `Exceso de fertilizante en ${zona === "todas" ? "toda la finca" : `el invernadero ${zona}`}: la CE subirá por encima del umbral.`
      : `Fertirriego 15-15-15 aplicado en ${zona === "todas" ? "toda la finca" : `el invernadero ${zona}`}.`,
    exceso ? "warn" : "ok",
  );
}

export function iniciarLluvia(sim: Sim, horas: number) {
  sim.lluviaHasta = sim.minuto + horas * 60;
  registrar(sim, `Comienza un aguacero de ${horas} h: sube la humedad relativa y la del suelo.`, "warn");
}

export function iniciarOlaDeCalor(sim: Sim, horas: number) {
  sim.calorHasta = sim.minuto + horas * 60;
  registrar(sim, `Ola de calor de ${horas} h: máximas sobre 28 °C y suelo secándose más rápido.`, "warn");
}

export function alternarFallaRiego(sim: Sim, cama: Cama) {
  cama.fallaRiego = !cama.fallaRiego;
  registrar(
    sim,
    cama.fallaRiego
      ? `Microaspersor obstruido en la cama ${cama.codigo}: el tramo final deja de recibir agua.`
      : `Se reparó el riego de la cama ${cama.codigo}.`,
    cama.fallaRiego ? "warn" : "ok",
  );
}

export function repararSondas(sim: Sim) {
  let n = 0;
  for (const s of sim.sensores) {
    if (s.fallaHasta > sim.minuto) {
      s.fallaHasta = 0;
      n++;
    }
  }
  registrar(sim, n ? `Mantenimiento: ${n} sondas reemplazadas o reconectadas.` : "Mantenimiento: todas las sondas estaban transmitiendo.", "ok");
  medir(sim);
}

export function tratarFoco(sim: Sim, id: number) {
  const f = sim.focos.find((x) => x.id === id);
  if (!f) return;
  sim.focos = sim.focos.filter((x) => x.id !== id);
  registrar(sim, `Tratamiento aplicado al foco ${f.codigo} (${f.nombre.split(" (")[0]}).`, "ok");
}

export function tratarTodos(sim: Sim) {
  const n = sim.focos.length;
  sim.focos = [];
  registrar(sim, n ? `Aplicación MIPE general: ${n} focos controlados.` : "No había focos activos.", "ok");
}

export function promedioNodo(sim: Sim, c: Cama) {
  const out = {} as Record<VarKey, number>;
  for (const d of VARIABLES) out[d.key] = promedioCama(sim, c, d.key);
  return out;
}
