/** Fecha local de hoy como "YYYY-MM-DD" (sin desfase por UTC). */
export function hoyISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** Formatea "YYYY-MM-DD" como "DD/MM/YYYY" sin pasar por Date. */
export function formatearFechaISO(fecha: string | null): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
