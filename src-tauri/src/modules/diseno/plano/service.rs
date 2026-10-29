use sqlx::PgPool;

use crate::{
    errors::{AppError, AppResult},
    types::{gestor::Gestor, ids::CodigoCama},
};

use super::{
    dto::{MoverCama, Plano, PosicionActualizada},
    models::LimitesCama,
    repository,
};

fn posicion_dentro_de_zona(pos_x: f64, pos_y: f64, limites: &LimitesCama) -> bool {
    pos_x >= limites.zona_x
        && pos_y >= limites.zona_y
        && pos_x + limites.ancho <= limites.zona_x + limites.zona_ancho
        && pos_y + limites.alto <= limites.zona_y + limites.zona_alto
}

pub async fn obtener(db: &PgPool) -> AppResult<Plano> {
    let zonas = repository::listar_zonas(db).await?;
    let camas = repository::listar_camas(db).await?;
    Ok(Plano { zonas, camas })
}

pub async fn mover(
    db: &PgPool,
    gestor: Gestor,
    codigo: &str,
    dto: MoverCama,
) -> AppResult<PosicionActualizada> {
    let codigo = codigo
        .parse::<CodigoCama>()
        .map(|cama| cama.to_string())
        .map_err(AppError::Validacion)?;
    if !dto.pos_x.is_finite() || !dto.pos_y.is_finite() {
        return Err(AppError::Validacion(
            "La posición de la cama debe ser un número válido".to_owned(),
        ));
    }

    let limites = repository::limites_cama(db, &codigo)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no tiene plano")))?;
    if !posicion_dentro_de_zona(dto.pos_x, dto.pos_y, &limites) {
        return Err(AppError::Validacion(format!(
            "La cama {codigo} debe permanecer dentro de la zona {}",
            limites.zona
        )));
    }

    let cama = repository::mover_cama(db, &codigo, dto.pos_x, dto.pos_y, gestor.as_str())
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("La cama {codigo} no existe")))?;

    Ok(PosicionActualizada {
        codigo: cama.codigo,
        pos_x: cama.pos_x,
        pos_y: cama.pos_y,
        actualizado_en: cama.actualizado_en,
    })
}

#[cfg(test)]
mod tests {
    use super::{LimitesCama, posicion_dentro_de_zona};

    fn limites() -> LimitesCama {
        LimitesCama {
            zona: "A".to_owned(),
            zona_x: 0.0,
            zona_y: 0.0,
            zona_ancho: 80.0,
            zona_alto: 56.0,
            ancho: 20.0,
            alto: 12.0,
        }
    }

    #[test]
    fn restringe_cama_al_rectangulo_de_su_zona() {
        let limites = limites();
        assert!(posicion_dentro_de_zona(0.0, 0.0, &limites));
        assert!(posicion_dentro_de_zona(60.0, 44.0, &limites));
        assert!(!posicion_dentro_de_zona(60.5, 44.0, &limites));
        assert!(!posicion_dentro_de_zona(-0.5, 0.0, &limites));
    }
}
