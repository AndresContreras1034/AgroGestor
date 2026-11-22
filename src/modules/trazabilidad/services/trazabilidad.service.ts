import { api } from "../../../shared/api/client";
import type { CadenaLote, EventoLinea, LoteResumen } from "../types";

const BASE = "/api/trazabilidad/lotes";

export function buscarLotes(texto: string, signal?: AbortSignal) {
  const q = texto.trim();
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return api.get<LoteResumen[]>(`${BASE}${query}`, signal);
}

export function obtenerCadena(codigo: string, signal?: AbortSignal) {
  return api.get<CadenaLote>(
    `${BASE}/${encodeURIComponent(codigo)}/cadena`,
    signal,
  );
}

export function obtenerLineaTiempo(codigo: string, signal?: AbortSignal) {
  return api.get<EventoLinea[]>(
    `${BASE}/${encodeURIComponent(codigo)}/linea-tiempo`,
    signal,
  );
}
