import type { CamaPlano, Plano, ZonaPlano } from "../types/plano";

const ZONAS: ZonaPlano[] = [
  {
    codigo: "A",
    nombre: "Zona A",
    color: "#527a59",
    pos_x: 0,
    pos_y: 0,
    ancho: 96,
    alto: 48,
  },
  {
    codigo: "B",
    nombre: "Zona B",
    color: "#527a59",
    pos_x: 110,
    pos_y: 0,
    ancho: 123,
    alto: 34,
  },
  {
    codigo: "C",
    nombre: "Zona C",
    color: "#527a59",
    pos_x: 110,
    pos_y: 50,
    ancho: 123,
    alto: 34,
  },
];

export function crearPlanoReferencia(): Plano {
  const camas: CamaPlano[] = [];

  for (const zona of ZONAS) {
    const columnas = zona.codigo === "A" ? 3 : 4;
    const cantidad = zona.codigo === "A" ? 9 : 8;
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
