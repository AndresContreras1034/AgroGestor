import type { EstadoCama } from "../../../shared/types/cama";

export { ESTADOS_CAMA } from "../../../shared/types/cama";
export type { EstadoCama } from "../../../shared/types/cama";

export interface Cama {
  id: number;
  codigo: string;
  zona: string;
  numero: number;
  estado: EstadoCama;
  observaciones: string | null;
  actualizado_en: string;
}
