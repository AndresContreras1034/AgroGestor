use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, patch},
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{FiltroSiembras, NuevaSiembra},
    models::Siembra,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar).post(crear))
        .route("/{id}", get(obtener))
        .route("/{id}/cancelar", patch(cancelar))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroSiembras>,
) -> AppResult<Json<Vec<Siembra>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}

async fn obtener(State(state): State<AppState>, Path(id): Path<i32>) -> AppResult<Json<Siembra>> {
    Ok(Json(service::obtener(&state.db, id).await?))
}

async fn crear(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Json(dto): Json<NuevaSiembra>,
) -> AppResult<(StatusCode, Json<Siembra>)> {
    let siembra = service::crear(&state.db, gestor, dto).await?;
    Ok((StatusCode::CREATED, Json(siembra)))
}

async fn cancelar(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Path(id): Path<i32>,
) -> AppResult<Json<Siembra>> {
    Ok(Json(service::cancelar(&state.db, gestor, id).await?))
}
