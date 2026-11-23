export interface Cliente {
  id: number; nombre: string; nit: string | null; tipo: "distribuidor_floral"|"mayorista"|"exportador"|"otro";
  email: string | null; telefono: string | null; ciudad: string | null; activo: boolean; creado_en: string;
}
export interface Orden {
  id: number; cliente_id: number; cliente_nombre: string | null; fecha: string;
  estado: "pendiente"|"confirmada"|"despachada"|"cancelada"; observaciones: string | null; creado_en: string;
}
export interface Despacho {
  id: number; orden_id: number; fecha: string; estado: "programado"|"en_transito"|"entregado"|"cancelado";
  transportador: string | null; guia: string | null; observaciones: string | null; creado_en: string;
}
