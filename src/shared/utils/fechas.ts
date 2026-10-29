const fechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatearFechaHora(value: string) {
  return fechaHora.format(new Date(value));
}