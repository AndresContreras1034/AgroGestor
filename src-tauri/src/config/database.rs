use std::env;

pub fn database_url() -> Result<String, env::VarError> {
    env::var("DATABASE_URL")
}
