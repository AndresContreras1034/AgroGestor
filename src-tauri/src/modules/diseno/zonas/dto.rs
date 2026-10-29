use serde::{Deserialize, Serialize};

use super::models::Zona;

#[derive(Debug, Deserialize)]
pub struct ActualizarZona {
    pub nombre: Option<String>,
    pub descripcion: Option<String>,
    pub hectareas: Option<f64>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ZonaResumen {
    #[serde(flatten)]
    pub zona: Zona,
    pub camas: i64,
    pub camas_esperadas: u8,
}
