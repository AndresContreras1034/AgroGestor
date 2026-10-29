import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CamaShape } from "./CamaShape";
import type { CamaPlano, ZonaPlano } from "../types/plano";
import type { useZoomPan } from "../hooks/useZoomPan";

const ANCHO_PLANO = 1000;
const ALTO_PLANO = 570;
const ESCALA_METROS = 2.45;
const ORIGEN_PARCELAS = { x: 82, y: 135 };

const ARBOLES = [
  [52, 94, 1],
  [52, 170, 1],
  [52, 252, 1],
  [52, 334, 1],
  [52, 490, 1],
  [52, 570, 1],
  [170, 534, 1],
  [290, 534, 1],
  [410, 534, 1],
  [530, 534, 1],
  [650, 534, 1],
  [830, 534, 1],
  [928, 110, 1],
  [928, 215, 1],
  [928, 320, 1],
  [928, 430, 1],
  [928, 545, 1],
] as const;

interface PlanoSvgProps {
  zonas: ZonaPlano[];
  camas: CamaPlano[];
  camaSeleccionada: string | null;
  modoEdicion: boolean;
  guardando: boolean;
  zoomPan: ReturnType<typeof useZoomPan>;
  onSeleccionar: (codigo: string) => void;
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

function Arbol({ x, y, escala }: { x: number; y: number; escala: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`} className="paisaje-arbol">
      <circle r="6" fill="#68805c" stroke="#f1f0e2" strokeWidth="1.2" />
      <circle r="2.1" fill="#93a47c" />
      <path d="M-4-3 4 3M4-3-4 3" stroke="#aab692" strokeWidth=".65" />
    </g>
  );
}

function CentroPoscosecha({ x, y }: { x: number; y: number }) {
  const estaciones = [
    { nombre: "RECEPCIÓN", detalle: ["Pesaje", "de cosecha"], color: "#e7eadb" },
    { nombre: "LAVADO", detalle: ["Agua", "filtrada"], color: "#dcebe5" },
    { nombre: "SELECCIÓN", detalle: ["Corte y", "calidad"], color: "#e9ead8" },
    { nombre: "EMPAQUE", detalle: ["Frío y", "despacho"], color: "#e6e9df" },
  ];

  return (
    <g transform={`translate(${x} ${y})`} className="paisaje-poscosecha">
      <rect x="-7" y="-7" width="214" height="178" rx="10" fill="#405444" opacity=".13" />
      <rect x="0" y="0" width="200" height="164" rx="7" fill="#f3f1e7" stroke="#737b68" strokeWidth="2" />
      <path d="M3 7q0-4 4-4h186q4 0 4 4v20H3z" fill="#485d4a" />
      <text x="12" y="16" className="paisaje-centro-titulo">CENTRO DE POSCOSECHA</text>
      <text x="190" y="16" textAnchor="end" className="paisaje-centro-subtitulo">FLUJO LIMPIO · 4 ETAPAS</text>
      <path d="M3 27h194" stroke="#b3baa7" strokeWidth="1" />
      {estaciones.map((estacion, index) => {
        const sx = 5 + index * 47;
        return (
          <g key={estacion.nombre} transform={`translate(${sx} 34)`}>
            <rect width="42" height="105" rx="3" fill={estacion.color} stroke="#aab29e" strokeWidth="1" />
            <circle cx="8" cy="9" r="5" fill="#55745a" />
            <text x="8" y="11" textAnchor="middle" className="paisaje-etapa-numero">{index + 1}</text>
            <text x="25" y="23" textAnchor="middle" className="paisaje-etapa-titulo">{estacion.nombre}</text>
            <path d="M4 29h34" stroke="#bdc3b4" />
            {index === 0 && (
              <g transform="translate(7 42)">
                <rect x="0" y="10" width="15" height="16" rx="1" fill="#b68e59" stroke="#80694a" />
                <path d="M3 10V6h9v4m-9 7h9m-9 4h9" fill="none" stroke="#80694a" strokeWidth="1" />
                <rect x="22" y="10" width="15" height="16" rx="1" fill="#c19d68" stroke="#80694a" />
                <path d="M25 10V6h9v4m-9 7h9m-9 4h9" fill="none" stroke="#80694a" strokeWidth="1" />
                <path d="M4 35h31" stroke="#89927c" strokeWidth="2" />
                <circle cx="10" cy="35" r="2" fill="#596b55" />
                <circle cx="28" cy="35" r="2" fill="#596b55" />
              </g>
            )}
            {index === 1 && (
              <g transform="translate(7 43)">
                <rect x="1" y="6" width="35" height="23" rx="3" fill="#8bb4ac" stroke="#547b76" strokeWidth="1.4" />
                <path d="M5 13h27m-23 4h20m-16 4h13" stroke="#e9f4e9" strokeWidth="1.1" />
                <path d="M9 0v5m17-5v5" stroke="#547b76" strokeWidth="2" />
                <path d="M18 31v6m-11 0h23" stroke="#86785b" strokeWidth="1.5" />
              </g>
            )}
            {index === 2 && (
              <g transform="translate(7 43)">
                <rect x="1" y="8" width="35" height="22" rx="2" fill="#d8c99e" stroke="#847957" strokeWidth="1.2" />
                <path d="M5 13h27m-24 5h21m-18 5h15" stroke="#8e825f" strokeWidth="1" />
                <path d="M8 4h22" stroke="#63785b" strokeWidth="2" />
                <path d="m23 2 7 2-7 2" fill="none" stroke="#63785b" strokeWidth="1.5" />
              </g>
            )}
            {index === 3 && (
              <g transform="translate(7 43)">
                <path d="M2 14h35M2 27h35" stroke="#77816f" strokeWidth="2" />
                <circle cx="8" cy="14" r="2" fill="#526650" />
                <circle cx="20" cy="14" r="2" fill="#526650" />
                <circle cx="32" cy="14" r="2" fill="#526650" />
                <rect x="5" y="2" width="12" height="10" rx="1" fill="#bd9860" stroke="#88734f" />
                <rect x="22" y="2" width="12" height="10" rx="1" fill="#bd9860" stroke="#88734f" />
                <path d="M5 6h12m5 0h12" stroke="#e6d5aa" />
              </g>
            )}
            <text x="21" y="91" textAnchor="middle" className="paisaje-etapa-detalle">
              <tspan x="21">{estacion.detalle[0]}</tspan>
              <tspan x="21" dy="4">{estacion.detalle[1]}</tspan>
            </text>
            {index < estaciones.length - 1 && (
              <path d="M42 84h7" stroke="#567453" strokeWidth="2" markerEnd="url(#plano-flecha-proceso)" />
            )}
          </g>
        );
      })}
      <path d="M8 148h184" stroke="#c1c5b7" />
      <path d="M14 154h172" stroke="#7c856f" strokeWidth="2" strokeDasharray="8 5" />
      <path d="M27 164v7m37-7v7m37-7v7m37-7v7m37-7v7" stroke="#6b705f" strokeWidth="2" />
      <text x="100" y="160" textAnchor="middle" className="paisaje-anden">ANDÉN DE CARGA · DESPACHO</text>
      <rect x="164" y="143" width="28" height="20" rx="2" fill="#d8ded1" stroke="#707d6d" />
      <path d="M169 148h18m-18 4h18m-18 4h18" stroke="#91a18b" strokeWidth="1.2" />
    </g>
  );
}

function Bodega({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="paisaje-bodega">
      <rect x="2" y="4" width="82" height="54" rx="4" fill="#455643" opacity=".16" />
      <rect x="0" y="0" width="82" height="52" rx="3" fill="#e9e7da" stroke="#737b68" strokeWidth="1.5" />
      <path d="M3 5h76v8H3z" fill="#596b56" />
      <path d="M8 6v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5m7-5v5" stroke="#c1c9b8" strokeWidth=".8" />
      <path d="M9 21h23v21H9zm37 0h26v21H46z" fill="#c7d0bc" stroke="#87917d" />
      <path d="M13 26h15m-15 5h15m-15 5h15m37-10H50m15 5H50m15 5H50" stroke="#899479" strokeWidth="1.2" />
      <path d="M34 22v20" stroke="#899479" />
      <rect x="5" y="-13" width="72" height="12" rx="6" fill="#fffdf7" stroke="#c6cebb" />
      <text x="41" y="-4.5" textAnchor="middle" className="paisaje-bodega-titulo">BODEGA DE INSUMOS</text>
    </g>
  );
}

function ParcelaExterior({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="paisaje-parcela-exterior">
      <rect x="0" y="0" width="260" height="82" rx="4" fill="#b9ce9d" stroke="#718463" strokeWidth="1.5" />
      <rect x="5" y="4" width="112" height="13" rx="6" fill="#f7f5e8" stroke="#c3cdb3" />
      <text x="12" y="13" className="paisaje-parcela-titulo">ROTACIÓN A CIELO ABIERTO</text>
      {Array.from({ length: 5 }, (_, fila) => {
        const yFila = 27 + fila * 10;
        return (
          <g key={`surco-${fila}`}>
            <path d={`M10 ${yFila + 2}h240`} stroke="#8e9b71" strokeWidth="2.2" strokeLinecap="round" />
            {Array.from({ length: 20 }, (_, planta) => (
              <g key={`planta-${fila}-${planta}`} transform={`translate(${16 + planta * 12} ${yFila})`}>
                <circle r="1.7" fill="#55784b" />
                <path d="M0 0q-2-3-3-2m3 2q2-3 3-2" fill="none" stroke="#668653" strokeWidth=".8" />
              </g>
            ))}
          </g>
        );
      })}
      <text x="250" y="78" textAnchor="end" className="paisaje-parcela-subtitulo">SIEMBRA ESCALONADA</text>
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

  return (
    <div className={`plano-svg-wrap${modoEdicion ? " modo-edicion" : ""}`}>
      <svg
        ref={svgRef}
        className="plano-svg"
        viewBox={`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`}
        role="group"
        aria-label="Plano ilustrado de la finca Santandersito"
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
        <rect width={ANCHO_PLANO} height={ALTO_PLANO} fill="#e8e7dc" />
        <rect x="22" y="24" width="956" height="524" rx="8" fill="#edf0e3" stroke="#4e6651" strokeWidth="2" />
        <rect x="31" y="33" width="938" height="502" rx="4" fill="none" stroke="#a3ad97" strokeWidth=".8" strokeDasharray="3 4" />
        <path d="M32 414h936" stroke="#b6c1a9" strokeWidth="1.2" strokeDasharray="3 5" />
        <g transform="translate(48 52)">
          <text className="paisaje-plano-kicker">FINCA SANTANDERSITO</text>
          <text y="17" className="paisaje-plano-subtitulo">UNIDAD DE PRODUCCIÓN · PLANO GENERAL</text>
        </g>
        <g transform="translate(835 51)">
          <rect width="111" height="28" rx="4" fill="#e1e8d8" stroke="#bdc8b3" />
          <circle cx="13" cy="14" r="4" fill="#5c7652" />
          <text x="23" y="12" className="paisaje-plano-dato">25 CAMAS</text>
          <text x="23" y="21" className="paisaje-plano-dato-secundario">3 INVERNADEROS</text>
        </g>

        <g className="paisaje-arboleda">
          {ARBOLES.map(([x, y, escala], index) => (
            <Arbol key={`arbol-${index}`} x={x} y={y} escala={escala} />
          ))}
        </g>

        <g className="paisaje-camino">
          <path d="M22 394h673v-31" fill="none" stroke="#a89067" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 394h673v-31" fill="none" stroke="#e7d9b9" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 394h669v-29" fill="none" stroke="#bca87c" strokeWidth="1" strokeDasharray="6 8" />
          <path d="M199 394v-129m301 129v-43" fill="none" stroke="#a89067" strokeWidth="13" strokeLinecap="round" />
          <path d="M199 394v-129m301 129v-43" fill="none" stroke="#e7d9b9" strokeWidth="8" strokeLinecap="round" />
          <path d="M695 363h44" fill="none" stroke="#a89067" strokeWidth="13" strokeLinecap="round" />
          <path d="M695 363h44" fill="none" stroke="#e7d9b9" strokeWidth="8" strokeLinecap="round" />
          <path d="M21 394h35" fill="none" stroke="#52684e" strokeWidth="4" />
          <path d="M34 384v20m9-20v20" stroke="#52684e" strokeWidth="2" />
        </g>

        <g className="paisaje-rio">
          <path d="M958 86q-18 50 0 94t-2 89 2 93-2 95 2 90" fill="none" stroke="#d4e0d1" strokeWidth="20" strokeLinecap="round" />
          <path d="M958 86q-18 50 0 94t-2 89 2 93-2 95 2 90" fill="none" stroke="url(#plano-rio)" strokeWidth="13" strokeLinecap="round" />
          <path d="M958 88q-13 48 1 91t-2 89 2 94-2 94 2 88" fill="none" stroke="#dcebe3" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4 7" />
        </g>

        <g className="paisaje-acueducto">
          <path d="M906 112q15 3 12 31v266h-90" fill="none" stroke="#789d98" strokeWidth="3.5" strokeDasharray="7 4" />
          <path d="M828 409H664v-15m-164 15v-68m-300 68v-152" fill="none" stroke="#789d98" strokeWidth="3.5" strokeDasharray="7 4" />
          <circle cx="664" cy="409" r="4" fill="#edf0e3" stroke="#668b84" strokeWidth="1.5" />
          <circle cx="500" cy="409" r="3" fill="#edf0e3" stroke="#668b84" strokeWidth="1.2" />
          <circle cx="200" cy="409" r="3" fill="#edf0e3" stroke="#668b84" strokeWidth="1.2" />
        </g>

        <g className="paisaje-tanques">
          {[0, 1, 2].map((i) => (
            <g key={`tanque-${i}`} transform={`translate(${820 + i * 31} 91)`}>
              <ellipse cx="12" cy="28" rx="12" ry="4" fill="#7e9d99" />
              <rect x="0" y="5" width="24" height="23" fill="#d6e0d6" stroke="#66827a" strokeWidth="1.2" />
              <ellipse cx="12" cy="5" rx="12" ry="4" fill="#eff2e8" stroke="#66827a" strokeWidth="1.2" />
              <ellipse cx="12" cy="28" rx="12" ry="4" fill="#a9c2b9" stroke="#66827a" strokeWidth="1" />
              <path d="M5 8v16m14-16v16" stroke="#8ba89d" strokeWidth="1" />
            </g>
          ))}
          <text x="855" y="83" textAnchor="middle" className="paisaje-infra-label">RESERVA DE AGUA</text>
        </g>

        <g transform={`translate(${ORIGEN_PARCELAS.x} ${ORIGEN_PARCELAS.y}) scale(${ESCALA_METROS})`} className="plano-parcelas">
          {zonas.map((zona) => (
            <g key={zona.codigo} className="plano-zona">
              <rect
                x={zona.pos_x - 2}
                y={zona.pos_y - 2}
                width={zona.ancho + 4}
                height={zona.alto + 4}
                rx="1.2"
                fill="#dbe7d4"
                stroke="#536f58"
                strokeWidth="1.1"
              />
              <rect
                x={zona.pos_x - 2}
                y={zona.pos_y - 2}
                width={zona.ancho + 4}
                height={zona.alto + 4}
                rx="1.2"
                fill="url(#plano-cubierta)"
                pointerEvents="none"
              />
              {Array.from(
                { length: Math.floor((zona.ancho + 4) / 24) + 1 },
                (_, index) => zona.pos_x - 2 + index * 24,
              ).map((x) => (
                <path
                  key={`${zona.codigo}-costilla-${x}`}
                  d={`M${x} ${zona.pos_y - 1.5}v${zona.alto + 3}`}
                  fill="none"
                  stroke="#79927d"
                  strokeOpacity=".65"
                  strokeWidth=".65"
                  pointerEvents="none"
                />
              ))}
              <path
                d={`M${zona.pos_x} ${zona.pos_y + zona.alto / 2}h${zona.ancho}M${zona.pos_x + zona.ancho / 2} ${zona.pos_y}v${zona.alto}`}
                fill="none"
                stroke="#718a73"
                strokeOpacity=".4"
                strokeWidth=".65"
                pointerEvents="none"
              />
              <path
                d={`M${zona.pos_x + 2} ${zona.pos_y + 2}h${zona.ancho - 4}M${zona.pos_x + 2} ${zona.pos_y + zona.alto - 2}h${zona.ancho - 4}`}
                fill="none"
                stroke="#55734f"
                strokeWidth=".75"
                pointerEvents="none"
              />
              <path
                d={`M${zona.pos_x + zona.ancho / 2 - 3} ${zona.pos_y + zona.alto + 2}v-3h6v3`}
                fill="#f3f0e2"
                stroke="#536f58"
                strokeWidth=".55"
                pointerEvents="none"
              />
              <rect
                x={zona.pos_x}
                y={zona.pos_y}
                width={zona.ancho}
                height={zona.alto}
                rx=".8"
                fill="none"
                stroke="#70866b"
                strokeWidth=".5"
                pointerEvents="none"
              />
            </g>
          ))}
          {camas.map((cama) => (
            <CamaShape
              key={cama.codigo}
              cama={cama}
              seleccionada={camaSeleccionada === cama.codigo}
              onSeleccionar={onSeleccionar}
            />
          ))}
          {zonas.map((zona) => (
            <g
              key={`invernadero-control-${zona.codigo}`}
              className="plano-invernadero-control"
              role="button"
              tabIndex={0}
              aria-label={`Entrar al invernadero ${zona.codigo}`}
              onClick={(event) => {
                event.stopPropagation();
                onEntrarZona(zona.codigo);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEntrarZona(zona.codigo);
                }
              }}
            >
              <rect
                x={zona.pos_x + 1}
                y={zona.pos_y + 1}
                width="72"
                height="7"
                rx="1.4"
                fill="#f4f2e7"
                stroke="#6b8066"
                strokeWidth=".45"
              />
              <text x={zona.pos_x + 4} y={zona.pos_y + 5.2} className="plano-zona-etiqueta">
                INVERNADERO {zona.codigo} · ENTRAR
              </text>
            </g>
          ))}
        </g>

        <g className="paisaje-infraestructura">
          <CentroPoscosecha x={700} y={178} />
          <Bodega x={724} y={458} />
          <ParcelaExterior x={112} y={438} />
          <g transform="translate(425 495)">
            <rect x="0" y="0" width="126" height="42" rx="4" fill="#d7e1c4" stroke="#718463" strokeWidth="1.2" />
            <path d="M8 28h110M14 13v20m14-20v20m14-20v20m14-20v20m14-20v20m14-20v20m14-20v20" stroke="#879a62" strokeWidth="1.5" />
            <path d="M7 11h112" stroke="#f2f1d8" strokeWidth="2" />
            <text x="63" y="8" textAnchor="middle" className="paisaje-etiqueta">VIVERO · COMPOSTA</text>
          </g>
          <text x="48" y="423" className="paisaje-infra-label">ACCESO DE SERVICIO</text>
          <text x="700" y="429" className="paisaje-infra-label">CANAL DE RIEGO PRINCIPAL</text>
        </g>

        <g className="paisaje-señaletica">
          <g transform="translate(918 526)">
            <path d="M0 13V-13m0 0-5 8m5-8 5 8" stroke="#42624b" strokeWidth="2" strokeLinecap="round" />
            <text y="-20" textAnchor="middle" className="paisaje-infra-label">N</text>
          </g>
          <g transform="translate(52 534)">
            <path d="M0 0h100" stroke="#465b47" strokeWidth="2.5" />
            <path d="M0-4v8m50-4v4m50-4v8" stroke="#465b47" strokeWidth="1.5" />
            <text x="50" y="-8" textAnchor="middle" className="paisaje-escala">REFERENCIA · 50 m</text>
          </g>
        </g>

        </g>
      </svg>
    </div>
  );
}
