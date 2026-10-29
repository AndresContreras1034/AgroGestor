use sqlx::PgPool;

use super::models::Cama;

const COLUMNAS: &str = "id, codigo, zona, numero, estado, observaciones, actualizado_en";

pub async fn listar(
    db: &PgPool,
    zona: Option<&str>,
    estado: Option<&str>,
) -> Result<Vec<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cama
         WHERE ($1::text IS NULL OR zona = $1)
           AND ($2::text IS NULL OR estado = $2)
         ORDER BY zona, numero"
    ))
    .bind(zona)
    .bind(estado)
    .fetch_all(db)
    .await
}

pub async fn obtener(db: &PgPool, codigo: &str) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cama WHERE codigo = $1"
    ))
    .bind(codigo)
    .fetch_optional(db)
    .await
}

pub async fn actualizar(
    db: &PgPool,
    codigo: &str,
    estado: Option<&str>,
    observaciones: Option<&str>,
    actor: &str,
) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "UPDATE produccion.cama SET
            estado = COALESCE($2, estado),
            observaciones = CASE WHEN $3::text IS NULL THEN observaciones ELSE NULLIF($3, '') END,
            actualizado_por = $4
         WHERE codigo = $1
         RETURNING {COLUMNAS}"
    ))
    .bind(codigo)
    .bind(estado)
    .bind(observaciones)
    .bind(actor)
    .fetch_optional(db)
    .await
}

pub async fn contar_por_zona(db: &PgPool) -> Result<Vec<(String, i64)>, sqlx::Error> {
    sqlx::query_as::<_, (String, i64)>("SELECT zona, COUNT(*) FROM produccion.cama GROUP BY zona")
        .fetch_all(db)
        .await
}
