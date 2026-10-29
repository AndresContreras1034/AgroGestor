use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Zona {
    pub id: i32,
    pub codigo: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub hectareas: Option<f64>,
    pub color: String,
    pub actualizado_en: DateTime<Utc>,
}
