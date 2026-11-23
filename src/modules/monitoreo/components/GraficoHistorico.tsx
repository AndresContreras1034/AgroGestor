import type { Lectura } from "../types";

interface GraficoHistoricoProps {
  lecturas: Lectura[];
  variable: "temperatura" | "humedad_relativa" | "humedad_suelo";
  unidad: string;
}

export function GraficoHistorico({
  lecturas,
  variable,
  unidad,
}: GraficoHistoricoProps) {
  const datos = lecturas.slice(0, 24).reverse();
  if (datos.length === 0) return null;

  const valores = datos.map((lectura) => lectura[variable]);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const puntos = valores
    .map((valor, indice) => {
      const x = (indice / Math.max(datos.length - 1, 1)) * 100;
      const y = 100 - ((valor - minimo) / rango) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="sensor-chart" title={`${valores.at(-1)?.toFixed(1)} ${unidad}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Histórico de ${variable}`}>
        <polyline points={puntos} fill="none" stroke="#3b8052" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
