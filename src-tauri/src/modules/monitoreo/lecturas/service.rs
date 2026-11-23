
use sqlx::PgPool;

use crate::errors::{AppError, AppResult};

use super::{
    dto::FiltroLecturas,
    models::Lectura,
    repository,
};

pub async fn listar(db: &PgPool, filtro: FiltroLecturas) -> AppResult<Vec<Lectura>> {
    let cama = filtro.cama_codigo
        .as_deref()
        .map(str::trim)
        .filter(|valor| !valor.is_empty())
        .map(str::to_ascii_uppercase);
    let limite = filtro.limite.unwrap_or(100).clamp(1, 500);
    Ok(repository::listar(db, cama.as_deref(), limite).await?)
}

pub fn validar_finito(nombre: &str, valor: f64) -> AppResult<()> {
    if !valor.is_finite() {
        return Err(AppError::Validacion(format!("{nombre} debe ser un número válido")));
    }
    Ok(())
}
