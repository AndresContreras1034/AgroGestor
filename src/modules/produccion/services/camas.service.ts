import { api } from "../../../shared/api/client";
import type { ZonaResumen } from "../../../shared/types/zona";
import type { Cama } from "../types";

export function listarCamas(signal?: AbortSignal) {
  return api.get<Cama[]>("/api/produccion/camas", signal);
}

export function listarZonas(signal?: AbortSignal) {
  return api.get<ZonaResumen[]>("/api/diseno/zonas", signal);
}
