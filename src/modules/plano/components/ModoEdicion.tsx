interface ModoEdicionProps {
  activo: boolean;
  deshabilitado?: boolean;
  soloLectura?: boolean;
  onCambiar: () => void;
}

export function ModoEdicion({
  activo,
  deshabilitado = false,
  soloLectura = false,
  onCambiar,
}: ModoEdicionProps) {
  return (
    <div className={`plano-modo-edicion${activo ? " activo" : ""}${soloLectura ? " solo-lectura" : ""}`}>
      <div>
        <strong>{soloLectura ? "Vista de referencia · solo lectura" : activo ? "Edición activada" : "Modo lectura"}</strong>
        {!soloLectura && (
          <span>
            {activo
              ? "Arrastra las camas para reorganizarlas; se guardan al soltarlas."
              : "Activa la edición para cambiar la posición de las camas."}
          </span>
        )}
      </div>
      {!soloLectura && (
        <button
          type="button"
          className={`button ${activo ? "button-edicion-activa" : "button-primario"}`}
          aria-pressed={activo}
          disabled={deshabilitado}
          onClick={onCambiar}
        >
          {activo ? "Terminar edición" : "Editar distribución"}
        </button>
      )}
    </div>
  );
}
