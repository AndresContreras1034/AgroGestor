
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct IngestaHttp {
    pub identificador: String,
    pub temperatura: f64,
    pub humedad_relativa: f64,
    pub humedad_suelo: f64,
    pub ph: f64,
    pub conductividad_electrica: f64,
}
