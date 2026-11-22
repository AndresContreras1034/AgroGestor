import { api } from "../../../shared/api/client";
import type { Gestor } from "../../../shared/types/gestor";
import type { NuevaSiembra, Siembra } from "../types";

const ACTOR: Gestor = "proyecto";
const BASE = "/api/produccion/siembras";

export function listarSiembras(signal?: AbortSignal) {
  return api.get<Siembra[]>(BASE, signal);
}

export function crearSiembra(datos: NuevaSiembra) {
  return api.post<Siembra>(BASE, datos, ACTOR);
}

export function cancelarSiembra(id: number) {
  return api.patch<Siembra>(`${BASE}/${id}/cancelar`, {}, ACTOR);
}
