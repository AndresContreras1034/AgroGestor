use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};

use crate::{errors::AppResult, state::AppState, types::gestor::GestorActivo};

use super::{
    dto::{CrearCosecha, FiltroCosechas},
    models::Cosecha,
    service,
};

pub fn rutas() -> Router<AppState> {
    Router::new()
        .route("/", get(listar).post(crear))
        .route("/{id}", get(obtener))
}

async fn listar(
    State(state): State<AppState>,
    Query(filtro): Query<FiltroCosechas>,
) -> AppResult<Json<Vec<Cosecha>>> {
    Ok(Json(service::listar(&state.db, filtro).await?))
}

async fn obtener(State(state): State<AppState>, Path(id): Path<i32>) -> AppResult<Json<Cosecha>> {
    Ok(Json(service::obtener(&state.db, id).await?))
}

async fn crear(
    State(state): State<AppState>,
    GestorActivo(gestor): GestorActivo,
    Json(dto): Json<CrearCosecha>,
) -> AppResult<(StatusCode, Json<Cosecha>)> {
    let cosecha = service::crear(&state.db, gestor, dto).await?;
    Ok((StatusCode::CREATED, Json(cosecha)))
}
