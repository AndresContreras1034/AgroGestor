import { api } from "../../../shared/api/client";
import type { Incidencia, Inspeccion, Tratamiento } from "../types";

export const listarIncidencias = (signal?: AbortSignal) =>
  api.get<Incidencia[]>("/api/calidad/incidencias", signal);
export const crearIncidencia = (body: {
  cama_codigo: string; siembra_id: number | null; tipo: string; nombre: string;
  severidad: string; detectada_en: string | null; descripcion: string | null;
}) => api.post<Incidencia>("/api/calidad/incidencias", body, "calidad");
export const cambiarIncidencia = (id: number, estado: string) =>
  api.patch<Incidencia>(`/api/calidad/incidencias/${id}`, { estado }, "calidad");
export const listarTratamientos = (signal?: AbortSignal) =>
  api.get<Tratamiento[]>("/api/calidad/tratamientos", signal);
export const crearTratamiento = (body: {
  incidencia_id: number; producto: string; dosis: string | null; fecha_aplicacion: string;
  responsable: string | null; observaciones: string | null;
}) => api.post<Tratamiento>("/api/calidad/tratamientos", body, "calidad");
export const listarInspecciones = (signal?: AbortSignal) =>
  api.get<Inspeccion[]>("/api/calidad/inspecciones", signal);
export const crearInspeccion = (body: {
  cama_codigo: string; fecha: string | null; resultado: string; puntaje: number | null;
  observaciones: string | null; inspector: string | null;
}) => api.post<Inspeccion>("/api/calidad/inspecciones", body, "calidad");
