export type TipoIncidencia = "plaga" | "enfermedad" | "brote" | "otro";
export type Severidad = "baja" | "media" | "alta" | "critica";
export type EstadoIncidencia = "abierta" | "en_tratamiento" | "resuelta";
export interface Incidencia {
  id: number; cama_id: number; cama_codigo: string | null; siembra_id: number | null;
  tipo: TipoIncidencia; nombre: string; severidad: Severidad; estado: EstadoIncidencia;
  detectada_en: string; descripcion: string | null; registrado_por: string; creado_en: string;
}
export interface Tratamiento {
  id: number; incidencia_id: number; producto: string; dosis: string | null;
  fecha_aplicacion: string; responsable: string | null; observaciones: string | null; creado_en: string;
}
export interface Inspeccion {
  id: number; cama_id: number; cama_codigo: string | null; fecha: string;
  resultado: "aprobada" | "observada" | "rechazada"; puntaje: number | null;
  observaciones: string | null; inspector: string | null; creado_en: string;
}
