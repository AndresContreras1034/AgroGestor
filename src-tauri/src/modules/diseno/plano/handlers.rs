use axum::{
    Json, Router,
    extract::{Path, State},
    routing::get,
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{MoverCama, Plano, PosicionActualizada},
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(obtener))
        .route("/camas/{codigo}", axum::routing::patch(mover))
}

async fn obtener(State(state): State<AppState>) -> AppResult<Json<Plano>> {
    Ok(Json(service::obtener(&state.db).await?))
}

async fn mover(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Path(codigo): Path<String>,
    Json(dto): Json<MoverCama>,
) -> AppResult<Json<PosicionActualizada>> {
    Ok(Json(service::mover(&state.db, gestor, &codigo, dto).await?))
}
