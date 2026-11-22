import { useEffect, useState } from "react";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { formatearFechaHora } from "../../../shared/utils/fechas";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { BuscadorLote } from "../components/BuscadorLote";
import { CadenaCamaCliente } from "../components/CadenaCamaCliente";
import { LineaDeTiempo } from "../components/LineaDeTiempo";
import { buscarLotes } from "../services/trazabilidad.service";
import type { LoteResumen } from "../types";
import { formatearNumero } from "../utils/formato";
import { mensajeErrorTrazabilidad } from "../utils/errores";
import "./trazabilidad.css";

export function TrazabilidadPage() {
  const [texto, setTexto] = useState("");
  const busqueda = useDebounce(texto, 300);
  const [lotes, setLotes] = useState<LoteResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<LoteResumen | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);

    buscarLotes(busqueda, controller.signal)
      .then(setLotes)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setLotes([]);
        setError(
          mensajeErrorTrazabilidad(cause, "No se pudieron cargar los lotes."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [busqueda, intento]);

  const cambiarBusqueda = (valor: string) => {
    setTexto(valor);
    setSeleccionado(null);
  };

  return (
    <section className="traz">
      <header className="traz-header">
        <div>
          <span className="traz-eyebrow">Historia de producción y venta</span>
          <h1>Trazabilidad</h1>
          <p className="traz-subtitle">
            Sigue cada lote desde sus camas de origen hasta sus clientes.
          </p>
        </div>
      </header>

      <BuscadorLote valor={texto} onCambiar={cambiarBusqueda} />

      <div className="traz-layout">
        <section className="traz-panel traz-lista" aria-label="Lotes">
          <div className="traz-panel-header">
            <div>
              <h2>Lotes</h2>
              <p>{cargando ? "Buscando…" : `${lotes.length} resultados`}</p>
            </div>
          </div>
          {error ? (
            <div className="traz-lista-error" role="alert">
              <p>{error}</p>
              <Button onClick={() => setIntento((actual) => actual + 1)}>
                Reintentar
              </Button>
            </div>
          ) : cargando ? (
            <div className="traz-lista-estado" role="status">
              <Spinner etiqueta="Buscando lotes" />
              <span>Buscando lotes…</span>
            </div>
          ) : (
            <div className="traz-tabla-wrap">
              <table className="traz-tabla traz-tabla--lotes">
                <thead>
                  <tr>
                    <th scope="col">Lote</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="traz-num">Tallos</th>
                    <th scope="col" className="traz-num">Camas</th>
                    <th scope="col" className="traz-num">Clientes</th>
                    <th scope="col"><span className="visually-hidden">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((lote) => (
                    <tr
                      key={lote.id}
                      className={
                        seleccionado?.id === lote.id ? "traz-fila-activa" : undefined
                      }
                    >
                      <td><strong>{lote.codigo}</strong></td>
                      <td>
                        <Badge tono={lote.estado === "abierto" ? "ok" : "neutro"}>
                          {lote.estado === "abierto" ? "Abierto" : "Cerrado"}
                        </Badge>
                      </td>
                      <td className="traz-num">{formatearNumero(lote.total_tallos)}</td>
                      <td className="traz-num">{formatearNumero(lote.camas)}</td>
                      <td className="traz-num">{formatearNumero(lote.clientes)}</td>
                      <td>
                        <Button
                          variante="primario"
                          className="traz-ver"
                          aria-label={`Ver lote ${lote.codigo}`}
                          aria-pressed={seleccionado?.id === lote.id}
                          onClick={() => setSeleccionado(lote)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {lotes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="traz-vacio">
                        {busqueda
                          ? "Ningún lote coincide con la búsqueda."
                          : "No hay lotes registrados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="traz-panel traz-detalle" aria-live="polite">
          {seleccionado ? (
            <>
              <div className="traz-detalle-header">
                <div>
                  <span className="traz-eyebrow">Lote seleccionado</span>
                  <h2>{seleccionado.codigo}</h2>
                </div>
                <Badge tono={seleccionado.estado === "abierto" ? "ok" : "neutro"}>
                  {seleccionado.estado === "abierto" ? "Abierto" : "Cerrado"}
                </Badge>
              </div>
              <p className="traz-subtitle">
                Creado {formatearFechaHora(seleccionado.creado_en)}
              </p>
              {seleccionado.observaciones && (
                <p className="traz-observaciones">{seleccionado.observaciones}</p>
              )}
              <dl className="traz-resumen">
                <div>
                  <dt>Tallos cosechados</dt>
                  <dd>{formatearNumero(seleccionado.total_tallos)}</dd>
                </div>
                <div>
                  <dt>Cosechas</dt>
                  <dd>{formatearNumero(seleccionado.cosechas)}</dd>
                </div>
                <div>
                  <dt>Camas de origen</dt>
                  <dd>{formatearNumero(seleccionado.camas)}</dd>
                </div>
                <div>
                  <dt>Clientes</dt>
                  <dd>{formatearNumero(seleccionado.clientes)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="traz-seleccion-vacia">
              <span aria-hidden="true">01</span>
              <h2>Selecciona un lote</h2>
              <p>Elige “Ver” para consultar su resumen, origen y recorrido.</p>
            </div>
          )}
        </aside>
      </div>

      {seleccionado && (
        <div className="traz-historia">
          <section className="traz-panel traz-historia-panel">
            <div className="traz-panel-header">
              <div>
                <span className="traz-eyebrow">Origen y destino</span>
                <h2>Cadena del lote</h2>
              </div>
            </div>
            <CadenaCamaCliente codigo={seleccionado.codigo} key={seleccionado.id} />
          </section>
          <section className="traz-panel traz-historia-panel">
            <div className="traz-panel-header">
              <div>
                <span className="traz-eyebrow">Registro cronológico</span>
                <h2>Línea de tiempo</h2>
              </div>
            </div>
            <LineaDeTiempo codigo={seleccionado.codigo} key={`timeline-${seleccionado.id}`} />
          </section>
        </div>
      )}
    </section>
  );
}
