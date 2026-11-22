use sqlx::PgConnection;

use super::models::Lote;

const COLUMNAS: &str =
    "id, codigo, anio, secuencia, estado, observaciones, registrado_por, creado_en, actualizado_en";

pub async fn listar(
    conn: &mut PgConnection,
    estado: Option<&str>,
    anio: Option<i32>,
) -> Result<Vec<Lote>, sqlx::Error> {
    sqlx::query_as::<_, Lote>(&format!(
        "SELECT {COLUMNAS} FROM produccion.lote
         WHERE ($1::text IS NULL OR estado = $1)
           AND ($2::int IS NULL OR anio = $2)
         ORDER BY anio DESC, secuencia DESC"
    ))
    .bind(estado)
    .bind(anio)
    .fetch_all(conn)
    .await
}

pub async fn obtener(conn: &mut PgConnection, id: i32) -> Result<Option<Lote>, sqlx::Error> {
    sqlx::query_as::<_, Lote>(&format!(
        "SELECT {COLUMNAS} FROM produccion.lote WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(conn)
    .await
}

pub async fn anio_actual(conn: &mut PgConnection) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar::<_, i32>(
        "SELECT EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Bogota')::int",
    )
    .fetch_one(conn)
    .await
}

pub async fn siguiente_secuencia(conn: &mut PgConnection, anio: i32) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar::<_, i32>(
        "SELECT COALESCE(MAX(secuencia), 0) + 1 FROM produccion.lote WHERE anio = $1",
    )
    .bind(anio)
    .fetch_one(conn)
    .await
}

pub async fn crear(
    conn: &mut PgConnection,
    codigo: &str,
    anio: i32,
    secuencia: i32,
    observaciones: Option<&str>,
    actor: &str,
) -> Result<Lote, sqlx::Error> {
    sqlx::query_as::<_, Lote>(&format!(
        "INSERT INTO produccion.lote (codigo, anio, secuencia, observaciones, registrado_por)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING {COLUMNAS}"
    ))
    .bind(codigo)
    .bind(anio)
    .bind(secuencia)
    .bind(observaciones)
    .bind(actor)
    .fetch_one(conn)
    .await
}

pub async fn cerrar(conn: &mut PgConnection, id: i32) -> Result<bool, sqlx::Error> {
    let resultado = sqlx::query(
        "UPDATE produccion.lote SET estado = 'cerrado' WHERE id = $1 AND estado = 'abierto'",
    )
    .bind(id)
    .execute(conn)
    .await?;
    Ok(resultado.rows_affected() == 1)
}
