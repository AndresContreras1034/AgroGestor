export type EstadoNodo = "activo" | "offline" | "alerta";

export interface Nodo {
  id: number;
  cama_id: number;
  cama_codigo: string;
  zona: string;
  identificador: string;
  estado: EstadoNodo;
  ultima_conexion: string | null;
  firmware: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevaIngesta {
  identificador: string;
  temperatura: number;
  humedad_relativa: number;
  humedad_suelo: number;
  ph: number;
  conductividad_electrica: number;
}

export interface Lectura {
  id: number;
  nodo_id: number;
  nodo_identificador: string;
  cama_id: number;
  cama_codigo: string;
  zona: string;
  leido_en: string;
  temperatura: number;
  humedad_relativa: number;
  humedad_suelo: number;
  ph: number;
  conductividad_electrica: number;
}

export type VariableMonitoreo =
  | "temperatura"
  | "humedad_relativa"
  | "humedad_suelo"
  | "ph"
  | "conductividad_electrica";

export interface Umbral {
  variable: VariableMonitoreo;
  unidad: string;
  min_alerta: number;
  max_alerta: number;
  min_critico: number;
  max_critico: number;
}
