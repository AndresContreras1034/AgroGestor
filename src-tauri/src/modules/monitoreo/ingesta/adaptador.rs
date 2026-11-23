
use crate::errors::{AppError, AppResult};

use super::http::IngestaHttp;

pub trait AdaptadorLecturas {
    fn validar(&self) -> AppResult<()>;
}

impl AdaptadorLecturas for IngestaHttp {
    fn validar(&self) -> AppResult<()> {
        let valores = [
            ("temperatura", self.temperatura),
            ("humedad_relativa", self.humedad_relativa),
            ("humedad_suelo", self.humedad_suelo),
            ("ph", self.ph),
            ("conductividad_electrica", self.conductividad_electrica),
        ];
        for (nombre, valor) in valores {
            if !valor.is_finite() {
                return Err(AppError::Validacion(format!(
                    "{nombre} debe ser un número válido"
                )));
            }
        }
        if self.humedad_relativa < 0.0 || self.humedad_relativa > 100.0
            || self.humedad_suelo < 0.0 || self.humedad_suelo > 100.0
        {
            return Err(AppError::Validacion(
                "Las humedades deben estar entre 0 y 100".to_owned(),
            ));
        }
        if self.ph < 0.0 || self.ph > 14.0 {
            return Err(AppError::Validacion(
                "El pH debe estar entre 0 y 14".to_owned(),
            ));
        }
        if self.conductividad_electrica < 0.0 {
            return Err(AppError::Validacion(
                "La conductividad eléctrica no puede ser negativa".to_owned(),
            ));
        }
        Ok(())
    }
}
