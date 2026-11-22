import { api } from "../../../shared/api/client";
import type { Gestor } from "../../../shared/types/gestor";
import type { Lote, NuevoLote } from "../types";

export function listarLotes(signal?: AbortSignal) {
  return api.get<Lote[]>("/api/produccion/lotes", signal);
}

export function crearLote(datos: NuevoLote, actor: Gestor) {
  return api.post<Lote>("/api/produccion/lotes", datos, actor);
}

export function cerrarLote(id: number, actor: Gestor) {
  return api.patch<Lote>(`/api/produccion/lotes/${id}/cerrar`, {}, actor);
}
