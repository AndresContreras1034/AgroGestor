use sqlx::PgPool;

#[derive(Clone)]
pub(crate) struct AppState {
    pub db: PgPool,
}
