import { api } from "../../../shared/api/client";
import type { Gestor } from "../../../shared/types/gestor";
import type { Labor, NuevaLabor, Siembra } from "../types";

export function listarLabores(signal?: AbortSignal) {
  return api.get<Labor[]>("/api/produccion/labores", signal);
}

export function listarSiembrasActivas(signal?: AbortSignal) {
  return api.get<Siembra[]>("/api/produccion/siembras", signal);
}

export function crearLabor(datos: NuevaLabor, actor: Gestor) {
  return api.post<Labor>("/api/produccion/labores", datos, actor);
}
