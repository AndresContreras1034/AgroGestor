interface TarjetaSensorProps {
  titulo: string;
  valor: number;
  unidad: string;
  decimales?: number;
}

export function TarjetaSensor({
  titulo,
  valor,
  unidad,
  decimales = 1,
}: TarjetaSensorProps) {
  return (
    <article className="sensor-card">
      <span>{titulo}</span>
      <strong>
        {valor.toFixed(decimales)} <small>{unidad}</small>
      </strong>
    </article>
  );
}
