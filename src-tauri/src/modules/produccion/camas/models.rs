use chrono::{DateTime, NaiveDate, Utc};
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

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SiembraResumen {
    pub id: i32,
    pub cama_id: i32,
    pub fecha_siembra: NaiveDate,
    pub fecha_estimada_cosecha: Option<NaiveDate>,
    pub plantas_sembradas: i32,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct CosechaResumen {
    pub id: i32,
    pub fecha: NaiveDate,
    pub tallos: i32,
    pub calidad: String,
    pub lote_id: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ResumenCama {
    pub cama: Cama,
    pub siembra_activa: Option<SiembraResumen>,
    pub tallos_siembra_activa: i64,
    pub ultima_cosecha: Option<CosechaResumen>,
}
