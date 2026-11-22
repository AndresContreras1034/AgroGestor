import type { EstadoCama } from "../../../shared/types/cama";

export { ESTADOS_CAMA } from "../../../shared/types/cama";
export type { EstadoCama } from "../../../shared/types/cama";

export interface Cama {
  id: number;
  codigo: string;
  zona: string;
  numero: number;
  estado: EstadoCama;
  observaciones: string | null;
  actualizado_en: string;
}

export const ESTADOS_SIEMBRA = [
  { valor: "activa", etiqueta: "Activa" },
  { valor: "cosechada", etiqueta: "Cosechada" },
  { valor: "cancelada", etiqueta: "Cancelada" },
] as const;

export type EstadoSiembra = (typeof ESTADOS_SIEMBRA)[number]["valor"];

/** Fechas en formato ISO "YYYY-MM-DD" (sin hora ni zona). */
export interface Siembra {
  id: number;
  cama_id: number;
  fecha_siembra: string;
  fecha_estimada_cosecha: string | null;
  plantas_sembradas: number;
  estado: EstadoSiembra;
  observaciones: string | null;
  registrado_por: string;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevaSiembra {
  cama_id: number;
  fecha_siembra: string;
  fecha_estimada_cosecha: string | null;
  plantas_sembradas: number;
  observaciones: string | null;
}

export type EstadoLote = "abierto" | "cerrado";

export interface Lote {
  id: number;
  codigo: string;
  anio: number;
  secuencia: number;
  estado: EstadoLote;
  observaciones: string | null;
  registrado_por: string;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevoLote {
  observaciones: string | null;
}

export const CALIDADES_COSECHA = [
  { valor: "primera", etiqueta: "Primera" },
  { valor: "segunda", etiqueta: "Segunda" },
  { valor: "descarte", etiqueta: "Descarte" },
] as const;

export type CalidadCosecha = (typeof CALIDADES_COSECHA)[number]["valor"];

export interface Cosecha {
  id: number;
  cama_id: number;
  siembra_id: number;
  lote_id: number | null;
  fecha: string;
  tallos: number;
  calidad: CalidadCosecha;
  registrado_por: string;
  creado_en: string;
}

export interface NuevaCosecha {
  siembra_id: number;
  lote_id: number | null;
  fecha: string;
  tallos: number;
  calidad: CalidadCosecha;
  cerrar_siembra: boolean;
}

export interface SiembraResumen {
  id: number;
  cama_id: number;
  fecha_siembra: string;
  fecha_estimada_cosecha: string | null;
  plantas_sembradas: number;
}

export interface CosechaResumen {
  id: number;
  fecha: string;
  tallos: number;
  calidad: CalidadCosecha;
  lote_id: number | null;
}

export interface ResumenCama {
  cama: Cama;
  siembra_activa: SiembraResumen | null;
  tallos_siembra_activa: number;
  ultima_cosecha: CosechaResumen | null;
}

export const TIPOS_LABOR = [
  { valor: "riego", etiqueta: "Riego" },
  { valor: "fertilizacion", etiqueta: "Fertilización" },
  { valor: "poda", etiqueta: "Poda" },
  { valor: "deshierbe", etiqueta: "Deshierbe" },
  { valor: "fumigacion", etiqueta: "Fumigación" },
  { valor: "otra", etiqueta: "Otra" },
] as const;

export type TipoLabor = (typeof TIPOS_LABOR)[number]["valor"];

export interface Labor {
  id: number;
  cama_id: number;
  cama_codigo: string;
  siembra_id: number | null;
  tipo: TipoLabor;
  fecha: string;
  descripcion: string | null;
  registrado_por: string;
  creado_en: string;
}

export interface NuevaLabor {
  cama?: string;
  siembra_id?: number;
  tipo: TipoLabor;
  fecha: string;
  descripcion: string | null;
}
