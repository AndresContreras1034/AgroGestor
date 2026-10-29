use sqlx::PgPool;

use super::models::Zona;

const COLUMNAS: &str = "id, codigo, nombre, descripcion, hectareas, color, actualizado_en";

pub async fn listar(db: &PgPool) -> Result<Vec<Zona>, sqlx::Error> {
    sqlx::query_as::<_, Zona>(&format!(
        "SELECT {COLUMNAS} FROM finca.zona ORDER BY codigo"
    ))
    .fetch_all(db)
    .await
}

pub async fn obtener(db: &PgPool, codigo: &str) -> Result<Option<Zona>, sqlx::Error> {
    sqlx::query_as::<_, Zona>(&format!(
        "SELECT {COLUMNAS} FROM finca.zona WHERE codigo = $1"
    ))
    .bind(codigo)
    .fetch_optional(db)
    .await
}

pub async fn actualizar(
    db: &PgPool,
    codigo: &str,
    nombre: Option<&str>,
    descripcion: Option<&str>,
    hectareas: Option<f64>,
    color: Option<&str>,
    actor: &str,
) -> Result<Option<Zona>, sqlx::Error> {
    sqlx::query_as::<_, Zona>(&format!(
        "UPDATE finca.zona SET
            nombre = COALESCE($2, nombre),
            descripcion = CASE WHEN $3::text IS NULL THEN descripcion ELSE NULLIF($3, '') END,
            hectareas = COALESCE($4, hectareas),
            color = COALESCE($5, color),
            actualizado_por = $6
         WHERE codigo = $1
         RETURNING {COLUMNAS}"
    ))
    .bind(codigo)
    .bind(nombre)
    .bind(descripcion)
    .bind(hectareas)
    .bind(color)
    .bind(actor)
    .fetch_optional(db)
    .await
}
