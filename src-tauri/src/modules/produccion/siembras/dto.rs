use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct NuevaSiembra {
    pub cama_id: Option<i32>,
    pub cama: Option<String>,
    pub fecha_siembra: NaiveDate,
    pub fecha_estimada_cosecha: Option<NaiveDate>,
    pub plantas_sembradas: i32,
    pub observaciones: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct FiltroSiembras {
    pub cama: Option<String>,
    pub estado: Option<String>,
}
