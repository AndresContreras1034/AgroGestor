
use sqlx::PgExecutor;

use super::models::Umbral;

pub async fn listar(db: impl PgExecutor<'_>) -> Result<Vec<Umbral>, sqlx::Error> {
    sqlx::query_as::<_, Umbral>(
        "SELECT variable, unidad, min_alerta, max_alerta, min_critico, max_critico
         FROM monitoreo.umbral
         ORDER BY variable",
    )
    .fetch_all(db)
    .await
}

pub async fn actualizar(
    db: impl PgExecutor<'_>,
    variable: &str,
    unidad: Option<&str>,
    min_alerta: f64,
    max_alerta: f64,
    min_critico: f64,
    max_critico: f64,
) -> Result<Option<Umbral>, sqlx::Error> {
    sqlx::query_as::<_, Umbral>(
        "UPDATE monitoreo.umbral
         SET unidad = COALESCE($2, unidad),
             min_alerta = $3, max_alerta = $4,
             min_critico = $5, max_critico = $6
         WHERE variable = $1
         RETURNING variable, unidad, min_alerta, max_alerta, min_critico, max_critico",
    )
    .bind(variable)
    .bind(unidad)
    .bind(min_alerta)
    .bind(max_alerta)
    .bind(min_critico)
    .bind(max_critico)
    .fetch_optional(db)
    .await
}
