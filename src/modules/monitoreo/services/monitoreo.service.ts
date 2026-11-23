import { api } from "../../../shared/api/client";
import type { Gestor } from "../../../shared/types/gestor";
import type { Lectura, Nodo, NuevaIngesta, Umbral } from "../types";

export function listarNodos(signal?: AbortSignal) {
  return api.get<Nodo[]>("/api/monitoreo/nodos", signal);
}

export function crearNodo(
  cama_codigo: string,
  identificador: string,
  firmware: string | null,
) {
  const actor: Gestor = "proyecto";
  return api.post<Nodo>(
    "/api/monitoreo/nodos",
    { cama_codigo, identificador, firmware },
    actor,
  );
}

export function actualizarNodo(
  identificador: string,
  estado: Nodo["estado"],
  firmware: string | null,
) {
  const actor: Gestor = "proyecto";
  return api.patch<Nodo>(
    `/api/monitoreo/nodos/${encodeURIComponent(identificador)}`,
    { estado, firmware },
    actor,
  );
}

export function listarLecturas(camaCodigo?: string, limite = 100, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (camaCodigo && camaCodigo !== "todas") params.set("cama_codigo", camaCodigo);
  params.set("limite", String(limite));
  return api.get<Lectura[]>(`/api/monitoreo/lecturas?${params}`, signal);
}

export function ingresarLectura(payload: NuevaIngesta) {
  const actor: Gestor = "proyecto";
  return api.post<Lectura>("/api/monitoreo/ingesta", payload, actor);
}

export function listarUmbrales(signal?: AbortSignal) {
  return api.get<Umbral[]>("/api/monitoreo/umbrales", signal);
}

export function actualizarUmbral(
  variable: Umbral["variable"],
  payload: Omit<Umbral, "variable">,
) {
  const actor: Gestor = "proyecto";
  return api.put<Umbral>(
    `/api/monitoreo/umbrales/${encodeURIComponent(variable)}`,
    payload,
    actor,
  );
}
