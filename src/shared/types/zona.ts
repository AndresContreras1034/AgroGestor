export interface ZonaResumen {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  hectareas: number | null;
  color: string;
  actualizado_en: string;
  camas: number;
  camas_esperadas: number;
}
