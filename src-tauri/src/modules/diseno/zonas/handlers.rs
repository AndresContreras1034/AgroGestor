use axum::{
    Json, Router,
    extract::{Path, State},
    routing::get,
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{ActualizarZona, ZonaResumen},
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar))
        .route("/{codigo}", get(obtener).patch(actualizar))
}

async fn listar(State(state): State<AppState>) -> AppResult<Json<Vec<ZonaResumen>>> {
    Ok(Json(service::listar(&state.db).await?))
}

async fn obtener(
    State(state): State<AppState>,
    Path(codigo): Path<String>,
) -> AppResult<Json<ZonaResumen>> {
    Ok(Json(service::obtener(&state.db, &codigo).await?))
}

async fn actualizar(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Path(codigo): Path<String>,
    Json(dto): Json<ActualizarZona>,
) -> AppResult<Json<ZonaResumen>> {
    Ok(Json(
        service::actualizar(&state.db, gestor, &codigo, dto).await?,
    ))
}
