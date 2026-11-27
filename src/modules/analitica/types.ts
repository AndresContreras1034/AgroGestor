export interface ResumenAnalitico {
  camas: number; siembras_activas: number; tallos_cosechados: number; lotes_abiertos: number;
  incidencias_abiertas: number; lecturas_24h: number; alertas_iot: number; clientes_activos: number;
}
export interface ProduccionSerie { fecha: string; tallos: number }
export interface SemaforoItem { zona: string; estado: "verde"|"amarillo"|"rojo"; lecturas: number; alertas: number }
export interface EstadoAsistente { configurado: boolean; modelo: string; pensamiento: boolean }
export interface TurnoAsistente { rol: "usuario" | "asistente"; contenido: string }
export interface RespuestaAsistente {
  respuesta: string; modelo: string; tokens_entrada: number; tokens_salida: number; duracion_ms: number;
}
