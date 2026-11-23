use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};

use crate::{
    errors::{AppError, AppResult},
    modules::monitoreo::lecturas::{models::Lectura, repository},
    state::AppState,
};

use super::{adaptador::AdaptadorLecturas, http::IngestaHttp};

pub fn rutas() -> Router<AppState> {
    Router::new().route("/", post(ingestar))
}

async fn ingestar(
    State(state): State<AppState>,
    Json(payload): Json<IngestaHttp>,
) -> AppResult<(StatusCode, Json<Lectura>)> {
    payload.validar()?;
    let identificador = payload.identificador.trim();
    if identificador.is_empty() {
        return Err(AppError::Validacion(
            "El identificador del nodo es obligatorio".to_owned(),
        ));
    }

    let mut tx = state.db.begin().await?;
    let (nodo_id, cama_id) = repository::obtener_nodo(&mut *tx, identificador)
        .await?
        .ok_or_else(|| AppError::NoEncontrado(format!("El nodo {identificador} no existe")))?;
    let lectura = repository::registrar(
        &mut *tx,
        nodo_id,
        cama_id,
        payload.temperatura,
        payload.humedad_relativa,
        payload.humedad_suelo,
        payload.ph,
        payload.conductividad_electrica,
    )
    .await?;
    repository::marcar_conexion(&mut *tx, nodo_id).await?;
    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(lectura)))
}
