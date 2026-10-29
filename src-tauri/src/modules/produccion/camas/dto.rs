use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct FiltroCamas {
    pub zona: Option<String>,
    pub estado: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ActualizarCama {
    pub estado: Option<String>,
    pub observaciones: Option<String>,
}
