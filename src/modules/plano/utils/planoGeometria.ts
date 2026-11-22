import type { TipoZona, ZonaPlano } from "../types/plano";

export const ANCHO_PLANO = 1000;
export const ALTO_PLANO = 650;
export const ESCALA_METROS = 3.5;
export const ORIGEN_PARCELAS = { x: 40, y: 100 };
export const CAMINO_INTERNO_X = 400;

export function tipoDeZona(zona: ZonaPlano): TipoZona {
  return zona.tipo ?? "invernadero";
}

export function etiquetaZona(zona: ZonaPlano): string {
  return tipoDeZona(zona) === "campo_abierto"
    ? `Campo abierto ${zona.codigo}`
    : `Invernadero ${zona.codigo}`;
}

export function encuadreZona(zona: ZonaPlano) {
  return {
    centro: {
      x: ORIGEN_PARCELAS.x + (zona.pos_x + zona.ancho / 2) * ESCALA_METROS,
      y: ORIGEN_PARCELAS.y + (zona.pos_y + zona.alto / 2) * ESCALA_METROS,
    },
    ancho: (zona.ancho + 10) * ESCALA_METROS,
    alto: (zona.alto + 22) * ESCALA_METROS,
  };
}
