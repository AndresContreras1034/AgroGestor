import { ApiError } from "../../../shared/api/errors";

export function mensajeErrorTrazabilidad(
  causa: unknown,
  mensajeAlternativo: string,
) {
  if (causa instanceof ApiError && causa.noConnection) {
    return "No hay conexión con el backend. Revisa que la API y PostgreSQL estén activos.";
  }
  return causa instanceof Error ? causa.message : mensajeAlternativo;
}
