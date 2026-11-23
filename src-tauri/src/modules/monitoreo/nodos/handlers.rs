
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};

use crate::{errors::AppResult, state::AppState};

use super::{
    dto::{ActualizarNodo, CrearNodo},
    models::Nodo,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar).post(crear))
        .route("/{identificador}", get(obtener).patch(actualizar))
}

async fn listar(State(state): State<AppState>) -> AppResult<Json<Vec<Nodo>>> {
    Ok(Json(service::listar(&state.db).await?))
}

async fn obtener(
    State(state): State<AppState>,
    Path(identificador): Path<String>,
) -> AppResult<Json<Nodo>> {
    match super::repository::obtener(&state.db, &identificador).await? {
        Some(nodo) => Ok(Json(nodo)),
        None => Err(crate::errors::AppError::NoEncontrado(format!(
            "El nodo {identificador} no existe"
        ))),
    }
}

async fn crear(
    State(state): State<AppState>,
    Json(dto): Json<CrearNodo>,
) -> AppResult<(StatusCode, Json<Nodo>)> {
    Ok((StatusCode::CREATED, Json(service::crear(&state.db, dto).await?)))
}

async fn actualizar(
    State(state): State<AppState>,
    Path(identificador): Path<String>,
    Json(dto): Json<ActualizarNodo>,
) -> AppResult<Json<Nodo>> {
    Ok(Json(service::actualizar(&state.db, &identificador, dto).await?))
}
