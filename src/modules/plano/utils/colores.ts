export {};
import type { EstadoCama } from "../../../shared/types/cama";

export const COLORES_ESTADO: Record<
  EstadoCama,
  { relleno: string; borde: string; etiqueta: string }
> = {
  disponible: { relleno: "#e7f2e9", borde: "#3d8055", etiqueta: "Disponible" },
  sembrada: { relleno: "#cbe8d0", borde: "#247f49", etiqueta: "Sembrada" },
  cosechada: { relleno: "#f7e8c5", borde: "#a86b1f", etiqueta: "Cosechada" },
  en_descanso: { relleno: "#e8e8e3", borde: "#72786f", etiqueta: "En descanso" },
};