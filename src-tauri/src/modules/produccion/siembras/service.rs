use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    types::{gestor::Gestor, ids::CodigoCama},
};

use super::{
    dto::{FiltroSiembras, NuevaSiembra},
    models::Siembra,
    repository,
};
use crate::modules::produccion::camas::repository as camas_repository;

pub async fn listar(db: &PgPool, filtro: FiltroSiembras) -> AppResult<Vec<Siembra>> {
    let cama_id = if let Some(codigo) = filtro.cama.as_deref() {
        let codigo = codigo
            .parse::<CodigoCama>()
            .map(|cama| cama.to_string())
            .map_err(AppError::Validacion)?;
        Some(
            camas_repository::obtener(db, &codigo)
                .await?
                .map(|cama| cama.id)
                .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?,
        )
    } else {
        None
    };

    let siembras = repository::listar(db).await?;
    Ok(siembras
        .into_iter()
        .filter(|siembra| cama_id.is_none_or(|id| siembra.cama_id == id))
        .filter(|siembra| {
            filtro
                .estado
                .as_deref()
                .is_none_or(|estado| siembra.estado == estado)
        })
        .collect())
}

pub async fn obtener(db: &PgPool, id: i32) -> AppResult<Siembra> {
    repository::obtener(db, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La siembra {id} no existe")))
}

pub async fn crear(db: &PgPool, gestor: Gestor, dto: NuevaSiembra) -> AppResult<Siembra> {
    if dto.plantas_sembradas <= 0 {
        return Err(AppError::Validacion(
            "Las plantas sembradas deben ser mayores que 0".to_owned(),
        ));
    }
    if dto
        .fecha_estimada_cosecha
        .is_some_and(|fecha| fecha < dto.fecha_siembra)
    {
        return Err(AppError::Validacion(
            "La cosecha estimada no puede ser anterior a la siembra".to_owned(),
        ));
    }
    let observaciones = dto.observaciones.as_deref().map(str::trim);
    if matches!(observaciones, Some(texto) if texto.chars().count() > 500) {
        return Err(AppError::Validacion(
            "Las observaciones no pueden pasar de 500 caracteres".to_owned(),
        ));
    }
    let observaciones = observaciones.filter(|texto| !texto.is_empty());

    let mut tx = db.begin().await?;
    let cama_id = match (dto.cama_id, dto.cama.as_deref()) {
        (Some(_), Some(_)) | (None, None) => {
            return Err(AppError::Validacion(
                "Indica cama_id o cama, pero no ambos ni ninguno".to_owned(),
            ));
        }
        (Some(id), None) => id,
        (None, Some(codigo)) => {
            let codigo = codigo
                .parse::<CodigoCama>()
                .map(|cama| cama.to_string())
                .map_err(AppError::Validacion)?;
            camas_repository::obtener(&mut *tx, &codigo)
                .await?
                .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?
                .id
        }
    };
    let cama = camas_repository::obtener_por_id_para_actualizar(&mut *tx, cama_id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {cama_id} no existe")))?;
    if cama.estado != "disponible" && cama.estado != "en_descanso" {
        return Err(AppError::Validacion(if cama.estado == "sembrada" {
            format!(
                "La cama {} está sembrada y no admite otra siembra",
                cama.codigo
            )
        } else {
            format!("La cama {} no está disponible para sembrar", cama.codigo)
        }));
    }

    let siembra = match repository::crear(
        &mut *tx,
        cama_id,
        dto.fecha_siembra,
        dto.fecha_estimada_cosecha,
        dto.plantas_sembradas,
        observaciones,
        gestor.as_str(),
    )
    .await
    {
        Ok(siembra) => siembra,
        Err(sqlx::Error::Database(error)) if error.is_unique_violation() => {
            return Err(AppError::Validacion(format!(
                "La cama {} ya tiene una siembra activa",
                cama.codigo
            )));
        }
        Err(error) => return Err(AppError::from(error)),
    };

    camas_repository::cambiar_estado_por_id(&mut *tx, cama_id, "sembrada", gestor.as_str())
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {cama_id} no existe")))?;
    tx.commit().await?;
    Ok(siembra)
}

pub async fn cancelar(db: &PgPool, gestor: Gestor, id: i32) -> AppResult<Siembra> {
    let mut tx = db.begin().await?;
    let siembra = repository::obtener(&mut *tx, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La siembra {id} no existe")))?;
    if siembra.estado != "activa" {
        return Err(AppError::Validacion(format!(
            "La siembra {id} ya no está activa"
        )));
    }

    let cama = camas_repository::obtener_por_id_para_actualizar(&mut *tx, siembra.cama_id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {} no existe", siembra.cama_id)))?;
    let cancelada = repository::cancelar(&mut *tx, id)
        .await?
        .ok_or_else(|| AppError::Validacion(format!("La siembra {id} ya no está activa")))?;
    camas_repository::cambiar_estado_por_id(&mut *tx, cama.id, "disponible", gestor.as_str())
        .await?;
    tx.commit().await?;
    Ok(cancelada)
}
