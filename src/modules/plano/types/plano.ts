import type { EstadoCama } from "../../../shared/types/cama";

export interface ZonaPlano {
  codigo: string;
  nombre: string;
  color: string;
  pos_x: number;
  pos_y: number;
  ancho: number;
  alto: number;
}

export interface CamaPlano {
  id: number;
  codigo: string;
  zona: string;
  numero: number;
  estado: EstadoCama;
  observaciones: string | null;
  pos_x: number;
  pos_y: number;
  ancho: number;
  alto: number;
  actualizado_en: string;
}

export interface Plano {
  zonas: ZonaPlano[];
  camas: CamaPlano[];
}

export interface PosicionActualizada {
  codigo: string;
  pos_x: number;
  pos_y: number;
  actualizado_en: string;
}
