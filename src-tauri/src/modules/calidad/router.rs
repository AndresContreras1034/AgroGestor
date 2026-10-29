use crate::router::AppState;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new()
}
