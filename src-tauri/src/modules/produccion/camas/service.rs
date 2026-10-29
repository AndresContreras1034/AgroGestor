use std::collections::HashMap;

use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    types::{
        gestor::Gestor,
        ids::{CodigoCama, Zona},
    },
};

use super::{
    dto::{ActualizarCama, FiltroCamas},
    models::Cama,
    repository,
};

pub const ESTADOS: [&str; 4] = ["disponible", "sembrada", "cosechada", "en_descanso"];

fn validar_estado(estado: &str) -> AppResult<&'static str> {
    let estado = estado.trim();
    ESTADOS
        .iter()
        .copied()
        .find(|permitido| *permitido == estado)
        .ok_or_else(|| {
            AppError::Validacion(format!(
                "Estado inválido: '{estado}'. Usa: {}",
                ESTADOS.join(", ")
            ))
        })
}

fn normalizar_codigo(codigo: &str) -> AppResult<String> {
    codigo
        .parse::<CodigoCama>()
        .map(|cama| cama.to_string())
        .map_err(AppError::Validacion)
}

pub async fn listar(db: &PgPool, filtro: FiltroCamas) -> AppResult<Vec<Cama>> {
    let zona = filtro
        .zona
        .as_deref()
        .map(|zona| {
            zona.parse::<Zona>()
                .map(|zona| zona.letra().to_string())
                .map_err(AppError::Validacion)
        })
        .transpose()?;
    let estado = filtro.estado.as_deref().map(validar_estado).transpose()?;

    Ok(repository::listar(db, zona.as_deref(), estado).await?)
}

pub async fn obtener(db: &PgPool, codigo: &str) -> AppResult<Cama> {
    let codigo = normalizar_codigo(codigo)?;
    repository::obtener(db, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))
}

pub async fn actualizar(
    db: &PgPool,
    gestor: Gestor,
    codigo: &str,
    dto: ActualizarCama,
) -> AppResult<Cama> {
    let codigo = normalizar_codigo(codigo)?;
    let estado = dto.estado.as_deref().map(validar_estado).transpose()?;
    if estado.is_none() && dto.observaciones.is_none() {
        return Err(AppError::Validacion(
            "No hay campos para actualizar".to_owned(),
        ));
    }

    let observaciones = dto.observaciones.as_deref().map(str::trim);
    if matches!(observaciones, Some(value) if value.chars().count() > 500) {
        return Err(AppError::Validacion(
            "Las observaciones no pueden pasar de 500 caracteres".to_owned(),
        ));
    }

    repository::actualizar(db, &codigo, estado, observaciones, gestor.as_str())
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))
}

pub async fn contar_por_zona(db: &PgPool) -> AppResult<HashMap<String, i64>> {
    Ok(repository::contar_por_zona(db).await?.into_iter().collect())
}

#[cfg(test)]
mod tests {
    use super::{ESTADOS, validar_estado};

    #[test]
    fn acepta_estados_de_cama_y_rechaza_otros() {
        for estado in ESTADOS {
            assert_eq!(validar_estado(estado).unwrap(), estado);
        }
        assert!(validar_estado("ocupada").is_err());
    }
}
