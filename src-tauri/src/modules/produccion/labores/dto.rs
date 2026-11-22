use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CrearLabor {
    pub cama: Option<String>,
    pub siembra_id: Option<i32>,
    pub tipo: String,
    pub fecha: NaiveDate,
    pub descripcion: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct FiltroLabores {
    pub cama: Option<String>,
    pub siembra_id: Option<i32>,
    pub tipo: Option<String>,
}
