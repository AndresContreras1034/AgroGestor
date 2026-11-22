use chrono::NaiveDate;
use sqlx::{FromRow, PgConnection, PgExecutor};

use super::models::Cosecha;

const COLUMNAS: &str =
    "id, cama_id, siembra_id, lote_id, fecha, tallos, calidad, registrado_por, creado_en";

#[derive(Debug, FromRow)]
pub struct SiembraBloqueada {
    pub fecha_siembra: NaiveDate,
    pub estado: String,
}

pub async fn listar(
    db: impl PgExecutor<'_>,
    siembra_id: Option<i32>,
    lote_id: Option<i32>,
) -> Result<Vec<Cosecha>, sqlx::Error> {
    sqlx::query_as::<_, Cosecha>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cosecha
         WHERE ($1::int IS NULL OR siembra_id = $1)
           AND ($2::int IS NULL OR lote_id = $2)
         ORDER BY fecha DESC, id DESC"
    ))
    .bind(siembra_id)
    .bind(lote_id)
    .fetch_all(db)
    .await
}

pub async fn obtener(db: impl PgExecutor<'_>, id: i32) -> Result<Option<Cosecha>, sqlx::Error> {
    sqlx::query_as::<_, Cosecha>(&format!(
        "SELECT {COLUMNAS} FROM produccion.cosecha WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(db)
    .await
}

pub async fn cama_id_de_siembra(
    db: impl PgExecutor<'_>,
    siembra_id: i32,
) -> Result<Option<i32>, sqlx::Error> {
    sqlx::query_scalar::<_, i32>("SELECT cama_id FROM produccion.siembra WHERE id = $1")
        .bind(siembra_id)
        .fetch_optional(db)
        .await
}

pub async fn siembra_para_actualizar(
    conn: &mut PgConnection,
    siembra_id: i32,
) -> Result<Option<SiembraBloqueada>, sqlx::Error> {
    sqlx::query_as::<_, SiembraBloqueada>(
        "SELECT fecha_siembra, estado FROM produccion.siembra WHERE id = $1 FOR UPDATE",
    )
    .bind(siembra_id)
    .fetch_optional(conn)
    .await
}

pub async fn estado_lote_compartido(
    conn: &mut PgConnection,
    lote_id: i32,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar::<_, String>("SELECT estado FROM produccion.lote WHERE id = $1 FOR SHARE")
        .bind(lote_id)
        .fetch_optional(conn)
        .await
}

#[allow(clippy::too_many_arguments)]
pub async fn crear(
    db: impl PgExecutor<'_>,
    cama_id: i32,
    siembra_id: i32,
    lote_id: Option<i32>,
    fecha: NaiveDate,
    tallos: i32,
    calidad: &str,
    actor: &str,
) -> Result<Cosecha, sqlx::Error> {
    sqlx::query_as::<_, Cosecha>(&format!(
        "INSERT INTO produccion.cosecha
            (cama_id, siembra_id, lote_id, fecha, tallos, calidad, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING {COLUMNAS}"
    ))
    .bind(cama_id)
    .bind(siembra_id)
    .bind(lote_id)
    .bind(fecha)
    .bind(tallos)
    .bind(calidad)
    .bind(actor)
    .fetch_one(db)
    .await
}

pub async fn marcar_siembra_cosechada(
    db: impl PgExecutor<'_>,
    siembra_id: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE produccion.siembra SET estado = 'cosechada' WHERE id = $1")
        .bind(siembra_id)
        .execute(db)
        .await?;
    Ok(())
}
