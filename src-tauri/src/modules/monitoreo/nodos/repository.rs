
use sqlx::PgExecutor;

use super::models::Nodo;

const COLUMNAS: &str = "nodo.id, nodo.cama_id, cama.codigo AS cama_codigo, cama.zona,
    nodo.identificador, nodo.estado, nodo.ultima_conexion, nodo.firmware,
    nodo.creado_en, nodo.actualizado_en";

pub async fn listar(db: impl PgExecutor<'_>) -> Result<Vec<Nodo>, sqlx::Error> {
    sqlx::query_as::<_, Nodo>(&format!(
        "SELECT {COLUMNAS}
         FROM monitoreo.nodo AS nodo
         JOIN produccion.cama AS cama ON cama.id = nodo.cama_id
         ORDER BY cama.zona, cama.numero"
    ))
    .fetch_all(db)
    .await
}

pub async fn obtener_cama(db: impl PgExecutor<'_>, codigo: &str) -> Result<Option<(i32, String)>, sqlx::Error> {
    sqlx::query_as::<_, (i32, String)>(
        "SELECT id, zona FROM produccion.cama WHERE codigo = $1",
    )
    .bind(codigo)
    .fetch_optional(db)
    .await
}

pub async fn crear(
    db: impl PgExecutor<'_>,
    cama_id: i32,
    identificador: &str,
    firmware: Option<&str>,
) -> Result<Nodo, sqlx::Error> {
    sqlx::query_as::<_, Nodo>(&format!(
        "INSERT INTO monitoreo.nodo (cama_id, identificador, estado, firmware)
         VALUES ($1, $2, 'activo', $3)
         RETURNING id, cama_id, (SELECT codigo FROM produccion.cama WHERE id = $1) AS cama_codigo,
                   (SELECT zona FROM produccion.cama WHERE id = $1) AS zona,
                   identificador, estado, ultima_conexion, firmware, creado_en, actualizado_en"
    ))
    .bind(cama_id)
    .bind(identificador)
    .bind(firmware)
    .fetch_one(db)
    .await
}

pub async fn obtener(db: impl PgExecutor<'_>, identificador: &str) -> Result<Option<Nodo>, sqlx::Error> {
    sqlx::query_as::<_, Nodo>(&format!(
        "SELECT {COLUMNAS}
         FROM monitoreo.nodo AS nodo
         JOIN produccion.cama AS cama ON cama.id = nodo.cama_id
         WHERE nodo.identificador = $1"
    ))
    .bind(identificador)
    .fetch_optional(db)
    .await
}

pub async fn actualizar(
    db: impl PgExecutor<'_>,
    identificador: &str,
    estado: Option<&str>,
    firmware: Option<&str>,
) -> Result<Option<Nodo>, sqlx::Error> {
    sqlx::query_as::<_, Nodo>(&format!(
        "UPDATE monitoreo.nodo AS nodo
         SET estado = COALESCE($2, nodo.estado),
             firmware = CASE WHEN $3::text IS NULL THEN nodo.firmware ELSE NULLIF($3, '') END
         WHERE nodo.identificador = $1
         RETURNING nodo.id, nodo.cama_id,
                   (SELECT codigo FROM produccion.cama WHERE id = nodo.cama_id) AS cama_codigo,
                   (SELECT zona FROM produccion.cama WHERE id = nodo.cama_id) AS zona,
                   nodo.identificador, nodo.estado, nodo.ultima_conexion, nodo.firmware,
                   nodo.creado_en, nodo.actualizado_en"
    ))
    .bind(identificador)
    .bind(estado)
    .bind(firmware)
    .fetch_optional(db)
    .await
}
