use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    types::gestor::Gestor,
};

use super::{
    dto::{CrearLote, FiltroLotes},
    models::Lote,
    repository,
};

const ESTADOS: [&str; 2] = ["abierto", "cerrado"];
const MAX_INTENTOS: usize = 5;
const MAX_SECUENCIA: i32 = 999;

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

fn validar_observaciones(observaciones: Option<&str>) -> AppResult<Option<&str>> {
    let observaciones = observaciones
        .map(str::trim)
        .filter(|texto| !texto.is_empty());
    if matches!(observaciones, Some(texto) if texto.chars().count() > 500) {
        return Err(AppError::Validacion(
            "Las observaciones no pueden pasar de 500 caracteres".to_owned(),
        ));
    }
    Ok(observaciones)
}

fn formatear_codigo(anio: i32, secuencia: i32) -> String {
    format!("RSC-{anio}-{secuencia:03}")
}

pub async fn listar(db: &PgPool, filtro: FiltroLotes) -> AppResult<Vec<Lote>> {
    let estado = filtro.estado.as_deref().map(validar_estado).transpose()?;
    let mut conn = db.acquire().await?;
    Ok(repository::listar(&mut conn, estado, filtro.anio).await?)
}

pub async fn obtener(db: &PgPool, id: i32) -> AppResult<Lote> {
    let mut conn = db.acquire().await?;
    repository::obtener(&mut conn, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El lote {id} no existe")))
}

async fn intentar_crear(
    db: &PgPool,
    actor: &str,
    observaciones: Option<&str>,
) -> AppResult<Option<Lote>> {
    let mut tx = db.begin().await?;
    let anio = repository::anio_actual(&mut *tx).await?;
    let secuencia = repository::siguiente_secuencia(&mut *tx, anio).await?;
    if secuencia > MAX_SECUENCIA {
        return Err(AppError::Validacion(format!(
            "Se alcanzó el máximo de {MAX_SECUENCIA} lotes para {anio}"
        )));
    }
    let codigo = formatear_codigo(anio, secuencia);

    match repository::crear(&mut *tx, &codigo, anio, secuencia, observaciones, actor).await {
        Ok(lote) => {
            tx.commit().await?;
            Ok(Some(lote))
        }
        Err(sqlx::Error::Database(error)) if error.is_unique_violation() => Ok(None),
        Err(error) => Err(AppError::from(error)),
    }
}

pub async fn crear(db: &PgPool, gestor: Gestor, dto: CrearLote) -> AppResult<Lote> {
    let observaciones = validar_observaciones(dto.observaciones.as_deref())?;
    for _ in 0..MAX_INTENTOS {
        if let Some(lote) = intentar_crear(db, gestor.as_str(), observaciones).await? {
            return Ok(lote);
        }
    }
    Err(AppError::Validacion(
        "No se pudo generar el código del lote por concurrencia. Intenta de nuevo".to_owned(),
    ))
}

pub async fn cerrar(db: &PgPool, id: i32) -> AppResult<Lote> {
    let mut tx = db.begin().await?;
    let lote = repository::obtener(&mut *tx, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El lote {id} no existe")))?;
    if lote.estado != "abierto" {
        return Err(AppError::Validacion(format!(
            "El lote {} ya está cerrado",
            lote.codigo
        )));
    }
    if !repository::cerrar(&mut *tx, id).await? {
        return Err(AppError::Validacion(format!(
            "El lote {} ya está cerrado",
            lote.codigo
        )));
    }
    let actualizado = repository::obtener(&mut *tx, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El lote {id} no existe")))?;
    tx.commit().await?;
    Ok(actualizado)
}

pub async fn exigir_abierto(conn: &mut sqlx::PgConnection, id: i32) -> AppResult<Lote> {
    let lote = repository::obtener(conn, id)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El lote {id} no existe")))?;
    if lote.estado != "abierto" {
        return Err(AppError::Validacion(format!(
            "El lote {} está cerrado y no admite nuevas cosechas",
            lote.codigo
        )));
    }
    Ok(lote)
}

#[cfg(test)]
mod tests {
    use super::{formatear_codigo, validar_estado, validar_observaciones};

    #[test]
    fn formatea_el_codigo_con_secuencia_de_tres_digitos() {
        assert_eq!(formatear_codigo(2026, 7), "RSC-2026-007");
        assert_eq!(formatear_codigo(2026, 123), "RSC-2026-123");
    }

    #[test]
    fn valida_estados() {
        assert_eq!(validar_estado(" abierto ").unwrap(), "abierto");
        assert!(validar_estado("pendiente").is_err());
    }

    #[test]
    fn observaciones_vacias_son_none_y_las_largas_se_rechazan() {
        assert_eq!(validar_observaciones(Some("   ")).unwrap(), None);
        assert!(validar_observaciones(Some(&"a".repeat(501))).is_err());
    }
}
