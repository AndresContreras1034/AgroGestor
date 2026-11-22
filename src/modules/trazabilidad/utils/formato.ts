const numero = new Intl.NumberFormat("es-CO");

export const formatearNumero = (valor: number) => numero.format(valor);

export function formatearFecha(iso: string, larga = false): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return iso;

  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(larga ? { weekday: "long" as const } : {}),
  });
}

export function calcularPorcentaje(parte: number, total: number) {
  return total > 0 ? Math.min(100, (parte / total) * 100) : 0;
}
