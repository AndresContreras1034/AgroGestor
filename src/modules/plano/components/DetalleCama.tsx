import { Badge } from "../../../shared/ui/Badge";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { COLORES_ESTADO } from "../utils/colores";
import type { CamaPlano } from "../types/plano";

interface DetalleCamaProps {
  cama: CamaPlano | null;
  nombreZona?: string;
  sinConexion?: boolean;
}

export function DetalleCama({ cama, nombreZona, sinConexion = false }: DetalleCamaProps) {
  if (!cama) {
    return (
      <aside className="plano-detalle plano-detalle-vacio">
        <h2>Detalle de cama</h2>
        <p>Selecciona una cama en el plano para consultar su información.</p>
      </aside>
    );
  }

  const estado = COLORES_ESTADO[cama.estado];
  return (
    <aside className="plano-detalle" aria-live="polite">
      <div className="plano-detalle-titulo">
        <div>
          <span className="plano-eyebrow">Cama</span>
          <h2>{cama.codigo}</h2>
        </div>
        <Badge tono={sinConexion ? "neutro" : cama.estado === "sembrada" ? "ok" : "neutro"}>
          {sinConexion ? "Estado sin sincronizar" : estado.etiqueta}
        </Badge>
      </div>
      <dl className="plano-detalle-lista">
        <div>
          <dt>Zona</dt>
          <dd>{nombreZona ?? cama.zona}</dd>
        </div>
        <div>
          <dt>Dimensiones</dt>
          <dd>{cama.ancho} × {cama.alto} m</dd>
        </div>
        <div>
          <dt>Superficie</dt>
          <dd>{cama.ancho * cama.alto} m²</dd>
        </div>
        <div>
          <dt>{sinConexion ? "Posición ilustrativa" : "Posición"}</dt>
          <dd>
            {cama.pos_x.toFixed(1)}, {cama.pos_y.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt>Observaciones</dt>
          <dd>
            {sinConexion
              ? "Datos no disponibles sin conexión"
              : cama.observaciones || "Sin observaciones"}
          </dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd>{sinConexion ? "Conecta la API para consultar los datos actuales" : formatearFechaHora(cama.actualizado_en)}</dd>
        </div>
      </dl>
    </aside>
  );
}
