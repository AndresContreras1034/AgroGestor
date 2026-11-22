use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Inspeccion {
    pub id: i32,
    pub cama_id: i32,
    pub fecha: NaiveDate,
    pub resultado: String,
    pub puntaje: Option<i32>,
    pub observaciones: Option<String>,
    pub inspector: Option<String>,
    pub registrado_por: String,
    pub creado_en: DateTime<Utc>,
}
