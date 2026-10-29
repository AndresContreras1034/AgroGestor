interface ControlesZoomProps {
  zoom: number;
  zoomMaximo?: number;
  onAcercar: () => void;
  onAlejar: () => void;
  onRestablecer: () => void;
}

export function ControlesZoom({
  zoom,
  zoomMaximo = 6,
  onAcercar,
  onAlejar,
  onRestablecer,
}: ControlesZoomProps) {
  return (
    <div className="plano-zoom" aria-label="Controles de zoom">
      <button type="button" onClick={onAlejar} aria-label="Alejar" disabled={zoom <= 0.6}>
        −
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={onAcercar} aria-label="Acercar" disabled={zoom >= zoomMaximo}>
        +
      </button>
      <button type="button" className="plano-zoom-ajustar" onClick={onRestablecer}>
        Ajustar
      </button>
    </div>
  );
}
