
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Lectura {
    pub id: i64,
    pub nodo_id: i32,
    pub nodo_identificador: String,
    pub cama_id: i32,
    pub cama_codigo: String,
    pub zona: String,
    pub leido_en: DateTime<Utc>,
    pub temperatura: f64,
    pub humedad_relativa: f64,
    pub humedad_suelo: f64,
    pub ph: f64,
    pub conductividad_electrica: f64,
}
