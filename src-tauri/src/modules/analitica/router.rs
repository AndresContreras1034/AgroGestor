use crate::state::AppState;
use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct ResumenAnalitico {
    camas: i64,
    siembras_activas: i64,
    tallos_cosechados: i64,
    lotes_abiertos: i64,
    incidencias_abiertas: i64,
    lecturas_24h: i64,
    alertas_iot: i64,
    clientes_activos: i64,
}

#[derive(Debug, Serialize)]
struct ProduccionSerie { fecha: String, tallos: i64 }

#[derive(Debug, Serialize)]
struct SemaforoItem { zona: String, estado: String, lecturas: i64, alertas: i64 }

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/resumen", get(resumen))
        .route("/produccion", get(produccion))
        .route("/semaforo", get(semaforo))
        .route("/asistente", get(super::asistente::estado).post(super::asistente::preguntar))
}

async fn resumen(State(state): State<AppState>) -> Result<Json<ResumenAnalitico>, crate::errors::AppError> {
    let camas=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM produccion.cama").fetch_one(&state.db).await?;
    let siembras=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM produccion.siembra WHERE estado='activa'").fetch_one(&state.db).await?;
    let tallos=sqlx::query_scalar::<_,i64>("SELECT COALESCE(sum(tallos),0)::bigint FROM produccion.cosecha").fetch_one(&state.db).await?;
    let lotes=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM produccion.lote WHERE estado='abierto'").fetch_one(&state.db).await?;
    let incidencias=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM calidad.incidencia WHERE estado!='resuelta'").fetch_one(&state.db).await?;
    let lecturas=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM monitoreo.lectura WHERE leido_en>=now()-interval '24 hours'").fetch_one(&state.db).await?;
    let alertas=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM monitoreo.nodo WHERE estado='alerta'").fetch_one(&state.db).await?;
    let clientes=sqlx::query_scalar::<_,i64>("SELECT count(*) FROM ventas.cliente WHERE activo").fetch_one(&state.db).await?;
    Ok(Json(ResumenAnalitico{camas,siembras_activas:siembras,tallos_cosechados:tallos,lotes_abiertos:lotes,incidencias_abiertas:incidencias,lecturas_24h:lecturas,alertas_iot:alertas,clientes_activos:clientes}))
}

async fn produccion(State(state):State<AppState>) -> Result<Json<Vec<ProduccionSerie>>,crate::errors::AppError> {
    let filas=sqlx::query_as::<_,(String,i64)>(
        "SELECT to_char(fecha,'YYYY-MM-DD'), COALESCE(sum(tallos),0)::bigint
         FROM produccion.cosecha
         WHERE fecha>=current_date-14
         GROUP BY fecha ORDER BY fecha",
    ).fetch_all(&state.db).await?;
    Ok(Json(filas.into_iter().map(|(fecha,tallos)|ProduccionSerie{fecha,tallos}).collect()))
}

async fn semaforo(State(state):State<AppState>) -> Result<Json<Vec<SemaforoItem>>,crate::errors::AppError> {
    let filas=sqlx::query_as::<_,(String,i64,i64)>(
        "SELECT c.zona,
                count(l.id)::bigint,
                count(l.id) FILTER (
                  WHERE l.temperatura NOT BETWEEN 8 AND 28
                     OR l.humedad_relativa NOT BETWEEN 55 AND 90
                     OR l.humedad_suelo NOT BETWEEN 30 AND 70
                     OR l.ph NOT BETWEEN 5.5 AND 7
                     OR l.conductividad_electrica NOT BETWEEN 0.5 AND 2
                )::bigint
         FROM produccion.cama c
         LEFT JOIN monitoreo.lectura l ON l.cama_id=c.id
           AND l.leido_en>=now()-interval '24 hours'
         GROUP BY c.zona ORDER BY c.zona",
    ).fetch_all(&state.db).await?;
    Ok(Json(filas.into_iter().map(|(zona,lecturas,alertas)| {
        let estado=if alertas>0{"rojo"} else if lecturas>0{"verde"} else {"amarillo"};
        SemaforoItem{zona,estado:estado.to_owned(),lecturas,alertas}
    }).collect()))
}
