import {
  BODEGA,
  CAMA,
  CAMINO,
  COLOR,
  MUNDO,
  POSCOSECHA,
  QUEBRADA,
  RESERVORIO,
  ZONAS,
  ZOOM_SENSORES,
  altoInvernadero,
  anchoInvernadero,
} from "./config";
import { lloviendo, type Cama, type Sim } from "./motor";

export interface Camara { x: number; y: number; zoom: number; min: number; max: number }
export interface Vista { w: number; h: number }
export type Objetivo =
  | { tipo: "sensor"; idx: number }
  | { tipo: "cama"; idx: number }
  | { tipo: "foco"; id: number };

export const MINIMAPA = { w: 170, margen: 12 };

export function ajustar(cam: Camara, vista: Vista) {
  cam.zoom = Math.min(vista.w / MUNDO.ancho, vista.h / MUNDO.alto) * 0.94;
  cam.min = cam.zoom * 0.7;
  cam.max = 32;
  cam.x = MUNDO.ancho / 2;
  cam.y = MUNDO.alto / 2;
}

export const pantallaAMundo = (cam: Camara, vista: Vista, sx: number, sy: number) => ({
  x: (sx - vista.w / 2) / cam.zoom + cam.x,
  y: (sy - vista.h / 2) / cam.zoom + cam.y,
});

export const mundoAPantalla = (cam: Camara, vista: Vista, wx: number, wy: number) => ({
  x: (wx - cam.x) * cam.zoom + vista.w / 2,
  y: (wy - cam.y) * cam.zoom + vista.h / 2,
});

function limitarCamara(cam: Camara) {
  cam.x = Math.min(Math.max(cam.x, 0), MUNDO.ancho);
  cam.y = Math.min(Math.max(cam.y, 0), MUNDO.alto);
}

export function zoomEn(cam: Camara, vista: Vista, sx: number, sy: number, factor: number) {
  const antes = pantallaAMundo(cam, vista, sx, sy);
  cam.zoom = Math.min(Math.max(cam.zoom * factor, cam.min), cam.max);
  const despues = pantallaAMundo(cam, vista, sx, sy);
  cam.x += antes.x - despues.x;
  cam.y += antes.y - despues.y;
  limitarCamara(cam);
}

export function desplazar(cam: Camara, dx: number, dy: number) {
  cam.x -= dx / cam.zoom;
  cam.y -= dy / cam.zoom;
  limitarCamara(cam);
}

export function enfocar(cam: Camara, wx: number, wy: number, zoomMin = ZOOM_SENSORES * 2.2) {
  cam.x = wx;
  cam.y = wy;
  cam.zoom = Math.max(cam.zoom, zoomMin);
  limitarCamara(cam);
}

// ------------------------------------------------------------------ geometría de camas

const ANCHO_INV = anchoInvernadero();

export function centroCama(c: Cama) {
  const z = ZONAS[c.zonaIdx];
  const alto = altoInvernadero(z.camas);
  return { x: z.cx, y: z.cy - alto / 2 + CAMA.margenV + CAMA.paso * (c.slot + 0.5) };
}

export function puntoCama(c: Cama, metros: number) {
  const centro = centroCama(c);
  return { x: centro.x - CAMA.largo / 2 + metros, y: centro.y };
}

// ------------------------------------------------------------------ dibujo

const COLOR_CAMA: Record<string, string> = {
  sembrada: "#3f8f4a",
  cosechada: "#a7b46a",
  en_descanso: "#a0845c",
  disponible: "#b9b39d",
};

export interface Pintura {
  sim: Sim;
  cam: Camara;
  vista: Vista;
  dpr: number;
  hover: Objetivo | null;
  seleccion: Objetivo | null;
  /** 0..1 mientras corre la secuencia de arranque; null en operación normal. */
  arranque: number | null;
}

/** Posición x (m) de la línea de escaneo del arranque. */
export const xEscaneo = (progreso: number) => -4 + progreso * (MUNDO.ancho + 8);

/** Sondas ya "conectadas" por la línea de escaneo. */
export function sondasEncendidas(sim: Sim, progreso: number) {
  const x = xEscaneo(progreso);
  return sim.sensores.filter((s) => puntoCama(sim.camas[s.camaIdx], s.pos).x <= x).length;
}

const APAGADO = "#46524b";

export function dibujar(ctx: CanvasRenderingContext2D, p: Pintura) {
  const { sim, cam, vista, dpr } = p;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, vista.w * dpr, vista.h * dpr);
  ctx.fillStyle = "#eef3ea";
  ctx.fillRect(0, 0, vista.w * dpr, vista.h * dpr);
  const z = cam.zoom * dpr;
  ctx.setTransform(z, 0, 0, z, (vista.w * dpr) / 2 - cam.x * z, (vista.h * dpr) / 2 - cam.y * z);
  const px = 1 / cam.zoom;

  terreno(ctx, px, lloviendo(sim));
  invernaderos(ctx, p, px);
  if (cam.zoom >= ZOOM_SENSORES) sensores(ctx, p, px);
  else semaforos(ctx, p, px);
  focos(ctx, p, px);
  if (p.arranque !== null) escaneo(ctx, p.arranque, px);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  minimapa(ctx, p);
}

function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, px: number, tam = 11, peso = "") {
  ctx.fillStyle = "#1f2a1f";
  ctx.font = `${peso} ${tam * px}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(t, x, y);
}

function terreno(ctx: CanvasRenderingContext2D, px: number, lluvia: boolean) {
  ctx.fillStyle = "#d9e8c4";
  ctx.fillRect(0, 0, MUNDO.ancho, MUNDO.alto);
  ctx.strokeStyle = "rgba(31,58,43,0.12)";
  ctx.lineWidth = Math.max(0.04, px);
  ctx.beginPath();
  for (let x = 0; x <= MUNDO.ancho; x += 2.5) { ctx.moveTo(x, 0); ctx.lineTo(x, MUNDO.alto); }
  for (let y = 0; y <= MUNDO.alto; y += 2.5) { ctx.moveTo(0, y); ctx.lineTo(MUNDO.ancho, y); }
  ctx.stroke();

  // Quebrada
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#a88f62";
  ctx.lineWidth = lluvia ? 6.5 : 5.5;
  trazo(ctx);
  ctx.strokeStyle = lluvia ? "#2f7fc4" : "#3d8ed0";
  ctx.lineWidth = lluvia ? 5 : 3.6;
  trazo(ctx);

  // Camino
  ctx.fillStyle = "#c9b48a";
  ctx.fillRect(0, CAMINO.y, MUNDO.ancho, CAMINO.h);
  ctx.strokeStyle = "#a8946b";
  ctx.lineWidth = px;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, CAMINO.y + CAMINO.h / 2);
  ctx.lineTo(MUNDO.ancho, CAMINO.y + CAMINO.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Edificios
  for (const [b, muro, techo] of [[POSCOSECHA, "#dfe7ef", "#5e7f9b"], [BODEGA, "#d8b58a", "#b5651d"]] as const) {
    ctx.fillStyle = muro;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = techo;
    ctx.fillRect(b.x, b.y, b.w, b.h * 0.35);
    ctx.strokeStyle = "#3b2f22";
    ctx.lineWidth = 1.5 * px;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    texto(ctx, b.etiqueta, b.x + b.w / 2, b.y + b.h + 3 * px, px);
  }
  ctx.fillStyle = "#5aa3d6";
  ctx.strokeStyle = "#2b5f86";
  ctx.lineWidth = 1.5 * px;
  ctx.beginPath();
  ctx.arc(RESERVORIO.x, RESERVORIO.y, RESERVORIO.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  texto(ctx, RESERVORIO.etiqueta, RESERVORIO.x, RESERVORIO.y + RESERVORIO.r + 3 * px, px);

  ctx.strokeStyle = "#2f5d2a";
  ctx.lineWidth = 3 * px;
  ctx.strokeRect(0, 0, MUNDO.ancho, MUNDO.alto);
}

function trazo(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  QUEBRADA.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function esCama(o: Objetivo | null, idx: number) {
  return !!o && o.tipo === "cama" && o.idx === idx;
}

function invernaderos(ctx: CanvasRenderingContext2D, p: Pintura, px: number) {
  const { sim, cam } = p;
  for (const z of ZONAS) {
    const alto = altoInvernadero(z.camas);
    const x0 = z.cx - ANCHO_INV / 2;
    const y0 = z.cy - alto / 2;
    ctx.fillStyle = "rgba(233,243,226,0.95)";
    ctx.fillRect(x0, y0, ANCHO_INV, alto);
    ctx.strokeStyle = "rgba(75,107,79,0.25)";
    ctx.lineWidth = px;
    ctx.beginPath();
    for (let x = x0 + 5; x < x0 + ANCHO_INV; x += 5) { ctx.moveTo(x, y0); ctx.lineTo(x, y0 + alto); }
    ctx.stroke();
    ctx.strokeStyle = "#4b6b4f";
    ctx.lineWidth = 2 * px;
    ctx.strokeRect(x0, y0, ANCHO_INV, alto);
    ctx.fillStyle = "#1f3d2b";
    ctx.font = `bold ${13 * px}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${z.nombre} · ${z.apodo}`, z.cx, y0 - 4 * px);
  }

  const codigos = cam.zoom >= 5;
  for (const c of sim.camas) {
    const centro = centroCama(c);
    const x = centro.x - CAMA.largo / 2;
    const y = centro.y - CAMA.anchoVisual / 2;
    ctx.fillStyle = COLOR_CAMA[c.estadoCama] ?? COLOR_CAMA.sembrada;
    ctx.fillRect(x, y, CAMA.largo, CAMA.anchoVisual);
    if (c.fallaRiego) {
      ctx.fillStyle = "rgba(201,140,60,0.55)";
      ctx.fillRect(x + CAMA.largo / 2, y, CAMA.largo / 2, CAMA.anchoVisual);
    }
    if (c.riego > 0) {
      ctx.fillStyle = "rgba(70,150,220,0.35)";
      ctx.fillRect(x, y, c.fallaRiego ? CAMA.largo / 2 : CAMA.largo, CAMA.anchoVisual);
    }
    if (esCama(p.hover, c.idx) || esCama(p.seleccion, c.idx)) {
      ctx.strokeStyle = esCama(p.seleccion, c.idx) ? "#111" : "#fff";
      ctx.lineWidth = 2.5 * px;
      ctx.strokeRect(x, y, CAMA.largo, CAMA.anchoVisual);
    }
    // válvula de riego
    ctx.fillStyle = "#2b5f86";
    ctx.fillRect(x - 0.6, centro.y - 0.35, 0.6, 0.7);
    if (codigos) {
      ctx.fillStyle = "#1f2a1f";
      ctx.font = `${Math.min(1.6, 10 * px)}px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(c.codigo, x - 0.9, centro.y);
    }
  }
}

function semaforos(ctx: CanvasRenderingContext2D, p: Pintura, px: number) {
  const r = Math.max(0.9, 5.5 * px);
  const xs = p.arranque === null ? Number.POSITIVE_INFINITY : xEscaneo(p.arranque);
  for (const c of p.sim.camas) {
    const centro = centroCama(c);
    const encendida = centro.x <= xs;
    if (encendida && xs - centro.x < 6) destello(ctx, centro.x, centro.y, r * 2.8, 1 - (xs - centro.x) / 6);
    ctx.fillStyle = encendida ? COLOR[c.estado] : APAGADO;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    ctx.arc(centro.x, centro.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function sensores(ctx: CanvasRenderingContext2D, p: Pintura, px: number) {
  const r = Math.min(Math.max(4.2 * px, 0.25), 0.55);
  const xs = p.arranque === null ? Number.POSITIVE_INFINITY : xEscaneo(p.arranque);
  for (const s of p.sim.sensores) {
    const c = p.sim.camas[s.camaIdx];
    const q = puntoCama(c, s.pos);
    const encendida = q.x <= xs;
    if (encendida && xs - q.x < 4) destello(ctx, q.x, q.y, r * 3.2, 1 - (xs - q.x) / 4);
    const sel = p.seleccion?.tipo === "sensor" && p.seleccion.idx === s.idx;
    const hov = p.hover?.tipo === "sensor" && p.hover.idx === s.idx;
    // antena
    ctx.strokeStyle = "#1f2a1f";
    ctx.lineWidth = Math.max(px, r * 0.2);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y - r);
    ctx.lineTo(q.x, q.y - r * 2.3);
    ctx.stroke();
    ctx.fillStyle = !encendida ? APAGADO : s.estado === "ok" ? "rgba(255,255,255,0.92)" : COLOR[s.estado];
    ctx.strokeStyle = !encendida ? "#2c352f" : s.estado === "ok" ? COLOR.ok : "#fff";
    ctx.lineWidth = Math.max(px, r * 0.3);
    ctx.beginPath();
    ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (sel || hov) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * 1.9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function focos(ctx: CanvasRenderingContext2D, p: Pintura, px: number) {
  const r = Math.min(Math.max(3.2 * px, 0.22), 0.45);
  for (const f of p.sim.focos) {
    const c = p.sim.camas[f.camaIdx];
    const q = puntoCama(c, f.pos);
    const y = q.y + CAMA.anchoVisual * 0.22;
    ctx.fillStyle = f.severidad > 60 ? "#b3261e" : "#d64541";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = Math.max(px * 0.8, r * 0.3);
    ctx.beginPath();
    ctx.arc(q.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (p.seleccion?.tipo === "foco" && p.seleccion.id === f.id || p.hover?.tipo === "foco" && p.hover.id === f.id) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.arc(q.x, y, r * 2.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function destello(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, intensidad: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(170,255,200,${0.85 * intensidad})`);
  g.addColorStop(1, "rgba(170,255,200,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function escaneo(ctx: CanvasRenderingContext2D, progreso: number, px: number) {
  const x = xEscaneo(progreso);
  // Lo que aún no se ha conectado queda en penumbra
  ctx.fillStyle = "rgba(8,22,15,0.55)";
  ctx.fillRect(Math.max(0, x), 0, MUNDO.ancho - Math.max(0, x), MUNDO.alto);
  // Estela y línea de escaneo
  const estela = ctx.createLinearGradient(x - 14, 0, x, 0);
  estela.addColorStop(0, "rgba(111,255,170,0)");
  estela.addColorStop(1, "rgba(111,255,170,0.28)");
  ctx.fillStyle = estela;
  ctx.fillRect(x - 14, 0, 14, MUNDO.alto);
  ctx.strokeStyle = "rgba(150,255,190,0.95)";
  ctx.lineWidth = 3 * px;
  ctx.shadowColor = "rgba(111,255,170,0.9)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, MUNDO.alto);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function rectMinimapa(vista: Vista) {
  const w = MINIMAPA.w;
  const h = (w * MUNDO.alto) / MUNDO.ancho;
  return { x: vista.w - w - MINIMAPA.margen, y: vista.h - h - MINIMAPA.margen, w, h };
}

function minimapa(ctx: CanvasRenderingContext2D, p: Pintura) {
  const m = rectMinimapa(p.vista);
  const s = m.w / MUNDO.ancho;
  ctx.save();
  ctx.fillStyle = "#d9e8c4";
  ctx.strokeStyle = "#2f5d2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(m.x, m.y, m.w, m.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = "#4a90c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  QUEBRADA.forEach(([x, y], i) => (i ? ctx.lineTo(m.x + x * s, m.y + y * s) : ctx.moveTo(m.x + x * s, m.y + y * s)));
  ctx.stroke();
  for (const z of ZONAS) {
    const alto = altoInvernadero(z.camas);
    ctx.fillStyle = "#4b6b4f";
    ctx.fillRect(m.x + (z.cx - ANCHO_INV / 2) * s, m.y + (z.cy - alto / 2) * s, ANCHO_INV * s, alto * s);
  }
  for (const c of p.sim.camas) {
    if (c.estado === "ok") continue;
    const q = centroCama(c);
    ctx.fillStyle = COLOR[c.estado];
    ctx.beginPath();
    ctx.arc(m.x + q.x * s, m.y + q.y * s, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const vw = p.vista.w / p.cam.zoom;
  const vh = p.vista.h / p.cam.zoom;
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 2;
  ctx.strokeRect(m.x + (p.cam.x - vw / 2) * s, m.y + (p.cam.y - vh / 2) * s, vw * s, vh * s);
  ctx.restore();
}

// ------------------------------------------------------------------ selección

export function enMinimapa(vista: Vista, sx: number, sy: number) {
  const m = rectMinimapa(vista);
  if (sx < m.x || sx > m.x + m.w || sy < m.y || sy > m.y + m.h) return null;
  const s = m.w / MUNDO.ancho;
  return { x: (sx - m.x) / s, y: (sy - m.y) / s };
}

export function detectar(sim: Sim, cam: Camara, vista: Vista, sx: number, sy: number): Objetivo | null {
  if (enMinimapa(vista, sx, sy)) return null;
  let mejor: Objetivo | null = null;
  let d0 = 10;
  for (const f of sim.focos) {
    const q = puntoCama(sim.camas[f.camaIdx], f.pos);
    const s = mundoAPantalla(cam, vista, q.x, q.y + CAMA.anchoVisual * 0.22);
    const d = Math.hypot(s.x - sx, s.y - sy);
    if (d < d0) { d0 = d; mejor = { tipo: "foco", id: f.id }; }
  }
  if (mejor) return mejor;
  if (cam.zoom >= ZOOM_SENSORES) {
    d0 = 11;
    for (const s of sim.sensores) {
      const q = puntoCama(sim.camas[s.camaIdx], s.pos);
      const sc = mundoAPantalla(cam, vista, q.x, q.y);
      const d = Math.hypot(sc.x - sx, sc.y - sy);
      if (d < d0) { d0 = d; mejor = { tipo: "sensor", idx: s.idx }; }
    }
    if (mejor) return mejor;
  }
  const w = pantallaAMundo(cam, vista, sx, sy);
  for (const c of sim.camas) {
    const centro = centroCama(c);
    if (Math.abs(w.x - centro.x) <= CAMA.largo / 2 + 0.5 && Math.abs(w.y - centro.y) <= CAMA.paso / 2) {
      return { tipo: "cama", idx: c.idx };
    }
  }
  return null;
}
