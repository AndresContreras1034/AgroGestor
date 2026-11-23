import { api } from "../../../shared/api/client";
import type { Cliente, Despacho, Orden } from "../types";

export const listarClientes=(signal?:AbortSignal)=>api.get<Cliente[]>("/api/comercial/clientes",signal);
export const crearCliente=(body:{nombre:string;nit:string|null;tipo:string;email:string|null;telefono:string|null;ciudad:string|null})=>
 api.post<Cliente>("/api/comercial/clientes",body,"comercial");
export const listarOrdenes=(signal?:AbortSignal)=>api.get<Orden[]>("/api/comercial/ordenes",signal);
export const crearOrden=(body:{cliente_id:number;fecha:string|null;observaciones:string|null})=>
 api.post<Orden>("/api/comercial/ordenes",body,"comercial");
export const cambiarOrden=(id:number,estado:string)=>api.patch<Orden>(`/api/comercial/ordenes/${id}/estado`,{estado},"comercial");
export const listarDespachos=(signal?:AbortSignal)=>api.get<Despacho[]>("/api/comercial/despachos",signal);
export const crearDespacho=(body:{orden_id:number;fecha:string|null;transportador:string|null;guia:string|null;observaciones:string|null})=>
 api.post<Despacho>("/api/comercial/despachos",body,"comercial");
