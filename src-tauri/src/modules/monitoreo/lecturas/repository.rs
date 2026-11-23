
use sqlx::PgExecutor;

use super::models::Lectura;

const COLUMNAS: &str = "lectura.id, lectura.nodo_id, nodo.identificador AS nodo_identificador,
    lectura.cama_id, cama.codigo AS cama_codigo, cama.zona, lectura.leido_en,
    lectura.temperatura, lectura.humedad_relativa, lectura.humedad_suelo,
    lectura.ph, lectura.conductividad_electrica";

pub async fn listar(
    db: impl PgExecutor<'_>,
    cama_codigo: Option<&str>,
    limite: i64,
) -> Result<Vec<Lectura>, sqlx::Error> {
    sqlx::query_as::<_, Lectura>(&format!(
        "SELECT {COLUMNAS}
         FROM monitoreo.lectura AS lectura
         JOIN monitoreo.nodo AS nodo ON nodo.id = lectura.nodo_id
         JOIN produccion.cama AS cama ON cama.id = lectura.cama_id
         WHERE ($1::text IS NULL OR cama.codigo = $1)
         ORDER BY lectura.leido_en DESC, lectura.id DESC
         LIMIT $2"
    ))
    .bind(cama_codigo)
    .bind(limite)
    .fetch_all(db)
    .await
}

pub async fn registrar(
    db: impl PgExecutor<'_>,
    nodo_id: i32,
    cama_id: i32,
    temperatura: f64,
    humedad_relativa: f64,
    humedad_suelo: f64,
    ph: f64,
    conductividad_electrica: f64,
) -> Result<Lectura, sqlx::Error> {
    sqlx::query_as::<_, Lectura>(
        "INSERT INTO monitoreo.lectura
         (nodo_id, cama_id, temperatura, humedad_relativa, humedad_suelo, ph, conductividad_electrica)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, nodo_id,
                   (SELECT identificador FROM monitoreo.nodo WHERE id = $1) AS nodo_identificador,
                   cama_id,
                   (SELECT codigo FROM produccion.cama WHERE id = $2) AS cama_codigo,
                   (SELECT zona FROM produccion.cama WHERE id = $2) AS zona,
                   leido_en, temperatura, humedad_relativa, humedad_suelo, ph, conductividad_electrica",
    )
    .bind(nodo_id)
    .bind(cama_id)
    .bind(temperatura)
    .bind(humedad_relativa)
    .bind(humedad_suelo)
    .bind(ph)
    .bind(conductividad_electrica)
    .fetch_one(db)
    .await
}

pub async fn obtener_nodo(
    db: impl PgExecutor<'_>,
    identificador: &str,
) -> Result<Option<(i32, i32)>, sqlx::Error> {
    sqlx::query_as::<_, (i32, i32)>(
        "SELECT id, cama_id FROM monitoreo.nodo WHERE identificador = $1",
    )
    .bind(identificador)
    .fetch_optional(db)
    .await
}

pub async fn marcar_conexion(db: impl PgExecutor<'_>, nodo_id: i32) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE monitoreo.nodo
         SET estado = CASE WHEN estado = 'offline' THEN 'activo' ELSE estado END,
             ultima_conexion = now()
         WHERE id = $1",
    )
    .bind(nodo_id)
    .execute(db)
    .await?;
    Ok(())
}
