import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { crearSiembra } from "../services/siembras.service";
import type { Cama } from "../types";
import { hoyISO } from "../utils/fechas";

interface Props {
  camas: Cama[];
  camaIdInicial?: number;
  onCerrar: () => void;
  onCreada: () => void;
}

const MAX_OBSERVACIONES = 500;

export function NuevaSiembraDialog({ camas, camaIdInicial, onCerrar, onCreada }: Props) {
  const [camaId, setCamaId] = useState(camaIdInicial ? String(camaIdInicial) : "");
  const [fechaSiembra, setFechaSiembra] = useState(hoyISO());
  const [fechaCosecha, setFechaCosecha] = useState("");
  const [plantas, setPlantas] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function alTeclear(event: KeyboardEvent) {
      if (event.key === "Escape" && !enviando) onCerrar();
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [enviando, onCerrar]);

  function validar(): string | null {
    if (!camaId) return "Selecciona una cama.";
    if (!fechaSiembra) return "Indica la fecha de siembra.";
    const cantidad = Number(plantas);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return "Las plantas sembradas deben ser un número entero mayor que 0.";
    }
    if (fechaCosecha && fechaCosecha < fechaSiembra) {
      return "La cosecha estimada no puede ser anterior a la siembra.";
    }
    if (observaciones.trim().length > MAX_OBSERVACIONES) {
      return `Las observaciones no pueden pasar de ${MAX_OBSERVACIONES} caracteres.`;
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
      await crearSiembra({
        cama_id: Number(camaId),
        fecha_siembra: fechaSiembra,
        fecha_estimada_cosecha: fechaCosecha || null,
        plantas_sembradas: Number(plantas),
        observaciones: observaciones.trim() || null,
      });
      onCreada();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.noConnection
          ? "No hay conexión con el backend."
          : cause instanceof Error
            ? cause.message
            : "No se pudo registrar la siembra.",
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
        aria-labelledby="nueva-siembra-titulo"
      >
        <h2 id="nueva-siembra-titulo">Nueva siembra</h2>
        <form className="siembras-form" onSubmit={(event) => void enviar(event)} noValidate>
          <label>
            Cama
            <select value={camaId} onChange={(event) => setCamaId(event.target.value)} autoFocus>
              <option value="">Selecciona una cama…</option>
              {camas.map((cama) => (
                <option key={cama.id} value={cama.id}>
                  {cama.codigo} ({cama.estado === "en_descanso" ? "en descanso" : "disponible"})
                </option>
              ))}
            </select>
          </label>
          {camas.length === 0 && (
            <p className="siembras-hint">
              No hay camas disponibles ni en descanso. Cancela una siembra o cosecha una cama
              primero.
            </p>
          )}

          <div className="fila">
            <label>
              Fecha de siembra
              <input
                type="date"
                value={fechaSiembra}
                onChange={(event) => setFechaSiembra(event.target.value)}
              />
            </label>
            <label>
              Cosecha estimada (opcional)
              <input
                type="date"
                value={fechaCosecha}
                min={fechaSiembra || undefined}
                onChange={(event) => setFechaCosecha(event.target.value)}
              />
            </label>
          </div>

          <label>
            Plantas sembradas
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={plantas}
              onChange={(event) => setPlantas(event.target.value)}
            />
          </label>

          <label>
            Observaciones (opcional)
            <textarea
              rows={3}
              maxLength={MAX_OBSERVACIONES}
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </label>

          {error && (
            <p role="alert" className="camas-error">
              {error}
            </p>
          )}

          <div className="siembras-form-footer">
            <Button type="button" onClick={onCerrar} disabled={enviando}>
              Cerrar
            </Button>
            <Button type="submit" disabled={enviando || camas.length === 0}>
              {enviando ? "Guardando…" : "Registrar siembra"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
