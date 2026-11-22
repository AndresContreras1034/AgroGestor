use crate::state::AppState;
use axum::Router;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/camas", super::camas::handlers::rutas())
        .nest("/siembras", super::siembras::handlers::rutas())
        .nest("/lotes", super::lotes::handlers::rutas())
        .nest("/cosechas", super::cosechas::handlers::rutas())
        .nest("/labores", super::labores::handlers::rutas())
}
