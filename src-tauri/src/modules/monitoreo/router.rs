use crate::state::AppState;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/nodos", super::nodos::handlers::rutas())
        .nest("/lecturas", super::lecturas::handlers::rutas())
        .nest("/umbrales", super::umbrales::handlers::rutas())
        .nest("/ingesta", super::ingesta::handlers::rutas())
}
