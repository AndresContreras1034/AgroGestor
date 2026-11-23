import { api } from "../../../shared/api/client";
import type { ProduccionSerie, ResumenAnalitico, SemaforoItem } from "../types";
export const obtenerResumenAnalitico=(signal?:AbortSignal)=>api.get<ResumenAnalitico>("/api/analitica/resumen",signal);
export const obtenerProduccionAnalitica=(signal?:AbortSignal)=>api.get<ProduccionSerie[]>("/api/analitica/produccion",signal);
export const obtenerSemaforo=(signal?:AbortSignal)=>api.get<SemaforoItem[]>("/api/analitica/semaforo",signal);
