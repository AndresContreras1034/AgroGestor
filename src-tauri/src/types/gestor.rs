use std::str::FromStr;

use axum::{
    extract::FromRequestParts,
    http::{header::HeaderName, request::Parts},
};

use crate::errors::AppError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Gestor {
    Proyecto,
    Comercial,
    Calidad,
    Diseno,
}

impl Gestor {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Proyecto => "proyecto",
            Self::Comercial => "comercial",
            Self::Calidad => "calidad",
            Self::Diseno => "diseno",
        }
    }
}

impl FromStr for Gestor {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "proyecto" => Ok(Self::Proyecto),
            "comercial" => Ok(Self::Comercial),
            "calidad" => Ok(Self::Calidad),
            "diseno" => Ok(Self::Diseno),
            _ => Err("X-Gestor debe ser proyecto, comercial, calidad o diseno".to_owned()),
        }
    }
}

pub struct GestorActivo(pub Gestor);

impl<S> FromRequestParts<S> for GestorActivo
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let header = HeaderName::from_static("x-gestor");
        let value = parts
            .headers
            .get(header)
            .ok_or_else(|| AppError::NoAutorizado("Falta el encabezado X-Gestor".to_owned()))?
            .to_str()
            .map_err(|_| AppError::NoAutorizado("X-Gestor no es válido".to_owned()))?;

        value.parse().map(Self).map_err(AppError::NoAutorizado)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::Gestor;

    #[test]
    fn parsea_gestores_sin_distinguir_mayusculas() {
        assert_eq!(Gestor::from_str("PROYECTO"), Ok(Gestor::Proyecto));
        assert_eq!(Gestor::from_str("diseno"), Ok(Gestor::Diseno));
        assert!(Gestor::from_str("administrador").is_err());
    }
}
