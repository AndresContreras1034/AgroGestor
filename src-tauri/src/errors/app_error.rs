use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug)]
pub enum AppError {
    Validacion(String),
    NoEncontrado(String),
    NoAutorizado(String),
    Database(sqlx::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    codigo: &'static str,
    mensaje: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, codigo, mensaje) = match self {
            Self::Validacion(mensaje) => (StatusCode::BAD_REQUEST, "validacion", mensaje),
            Self::NoEncontrado(mensaje) => (StatusCode::NOT_FOUND, "no_encontrado", mensaje),
            Self::NoAutorizado(mensaje) => (StatusCode::BAD_REQUEST, "gestor_invalido", mensaje),
            Self::Database(error) => {
                tracing::error!(%error, "Error de base de datos");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "error_interno",
                    "Error interno del servidor".to_owned(),
                )
            }
        };

        (
            status,
            Json(ErrorResponse {
                error: ErrorDetail { codigo, mensaje },
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        Self::Database(error)
    }
}
