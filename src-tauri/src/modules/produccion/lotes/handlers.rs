use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, patch},
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{CrearLote, FiltroLotes},
    models::Lote,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar).post(crear))
        .route("/{id}", get(obtener))
        .route("/{id}/cerrar", patch(cerrar))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroLotes>,
) -> AppResult<Json<Vec<Lote>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}

async fn obtener(State(state): State<AppState>, Path(id): Path<i32>) -> AppResult<Json<Lote>> {
    Ok(Json(service::obtener(&state.db, id).await?))
}

async fn crear(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Json(dto): Json<CrearLote>,
) -> AppResult<(StatusCode, Json<Lote>)> {
    let lote = service::crear(&state.db, gestor, dto).await?;
    Ok((StatusCode::CREATED, Json(lote)))
}

async fn cerrar(
    State(state): State<AppState>,
    GestorActivo(_gestor): GestorActivo,
    Path(id): Path<i32>,
) -> AppResult<Json<Lote>> {
    Ok(Json(service::cerrar(&state.db, id).await?))
}
