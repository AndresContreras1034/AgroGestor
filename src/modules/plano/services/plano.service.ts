import { api } from "../../../shared/api/client";
import type { Plano, PosicionActualizada } from "../types/plano";

export function obtenerPlano(signal?: AbortSignal) {
  return api.get<Plano>("/api/diseno/plano/", signal);
}

export function guardarPosicionCama(
  codigo: string,
  posicion: { pos_x: number; pos_y: number },
) {
  return api.patch<PosicionActualizada>(
    `/api/diseno/plano/camas/${encodeURIComponent(codigo)}`,
    posicion,
    "diseno",
  );
}
