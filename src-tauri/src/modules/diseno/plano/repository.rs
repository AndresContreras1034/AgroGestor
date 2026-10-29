use sqlx::PgPool;

use super::models::{CamaPlano, LimitesCama, ZonaPlano};

pub async fn listar_zonas(db: &PgPool) -> Result<Vec<ZonaPlano>, sqlx::Error> {
    sqlx::query_as::<_, ZonaPlano>(
        "SELECT codigo, nombre, color, pos_x, pos_y, ancho, alto
         FROM finca.zona
         ORDER BY codigo",
    )
    .fetch_all(db)
    .await
}

pub async fn listar_camas(db: &PgPool) -> Result<Vec<CamaPlano>, sqlx::Error> {
    sqlx::query_as::<_, CamaPlano>(
        "SELECT cama.id, cama.codigo, cama.zona, cama.numero, cama.estado,
                cama.observaciones, geometria.pos_x, geometria.pos_y,
                geometria.ancho, geometria.alto, geometria.actualizado_en
         FROM produccion.cama AS cama
         JOIN finca.cama_plano AS geometria ON geometria.cama_id = cama.id
         ORDER BY cama.zona, cama.numero",
    )
    .fetch_all(db)
    .await
}

pub async fn limites_cama(db: &PgPool, codigo: &str) -> Result<Option<LimitesCama>, sqlx::Error> {
    sqlx::query_as::<_, LimitesCama>(
        "SELECT cama.zona, zona.pos_x AS zona_x, zona.pos_y AS zona_y,
                zona.ancho AS zona_ancho, zona.alto AS zona_alto,
                geometria.ancho, geometria.alto
         FROM produccion.cama AS cama
         JOIN finca.cama_plano AS geometria ON geometria.cama_id = cama.id
         JOIN finca.zona AS zona ON zona.codigo = cama.zona
         WHERE cama.codigo = $1",
    )
    .bind(codigo)
    .fetch_optional(db)
    .await
}

pub async fn mover_cama(
    db: &PgPool,
    codigo: &str,
    pos_x: f64,
    pos_y: f64,
    actor: &str,
) -> Result<Option<CamaPlano>, sqlx::Error> {
    sqlx::query_as::<_, CamaPlano>(
        "UPDATE finca.cama_plano AS geometria
         SET pos_x = $2, pos_y = $3, actualizado_por = $4
         FROM produccion.cama AS cama
         WHERE geometria.cama_id = cama.id AND cama.codigo = $1
         RETURNING cama.id, cama.codigo, cama.zona, cama.numero, cama.estado,
                   cama.observaciones, geometria.pos_x, geometria.pos_y,
                   geometria.ancho, geometria.alto, geometria.actualizado_en",
    )
    .bind(codigo)
    .bind(pos_x)
    .bind(pos_y)
    .bind(actor)
    .fetch_optional(db)
    .await
}
