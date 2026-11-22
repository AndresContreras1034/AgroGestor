import { useEffect, useMemo, useState } from "react";
import { EstadoCarga } from "./EstadoCarga";
import { obtenerLineaTiempo } from "../services/trazabilidad.service";
import type { EventoLinea, TipoEvento } from "../types";
import { formatearFecha } from "../utils/formato";
import { mensajeErrorTrazabilidad } from "../utils/errores";

interface LineaDeTiempoProps {
  codigo: string;
}

const TIPOS: TipoEvento[] = [
  "siembra",
  "labor",
  "incidencia",
  "tratamiento",
  "inspeccion",
  "cosecha",
  "lote",
  "orden",
  "despacho",
];

const ETIQUETAS: Record<TipoEvento, string> = {
  siembra: "Siembra",
  labor: "Labor",
  incidencia: "Incidencia",
  tratamiento: "Tratamiento",
  inspeccion: "Inspección",
  cosecha: "Cosecha",
  lote: "Lote",
  orden: "Orden",
  despacho: "Despacho",
};

export function LineaDeTiempo({ codigo }: LineaDeTiempoProps) {
  const [eventos, setEventos] = useState<EventoLinea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoEvento | "todos">("todos");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    setEventos([]);

    obtenerLineaTiempo(codigo, controller.signal)
      .then(setEventos)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          mensajeErrorTrazabilidad(cause, "No se pudo cargar la línea de tiempo."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [codigo, intento]);

  const visibles = useMemo(
    () => filtro === "todos"
      ? eventos
      : eventos.filter((evento) => evento.tipo === filtro),
    [eventos, filtro],
  );
  const conteos = useMemo(() => {
    const porTipo = new Map<TipoEvento, number>();
    for (const evento of eventos) {
      porTipo.set(evento.tipo, (porTipo.get(evento.tipo) ?? 0) + 1);
    }
    return porTipo;
  }, [eventos]);

  return (
    <div className="traz-contenido" aria-label={`Línea de tiempo del lote ${codigo}`}>
      <EstadoCarga
        cargando={cargando}
        error={error}
        vacio={eventos.length === 0}
        mensajeVacio="No hay eventos registrados para este lote."
        onReintentar={() => setIntento((actual) => actual + 1)}
      >
        <div className="traz-tiempo">
          <div className="traz-filtros" aria-label="Filtrar eventos">
            <button
              type="button"
              className="traz-filtro"
              aria-pressed={filtro === "todos"}
              onClick={() => setFiltro("todos")}
            >
              Todos <span>{eventos.length}</span>
            </button>
            {TIPOS.filter((tipo) => (conteos.get(tipo) ?? 0) > 0).map((tipo) => (
              <button
                key={tipo}
                type="button"
                className="traz-filtro"
                data-tipo={tipo}
                aria-pressed={filtro === tipo}
                onClick={() => setFiltro(tipo)}
              >
                {ETIQUETAS[tipo]} <span>{conteos.get(tipo)}</span>
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <div className="traz-estado traz-estado--vacio">
              No hay eventos de tipo {filtro === "todos" ? "ninguno" : ETIQUETAS[filtro]}.
            </div>
          ) : (
            <ol className="traz-eventos">
              {visibles.map((evento) => (
                <Evento key={`${evento.tipo}-${evento.referencia_id}-${evento.fecha}`} evento={evento} />
              ))}
            </ol>
          )}
        </div>
      </EstadoCarga>
    </div>
  );
}

function Evento({ evento }: { evento: EventoLinea }) {
  return (
    <li className="traz-evento" data-tipo={evento.tipo}>
      <span className="traz-evento-punto" aria-hidden="true" />
      <time className="traz-evento-fecha" dateTime={evento.fecha}>
        {formatearFecha(evento.fecha, true)}
      </time>
      <article className="traz-tarjeta traz-evento-tarjeta">
        <header className="traz-tarjeta-cabecera">
          <span className="traz-evento-tipo" data-tipo={evento.tipo}>
            {ETIQUETAS[evento.tipo]}
          </span>
          {evento.cama_codigo && (
            <span className="traz-evento-cama">Cama {evento.cama_codigo}</span>
          )}
        </header>
        <h3>{evento.titulo}</h3>
        {evento.detalle && <p className="traz-nota">{evento.detalle}</p>}
      </article>
    </li>
  );
}
