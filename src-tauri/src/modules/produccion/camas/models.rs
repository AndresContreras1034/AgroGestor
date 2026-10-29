use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Cama {
    pub id: i32,
    pub codigo: String,
    pub zona: String,
    pub numero: i32,
    pub estado: String,
    pub observaciones: Option<String>,
    pub actualizado_en: DateTime<Utc>,
}
