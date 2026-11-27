import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ApiError } from "../../../shared/api/errors";
import { obtenerEstadoAsistente, preguntarAsistente } from "../services/analitica.service";
import type { EstadoAsistente, TurnoAsistente } from "../types";

interface Mensaje extends TurnoAsistente {
  meta?: string;
  error?: boolean;
}

const SUGERENCIAS = [
  "¿Cómo va la producción de este año frente al anterior?",
  "¿Qué camas tienen más descarte en los últimos 90 días y qué puede estar pasando?",
  "Resume el estado fitosanitario y dime qué atender primero esta semana",
  "¿Hay alertas IoT que requieran acción hoy?",
  "¿Qué clientes compran más y cómo ha evolucionado el precio por tallo?",
];

/** Negritas **así** dentro de una línea, sin HTML inyectado. */
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith("**") && parte.endsWith("**") ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte,
  );
}

/** Markdown mínimo: títulos, viñetas, listas numeradas y párrafos. */
function Markdown({ texto }: { texto: string }) {
  const bloques: ReactNode[] = [];
  let lista: { ordenada: boolean; items: string[] } | null = null;
  const cerrarLista = () => {
    if (!lista) return;
    const items = lista.items.map((item, i) => <li key={i}>{enLinea(item)}</li>);
    bloques.push(lista.ordenada ? <ol key={bloques.length}>{items}</ol> : <ul key={bloques.length}>{items}</ul>);
    lista = null;
  };
  for (const cruda of texto.split("\n")) {
    const linea = cruda.trimEnd();
    const vineta = /^\s*[-*•]\s+(.*)$/.exec(linea);
    const numero = /^\s*\d+[.)]\s+(.*)$/.exec(linea);
    const titulo = /^#{1,4}\s+(.*)$/.exec(linea);
    if (vineta || numero) {
      const ordenada = Boolean(numero);
      if (lista && lista.ordenada !== ordenada) cerrarLista();
      lista ??= { ordenada, items: [] };
      lista.items.push((vineta ?? numero)![1]);
      continue;
    }
    cerrarLista();
    if (!linea.trim()) continue;
    bloques.push(titulo ? <h4 key={bloques.length}>{enLinea(titulo[1])}</h4> : <p key={bloques.length}>{enLinea(linea)}</p>);
  }
  cerrarLista();
  return <>{bloques}</>;
}

export function AsistenteIA() {
  const [estado, setEstado] = useState<EstadoAsistente | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const controlador = useRef<AbortController | null>(null);
  const fin = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const c = new AbortController();
    obtenerEstadoAsistente(c.signal)
      .then(setEstado)
      .catch(() => {
        if (!c.signal.aborted) setEstado({ configurado: false, modelo: "deepseek-flash", pensamiento: false });
      });
    return () => {
      c.abort();
      controlador.current?.abort();
    };
  }, []);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mensajes, enviando]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || enviando) return;
    const historial: TurnoAsistente[] = mensajes
      .filter((m) => !m.error)
      .map(({ rol, contenido }) => ({ rol, contenido }));
    setMensajes((previos) => [...previos, { rol: "usuario", contenido: limpia }]);
    setTexto("");
    setEnviando(true);
    controlador.current = new AbortController();
    try {
      const r = await preguntarAsistente(limpia, historial, controlador.current.signal);
      const segundos = (r.duracion_ms / 1000).toFixed(1);
      setMensajes((previos) => [
        ...previos,
        {
          rol: "asistente",
          contenido: r.respuesta,
          meta: `${r.modelo} · ${segundos} s · ${(r.tokens_entrada + r.tokens_salida).toLocaleString("es-CO")} tokens`,
        },
      ]);
    } catch (causa) {
      if (controlador.current?.signal.aborted) return;
      const mensaje =
        causa instanceof ApiError
          ? causa.noConnection
            ? "No hay conexión con el backend."
            : causa.message
          : "No se pudo obtener respuesta del asistente.";
      if (causa instanceof ApiError && causa.code === "ia_no_configurada") {
        setEstado((e) => (e ? { ...e, configurado: false } : e));
      }
      setMensajes((previos) => [...previos, { rol: "asistente", contenido: mensaje, error: true }]);
    } finally {
      setEnviando(false);
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(texto);
  }

  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar(texto);
    }
  }

  const configurado = estado?.configurado ?? false;

  return (
    <section className="analitica-panel asistente">
      <div className="analitica-panel-header">
        <div>
          <h2>Asistente IA</h2>
          <p>Pregunta en lenguaje natural sobre producción, calidad, IoT y ventas de la finca</p>
        </div>
        <div className="asistente-acciones">
          {estado && (
            <span className={`asistente-chip ${configurado ? "asistente-chip-ok" : "asistente-chip-off"}`}>
              {configurado ? `DeepSeek · ${estado.modelo}` : "Sin configurar"}
            </span>
          )}
          {mensajes.length > 0 && (
            <button type="button" className="asistente-limpiar" onClick={() => setMensajes([])} disabled={enviando}>
              Nueva conversación
            </button>
          )}
        </div>
      </div>

      {estado && !configurado ? (
        <div className="asistente-vacio">
          <strong>Configura la clave de DeepSeek para activar el asistente</strong>
          <p>
            Agrega <code>DEEPSEEK_API_KEY</code> en <code>src-tauri/.env</code> y reinicia{" "}
            <code>npm run tauri dev</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="asistente-conversacion" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="asistente-vacio">
                <strong>¿Qué quieres saber de la finca?</strong>
                <p>El asistente responde con los datos actuales de AgroGestor. Prueba con una de estas preguntas:</p>
                <div className="asistente-sugerencias">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" onClick={() => void enviar(s)} disabled={!estado || enviando}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <article
                key={i}
                className={`asistente-mensaje asistente-${m.rol}${m.error ? " asistente-error" : ""}`}
              >
                {m.rol === "asistente" && !m.error ? <Markdown texto={m.contenido} /> : <p>{m.contenido}</p>}
                {m.meta && <small>{m.meta}</small>}
              </article>
            ))}
            {enviando && (
              <article className="asistente-mensaje asistente-asistente asistente-pensando">
                <span />
                <span />
                <span />
                <small>Analizando los datos de la finca…</small>
              </article>
            )}
            <div ref={fin} />
          </div>
          <form className="asistente-form" onSubmit={alEnviar}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={alTeclear}
              placeholder="Ej.: ¿Por qué bajó la producción de la zona B en octubre?"
              rows={2}
              maxLength={1000}
              disabled={!estado || enviando}
              aria-label="Pregunta para el asistente"
            />
            <button type="submit" disabled={!estado || enviando || !texto.trim()}>
              {enviando ? "Consultando…" : "Preguntar"}
            </button>
          </form>
          <p className="asistente-nota">
            Respuestas generadas por IA a partir de los datos registrados. Verifica las cifras críticas antes de tomar
            decisiones.
          </p>
        </>
      )}
    </section>
  );
}
