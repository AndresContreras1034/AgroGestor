
use sqlx::PgPool;

use crate::errors::{AppError, AppResult};

use super::{dto::{ActualizarNodo, CrearNodo}, models::Nodo, repository};

const ESTADOS: [&str; 3] = ["activo", "offline", "alerta"];

pub async fn listar(db: &PgPool) -> AppResult<Vec<Nodo>> {
    Ok(repository::listar(db).await?)
}

pub async fn crear(db: &PgPool, dto: CrearNodo) -> AppResult<Nodo> {
    let cama_codigo = dto.cama_codigo.trim().to_ascii_uppercase();
    let identificador = dto.identificador.trim();
    if cama_codigo.is_empty() {
        return Err(AppError::Validacion("La cama es obligatoria".to_owned()));
    }
    if identificador.is_empty() || identificador.chars().count() > 64 {
        return Err(AppError::Validacion(
            "El identificador debe tener entre 1 y 64 caracteres".to_owned(),
        ));
    }

    let (cama_id, _) = repository::obtener_cama(db, &cama_codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {cama_codigo} no existe")))?;
    match repository::crear(db, cama_id, identificador, dto.firmware.as_deref()).await {
        Ok(nodo) => Ok(nodo),
        Err(error) if matches!(&error, sqlx::Error::Database(db_error) if db_error.is_unique_violation()) =>
            Err(AppError::Validacion(
                "La cama ya tiene un nodo o el identificador está duplicado".to_owned(),
            )),
        Err(error) => Err(AppError::from(error)),
    }
}

pub async fn actualizar(db: &PgPool, identificador: &str, dto: ActualizarNodo) -> AppResult<Nodo> {
    let estado = match dto.estado.as_deref().map(str::trim) {
        Some("") | None => None,
        Some(valor) => Some(
            ESTADOS
                .iter()
                .copied()
                .find(|item| *item == valor)
                .ok_or_else(|| {
                    AppError::Validacion(format!(
                        "Estado inválido: '{valor}'. Usa: {}",
                        ESTADOS.join(", ")
                    ))
                })?,
        ),
    };
    repository::actualizar(db, identificador, estado, dto.firmware.as_deref())
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El nodo {identificador} no existe")))
}
