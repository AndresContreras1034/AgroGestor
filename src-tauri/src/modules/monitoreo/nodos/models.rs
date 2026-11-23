
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Nodo {
    pub id: i32,
    pub cama_id: i32,
    pub cama_codigo: String,
    pub zona: String,
    pub identificador: String,
    pub estado: String,
    pub ultima_conexion: Option<DateTime<Utc>>,
    pub firmware: Option<String>,
    pub creado_en: DateTime<Utc>,
    pub actualizado_en: DateTime<Utc>,
}
