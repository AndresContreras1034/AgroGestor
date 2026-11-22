use chrono::NaiveDate;
use sqlx::PgConnection;

use super::models::Labor;

const SELECT: &str = "SELECT l.id, l.cama_id, c.codigo AS cama_codigo, l.siembra_id, l.tipo,
        l.fecha, l.descripcion, l.registrado_por, l.creado_en
    FROM produccion.labor l
    JOIN produccion.cama c ON c.id = l.cama_id";

pub async fn listar(
    conn: &mut PgConnection,
    cama: Option<&str>,
    siembra_id: Option<i32>,
    tipo: Option<&str>,
) -> Result<Vec<Labor>, sqlx::Error> {
    sqlx::query_as::<_, Labor>(&format!(
        "{SELECT}
         WHERE ($1::text IS NULL OR c.codigo = $1)
           AND ($2::int IS NULL OR l.siembra_id = $2)
           AND ($3::text IS NULL OR l.tipo = $3)
         ORDER BY l.fecha DESC, l.id DESC
         LIMIT 500"
    ))
    .bind(cama)
    .bind(siembra_id)
    .bind(tipo)
    .fetch_all(conn)
    .await
}

pub async fn obtener(conn: &mut PgConnection, id: i32) -> Result<Option<Labor>, sqlx::Error> {
    sqlx::query_as::<_, Labor>(&format!("{SELECT} WHERE l.id = $1"))
        .bind(id)
        .fetch_optional(conn)
        .await
}

pub async fn hoy(conn: &mut PgConnection) -> Result<NaiveDate, sqlx::Error> {
    sqlx::query_scalar::<_, NaiveDate>("SELECT (now() AT TIME ZONE 'America/Bogota')::date")
        .fetch_one(conn)
        .await
}

pub async fn crear(
    conn: &mut PgConnection,
    cama_id: i32,
    siembra_id: Option<i32>,
    tipo: &str,
    fecha: NaiveDate,
    descripcion: Option<&str>,
    actor: &str,
) -> Result<Labor, sqlx::Error> {
    sqlx::query_as::<_, Labor>(
        "WITH nueva AS (
            INSERT INTO produccion.labor
                (cama_id, siembra_id, tipo, fecha, descripcion, registrado_por)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
         )
         SELECT l.id, l.cama_id, c.codigo AS cama_codigo, l.siembra_id, l.tipo,
                l.fecha, l.descripcion, l.registrado_por, l.creado_en
         FROM nueva l
         JOIN produccion.cama c ON c.id = l.cama_id",
    )
    .bind(cama_id)
    .bind(siembra_id)
    .bind(tipo)
    .bind(fecha)
    .bind(descripcion)
    .bind(actor)
    .fetch_one(conn)
    .await
}
