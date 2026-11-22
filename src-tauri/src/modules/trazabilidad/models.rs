use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct LoteResumen {
    pub id: i32,
    pub codigo: String,
    pub anio: i32,
    pub estado: String,
    pub observaciones: Option<String>,
    pub creado_en: DateTime<Utc>,
    pub total_tallos: i64,
    pub cosechas: i64,
    pub camas: i64,
    pub clientes: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrigenCama {
    pub cama_id: i32,
    pub cama_codigo: String,
    pub zona: String,
    pub siembra_id: i32,
    pub fecha_siembra: NaiveDate,
    pub plantas_sembradas: i32,
    pub estado_siembra: String,
    pub cosechas: i64,
    pub tallos: i64,
    pub tallos_primera: i64,
    pub tallos_segunda: i64,
    pub tallos_descarte: i64,
    pub primera_cosecha: NaiveDate,
    pub ultima_cosecha: NaiveDate,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct DestinoOrden {
    pub cliente_id: i32,
    pub cliente: String,
    pub ciudad: Option<String>,
    pub orden_id: i32,
    pub orden_item_id: i32,
    pub fecha_orden: NaiveDate,
    pub estado_orden: String,
    pub tallos_orden: i32,
    pub tallos_despachados: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct DespachoLote {
    pub despacho_id: i32,
    pub orden_id: i32,
    pub fecha: NaiveDate,
    pub estado: String,
    pub transportador: Option<String>,
    pub guia: Option<String>,
    pub tallos: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct EventoLinea {
    pub fecha: NaiveDate,
    pub tipo: String,
    pub titulo: String,
    pub detalle: Option<String>,
    pub cama_codigo: Option<String>,
    pub referencia_id: i32,
}

#[derive(Debug, Serialize)]
pub struct CadenaLote {
    pub lote: LoteResumen,
    pub origen: Vec<OrigenCama>,
    pub destinos: Vec<DestinoOrden>,
    pub despachos: Vec<DespachoLote>,
}
