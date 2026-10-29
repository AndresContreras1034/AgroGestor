use crate::router::AppState;
use axum::{Json, Router, http::StatusCode, routing::post};

pub fn router() -> Router<AppState> {
    Router::new().route("/ingesta", post(ingesta_not_implemented))
}

async fn ingesta_not_implemented(
    Json(_payload): Json<serde_json::Value>,
) -> (StatusCode, &'static str) {
    (
        StatusCode::NOT_IMPLEMENTED,
        "La persistencia de lecturas aún no está implementada",
    )
}
