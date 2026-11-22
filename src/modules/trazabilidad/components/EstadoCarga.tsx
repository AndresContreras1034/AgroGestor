import type { ReactNode } from "react";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";

interface EstadoCargaProps {
  cargando: boolean;
  error: string | null;
  vacio: boolean;
  mensajeVacio: string;
  mensajeCargando?: string;
  onReintentar: () => void;
  children: ReactNode;
}

export function EstadoCarga({
  cargando,
  error,
  vacio,
  mensajeVacio,
  mensajeCargando = "Cargando trazabilidad…",
  onReintentar,
  children,
}: EstadoCargaProps) {
  if (cargando) {
    return (
      <div className="traz-estado" role="status" aria-live="polite">
        <Spinner etiqueta={mensajeCargando} />
        <span>{mensajeCargando}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="traz-estado traz-estado--error" role="alert">
        <p>No se pudo cargar la información: {error}</p>
        <Button onClick={onReintentar}>Reintentar</Button>
      </div>
    );
  }

  if (vacio) {
    return <div className="traz-estado traz-estado--vacio">{mensajeVacio}</div>;
  }

  return <>{children}</>;
}
