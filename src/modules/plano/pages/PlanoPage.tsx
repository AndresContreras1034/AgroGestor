import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ControlesZoom } from "../components/ControlesZoom";
import { DetalleCama } from "../components/DetalleCama";
import { ModoEdicion } from "../components/ModoEdicion";
import { PlanoSvg } from "../components/PlanoSvg";
import { useZoomPan } from "../hooks/useZoomPan";
import { guardarPosicionCama, obtenerPlano } from "../services/plano.service";
import type { CamaPlano, Plano } from "../types/plano";
import { crearPlanoReferencia } from "../utils/planoReferencia";
import "./plano.css";

const PLANO_REFERENCIA = crearPlanoReferencia();

function actualizarPosicion(camas: CamaPlano[], codigo: string, x: number, y: number) {
  return camas.map((cama) =>
    cama.codigo === codigo ? { ...cama, pos_x: x, pos_y: y } : cama,
  );
}

export function PlanoPage() {
  const [plano, setPlano] = useState<Plano>(PLANO_REFERENCIA);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(true);
  const [datosReferencia, setDatosReferencia] = useState(true);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [zonaFiltro, setZonaFiltro] = useState("todas");
  const [camaSeleccionada, setCamaSeleccionada] = useState<string | null>("A-01");
  const zoomPan = useZoomPan();
  const planoGuardado = useRef<Plano | null>(null);
  const datosReferenciaRef = useRef(true);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await obtenerPlano(signal);
      planoGuardado.current = respuesta;
      setPlano(respuesta);
      setSinConexion(false);
      datosReferenciaRef.current = false;
      setDatosReferencia(false);
      setError(null);
      setCamaSeleccionada((actual) =>
        actual && respuesta.camas.some((cama) => cama.codigo === actual)
          ? actual
          : respuesta.camas[0]?.codigo ?? null,
      );
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      setSinConexion(true);
      setError(
        cause instanceof ApiError && cause.noConnection
          ? datosReferenciaRef.current
            ? "Sin conexión: configura DATABASE_URL e inicia PostgreSQL para sincronizar."
            : "No se pudo contactar la API. Se conservan en pantalla los últimos datos cargados; los cambios no se podrán guardar."
          : cause instanceof Error
            ? cause.message
            : "No se pudo cargar el plano.",
      );
    } finally {
      if (!signal?.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const camasVisibles = useMemo(
    () => plano.camas.filter((cama) => zonaFiltro === "todas" || cama.zona === zonaFiltro),
    [plano, zonaFiltro],
  );
  const camaActiva =
    camasVisibles.find((cama) => cama.codigo === camaSeleccionada) ?? null;
  const zonaActiva = plano.zonas.find((zona) => zona.codigo === camaActiva?.zona);
  const superficieVisible = camasVisibles.reduce(
    (total, cama) => total + cama.ancho * cama.alto,
    0,
  );

  const enfocarZona = useCallback(
    (codigo: string) => {
      const zona = plano.zonas.find((item) => item.codigo === codigo);
      if (!zona) {
        return;
      }
      setZonaFiltro(codigo);
      zoomPan.enfocar(
        { x: 82 + (zona.pos_x + zona.ancho / 2) * 2.45, y: 135 + (zona.pos_y + zona.alto / 2) * 2.45 },
        (zona.ancho + 8) * 2.45,
        (zona.alto + 16) * 2.45,
      );
      setCamaSeleccionada(
        plano.camas.find((cama) => cama.zona === codigo)?.codigo ?? null,
      );
    },
    [plano, zoomPan],
  );

  const cambiarZona = useCallback(
    (codigo: string) => {
      if (codigo === "todas") {
        setZonaFiltro("todas");
        zoomPan.restablecer();
        return;
      }
      enfocarZona(codigo);
    },
    [enfocarZona, zoomPan],
  );

  const previsualizar = useCallback((codigo: string, x: number, y: number) => {
    setPlano((actual) =>
      actual ? { ...actual, camas: actualizarPosicion(actual.camas, codigo, x, y) } : actual,
    );
  }, []);

  const moverCama = useCallback(async (codigo: string, x: number, y: number) => {
    if (sinConexion) {
      return;
    }
    const planoOriginal = planoGuardado.current;
    const posicionOriginal = planoOriginal?.camas.find((cama) => cama.codigo === codigo);
    if (!planoOriginal || !posicionOriginal) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const guardada = await guardarPosicionCama(codigo, { pos_x: x, pos_y: y });
      const actualizar = (camas: CamaPlano[]) =>
        camas.map((cama) =>
          cama.codigo === codigo
            ? {
                ...cama,
                pos_x: guardada.pos_x,
                pos_y: guardada.pos_y,
                actualizado_en: guardada.actualizado_en,
              }
            : cama,
        );
      planoGuardado.current = { ...planoOriginal, camas: actualizar(planoOriginal.camas) };
      setPlano((actual) => (actual ? { ...actual, camas: actualizar(actual.camas) } : actual));
    } catch (cause) {
      const noHayConexion = cause instanceof ApiError && cause.noConnection;
      if (noHayConexion) {
        setSinConexion(true);
        setModoEdicion(false);
      }
      setPlano((actual) =>
        actual
          ? {
              ...actual,
              camas: actualizarPosicion(
                actual.camas,
                codigo,
                posicionOriginal.pos_x,
                posicionOriginal.pos_y,
              ),
            }
          : actual,
      );
      setError(
        noHayConexion
          ? "Se perdió la conexión con la API. La posición original se restauró y no se guardaron más cambios."
          : cause instanceof ApiError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : "No se pudo guardar la posición de la cama.",
      );
    } finally {
      setGuardando(false);
    }
  }, [sinConexion]);

  return (
    <section className="plano-page">
      <header className="plano-header">
        <div>
          <span className="plano-eyebrow">Distribución de la finca</span>
          <h1>Plano de camas</h1>
          <p>
            {zonaFiltro === "todas"
              ? `${camasVisibles.length} camas · ${superficieVisible.toLocaleString("es-CO")} m² cultivables · esquema visual de la finca`
              : `${camasVisibles.length} camas · ${superficieVisible.toLocaleString("es-CO")} m² en el invernadero`}
          </p>
        </div>
        <Button onClick={() => void cargar()} disabled={cargando || guardando}>
          Actualizar
        </Button>
      </header>

      {sinConexion && error && (
        <div className="plano-aviso-offline" role="status">
          <span className="plano-aviso-icono" aria-hidden="true">i</span>
          <div>
            <strong>{datosReferencia ? "Estás viendo el diseño de referencia" : "API sin conexión"}</strong>
            <p>{error}</p>
          </div>
          <Button onClick={() => void cargar()} disabled={cargando}>
            {cargando ? "Conectando…" : "Reintentar conexión"}
          </Button>
        </div>
      )}
      {!sinConexion && error && <div className="plano-error" role="alert">{error}</div>}

      <ModoEdicion
        activo={modoEdicion}
        deshabilitado={guardando}
        soloLectura={sinConexion}
        onCambiar={() => setModoEdicion((actual) => !actual)}
      />

      <div className="plano-layout">
        <section className="plano-mapa-card" aria-label="Mapa de camas">
          <div className="plano-mapa-toolbar">
            <label className="plano-filtro">
              <span>Vista de finca</span>
              <select value={zonaFiltro} onChange={(event) => cambiarZona(event.target.value)}>
                <option value="todas">Vista general</option>
                {plano.zonas.map((zona) => (
                  <option key={zona.codigo} value={zona.codigo}>
                    Invernadero {zona.codigo} ·{" "}
                    {plano.camas.filter((cama) => cama.zona === zona.codigo).length} camas
                  </option>
                ))}
              </select>
            </label>
            {zonaFiltro !== "todas" && (
              <button
                type="button"
                className="plano-volver-general"
                onClick={() => cambiarZona("todas")}
              >
                ← Vista general de la finca
              </button>
            )}
            <ControlesZoom
              zoom={zoomPan.zoom}
              zoomMaximo={zoomPan.zoomMaximo}
              onAcercar={zoomPan.acercar}
              onAlejar={zoomPan.alejar}
              onRestablecer={zoomPan.restablecer}
            />
          </div>

          <PlanoSvg
            zonas={plano.zonas}
            camas={camasVisibles}
            camaSeleccionada={camaSeleccionada}
            modoEdicion={modoEdicion}
            guardando={guardando}
            zoomPan={zoomPan}
            onSeleccionar={setCamaSeleccionada}
            onEntrarZona={enfocarZona}
            onPrevisualizar={previsualizar}
            onMover={(codigo, x, y) => void moverCama(codigo, x, y)}
          />

          <footer className="plano-leyenda" aria-label="Información del plano">
            <span>
              <i className="plano-muestra-cama" />
              Cama agrícola de 250 m²
            </span>
            <span>
              <i className="plano-muestra-rio" />
              Río y canal de riego
            </span>
            <span>
              <i className="plano-muestra-arbol" />
              Bosque de borde
            </span>
            <small>
              {sinConexion
                ? "Vista de referencia"
                : "Rueda: zoom · Arrastra el fondo: desplazamiento"}
            </small>
          </footer>
        </section>

        <div className="plano-side-panel">
          <DetalleCama
            cama={camaActiva}
            nombreZona={zonaActiva?.nombre}
            sinConexion={sinConexion}
          />
          <section className="plano-resumen-zonas">
            <h2>Áreas de la finca</h2>
            <p className="plano-zonas-descripcion">
              Producción y poscosecha conectadas por caminos internos.
            </p>
            {plano.zonas.map((zona) => {
              const camasZona = plano.camas.filter((cama) => cama.zona === zona.codigo);
              const superficieZona = camasZona.reduce(
                (total, cama) => total + cama.ancho * cama.alto,
                0,
              );
              return (
                <button
                  type="button"
                  key={zona.codigo}
                  className={`plano-zona-resumen${
                    zonaFiltro === zona.codigo ? " activa" : ""
                  }`}
                  onClick={() =>
                    zonaFiltro === zona.codigo
                      ? cambiarZona("todas")
                      : enfocarZona(zona.codigo)
                  }
                >
                  <i className="plano-zona-muestra" />
                  <span>Invernadero {zona.codigo}</span>
                  <strong>
                    {camasZona.length} camas · {superficieZona.toLocaleString("es-CO")} m²
                  </strong>
                </button>
              );
            })}
          </section>
          <section className="plano-instalaciones">
            <h2>Infraestructura productiva</h2>
            <ul>
              <li>Centro cubierto: recepción, lavado, selección y empaque</li>
              <li>Bodega de insumos junto al área de carga</li>
              <li>Reserva de agua conectada al río y al riego</li>
              <li>Rotación exterior, vivero y compostaje fuera del cauce</li>
            </ul>
          </section>
        </div>
      </div>
      {guardando && (
        <p className="plano-guardando" role="status">
          <Spinner /> Guardando posición…
        </p>
      )}
    </section>
  );
}
