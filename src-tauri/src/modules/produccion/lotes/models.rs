use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Lote {
    pub id: i32,
    pub codigo: String,
    pub anio: i32,
    pub secuencia: i32,
    pub estado: String,
    pub observaciones: Option<String>,
    pub registrado_por: String,
    pub creado_en: DateTime<Utc>,
    pub actualizado_en: DateTime<Utc>,
}
