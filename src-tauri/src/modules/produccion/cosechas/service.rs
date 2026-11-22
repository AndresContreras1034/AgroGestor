use chrono::Utc;
use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    modules::produccion::camas::repository as camas_repo,
    types::gestor::Gestor,
};

use super::{
    dto::{CrearCosecha, FiltroCosechas},
    models::Cosecha,
    repository,
};

pub const CALIDADES: [&str; 3] = ["primera", "segunda", "descarte"];

fn validar_calidad(calidad: &str) -> AppResult<&'static str> {
    let calidad = calidad.trim();
    CALIDADES
        .iter()
        .copied()
        .find(|permitida| *permitida == calidad)
        .ok_or_else(|| {
            AppError::Validacion(format!(
                "Calidad inválida: '{calidad}'. Usa: {}",
                CALIDADES.join(", ")
            ))
        })
}

fn validar_tallos(tallos: i32) -> AppResult<()> {
    if tallos <= 0 {
        return Err(AppError::Validacion(
            "Los tallos deben ser mayores que 0 (si se perdió el corte, regístralo como descarte)"
                .to_owned(),
        ));
    }
    Ok(())
}

pub async fn listar(db: &PgPool, filtro: FiltroCosechas) -> AppResult<Vec<Cosecha>> {
    Ok(repository::listar(db, filtro.siembra_id, filtro.lote_id).await?)
}

pub async fn obtener(db: &PgPool, id: i32) -> AppResult<Cosecha> {
    repository::obtener(db, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cosecha {id} no existe")))
}

pub async fn crear(db: &PgPool, gestor: Gestor, dto: CrearCosecha) -> AppResult<Cosecha> {
    let calidad = validar_calidad(dto.calidad.as_deref().unwrap_or("primera"))?;
    validar_tallos(dto.tallos)?;
    if dto.fecha > Utc::now().date_naive() {
        return Err(AppError::Validacion(
            "La fecha de cosecha no puede ser futura".to_owned(),
        ));
    }
    let cerrar_siembra = dto.cerrar_siembra.unwrap_or(true);

    let cama_id = repository::cama_id_de_siembra(db, dto.siembra_id)
        .await?
        .ok_or_else(|| {
            AppError::NoEncontrado(format!("La siembra {} no existe", dto.siembra_id))
        })?;

    let mut tx = db.begin().await?;
    let cama = camas_repo::obtener_por_id_para_actualizar(&mut tx, cama_id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {cama_id} no existe")))?;
    let siembra = repository::siembra_para_actualizar(&mut tx, dto.siembra_id)
        .await?
        .ok_or_else(|| {
            AppError::NoEncontrado(format!("La siembra {} no existe", dto.siembra_id))
        })?;

    if siembra.estado != "activa" {
        return Err(AppError::Validacion(format!(
            "Solo se puede cosechar una siembra activa (estado actual: {})",
            siembra.estado
        )));
    }
    if cama.estado != "sembrada" {
        return Err(AppError::Validacion(format!(
            "La cama {} no está sembrada (estado actual: {}). Revisa la consistencia de datos",
            cama.codigo, cama.estado
        )));
    }
    if dto.fecha < siembra.fecha_siembra {
        return Err(AppError::Validacion(
            "La fecha de cosecha no puede ser anterior a la siembra".to_owned(),
        ));
    }

    if let Some(lote_id) = dto.lote_id {
        match repository::estado_lote_compartido(&mut tx, lote_id).await? {
            None => {
                return Err(AppError::NoEncontrado(format!(
                    "El lote {lote_id} no existe"
                )));
            }
            Some(estado) if estado != "abierto" => {
                return Err(AppError::Validacion(format!(
                    "El lote {lote_id} está {estado}; solo se cosecha en lotes abiertos"
                )));
            }
            Some(_) => {}
        }
    }

    let cosecha = repository::crear(
        &mut *tx,
        cama_id,
        dto.siembra_id,
        dto.lote_id,
        dto.fecha,
        dto.tallos,
        calidad,
        gestor.as_str(),
    )
    .await?;

    if cerrar_siembra {
        repository::marcar_siembra_cosechada(&mut *tx, dto.siembra_id).await?;
        camas_repo::cambiar_estado_por_id(&mut *tx, cama_id, "cosechada", gestor.as_str())
            .await?
            .ok_or_else(|| AppError::NoEncontrado(format!("La cama {cama_id} no existe")))?;
    }

    tx.commit().await?;
    Ok(cosecha)
}

#[cfg(test)]
mod tests {
    use super::{CALIDADES, validar_calidad, validar_tallos};

    #[test]
    fn acepta_calidades_conocidas_y_rechaza_otras() {
        for calidad in CALIDADES {
            assert_eq!(validar_calidad(calidad).unwrap(), calidad);
        }
        assert_eq!(validar_calidad("  segunda ").unwrap(), "segunda");
        assert!(validar_calidad("tercera").is_err());
    }

    #[test]
    fn exige_tallos_positivos() {
        assert!(validar_tallos(1).is_ok());
        assert!(validar_tallos(0).is_err());
        assert!(validar_tallos(-5).is_err());
    }
}
