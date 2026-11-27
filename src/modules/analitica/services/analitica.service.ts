import { api } from "../../../shared/api/client";
import type {
  EstadoAsistente, ProduccionSerie, RespuestaAsistente, ResumenAnalitico, SemaforoItem, TurnoAsistente,
} from "../types";
export const obtenerResumenAnalitico=(signal?:AbortSignal)=>api.get<ResumenAnalitico>("/api/analitica/resumen",signal);
export const obtenerProduccionAnalitica=(signal?:AbortSignal)=>api.get<ProduccionSerie[]>("/api/analitica/produccion",signal);
export const obtenerSemaforo=(signal?:AbortSignal)=>api.get<SemaforoItem[]>("/api/analitica/semaforo",signal);
export const obtenerEstadoAsistente=(signal?:AbortSignal)=>api.get<EstadoAsistente>("/api/analitica/asistente",signal);
export const preguntarAsistente=(pregunta:string,historial:TurnoAsistente[],signal?:AbortSignal)=>
  api.post<RespuestaAsistente>("/api/analitica/asistente",{pregunta,historial},"proyecto",signal);
