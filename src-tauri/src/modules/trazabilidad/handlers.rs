use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};

use crate::errors::AppResult;
use crate::state::AppState;

use super::dto::FiltroBusqueda;
use super::models::{CadenaLote, EventoLinea, LoteResumen};
use super::service;

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/lotes", get(buscar))
        .route("/lotes/{codigo}/cadena", get(cadena))
        .route("/lotes/{codigo}/linea-tiempo", get(linea_tiempo))
}

async fn buscar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroBusqueda>,
) -> AppResult<Json<Vec<LoteResumen>>> {
    Ok(Json(service::buscar_lotes(&state.db, filtro.q).await?))
}

async fn cadena(
    State(state): State<AppState>,
    Path(codigo): Path<String>,
) -> AppResult<Json<CadenaLote>> {
    Ok(Json(service::cadena(&state.db, &codigo).await?))
}

async fn linea_tiempo(
    State(state): State<AppState>,
    Path(codigo): Path<String>,
) -> AppResult<Json<Vec<EventoLinea>>> {
    Ok(Json(service::linea_tiempo(&state.db, &codigo).await?))
}
