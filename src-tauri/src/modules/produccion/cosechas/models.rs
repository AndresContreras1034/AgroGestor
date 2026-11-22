use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Cosecha {
    pub id: i32,
    pub cama_id: i32,
    pub siembra_id: i32,
    pub lote_id: Option<i32>,
    pub fecha: NaiveDate,
    pub tallos: i32,
    pub calidad: String,
    pub registrado_por: String,
    pub creado_en: DateTime<Utc>,
}
