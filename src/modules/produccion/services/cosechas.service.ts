import { api } from "../../../shared/api/client";
import type { Gestor } from "../../../shared/types/gestor";
import type { Cosecha, NuevaCosecha } from "../types";

const ACTOR: Gestor = "proyecto";
const BASE = "/api/produccion/cosechas";

export function listarCosechas(signal?: AbortSignal) {
  return api.get<Cosecha[]>(BASE, signal);
}

export function registrarCosecha(datos: NuevaCosecha) {
  return api.post<Cosecha>(BASE, datos, ACTOR);
}
