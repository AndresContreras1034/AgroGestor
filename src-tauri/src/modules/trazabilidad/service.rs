use sqlx::PgPool;

use crate::errors::{AppError, AppResult};

use super::models::{CadenaLote, EventoLinea, LoteResumen};
use super::repository;

const MAX_BUSQUEDA: usize = 40;

pub fn normalizar_codigo(valor: &str) -> AppResult<String> {
    let codigo = valor.trim().to_ascii_uppercase();
    let partes: Vec<&str> = codigo.split('-').collect();
    let valido = partes.len() == 3
        && partes[0] == "RSC"
        && partes[1].len() == 4
        && partes[2].len() == 3
        && partes[1].bytes().all(|byte| byte.is_ascii_digit())
        && partes[2].bytes().all(|byte| byte.is_ascii_digit());

    if valido {
        Ok(codigo)
    } else {
        Err(AppError::Validacion(
            "El código del lote debe tener formato RSC-AAAA-NNN".to_owned(),
        ))
    }
}

fn normalizar_busqueda(q: Option<String>) -> AppResult<Option<String>> {
    let Some(texto) = q else {
        return Ok(None);
    };
    let texto = texto.trim().to_owned();
    if texto.is_empty() {
        return Ok(None);
    }
    if texto.chars().count() > MAX_BUSQUEDA {
        return Err(AppError::Validacion(format!(
            "La búsqueda admite máximo {MAX_BUSQUEDA} caracteres"
        )));
    }
    Ok(Some(texto))
}

async fn lote_o_404(db: &PgPool, codigo: &str) -> AppResult<LoteResumen> {
    let codigo = normalizar_codigo(codigo)?;
    repository::obtener_lote(db, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("No existe el lote {codigo}")))
}

pub async fn buscar_lotes(db: &PgPool, q: Option<String>) -> AppResult<Vec<LoteResumen>> {
    let q = normalizar_busqueda(q)?;
    Ok(repository::buscar_lotes(db, q.as_deref()).await?)
}

pub async fn cadena(db: &PgPool, codigo: &str) -> AppResult<CadenaLote> {
    let lote = lote_o_404(db, codigo).await?;
    let origen = repository::origen(db, lote.id).await?;
    let destinos = repository::destinos(db, lote.id).await?;
    let despachos = repository::despachos(db, lote.id).await?;
    Ok(CadenaLote {
        lote,
        origen,
        destinos,
        despachos,
    })
}

pub async fn linea_tiempo(db: &PgPool, codigo: &str) -> AppResult<Vec<EventoLinea>> {
    let lote = lote_o_404(db, codigo).await?;
    Ok(repository::linea_tiempo(db, lote.id).await?)
}

#[cfg(test)]
mod tests {
    use super::{normalizar_busqueda, normalizar_codigo};

    #[test]
    fn normaliza_codigos_validos() {
        assert_eq!(normalizar_codigo(" rsc-2026-014 ").unwrap(), "RSC-2026-014");
    }

    #[test]
    fn rechaza_codigos_invalidos() {
        assert!(normalizar_codigo("RSC-26-014").is_err());
        assert!(normalizar_codigo("RSC-2026-14").is_err());
        assert!(normalizar_codigo("ABC-2026-014").is_err());
        assert!(normalizar_codigo("RSC-2026-01A").is_err());
        assert!(normalizar_codigo("").is_err());
    }

    #[test]
    fn busqueda_vacia_equivale_a_sin_filtro() {
        assert_eq!(normalizar_busqueda(None).unwrap(), None);
        assert_eq!(normalizar_busqueda(Some("   ".to_owned())).unwrap(), None);
        assert_eq!(
            normalizar_busqueda(Some(" 014 ".to_owned())).unwrap(),
            Some("014".to_owned())
        );
        assert!(normalizar_busqueda(Some("x".repeat(41))).is_err());
    }
}
