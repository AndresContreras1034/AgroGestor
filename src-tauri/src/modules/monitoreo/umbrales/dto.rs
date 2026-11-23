
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ActualizarUmbral {
    pub unidad: Option<String>,
    pub min_alerta: f64,
    pub max_alerta: f64,
    pub min_critico: f64,
    pub max_critico: f64,
}
