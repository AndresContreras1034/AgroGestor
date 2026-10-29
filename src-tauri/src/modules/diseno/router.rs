use crate::state::AppState;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/zonas", super::zonas::handlers::rutas())
        .nest("/plano", super::plano::handlers::rutas())
}
