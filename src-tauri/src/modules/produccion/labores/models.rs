use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Labor {
    pub id: i32,
    pub cama_id: i32,
    pub cama_codigo: String,
    pub siembra_id: Option<i32>,
    pub tipo: String,
    pub fecha: NaiveDate,
    pub descripcion: Option<String>,
    pub registrado_por: String,
    pub creado_en: DateTime<Utc>,
}
