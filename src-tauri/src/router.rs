use axum::{
    Json, Router,
    extract::State,
    http::{HeaderValue, Method, StatusCode},
    routing::get,
};
use serde::Serialize;
use sqlx::PgPool;
use tower_http::cors::CorsLayer;

use crate::modules;
use crate::{config, db};

#[derive(Clone)]
pub(crate) struct AppState {
    database: PgPool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    database: &'static str,
}

pub async fn serve() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let database_url = config::database::database_url()?;
    let database = db::connection::connect(&database_url).await?;
    let address = config::app::api_address()?;
    let state = AppState { database };

    let cors = CorsLayer::new()
        .allow_origin(vec![
            HeaderValue::from_static("http://127.0.0.1:1420"),
            HeaderValue::from_static("http://localhost:1420"),
            HeaderValue::from_static("tauri://localhost"),
            HeaderValue::from_static("http://tauri.localhost"),
            HeaderValue::from_static("https://tauri.localhost"),
        ])
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(health))
        .nest("/api/v1/produccion", modules::produccion::router::router())
        .nest("/api/v1/diseno", modules::diseno::router::router())
        .nest("/api/v1/monitoreo", modules::monitoreo::router::router())
        .nest("/api/v1/calidad", modules::calidad::router::router())
        .nest("/api/v1/comercial", modules::comercial::router::router())
        .nest(
            "/api/v1/trazabilidad",
            modules::trazabilidad::router::router(),
        )
        .nest("/api/v1/analitica", modules::analitica::router::router())
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!(%address, "API HTTP local escuchando");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health(
    State(state): State<AppState>,
) -> Result<Json<HealthResponse>, (StatusCode, &'static str)> {
    sqlx::query("SELECT 1")
        .execute(&state.database)
        .await
        .map_err(|error| {
            tracing::error!(%error, "Falló la comprobación de PostgreSQL");
            (StatusCode::SERVICE_UNAVAILABLE, "PostgreSQL no disponible")
        })?;

    Ok(Json(HealthResponse {
        status: "ok",
        database: "connected",
    }))
}
