use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{ActualizarCama, FiltroCamas},
    models::Cama,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar))
        .route("/{codigo}", get(obtener).patch(actualizar))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroCamas>,
) -> AppResult<Json<Vec<Cama>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}

async fn obtener(
    State(state): State<AppState>,
    Path(codigo): Path<String>,
) -> AppResult<Json<Cama>> {
    Ok(Json(service::obtener(&state.db, &codigo).await?))
}

async fn actualizar(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Path(codigo): Path<String>,
    Json(dto): Json<ActualizarCama>,
) -> AppResult<Json<Cama>> {
    Ok(Json(
        service::actualizar(&state.db, gestor, &codigo, dto).await?,
    ))
}
