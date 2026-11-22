use sqlx::PgExecutor;

use super::models::Siembra;

const COLUMNAS: &str = "id, cama_id, fecha_siembra, fecha_estimada_cosecha, plantas_sembradas, estado, observaciones, registrado_por, creado_en, actualizado_en";

pub async fn listar(db: impl PgExecutor<'_>) -> Result<Vec<Siembra>, sqlx::Error> {
    sqlx::query_as::<_, Siembra>(&format!(
        "SELECT {COLUMNAS} FROM produccion.siembra ORDER BY fecha_siembra DESC, id DESC"
    ))
    .fetch_all(db)
    .await
}

pub async fn obtener(db: impl PgExecutor<'_>, id: i32) -> Result<Option<Siembra>, sqlx::Error> {
    sqlx::query_as::<_, Siembra>(&format!(
        "SELECT {COLUMNAS} FROM produccion.siembra WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}

pub async fn crear(
    db: impl PgExecutor<'_>,
    cama_id: i32,
    fecha_siembra: chrono::NaiveDate,
    fecha_estimada_cosecha: Option<chrono::NaiveDate>,
    plantas_sembradas: i32,
    observaciones: Option<&str>,
    actor: &str,
) -> Result<Siembra, sqlx::Error> {
    sqlx::query_as::<_, Siembra>(&format!(
        "INSERT INTO produccion.siembra
            (cama_id, fecha_siembra, fecha_estimada_cosecha, plantas_sembradas, observaciones, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING {COLUMNAS}"
    ))
    .bind(cama_id)
    .bind(fecha_siembra)
    .bind(fecha_estimada_cosecha)
    .bind(plantas_sembradas)
    .bind(observaciones)
    .bind(actor)
    .fetch_one(db)
    .await
}

pub async fn cancelar(db: impl PgExecutor<'_>, id: i32) -> Result<Option<Siembra>, sqlx::Error> {
    sqlx::query_as::<_, Siembra>(&format!(
        "UPDATE produccion.siembra SET estado = 'cancelada'
         WHERE id = $1 AND estado = 'activa'
         RETURNING {COLUMNAS}"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}
