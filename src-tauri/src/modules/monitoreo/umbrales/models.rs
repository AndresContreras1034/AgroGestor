
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Umbral {
    pub variable: String,
    pub unidad: String,
    pub min_alerta: f64,
    pub max_alerta: f64,
    pub min_critico: f64,
    pub max_critico: f64,
}
