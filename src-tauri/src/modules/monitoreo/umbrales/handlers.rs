
use axum::{
    extract::{Path, State},
    routing::{get, put},
    Json, Router,
};

use crate::{errors::AppResult, state::AppState};

use super::{dto::ActualizarUmbral, models::Umbral, service};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar))
        .route("/{variable}", put(actualizar))
}

async fn listar(State(state): State<AppState>) -> AppResult<Json<Vec<Umbral>>> {
    Ok(Json(service::listar(&state.db).await?))
}

async fn actualizar(
    State(state): State<AppState>,
    Path(variable): Path<String>,
    Json(dto): Json<ActualizarUmbral>,
) -> AppResult<Json<Umbral>> {
    Ok(Json(service::actualizar(&state.db, &variable, dto).await?))
}
