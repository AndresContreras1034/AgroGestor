import type { CamaPlano, Plano, ZonaPlano } from "../types/plano";

const ZONAS: ZonaPlano[] = [
  { codigo: "A", nombre: "Zona A", color: "#527a59", pos_x: 0, pos_y: 0, ancho: 96, alto: 48, tipo: "invernadero" },
  { codigo: "B", nombre: "Zona B", color: "#527a59", pos_x: 110, pos_y: 0, ancho: 123, alto: 34, tipo: "invernadero" },
  { codigo: "C", nombre: "Zona C", color: "#527a59", pos_x: 110, pos_y: 50, ancho: 123, alto: 34, tipo: "invernadero" },
  { codigo: "D", nombre: "Campo abierto D", color: "#8a7a4a", pos_x: 0, pos_y: 62, ancho: 96, alto: 34, tipo: "campo_abierto" },
];

const DISTRIBUCION: Record<string, { columnas: number; cantidad: number }> = {
  A: { columnas: 3, cantidad: 9 },
  B: { columnas: 4, cantidad: 8 },
  C: { columnas: 4, cantidad: 8 },
  D: { columnas: 3, cantidad: 6 },
};

export function crearPlanoReferencia(): Plano {
  const camas: CamaPlano[] = [];

  for (const zona of ZONAS) {
    const { columnas, cantidad } = DISTRIBUCION[zona.codigo];
    for (let numero = 1; numero <= cantidad; numero += 1) {
      const columna = (numero - 1) % columnas;
      const fila = Math.floor((numero - 1) / columnas);
      camas.push({
        id: camas.length + 1,
        codigo: `${zona.codigo}-${String(numero).padStart(2, "0")}`,
        zona: zona.codigo,
        numero,
        estado: "disponible",
        observaciones: null,
        pos_x: zona.pos_x + 5 + columna * 30,
        pos_y: zona.pos_y + 5 + fila * 14,
        ancho: 25,
        alto: 10,
        actualizado_en: new Date(0).toISOString(),
      });
    }
  }

  return { zonas: ZONAS, camas };
}
