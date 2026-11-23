
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CrearNodo {
    pub cama_codigo: String,
    pub identificador: String,
    pub firmware: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ActualizarNodo {
    pub estado: Option<String>,
    pub firmware: Option<String>,
}
