export type VarKey = "temperatura" | "humedad_relativa" | "humedad_suelo" | "ph" | "conductividad_electrica";
export type Estado = "ok" | "warn" | "crit" | "off";

export interface VarDef {
  key: VarKey;
  etiqueta: string;
  corta: string;
  unidad: string;
  dec: number;
}

export const VARIABLES: VarDef[] = [
  { key: "temperatura", etiqueta: "Temperatura del aire", corta: "T", unidad: "°C", dec: 1 },
  { key: "humedad_relativa", etiqueta: "Humedad relativa", corta: "HR", unidad: "%", dec: 0 },
  { key: "humedad_suelo", etiqueta: "Humedad del suelo", corta: "Suelo", unidad: "%", dec: 0 },
  { key: "ph", etiqueta: "pH del suelo", corta: "pH", unidad: "", dec: 2 },
  { key: "conductividad_electrica", etiqueta: "Conductividad eléctrica", corta: "CE", unidad: "dS/m", dec: 2 },
];

export interface Rango {
  unidad: string;
  min_alerta: number;
  max_alerta: number;
  min_critico: number;
  max_critico: number;
}

/** Iguales a la semilla de la migración 0118; se reemplazan por los de la API si responde. */
export const UMBRALES_DEFECTO: Record<VarKey, Rango> = {
  temperatura: { unidad: "°C", min_alerta: 8, max_alerta: 28, min_critico: 5, max_critico: 32 },
  humedad_relativa: { unidad: "%", min_alerta: 55, max_alerta: 90, min_critico: 40, max_critico: 95 },
  humedad_suelo: { unidad: "%", min_alerta: 30, max_alerta: 70, min_critico: 20, max_critico: 80 },
  ph: { unidad: "pH", min_alerta: 5.5, max_alerta: 7.0, min_critico: 5.0, max_critico: 7.5 },
  conductividad_electrica: { unidad: "dS/m", min_alerta: 0.5, max_alerta: 2.0, min_critico: 0.2, max_critico: 3.0 },
};

/** Geometría en metros. Cama de 25 m × 1,2 m = 30 m². */
export const CAMA = {
  largo: 25,
  ancho: 1.2,
  anchoVisual: 2.2,
  paso: 4,
  margenU: 3,
  margenV: 2.2,
};

/** 10 sondas por cama: una cada 2,5 m desde la válvula de riego. */
export const POS_SENSORES = Array.from({ length: 10 }, (_, i) => 1.25 + i * 2.5);

export interface ZonaDef {
  id: "A" | "B" | "C";
  nombre: string;
  apodo: string;
  camas: number;
  cx: number;
  cy: number;
  offsetT: number;
}

export const ZONAS: ZonaDef[] = [
  { id: "A", nombre: "Invernadero A", apodo: "Ladera alta", camas: 9, cx: 30, cy: 28, offsetT: 0 },
  { id: "B", nombre: "Invernadero B", apodo: "Terraza media", camas: 8, cx: 30, cy: 72, offsetT: 0.5 },
  { id: "C", nombre: "Invernadero C", apodo: "Ampliación baja", camas: 8, cx: 112, cy: 46, offsetT: 1.1 },
];

export const MUNDO = { ancho: 142, alto: 118 };

/** Quebrada que cruza el lote en diagonal (fuente del reservorio). */
export const QUEBRADA = [[60, 0], [64, 26], [70, 52], [78, 78], [86, 118]] as const;
export const CAMINO = { y: 95, h: 3.5 };
export const RESERVORIO = { x: 60, y: 106, r: 4.5, etiqueta: "Reservorio de riego" };
export const POSCOSECHA = { x: 16, y: 101, w: 14, h: 10, etiqueta: "Poscosecha y cuarto frío" };
export const BODEGA = { x: 104, y: 101, w: 13, h: 9, etiqueta: "Bodega de insumos" };

export const MIN_POR_TICK = 15;
export const HISTORIAL = 48; // 12 h a 15 min
export const ZOOM_SENSORES = 9; // px por metro a partir del cual se dibujan sondas

export const COLOR: Record<Estado, string> = {
  ok: "#2e9e4f",
  warn: "#e0a800",
  crit: "#d64541",
  off: "#8a8f8a",
};

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  ok: "Normal",
  warn: "Alerta",
  crit: "Crítico",
  off: "Sin señal",
};

export function anchoInvernadero() {
  return CAMA.largo + 2 * CAMA.margenU;
}

export function altoInvernadero(camas: number) {
  return camas * CAMA.paso + 2 * CAMA.margenV;
}

export function formato(valor: number, dec: number) {
  return valor.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
