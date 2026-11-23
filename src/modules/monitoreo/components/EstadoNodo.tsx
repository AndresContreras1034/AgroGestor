import { Badge } from "../../../shared/ui/Badge";
import type { EstadoNodo as Estado } from "../types";

interface EstadoNodoProps {
  estado: Estado;
  identificador: string;
}

export function EstadoNodo({ estado, identificador }: EstadoNodoProps) {
  const tono = estado === "activo" ? "ok" : estado === "alerta" ? "riesgo" : "neutro";
  return (
    <span className="estado-nodo">
      <Badge tono={tono}>{estado}</Badge>
      <code>{identificador}</code>
    </span>
  );
}
