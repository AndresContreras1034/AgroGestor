import { api } from "../../../shared/api/client";
import type { ZonaResumen } from "../../../shared/types/zona";
import type { Gestor } from "../../../shared/types/gestor";
import type { Cama, EstadoCama, ResumenCama } from "../types";

export function listarCamas(signal?: AbortSignal) {
  return api.get<Cama[]>("/api/produccion/camas", signal);
}

export function listarZonas(signal?: AbortSignal) {
  return api.get<ZonaResumen[]>("/api/diseno/zonas", signal);
}

export function cambiarEstadoCama(codigo: string, estado: EstadoCama) {
  const actor: Gestor = "proyecto";
  return api.patch<Cama>(`/api/produccion/camas/${codigo}`, { estado }, actor);
}

export function obtenerResumenCama(codigo: string, signal?: AbortSignal) {
  return api.get<ResumenCama>(`/api/produccion/camas/${encodeURIComponent(codigo)}/resumen`, signal);
}
