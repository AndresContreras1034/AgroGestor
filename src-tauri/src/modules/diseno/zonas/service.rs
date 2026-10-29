use std::collections::HashMap;

use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    modules::produccion::camas::service as camas_service,
    types::{gestor::Gestor, ids::Zona as ZonaId},
};

use super::{
    dto::{ActualizarZona, ZonaResumen},
    models::Zona,
    repository,
};

fn resumir(zona: Zona, conteo: &HashMap<String, i64>) -> AppResult<ZonaResumen> {
    let identificador: ZonaId = zona.codigo.parse().map_err(|error| {
        AppError::Validacion(format!("Zona inválida en base de datos: {error}"))
    })?;
    let camas = conteo.get(&zona.codigo).copied().unwrap_or(0);
    Ok(ZonaResumen {
        zona,
        camas,
        camas_esperadas: identificador.camas(),
    })
}

pub async fn listar(db: &PgPool) -> AppResult<Vec<ZonaResumen>> {
    let zonas = repository::listar(db).await?;
    let conteo = camas_service::contar_por_zona(db).await?;
    zonas
        .into_iter()
        .map(|zona| resumir(zona, &conteo))
        .collect()
}

pub async fn obtener(db: &PgPool, codigo: &str) -> AppResult<ZonaResumen> {
    let identificador: ZonaId = codigo.parse().map_err(AppError::Validacion)?;
    let codigo = identificador.letra().to_string();
    let zona = repository::obtener(db, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La zona {codigo} no existe")))?;
    let conteo = camas_service::contar_por_zona(db).await?;
    resumir(zona, &conteo)
}

fn color_valido(color: &str) -> bool {
    color.len() == 7
        && color.starts_with('#')
        && color[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
}

pub async fn actualizar(
    db: &PgPool,
    gestor: Gestor,
    codigo: &str,
    dto: ActualizarZona,
) -> AppResult<ZonaResumen> {
    let identificador: ZonaId = codigo.parse().map_err(AppError::Validacion)?;
    let codigo = identificador.letra().to_string();
    if dto.nombre.is_none()
        && dto.descripcion.is_none()
        && dto.hectareas.is_none()
        && dto.color.is_none()
    {
        return Err(AppError::Validacion(
            "No hay campos para actualizar".to_owned(),
        ));
    }

    let nombre = dto.nombre.as_deref().map(str::trim);
    if matches!(nombre, Some("")) {
        return Err(AppError::Validacion(
            "El nombre no puede estar vacío".to_owned(),
        ));
    }
    if matches!(dto.hectareas, Some(value) if !value.is_finite() || value < 0.0) {
        return Err(AppError::Validacion(
            "Las hectáreas deben ser un número mayor o igual a 0".to_owned(),
        ));
    }
    if matches!(dto.color.as_deref(), Some(color) if !color_valido(color)) {
        return Err(AppError::Validacion(
            "El color debe tener formato #RRGGBB".to_owned(),
        ));
    }

    repository::actualizar(
        db,
        &codigo,
        nombre,
        dto.descripcion.as_deref().map(str::trim),
        dto.hectareas,
        dto.color.as_deref(),
        gestor.as_str(),
    )
    .await?
    .ok_or_else(|| AppError::NoEncontrado(format!("La zona {codigo} no existe")))?;

    obtener(db, &codigo).await
}

#[cfg(test)]
mod tests {
    use super::color_valido;

    #[test]
    fn valida_colores_hexadecimales() {
        assert!(color_valido("#1F7A4D"));
        assert!(!color_valido("1F7A4D"));
        assert!(!color_valido("#12345"));
        assert!(!color_valido("#GGGGGG"));
    }
}
