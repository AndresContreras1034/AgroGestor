import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CamaShape } from "./CamaShape";
import type { CamaPlano, ZonaPlano } from "../types/plano";
import type { useZoomPan } from "../hooks/useZoomPan";
import {
  ALTO_PLANO,
  ANCHO_PLANO,
  CAMINO_INTERNO_X,
  ESCALA_METROS,
  ORIGEN_PARCELAS,
  tipoDeZona,
} from "../utils/planoGeometria";

const ZOOM_DETALLE = 1.8;
const ANDEN = 3.2;
const CAMINO_X_M = (CAMINO_INTERNO_X - ORIGEN_PARCELAS.x) / ESCALA_METROS;
const ARBOLES_X = [470, 518, 566, 614, 662, 710, 758, 806];

interface PlanoSvgProps {
  zonas: ZonaPlano[];
  camas: CamaPlano[];
  camaSeleccionada: string | null;
  modoEdicion: boolean;
  guardando: boolean;
  zoomPan: ReturnType<typeof useZoomPan>;
  onSeleccionar: (codigo: string) => void;
  onVerDetalle: (codigo: string) => void;
  onEntrarZona: (codigo: string) => void;
  onPrevisualizar: (codigo: string, x: number, y: number) => void;
  onMover: (codigo: string, x: number, y: number) => void;
}

type Gesto =
  | {
      tipo: "pan";
      idPuntero: number;
      xInicial: number;
      yInicial: number;
      panXInicial: number;
      panYInicial: number;
    }
  | {
      tipo: "cama";
      idPuntero: number;
      codigo: string;
      desfaseX: number;
      desfaseY: number;
      inicioX: number;
      inicioY: number;
      movimiento: boolean;
    };

function Arbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="mapa-arbol">
      <circle r="7" fill="#6f8f5e" stroke="#f4f5ec" strokeWidth="1.5" />
      <circle r="2.4" fill="#9db387" />
    </g>
  );
}

function Tanque({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="12" cy="28" rx="12" ry="4" fill="#7e9d99" />
      <rect x="0" y="5" width="24" height="23" fill="#d6e0d6" stroke="#66827a" strokeWidth="1.2" />
      <ellipse cx="12" cy="5" rx="12" ry="4" fill="#eff2e8" stroke="#66827a" strokeWidth="1.2" />
      <ellipse cx="12" cy="28" rx="12" ry="4" fill="#a9c2b9" stroke="#66827a" strokeWidth="1" />
    </g>
  );
}

function Bodega({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="150" height="80" rx="4" fill="#ece9dc" stroke="#737b68" strokeWidth="1.5" />
      <path d="M0 4q0-4 4-4h142q4 0 4 4v16H0z" fill="#596b56" />
      <text x="75" y="14" textAnchor="middle" className="mapa-bloque-titulo-claro">BODEGA DE INSUMOS</text>
      <rect x="12" y="32" width="40" height="38" rx="2" fill="#c7d0bc" stroke="#87917d" />
      <rect x="62" y="32" width="40" height="38" rx="2" fill="#c7d0bc" stroke="#87917d" />
      <rect x="112" y="32" width="26" height="38" rx="2" fill="#b9a56e" stroke="#6b5a30" />
    </g>
  );
}

function Vivero({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="170" height="80" rx="4" fill="#e0e9cd" stroke="#718463" strokeWidth="1.4" />
      <path d="M0 4q0-4 4-4h162q4 0 4 4v16H0z" fill="#6f8858" />
      <text x="85" y="14" textAnchor="middle" className="mapa-bloque-titulo-claro">VIVERO · COMPOSTA</text>
      {[34, 48, 62].map((fila) => (
        <path key={fila} d={`M12 ${fila}h100`} stroke="#879a62" strokeWidth="7" strokeDasharray="11 3" />
      ))}
      <rect x="124" y="30" width="36" height="38" rx="3" fill="#b8a37a" stroke="#7d6b47" />
    </g>
  );
}

const ETAPAS = ["RECEPCIÓN", "LAVADO", "SELECCIÓN", "EMPAQUE"];

function CentroPoscosecha({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="330" height="134" rx="6" fill="#f7f6ee" stroke="#737b68" strokeWidth="1.6" />
      <path d="M0 6q0-6 6-6h318q6 0 6 6v18H0z" fill="#485d4a" />
      <text x="12" y="16" className="mapa-centro-titulo">CENTRO DE POSCOSECHA</text>
      <text x="318" y="16" textAnchor="end" className="mapa-centro-subtitulo">FLUJO LIMPIO · 4 ETAPAS</text>
      {ETAPAS.map((etapa, index) => (
        <g key={etapa} transform={`translate(${6 + index * 82} 32)`}>
          <rect width="74" height="64" rx="3" fill="#e7ecdc" stroke="#aab29e" />
          <circle cx="10" cy="10" r="5.5" fill="#55745a" />
          <text x="10" y="12.3" textAnchor="middle" className="mapa-etapa-numero">{index + 1}</text>
          <text x="20" y="12.5" className="mapa-etapa-titulo">{etapa}</text>
          <rect x="17" y="22" width="40" height="22" rx="2" fill="#d7dfc6" stroke="#93a07c" />
          {index < 3 && <path d="M75 32l6 4-6 4z" fill="#567453" />}
        </g>
      ))}
      <rect x="6" y="104" width="318" height="22" rx="3" fill="#e1e6d8" stroke="#aab29e" />
      <text x="165" y="119" textAnchor="middle" className="mapa-etapa-detalle">ANDÉN DE CARGA · DESPACHO</text>
    </g>
  );
}

function Acceso({ zona }: { zona: ZonaPlano }) {
  const cy = zona.pos_y + zona.alto / 2;
  const alEste = zona.pos_x + zona.ancho / 2 < CAMINO_X_M;
  const pared = alEste ? zona.pos_x + zona.ancho : zona.pos_x;
  const xSenda = Math.min(pared, CAMINO_X_M);
  const anchoSenda = Math.abs(CAMINO_X_M - pared);
  return (
    <g pointerEvents="none">
      <rect x={xSenda} y={cy - 2.5} width={anchoSenda} height="5" fill="#e7d9b9" />
      <rect x={pared - 0.9} y={cy - 4} width="1.8" height="8" fill="#b9a56e" stroke="#6b5a30" strokeWidth=".3" />
    </g>
  );
}

function BaseInvernadero({ zona }: { zona: ZonaPlano }) {
  const { pos_x: x, pos_y: y, ancho: w, alto: h } = zona;
  return (
    <g className="plano-zona plano-zona-invernadero">
      <rect x={x - ANDEN} y={y - ANDEN} width={w + ANDEN * 2} height={h + ANDEN * 2} rx="1.2" fill="#e8e4d2" stroke="#bcb69c" strokeWidth=".4" />
      <rect x={x - 1.2} y={y - 1.2} width={w + 2.4} height={h + 2.4} rx=".6" fill="#d9d3b5" stroke="#3b5a43" strokeWidth="1" />
    </g>
  );
}

function TechoInvernadero({ zona }: { zona: ZonaPlano }) {
  const { pos_x: x, pos_y: y, ancho: w, alto: h } = zona;
  const naves = Math.max(2, Math.round(w / 24));
  const anchoNave = w / naves;
  return (
    <g className="plano-techo" pointerEvents="none">
      {Array.from({ length: naves }, (_, i) => (
        <g key={`${zona.codigo}-nave-${i}`}>
          <rect x={x + i * anchoNave} y={y} width={anchoNave} height={h} fill="#ffffff" opacity={i % 2 ? 0.1 : 0.16} />
          <path d={`M${x + i * anchoNave + anchoNave / 2} ${y + 0.8}V${y + h - 0.8}`} stroke="#4f7457" strokeWidth=".4" strokeDasharray="2.4 1.2" opacity=".6" />
        </g>
      ))}
      {Array.from({ length: naves - 1 }, (_, i) => (
        <rect key={`${zona.codigo}-canaleta-${i}`} x={x + (i + 1) * anchoNave - 0.35} y={y} width=".7" height={h} fill="#8fa7a8" opacity=".75" />
      ))}
      <path d={`M${x + 0.8} ${y + 1.1}h${w - 1.6}M${x + 0.8} ${y + h - 1.1}h${w - 1.6}`} stroke="#4f7a5a" strokeWidth=".55" strokeDasharray="1.2 .6" opacity=".65" />
      <Acceso zona={zona} />
    </g>
  );
}

function CampoAbierto({ zona }: { zona: ZonaPlano }) {
  const { pos_x: x, pos_y: y, ancho: w, alto: h } = zona;
  const surcos = Array.from({ length: Math.floor(h / 3.5) }, (_, i) => y + 1.75 + i * 3.5);
  return (
    <g className="plano-zona plano-zona-campo">
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx="1" fill="#d8cf9e" />
      {surcos.map((s) => (
        <path key={`${zona.codigo}-surco-${s}`} d={`M${x + 1.5} ${s}H${x + w - 1.5}`} stroke="#6f9a55" strokeWidth=".9" strokeLinecap="round" strokeDasharray="0.01 2.4" opacity=".8" />
      ))}
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx="1" fill="none" stroke="#7d6f3f" strokeWidth=".35" />
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx="1" fill="none" stroke="#7d6f3f" strokeWidth="1.3" strokeDasharray="0.01 5" />
      <Acceso zona={zona} />
    </g>
  );
}

function EtiquetaZona({ zona, onEntrar }: { zona: ZonaPlano; onEntrar: (codigo: string) => void }) {
  const campo = tipoDeZona(zona) === "campo_abierto";
  const texto = `${campo ? "CAMPO" : "INVERNADERO"} ${zona.codigo} · ENTRAR`;
  const ancho = texto.length * 2.7 + 5;
  const y = zona.pos_y - 10.5;
  return (
    <g
      className="plano-invernadero-control"
      role="button"
      tabIndex={0}
      aria-label={`Entrar a ${campo ? "campo abierto" : "invernadero"} ${zona.codigo}`}
      onClick={(event) => { event.stopPropagation(); onEntrar(zona.codigo); }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEntrar(zona.codigo);
        }
      }}
    >
      <rect x={zona.pos_x - 2} y={y} width={ancho} height="6.5" rx="1.4" fill="#fffef8" stroke="#6b8066" strokeWidth=".45" />
      <text x={zona.pos_x + 0.5} y={y + 4.6} className="plano-zona-etiqueta">{texto}</text>
    </g>
  );
}

export function PlanoSvg({
  zonas,
  camas,
  camaSeleccionada,
  modoEdicion,
  guardando,
  zoomPan,
  onSeleccionar,
  onVerDetalle,
  onEntrarZona,
  onPrevisualizar,
  onMover,
}: PlanoSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestoRef = useRef<Gesto | null>(null);
  const camasRef = useRef(camas);
  camasRef.current = camas;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const acercarConRueda = (event: WheelEvent) => {
      event.preventDefault();
      const punto = zoomPan.obtenerPuntoVista(svg, event.clientX, event.clientY);
      if (punto) {
        zoomPan.acercarEn(punto, event.deltaY < 0 ? 1.12 : 1 / 1.12);
      }
    };

    svg.addEventListener("wheel", acercarConRueda, { passive: false });
    return () => svg.removeEventListener("wheel", acercarConRueda);
  }, [zoomPan.acercarEn, zoomPan.obtenerPuntoVista]);

  function iniciarGesto(event: ReactPointerEvent<SVGSVGElement>) {
    if (guardando || !svgRef.current) {
      return;
    }
    const objetivo = event.target as Element;
    if (objetivo.closest(".plano-invernadero-control")) {
      return;
    }
    const destino = objetivo.closest<SVGGElement>("[data-cama]");
    const puntoVista = zoomPan.obtenerPuntoVista(svgRef.current, event.clientX, event.clientY);
    const puntoPlano = zoomPan.obtenerPuntoPlano(svgRef.current, event.clientX, event.clientY);
    if (!puntoVista || !puntoPlano) {
      return;
    }
    if (destino) {
      const codigo = destino.dataset.cama;
      if (!codigo) {
        return;
      }
      onSeleccionar(codigo);
      if (!modoEdicion) {
        return;
      }
      const cama = camasRef.current.find((item) => item.codigo === codigo);
      if (!cama) {
        return;
      }
      gestoRef.current = {
        tipo: "cama",
        idPuntero: event.pointerId,
        codigo,
        desfaseX: (puntoPlano.x - ORIGEN_PARCELAS.x) / ESCALA_METROS - cama.pos_x,
        desfaseY: (puntoPlano.y - ORIGEN_PARCELAS.y) / ESCALA_METROS - cama.pos_y,
        inicioX: cama.pos_x,
        inicioY: cama.pos_y,
        movimiento: false,
      };
    } else {
      gestoRef.current = {
        tipo: "pan",
        idPuntero: event.pointerId,
        xInicial: puntoVista.x,
        yInicial: puntoVista.y,
        panXInicial: zoomPan.pan.x,
        panYInicial: zoomPan.pan.y,
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moverPuntero(event: ReactPointerEvent<SVGSVGElement>) {
    const gesto = gestoRef.current;
    if (!gesto || gesto.idPuntero !== event.pointerId || !svgRef.current) {
      return;
    }
    if (gesto.tipo === "pan") {
      const punto = zoomPan.obtenerPuntoVista(svgRef.current, event.clientX, event.clientY);
      if (punto) {
        zoomPan.setPan({
          x: gesto.panXInicial + punto.x - gesto.xInicial,
          y: gesto.panYInicial + punto.y - gesto.yInicial,
        });
      }
      return;
    }

    const punto = zoomPan.obtenerPuntoPlano(svgRef.current, event.clientX, event.clientY);
    const cama = camasRef.current.find((item) => item.codigo === gesto.codigo);
    const zona = zonas.find((item) => item.codigo === cama?.zona);
    if (!punto || !cama || !zona) {
      return;
    }
    const x = Math.max(
      zona.pos_x,
      Math.min(zona.pos_x + zona.ancho - cama.ancho, (punto.x - ORIGEN_PARCELAS.x) / ESCALA_METROS - gesto.desfaseX),
    );
    const y = Math.max(
      zona.pos_y,
      Math.min(zona.pos_y + zona.alto - cama.alto, (punto.y - ORIGEN_PARCELAS.y) / ESCALA_METROS - gesto.desfaseY),
    );
    const posX = Math.round(x * 2) / 2;
    const posY = Math.round(y * 2) / 2;
    if (posX !== cama.pos_x || posY !== cama.pos_y) {
      gesto.movimiento = true;
      onPrevisualizar(gesto.codigo, posX, posY);
    }
  }

  function terminarGesto(event: ReactPointerEvent<SVGSVGElement>) {
    const gesto = gestoRef.current;
    if (!gesto || gesto.idPuntero !== event.pointerId) {
      return;
    }
    gestoRef.current = null;
    if (gesto.tipo === "cama" && gesto.movimiento) {
      const cama = camasRef.current.find((item) => item.codigo === gesto.codigo);
      if (cama && (cama.pos_x !== gesto.inicioX || cama.pos_y !== gesto.inicioY)) {
        onMover(gesto.codigo, cama.pos_x, cama.pos_y);
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const claseWrap = [
    "plano-svg-wrap",
    modoEdicion ? "modo-edicion" : "",
    zoomPan.zoom < ZOOM_DETALLE ? "zoom-bajo" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={claseWrap}>
      <svg
        ref={svgRef}
        className="plano-svg"
        viewBox={`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Plano ilustrado de la finca Santandercito"
        onPointerDown={iniciarGesto}
        onPointerMove={moverPuntero}
        onPointerUp={terminarGesto}
        onPointerCancel={terminarGesto}
      >
        <defs>
          <linearGradient id="plano-rio" x2="0" y2="1">
            <stop stopColor="#8fb9b3" />
            <stop offset="1" stopColor="#63958f" />
          </linearGradient>
          <pattern id="plano-cama-suelo" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M1 0v8M5 0v8" stroke="#806a49" strokeOpacity=".34" strokeWidth=".8" />
            <circle cx="3" cy="2" r=".55" fill="#567a4a" />
            <circle cx="7" cy="6" r=".55" fill="#6a8954" />
          </pattern>
          <marker id="plano-flecha-proceso" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0 0 5 2.5 0 5z" fill="#567453" />
          </marker>
          <pattern id="plano-cubierta" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0h16M0 8h16" stroke="#9bb19b" strokeOpacity=".35" strokeWidth=".55" />
          </pattern>
        </defs>

        <g transform={`translate(${zoomPan.pan.x} ${zoomPan.pan.y}) scale(${zoomPan.zoom})`}>
        <rect width={ANCHO_PLANO} height={ALTO_PLANO} fill="#e6e8dc" />
        <rect x="16" y="16" width="968" height="618" rx="8" fill="#f4f5ec" stroke="#4e6651" strokeWidth="2" />

        <g transform="translate(48 40)">
          <text className="mapa-kicker">FINCA SANTANDERCITO</text>
          <text y="14" className="mapa-subtitulo">UNIDAD DE PRODUCCIÓN · PLANO GENERAL</text>
        </g>

        <g className="mapa-arboleda">
          {ARBOLES_X.map((x) => (
            <Arbol key={`arbol-${x}`} x={x} y={40} />
          ))}
        </g>

        <g className="mapa-rio">
          <path d="M962 22C948 110 978 200 962 300S946 480 962 628" fill="none" stroke="#d4e0d1" strokeWidth="20" strokeLinecap="round" />
          <path d="M962 22C948 110 978 200 962 300S946 480 962 628" fill="none" stroke="url(#plano-rio)" strokeWidth="13" strokeLinecap="round" />
        </g>

        <g className="mapa-camino">
          <path d={`M24 458H890M${CAMINO_INTERNO_X} 84V458`} fill="none" stroke="#a89067" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M24 458H890M${CAMINO_INTERNO_X} 84V458`} fill="none" stroke="#e7d9b9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 458h35" fill="none" stroke="#52684e" strokeWidth="4" />
          <path d="M34 448v20m9-20v20" stroke="#52684e" strokeWidth="2" />
        </g>

        <g className="mapa-canal">
          <path d="M952 112H936M908 132V476H408" fill="none" stroke="#6f9c97" strokeWidth="3" strokeDasharray="7 4" />
        </g>

        <g className="mapa-tanques">
          <text x="868" y="88" className="mapa-etiqueta">RESERVA DE AGUA</text>
          {[0, 1, 2].map((i) => (
            <Tanque key={`tanque-${i}`} x={868 + i * 28} y={96} />
          ))}
        </g>

        <g
          transform={`translate(${ORIGEN_PARCELAS.x} ${ORIGEN_PARCELAS.y}) scale(${ESCALA_METROS})`}
          className="plano-parcelas"
        >
          {zonas.map((zona) =>
            tipoDeZona(zona) === "campo_abierto" ? (
              <CampoAbierto key={zona.codigo} zona={zona} />
            ) : (
              <BaseInvernadero key={zona.codigo} zona={zona} />
            ),
          )}
          {camas.map((cama) => (
            <CamaShape
              key={cama.codigo}
              cama={cama}
              seleccionada={camaSeleccionada === cama.codigo}
              onSeleccionar={onSeleccionar}
              onVerDetalle={onVerDetalle}
            />
          ))}
          {zonas
            .filter((zona) => tipoDeZona(zona) !== "campo_abierto")
            .map((zona) => (
              <TechoInvernadero key={`techo-${zona.codigo}`} zona={zona} />
            ))}
          {zonas.map((zona) => (
            <EtiquetaZona key={`etiqueta-${zona.codigo}`} zona={zona} onEntrar={onEntrarZona} />
          ))}
        </g>

        <g className="mapa-infraestructura">
          <text x="44" y="482" className="mapa-etiqueta">ACCESO DE SERVICIO</text>
          <Vivero x={40} y={490} />
          <Bodega x={230} y={490} />
          <CentroPoscosecha x={410} y={490} />
          <text x="756" y="494" className="mapa-etiqueta">CANAL DE RIEGO PRINCIPAL</text>
        </g>

        <g className="mapa-senaletica">
          <g transform="translate(938 590)">
            <path d="M0 12V-12M0-12-5-4M0-12 5-4" fill="none" stroke="#42624b" strokeWidth="2" strokeLinecap="round" />
            <text y="-18" textAnchor="middle" className="mapa-etiqueta">N</text>
          </g>
          <g transform="translate(756 606)">
            <path d="M0 0h175" stroke="#465b47" strokeWidth="2.5" />
            <path d="M0-4v8M87.5-3v3M175-4v8" stroke="#465b47" strokeWidth="1.5" />
            <text x="87.5" y="-8" textAnchor="middle" className="mapa-etiqueta">50 m</text>
          </g>
        </g>

        </g>
      </svg>
    </div>
  );
}
