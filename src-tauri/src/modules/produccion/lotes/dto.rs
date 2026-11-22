use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct CrearLote {
    pub observaciones: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct FiltroLotes {
    pub estado: Option<String>,
    pub anio: Option<i32>,
}
