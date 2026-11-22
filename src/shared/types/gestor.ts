export const GESTORES = ["proyecto", "comercial", "calidad", "diseno"] as const;

/** Debe coincidir con los valores permitidos por los CHECK de las migraciones. */
export type Gestor = (typeof GESTORES)[number];
