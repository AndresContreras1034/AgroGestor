use sqlx::PgExecutor;

use super::models::Inspeccion;

const COLUMNAS: &str =
    "id, cama_id, fecha, resultado, puntaje, observaciones, inspector, registrado_por, creado_en";

pub async fn listar(
    db: impl PgExecutor<'_>,
    cama_id: Option<i32>,
    resultado: Option<&str>,
) -> Result<Vec<Inspeccion>, sqlx::Error> {
    sqlx::query_as::<_, Inspeccion>(&format!(
        "SELECT {COLUMNAS} FROM calidad.inspeccion
         WHERE ($1::integer IS NULL OR cama_id = $1)
           AND ($2::text IS NULL OR resultado = $2)
         ORDER BY fecha DESC, id DESC"
    ))
    .bind(cama_id)
    .bind(resultado)
    .fetch_all(db)
    .await
}

pub async fn obtener(db: impl PgExecutor<'_>, id: i32) -> Result<Option<Inspeccion>, sqlx::Error> {
    sqlx::query_as::<_, Inspeccion>(&format!(
        "SELECT {COLUMNAS} FROM calidad.inspeccion WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}

pub async fn crear(
    db: impl PgExecutor<'_>,
    cama_id: i32,
    fecha: Option<chrono::NaiveDate>,
    resultado: &str,
    puntaje: Option<i32>,
    observaciones: Option<&str>,
    inspector: Option<&str>,
    registrado_por: &str,
) -> Result<Inspeccion, sqlx::Error> {
    sqlx::query_as::<_, Inspeccion>(&format!(
        "INSERT INTO calidad.inspeccion
            (cama_id, fecha, resultado, puntaje, observaciones, inspector, registrado_por)
         VALUES ($1, COALESCE($2, current_date), $3, $4,
                 NULLIF($5, ''), NULLIF($6, ''), $7)
         RETURNING {COLUMNAS}"
    ))
    .bind(cama_id)
    .bind(fecha)
    .bind(resultado)
    .bind(puntaje)
    .bind(observaciones)
    .bind(inspector)
    .bind(registrado_por)
    .fetch_one(db)
    .await
}

pub async fn actualizar(
    db: impl PgExecutor<'_>,
    id: i32,
    resultado: Option<&str>,
    puntaje: Option<i32>,
    observaciones: Option<&str>,
    inspector: Option<&str>,
) -> Result<Option<Inspeccion>, sqlx::Error> {
    sqlx::query_as::<_, Inspeccion>(&format!(
        "UPDATE calidad.inspeccion SET
            resultado = COALESCE($2, resultado),
            puntaje = COALESCE($3, puntaje),
            observaciones = CASE
                WHEN $4::text IS NULL THEN observaciones
                ELSE NULLIF($4, '')
            END,
            inspector = CASE
                WHEN $5::text IS NULL THEN inspector
                ELSE NULLIF($5, '')
            END
         WHERE id = $1
         RETURNING {COLUMNAS}"
    ))
    .bind(id)
    .bind(resultado)
    .bind(puntaje)
    .bind(observaciones)
    .bind(inspector)
    .fetch_optional(db)
    .await
}

pub async fn eliminar(db: impl PgExecutor<'_>, id: i32) -> Result<Option<Inspeccion>, sqlx::Error> {
    sqlx::query_as::<_, Inspeccion>(&format!(
        "DELETE FROM calidad.inspeccion WHERE id = $1 RETURNING {COLUMNAS}"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}
