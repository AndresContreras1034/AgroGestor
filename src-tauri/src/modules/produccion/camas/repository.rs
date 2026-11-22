use sqlx::PgExecutor;

use super::models::{Cama, CosechaResumen, SiembraResumen};

const COLUMNAS: &str = "id, codigo, zona, numero, estado, observaciones, actualizado_en";

pub async fn listar(
    db: impl PgExecutor<'_>,
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

pub async fn obtener(db: impl PgExecutor<'_>, codigo: &str) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cama WHERE codigo = $1"
    ))
    .bind(codigo)
    .fetch_optional(db)
    .await
}

pub async fn obtener_por_codigo_para_actualizar(
    conn: &mut sqlx::PgConnection,
    codigo: &str,
) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cama WHERE codigo = $1 FOR UPDATE"
    ))
    .bind(codigo)
    .fetch_optional(conn)
    .await
}

pub async fn actualizar(
    db: impl PgExecutor<'_>,
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

pub async fn contar_por_zona(db: impl PgExecutor<'_>) -> Result<Vec<(String, i64)>, sqlx::Error> {
    sqlx::query_as::<_, (String, i64)>("SELECT zona, COUNT(*) FROM produccion.cama GROUP BY zona")
        .fetch_all(db)
        .await
}

/// Lee la cama y bloquea la fila hasta el fin de la transacción.
/// Debe llamarse dentro de una transacción (`&mut *tx`).
pub async fn obtener_por_id_para_actualizar(
    conn: &mut sqlx::PgConnection,
    id: i32,
) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cama WHERE id = $1 FOR UPDATE"
    ))
    .bind(id)
    .fetch_optional(conn)
    .await
}

/// Cambia solo el estado de la cama. El estado ya debe venir validado.
pub async fn cambiar_estado_por_id(
    db: impl PgExecutor<'_>,
    id: i32,
    estado: &str,
    actor: &str,
) -> Result<Option<Cama>, sqlx::Error> {
    sqlx::query_as::<_, Cama>(&format!(
        "UPDATE produccion.cama SET estado = $2, actualizado_por = $3
         WHERE id = $1
         RETURNING {COLUMNAS}"
    ))
    .bind(id)
    .bind(estado)
    .bind(actor)
    .fetch_optional(db)
    .await
}

pub async fn siembra_activa_de_cama(
    db: impl PgExecutor<'_>,
    cama_id: i32,
) -> Result<Option<SiembraResumen>, sqlx::Error> {
    sqlx::query_as::<_, SiembraResumen>(
        "SELECT id, cama_id, fecha_siembra, fecha_estimada_cosecha, plantas_sembradas
         FROM produccion.siembra
         WHERE cama_id = $1 AND estado = 'activa'",
    )
    .bind(cama_id)
    .fetch_optional(db)
    .await
}

pub async fn tallos_de_siembra(
    db: impl PgExecutor<'_>,
    siembra_id: i32,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(SUM(tallos), 0)::bigint FROM produccion.cosecha WHERE siembra_id = $1",
    )
    .bind(siembra_id)
    .fetch_one(db)
    .await
}

pub async fn ultima_cosecha_de_cama(
    db: impl PgExecutor<'_>,
    cama_id: i32,
) -> Result<Option<CosechaResumen>, sqlx::Error> {
    sqlx::query_as::<_, CosechaResumen>(
        "SELECT id, fecha, tallos, calidad, lote_id
         FROM produccion.cosecha
         WHERE cama_id = $1
         ORDER BY fecha DESC, id DESC
         LIMIT 1",
    )
    .bind(cama_id)
    .fetch_optional(db)
    .await
}
