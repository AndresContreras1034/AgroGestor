import type { CamaPlano } from "../types/plano";

interface CamaShapeProps {
  cama: CamaPlano;
  seleccionada: boolean;
  onSeleccionar: (codigo: string) => void;
}

export function CamaShape({ cama, seleccionada, onSeleccionar }: CamaShapeProps) {
  return (
    <g
      data-cama={cama.codigo}
      className={`plano-cama${seleccionada ? " seleccionada" : ""}`}
      transform={`translate(${cama.pos_x} ${cama.pos_y})`}
      role="button"
      tabIndex={0}
      aria-label={`${cama.codigo}, cama de 250 metros cuadrados`}
      onClick={() => onSeleccionar(cama.codigo)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSeleccionar(cama.codigo);
        }
      }}
    >
      {seleccionada && (
        <rect
          className="plano-cama-seleccion"
          x="-0.6"
          y="-0.6"
          width={cama.ancho + 1.2}
          height={cama.alto + 1.2}
          rx="1.1"
        />
      )}
      <rect
        x="0"
        y="0"
        width={cama.ancho}
        height={cama.alto}
        rx="0.9"
        fill="#836344"
        stroke="#604a36"
        strokeWidth={seleccionada ? "0.65" : "0.38"}
      />
      <rect x="0.7" y="0.7" width={cama.ancho - 1.4} height={cama.alto - 1.4} rx="0.55" fill="url(#plano-cama-suelo)" />
      {[2.4, 4.1, 5.8, 7.5].map((y) => (
        <g key={`${cama.codigo}-hilera-${y}`} opacity=".94">
          <path d={`M1.3 ${y}h${cama.ancho - 2.6}`} stroke="#b09a6b" strokeWidth=".42" opacity=".8" />
          {Array.from({ length: 10 }, (_, index) => {
            const x = 2.5 + index * 2.1;
            return (
              <path
                key={`${cama.codigo}-planta-${y}-${index}`}
                d={`M${x} ${y}q-.65-.9-.05-1.25.65.45.05 1.25m0 0q.65-.9 1.25-.8-.1.85-1.25.8`}
                fill="#d2df9e"
                stroke="#587b46"
                strokeWidth=".18"
              />
            );
          })}
        </g>
      ))}
      <text
        x={cama.ancho / 2}
        y={cama.alto / 2 + 0.8}
        textAnchor="middle"
        className="plano-cama-etiqueta"
      >
        {cama.codigo}
      </text>
      <title>{`${cama.codigo} · cama agrícola de 25 × 10 metros · 250 metros cuadrados`}</title>
    </g>
  );
}
