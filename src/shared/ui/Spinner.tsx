interface SpinnerProps {
  etiqueta?: string;
}

export function Spinner({ etiqueta = "Cargando" }: SpinnerProps) {
  return <span className="spinner" role="status" aria-label={etiqueta} />;
}
