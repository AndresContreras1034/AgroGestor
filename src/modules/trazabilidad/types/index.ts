export type EstadoLote = "abierto" | "cerrado";

export interface LoteResumen {
  id: number;
  codigo: string;
  anio: number;
  estado: EstadoLote;
  observaciones: string | null;
  creado_en: string;
  total_tallos: number;
  cosechas: number;
  camas: number;
  clientes: number;
}

export interface OrigenCama {
  cama_id: number;
  cama_codigo: string;
  zona: string;
  siembra_id: number;
  fecha_siembra: string;
  plantas_sembradas: number;
  estado_siembra: string;
  cosechas: number;
  tallos: number;
  tallos_primera: number;
  tallos_segunda: number;
  tallos_descarte: number;
  primera_cosecha: string;
  ultima_cosecha: string;
}

export interface DestinoOrden {
  cliente_id: number;
  cliente: string;
  ciudad: string | null;
  orden_id: number;
  orden_item_id: number;
  fecha_orden: string;
  estado_orden: string;
  tallos_orden: number;
  tallos_despachados: number;
}

export interface DespachoLote {
  despacho_id: number;
  orden_id: number;
  fecha: string;
  estado: string;
  transportador: string | null;
  guia: string | null;
  tallos: number;
}

export interface CadenaLote {
  lote: LoteResumen;
  origen: OrigenCama[];
  destinos: DestinoOrden[];
  despachos: DespachoLote[];
}

export type TipoEvento =
  | "siembra"
  | "labor"
  | "incidencia"
  | "tratamiento"
  | "inspeccion"
  | "cosecha"
  | "lote"
  | "orden"
  | "despacho";

export interface EventoLinea {
  fecha: string;
  tipo: TipoEvento;
  titulo: string;
  detalle: string | null;
  cama_codigo: string | null;
  referencia_id: number;
}
