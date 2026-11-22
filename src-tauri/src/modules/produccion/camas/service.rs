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
    models::{Cama, ResumenCama},
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

const TRANSICIONES_MANUALES: [(&str, &str); 4] = [
    ("cosechada", "en_descanso"),
    ("cosechada", "disponible"),
    ("en_descanso", "disponible"),
    ("disponible", "en_descanso"),
];

fn validar_transicion(actual: &str, nuevo: &str) -> AppResult<()> {
    if actual == nuevo || TRANSICIONES_MANUALES.contains(&(actual, nuevo)) {
        return Ok(());
    }
    Err(AppError::Validacion(format!(
        "No se puede pasar una cama de '{actual}' a '{nuevo}' manualmente. \
         El estado 'sembrada' se gestiona con siembras y cosechas"
    )))
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

    let mut tx = db.begin().await?;
    let actual = repository::obtener_por_codigo_para_actualizar(&mut tx, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?;
    if let Some(nuevo) = estado {
        validar_transicion(&actual.estado, nuevo)?;
    }
    let cama = repository::actualizar(&mut *tx, &codigo, estado, observaciones, gestor.as_str())
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?;
    tx.commit().await?;
    Ok(cama)
}

pub async fn contar_por_zona(db: &PgPool) -> AppResult<HashMap<String, i64>> {
    Ok(repository::contar_por_zona(db).await?.into_iter().collect())
}

pub async fn resumen(db: &PgPool, codigo: &str) -> AppResult<ResumenCama> {
    let codigo = normalizar_codigo(codigo)?;
    let cama = repository::obtener(db, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?;

    let siembra_activa = repository::siembra_activa_de_cama(db, cama.id).await?;
    let tallos_siembra_activa = match &siembra_activa {
        Some(siembra) => repository::tallos_de_siembra(db, siembra.id).await?,
        None => 0,
    };
    let ultima_cosecha = repository::ultima_cosecha_de_cama(db, cama.id).await?;

    Ok(ResumenCama {
        cama,
        siembra_activa,
        tallos_siembra_activa,
        ultima_cosecha,
    })
}

#[cfg(test)]
mod tests {
    use super::{ESTADOS, validar_estado, validar_transicion};

    #[test]
    fn acepta_estados_de_cama_y_rechaza_otros() {
        for estado in ESTADOS {
            assert_eq!(validar_estado(estado).unwrap(), estado);
        }
        assert!(validar_estado("ocupada").is_err());
    }

    #[test]
    fn transiciones_manuales() {
        assert!(validar_transicion("cosechada", "en_descanso").is_ok());
        assert!(validar_transicion("en_descanso", "disponible").is_ok());
        assert!(validar_transicion("sembrada", "sembrada").is_ok());
        assert!(validar_transicion("disponible", "sembrada").is_err());
        assert!(validar_transicion("sembrada", "disponible").is_err());
    }
}
