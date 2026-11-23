
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct FiltroLecturas {
    pub cama_codigo: Option<String>,
    pub limite: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CrearLectura {
    pub identificador: String,
    pub temperatura: f64,
    pub humedad_relativa: f64,
    pub humedad_suelo: f64,
    pub ph: f64,
    pub conductividad_electrica: f64,
}
