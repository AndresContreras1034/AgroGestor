
use sqlx::PgPool;

use crate::errors::{AppError, AppResult};

use super::{dto::ActualizarUmbral, models::Umbral, repository};

const VARIABLES: [&str; 5] = [
    "temperatura",
    "humedad_relativa",
    "humedad_suelo",
    "ph",
    "conductividad_electrica",
];

pub async fn listar(db: &PgPool) -> AppResult<Vec<Umbral>> {
    Ok(repository::listar(db).await?)
}

pub async fn actualizar(db: &PgPool, variable: &str, dto: ActualizarUmbral) -> AppResult<Umbral> {
    let variable = variable.trim();
    if !VARIABLES.contains(&variable) {
        return Err(AppError::Validacion(format!(
            "Variable inválida: '{variable}'"
        )));
    }
    for (nombre, valor) in [
        ("min_alerta", dto.min_alerta),
        ("max_alerta", dto.max_alerta),
        ("min_critico", dto.min_critico),
        ("max_critico", dto.max_critico),
    ] {
        if !valor.is_finite() {
            return Err(AppError::Validacion(format!("{nombre} debe ser un número válido")));
        }
    }
    if dto.min_critico > dto.min_alerta
        || dto.min_alerta >= dto.max_alerta
        || dto.max_alerta > dto.max_critico
    {
        return Err(AppError::Validacion(
            "Rangos inválidos: crítico mínimo <= alerta mínima < alerta máxima <= crítico máximo"
                .to_owned(),
        ));
    }
    let unidad = dto.unidad.as_deref().map(str::trim).filter(|valor| !valor.is_empty());
    repository::actualizar(
        db,
        variable,
        unidad,
        dto.min_alerta,
        dto.max_alerta,
        dto.min_critico,
        dto.max_critico,
    )
    .await?
    .ok_or_else(|| AppError::NoEncontrado(format!("La variable {variable} no existe")))
}
