
use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};

use crate::{errors::AppResult, state::AppState};

use super::{dto::FiltroLecturas, models::Lectura, service};

pub fn rutas() -> Router<AppState> {
    Router::new().route("/", get(listar))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroLecturas>,
) -> AppResult<Json<Vec<Lectura>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}
