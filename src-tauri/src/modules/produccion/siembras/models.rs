use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Siembra {
    pub id: i32,
    pub cama_id: i32,
    pub fecha_siembra: NaiveDate,
    pub fecha_estimada_cosecha: Option<NaiveDate>,
    pub plantas_sembradas: i32,
    pub estado: String,
    pub observaciones: Option<String>,
    pub registrado_por: String,
    pub creado_en: DateTime<Utc>,
    pub actualizado_en: DateTime<Utc>,
}
