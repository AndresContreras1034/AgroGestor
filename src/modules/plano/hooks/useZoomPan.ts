export {};
import { useCallback, useState } from "react";

interface Punto {
  x: number;
  y: number;
}

const ZOOM_MINIMO = 0.6;
const ZOOM_MAXIMO = 6;

function limitarZoom(valor: number) {
  return Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, valor));
}

export function useZoomPan() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Punto>({ x: 0, y: 0 });

  const acercarEn = useCallback(
    (punto: Punto, factor: number) => {
      const nuevoZoom = limitarZoom(zoom * factor);
      const factorReal = nuevoZoom / zoom;
      setPan({
        x: punto.x - (punto.x - pan.x) * factorReal,
        y: punto.y - (punto.y - pan.y) * factorReal,
      });
      setZoom(nuevoZoom);
    },
    [pan, zoom],
  );
  const acercar = useCallback(
    () => acercarEn({ x: 500, y: 350 }, 1.2),
    [acercarEn],
  );
  const alejar = useCallback(
    () => acercarEn({ x: 500, y: 350 }, 1 / 1.2),
    [acercarEn],
  );

  const enfocar = useCallback(
    (centro: Punto, ancho: number, alto: number) => {
      const nuevoZoom = limitarZoom(Math.min(5, 800 / ancho, 520 / alto));
      setZoom(nuevoZoom);
      setPan({
        x: 500 - centro.x * nuevoZoom,
        y: 350 - centro.y * nuevoZoom,
      });
    },
    [],
  );
  const restablecer = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const obtenerPuntoVista = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number): Punto | null => {
      const matriz = svg.getScreenCTM();
      if (!matriz) {
        return null;
      }
      const punto = svg.createSVGPoint();
      punto.x = clientX;
      punto.y = clientY;
      const transformado = punto.matrixTransform(matriz.inverse());
      return { x: transformado.x, y: transformado.y };
    },
    [],
  );

  const obtenerPuntoPlano = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number): Punto | null => {
      const punto = obtenerPuntoVista(svg, clientX, clientY);
      return punto ? { x: (punto.x - pan.x) / zoom, y: (punto.y - pan.y) / zoom } : null;
    },
    [obtenerPuntoVista, pan, zoom],
  );

  return {
    zoom,
    pan,
    setPan,
    acercar,
    alejar,
    acercarEn,
    enfocar,
    zoomMaximo: ZOOM_MAXIMO,
    restablecer,
    obtenerPuntoVista,
    obtenerPuntoPlano,
  };
}