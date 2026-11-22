use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
pub struct FiltroBusqueda {
    pub q: Option<String>,
}
