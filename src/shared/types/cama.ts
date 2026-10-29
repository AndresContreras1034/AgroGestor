export type EstadoCama = "disponible" | "sembrada" | "cosechada" | "en_descanso";

export const ESTADOS_CAMA: { valor: EstadoCama; etiqueta: string }[] = [
  { valor: "disponible", etiqueta: "Disponible" },
  { valor: "sembrada", etiqueta: "Sembrada" },
  { valor: "cosechada", etiqueta: "Cosechada" },
  { valor: "en_descanso", etiqueta: "En descanso" },
];
