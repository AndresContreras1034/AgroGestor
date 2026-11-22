use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct FiltroCosechas {
    pub siembra_id: Option<i32>,
    pub lote_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CrearCosecha {
    pub siembra_id: i32,
    pub lote_id: Option<i32>,
    pub fecha: NaiveDate,
    pub tallos: i32,
    pub calidad: Option<String>,
    pub cerrar_siembra: Option<bool>,
}
