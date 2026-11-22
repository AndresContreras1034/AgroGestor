import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { registrarCosecha } from "../services/cosechas.service";
import { CALIDADES_COSECHA, type CalidadCosecha, type Siembra } from "../types";
import { formatearFechaISO, hoyISO } from "../utils/fechas";

type SiembraCosechable = Pick<Siembra, "id" | "cama_id" | "fecha_siembra" | "plantas_sembradas">;

interface Props {
  siembras: SiembraCosechable[];
  siembraIdInicial?: number;
  codigoCama: Map<number, string>;
  lotes: { id: number; codigo: string }[];
  onCerrar: () => void;
  onRegistrada: () => void;
}

export function RegistrarCosechaDialog({
  siembras,
  siembraIdInicial,
  codigoCama,
  lotes,
  onCerrar,
  onRegistrada,
}: Props) {
  const [siembraId, setSiembraId] = useState(siembraIdInicial ? String(siembraIdInicial) : "");
  const [loteId, setLoteId] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [tallos, setTallos] = useState("");
  const [calidad, setCalidad] = useState<CalidadCosecha>("primera");
  const [cerrarSiembra, setCerrarSiembra] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape" && !enviando) onCerrar();
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [enviando, onCerrar]);

  const siembra = siembras.find((item) => item.id === Number(siembraId));

  function validar(): string | null {
    if (!siembra) return "Selecciona una siembra.";
    if (!fecha) return "Indica la fecha de cosecha.";
    if (fecha < siembra.fecha_siembra) {
      return "La fecha de cosecha no puede ser anterior a la siembra.";
    }
    if (fecha > hoyISO()) return "La fecha de cosecha no puede ser futura.";
    const cantidad = Number(tallos);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return "Los tallos deben ser un número entero mayor que 0.";
    }
    return null;
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      await registrarCosecha({
        siembra_id: Number(siembraId),
        lote_id: loteId ? Number(loteId) : null,
        fecha,
        tallos: Number(tallos),
        calidad,
        cerrar_siembra: cerrarSiembra,
      });
      onRegistrada();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.noConnection
          ? "No hay conexión con el backend."
          : cause instanceof Error
            ? cause.message
            : "No se pudo registrar la cosecha.",
      );
      setEnviando(false);
    }
  }

  return (
    <div
      className="siembras-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onCerrar();
      }}
    >
      <div
        className="siembras-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-cosecha-titulo"
      >
        <h2 id="registrar-cosecha-titulo">Registrar cosecha</h2>
        <form className="siembras-form" onSubmit={(event) => void enviar(event)} noValidate>
          <label>
            Siembra
            <select
              value={siembraId}
              onChange={(event) => setSiembraId(event.target.value)}
              autoFocus
            >
              <option value="">Selecciona una siembra activa…</option>
              {siembras.map((item) => (
                <option key={item.id} value={item.id}>
                  {codigoCama.get(item.cama_id) ?? `#${item.cama_id}`} · sembrada el{" "}
                  {formatearFechaISO(item.fecha_siembra)} ·{" "}
                  {item.plantas_sembradas.toLocaleString("es-CO")} plantas
                </option>
              ))}
            </select>
          </label>
          {siembras.length === 0 && (
            <p className="siembras-hint">No hay siembras activas. Registra una siembra primero.</p>
          )}

          <div className="fila">
            <label>
              Fecha de cosecha
              <input
                type="date"
                value={fecha}
                min={siembra?.fecha_siembra}
                max={hoyISO()}
                onChange={(event) => setFecha(event.target.value)}
              />
            </label>
            <label>
              Tallos
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={tallos}
                onChange={(event) => setTallos(event.target.value)}
              />
            </label>
          </div>

          <div className="fila">
            <label>
              Calidad
              <select
                value={calidad}
                onChange={(event) => setCalidad(event.target.value as CalidadCosecha)}
              >
                {CALIDADES_COSECHA.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lote (opcional)
              <select value={loteId} onChange={(event) => setLoteId(event.target.value)}>
                <option value="">Sin lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!loteId && (
            <p className="siembras-hint">
              Una cosecha sin lote no aparecerá en la trazabilidad hacia el cliente.
            </p>
          )}

          <label className="check">
            <input
              type="checkbox"
              checked={cerrarSiembra}
              onChange={(event) => setCerrarSiembra(event.target.checked)}
            />
            Es la última cosecha: cerrar la siembra y marcar la cama como cosechada
          </label>
          {!cerrarSiembra && (
            <p className="siembras-hint">
              Cosecha parcial: la siembra seguirá activa y podrás registrar más cortes.
            </p>
          )}

          {error && <p role="alert" className="camas-error">{error}</p>}

          <div className="siembras-form-footer">
            <Button type="button" onClick={onCerrar} disabled={enviando}>Cerrar</Button>
            <Button type="submit" disabled={enviando || siembras.length === 0}>
              {enviando ? "Guardando…" : "Registrar cosecha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
