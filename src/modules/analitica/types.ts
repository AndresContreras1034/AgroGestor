export interface ResumenAnalitico {
  camas: number; siembras_activas: number; tallos_cosechados: number; lotes_abiertos: number;
  incidencias_abiertas: number; lecturas_24h: number; alertas_iot: number; clientes_activos: number;
}
export interface ProduccionSerie { fecha: string; tallos: number }
export interface SemaforoItem { zona: string; estado: "verde"|"amarillo"|"rojo"; lecturas: number; alertas: number }
