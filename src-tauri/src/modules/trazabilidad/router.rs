use crate::state::AppState;
use axum::Router;

pub fn router() -> Router<AppState> {
    super::handlers::rutas()
}
