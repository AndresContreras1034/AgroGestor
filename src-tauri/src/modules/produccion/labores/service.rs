use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    modules::produccion::{camas::repository as camas_repo, siembras::repository as siembras_repo},
    types::{gestor::Gestor, ids::CodigoCama},
};

use super::{
    dto::{CrearLabor, FiltroLabores},
    models::Labor,
    repository,
};

pub const TIPOS: [&str; 6] = [
    "riego",
    "fertilizacion",
    "poda",
    "deshierbe",
    "fumigacion",
    "otra",
];

fn validar_tipo(tipo: &str) -> AppResult<&'static str> {
    let tipo = tipo.trim();
    TIPOS
        .iter()
        .copied()
        .find(|permitido| *permitido == tipo)
        .ok_or_else(|| {
            AppError::Validacion(format!(
                "Tipo de labor inválido: '{tipo}'. Usa: {}",
                TIPOS.join(", ")
            ))
        })
}

fn validar_descripcion<'a>(descripcion: Option<&'a str>, tipo: &str) -> AppResult<Option<&'a str>> {
    let descripcion = descripcion.map(str::trim).filter(|texto| !texto.is_empty());
    if tipo == "otra" && descripcion.is_none() {
        return Err(AppError::Validacion(
            "Describe la labor cuando el tipo es 'otra'".to_owned(),
        ));
    }
    if matches!(descripcion, Some(texto) if texto.chars().count() > 500) {
        return Err(AppError::Validacion(
            "La descripción no puede pasar de 500 caracteres".to_owned(),
        ));
    }
    Ok(descripcion)
}

fn normalizar_codigo(codigo: &str) -> AppResult<String> {
    codigo
        .parse::<CodigoCama>()
        .map(|cama| cama.to_string())
        .map_err(AppError::Validacion)
}

pub async fn listar(db: &PgPool, filtro: FiltroLabores) -> AppResult<Vec<Labor>> {
    let cama = filtro.cama.as_deref().map(normalizar_codigo).transpose()?;
    let tipo = filtro.tipo.as_deref().map(validar_tipo).transpose()?;
    let mut conn = db.acquire().await?;
    Ok(repository::listar(&mut conn, cama.as_deref(), filtro.siembra_id, tipo).await?)
}

pub async fn obtener(db: &PgPool, id: i32) -> AppResult<Labor> {
    let mut conn = db.acquire().await?;
    repository::obtener(&mut conn, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La labor {id} no existe")))
}

pub async fn crear(db: &PgPool, gestor: Gestor, dto: CrearLabor) -> AppResult<Labor> {
    let tipo = validar_tipo(&dto.tipo)?;
    let descripcion = validar_descripcion(dto.descripcion.as_deref(), tipo)?;
    let mut tx = db.begin().await?;

    let hoy = repository::hoy(&mut *tx).await?;
    if dto.fecha > hoy {
        return Err(AppError::Validacion(
            "La fecha de la labor no puede ser futura".to_owned(),
        ));
    }

    let (cama_id, siembra_id) = match (dto.cama.as_deref(), dto.siembra_id) {
        (Some(_), Some(_)) | (None, None) => {
            return Err(AppError::Validacion(
                "Indica la cama o la siembra, pero no ambas".to_owned(),
            ));
        }
        (None, Some(id)) => {
            let siembra = siembras_repo::obtener(&mut *tx, id)
                .await?
                .ok_or_else(|| AppError::NoEncontrado(format!("La siembra {id} no existe")))?;
            if siembra.estado != "activa" {
                return Err(AppError::Validacion(format!(
                    "La siembra {id} está '{}'; solo se registran labores en siembras activas",
                    siembra.estado
                )));
            }
            if dto.fecha < siembra.fecha_siembra {
                return Err(AppError::Validacion(
                    "La labor no puede ser anterior a la fecha de siembra".to_owned(),
                ));
            }
            (siembra.cama_id, Some(siembra.id))
        }
        (Some(codigo), None) => {
            let codigo = normalizar_codigo(codigo)?;
            let cama = camas_repo::obtener(&mut *tx, &codigo)
                .await?
                .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?;
            let activas = siembras_repo::listar(&mut *tx).await?;
            let siembra_id = activas
                .into_iter()
                .find(|siembra| {
                    siembra.cama_id == cama.id
                        && siembra.estado == "activa"
                        && dto.fecha >= siembra.fecha_siembra
                })
                .map(|siembra| siembra.id);
            (cama.id, siembra_id)
        }
    };

    let labor = repository::crear(
        &mut *tx,
        cama_id,
        siembra_id,
        tipo,
        dto.fecha,
        descripcion,
        gestor.as_str(),
    )
    .await?;
    tx.commit().await?;
    Ok(labor)
}

#[cfg(test)]
mod tests {
    use super::{validar_descripcion, validar_tipo};

    #[test]
    fn valida_tipos() {
        assert_eq!(validar_tipo(" riego ").unwrap(), "riego");
        assert!(validar_tipo("baile").is_err());
    }

    #[test]
    fn otra_exige_descripcion() {
        assert!(validar_descripcion(None, "otra").is_err());
        assert!(validar_descripcion(Some("  "), "otra").is_err());
        assert_eq!(validar_descripcion(Some(" x "), "otra").unwrap(), Some("x"));
        assert_eq!(validar_descripcion(None, "riego").unwrap(), None);
    }

    #[test]
    fn rechaza_descripciones_largas() {
        assert!(validar_descripcion(Some(&"a".repeat(501)), "riego").is_err());
    }
}
