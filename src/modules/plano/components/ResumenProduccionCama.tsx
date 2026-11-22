import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { NuevaSiembraDialog } from "../../produccion/components/NuevaSiembraDialog";
import { RegistrarCosechaDialog } from "../../produccion/components/RegistrarCosechaDialog";
import { obtenerResumenCama } from "../../produccion/services/camas.service";
import { listarLotes } from "../../produccion/services/lotes.service";
import type { ResumenCama } from "../../produccion/types";
import { formatearFechaISO } from "../../produccion/utils/fechas";

interface Props {
  codigo: string;
  onCambio?: () => void;
}

type Lotes = Awaited<ReturnType<typeof listarLotes>>;
type Dialogo = "sembrar" | "cosechar" | null;

export function ResumenProduccionCama({ codigo, onCambio }: Props) {
  const [resumen, setResumen] = useState<ResumenCama | null>(null);
  const [lotes, setLotes] = useState<Lotes>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const [respuesta, lotesRespuesta] = await Promise.all([
        obtenerResumenCama(codigo, signal),
        listarLotes(signal),
      ]);
      setResumen(respuesta);
      setLotes(lotesRespuesta);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        cause instanceof ApiError && cause.noConnection
          ? "No hay conexión con el backend."
          : cause instanceof Error
            ? cause.message
            : "No se pudo cargar la producción de la cama.",
      );
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  async function alTerminar() {
    setDialogo(null);
    await cargar();
    onCambio?.();
  }

  if (cargando && !resumen) return <p>Cargando producción…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!resumen) return null;

  const { cama, siembra_activa: siembra, ultima_cosecha: cosecha } = resumen;
  const sembrable = cama.estado === "disponible" || cama.estado === "en_descanso";

  return (
    <section aria-label="Producción de la cama" className="plano-produccion">
      <h3>Producción</h3>
      {siembra ? (
        <p>
          <strong>Siembra activa:</strong> {formatearFechaISO(siembra.fecha_siembra)} ·{" "}
          {siembra.plantas_sembradas.toLocaleString("es-CO")} plantas
          <br />
          Cosecha estimada: {formatearFechaISO(siembra.fecha_estimada_cosecha)}
          <br />
          Tallos cosechados: {resumen.tallos_siembra_activa.toLocaleString("es-CO")}
        </p>
      ) : (
        <p>Sin siembra activa.</p>
      )}
      {cosecha ? (
        <p>
          <strong>Última cosecha:</strong> {formatearFechaISO(cosecha.fecha)} ·{" "}
          {cosecha.tallos.toLocaleString("es-CO")} tallos ({cosecha.calidad})
        </p>
      ) : (
        <p>Sin cosechas registradas.</p>
      )}
      <div className="plano-produccion-actions">
        {sembrable && <Button onClick={() => setDialogo("sembrar")}>Sembrar</Button>}
        {siembra && <Button onClick={() => setDialogo("cosechar")}>Cosechar</Button>}
      </div>

      {dialogo === "sembrar" && (
        <NuevaSiembraDialog
          camas={[cama]}
          camaIdInicial={cama.id}
          onCerrar={() => setDialogo(null)}
          onCreada={() => void alTerminar()}
        />
      )}
      {dialogo === "cosechar" && siembra && (
        <RegistrarCosechaDialog
          siembras={[siembra]}
          siembraIdInicial={siembra.id}
          codigoCama={new Map([[cama.id, cama.codigo]])}
          lotes={lotes.filter((lote) => lote.estado === "abierto")}
          onCerrar={() => setDialogo(null)}
          onRegistrada={() => void alTerminar()}
        />
      )}
    </section>
  );
}
