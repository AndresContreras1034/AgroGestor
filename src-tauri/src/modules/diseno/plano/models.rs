use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ZonaPlano {
    pub codigo: String,
    pub nombre: String,
    pub color: String,
    pub pos_x: f64,
    pub pos_y: f64,
    pub ancho: f64,
    pub alto: f64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CamaPlano {
    pub id: i32,
    pub codigo: String,
    pub zona: String,
    pub numero: i32,
    pub estado: String,
    pub observaciones: Option<String>,
    pub pos_x: f64,
    pub pos_y: f64,
    pub ancho: f64,
    pub alto: f64,
    pub actualizado_en: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct LimitesCama {
    pub zona: String,
    pub zona_x: f64,
    pub zona_y: f64,
    pub zona_ancho: f64,
    pub zona_alto: f64,
    pub ancho: f64,
    pub alto: f64,
}
