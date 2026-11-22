use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{CrearLabor, FiltroLabores},
    models::Labor,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar).post(crear))
        .route("/{id}", get(obtener))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroLabores>,
) -> AppResult<Json<Vec<Labor>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}

async fn obtener(State(state): State<AppState>, Path(id): Path<i32>) -> AppResult<Json<Labor>> {
    Ok(Json(service::obtener(&state.db, id).await?))
}

async fn crear(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Json(dto): Json<CrearLabor>,
) -> AppResult<(StatusCode, Json<Labor>)> {
    let labor = service::crear(&state.db, gestor, dto).await?;
    Ok((StatusCode::CREATED, Json(labor)))
}
