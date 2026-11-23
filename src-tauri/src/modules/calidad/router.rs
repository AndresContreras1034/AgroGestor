use crate::state::AppState;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
struct Incidencia {
    id: i32,
    cama_id: i32,
    cama_codigo: Option<String>,
    siembra_id: Option<i32>,
    tipo: String,
    nombre: String,
    severidad: String,
    estado: String,
    detectada_en: NaiveDate,
    descripcion: Option<String>,
    registrado_por: String,
    creado_en: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct NuevaIncidencia {
    cama_codigo: String,
    siembra_id: Option<i32>,
    tipo: String,
    nombre: String,
    severidad: String,
    detectada_en: Option<NaiveDate>,
    descripcion: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CambiarIncidencia { estado: String }

#[derive(Debug, Clone, Serialize, FromRow)]
struct Tratamiento {
    id: i32,
    incidencia_id: i32,
    producto: String,
    dosis: Option<String>,
    fecha_aplicacion: NaiveDate,
    responsable: Option<String>,
    observaciones: Option<String>,
    creado_en: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct NuevoTratamiento {
    incidencia_id: i32,
    producto: String,
    dosis: Option<String>,
    fecha_aplicacion: NaiveDate,
    responsable: Option<String>,
    observaciones: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
struct Inspeccion {
    id: i32,
    cama_id: i32,
    cama_codigo: Option<String>,
    fecha: NaiveDate,
    resultado: String,
    puntaje: Option<i32>,
    observaciones: Option<String>,
    inspector: Option<String>,
    creado_en: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct NuevaInspeccion {
    cama_codigo: String,
    fecha: Option<NaiveDate>,
    resultado: String,
    puntaje: Option<i32>,
    observaciones: Option<String>,
    inspector: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/incidencias", incidencias_router())
        .nest("/tratamientos", tratamientos_router())
        .nest("/inspecciones", inspecciones_router())
}

fn incidencias_router() -> Router<AppState> {
    Router::new()
        .route("/", get(listar_incidencias).post(crear_incidencia))
        .route("/{id}", patch(cambiar_incidencia))
}

async fn listar_incidencias(State(state): State<AppState>) -> Result<Json<Vec<Incidencia>>, crate::errors::AppError> {
    let filas = sqlx::query_as::<_, Incidencia>(
        "SELECT i.id, i.cama_id, c.codigo AS cama_codigo, i.siembra_id, i.tipo, i.nombre,
                i.severidad, i.estado, i.detectada_en, i.descripcion, i.registrado_por, i.creado_en
         FROM calidad.incidencia i JOIN produccion.cama c ON c.id=i.cama_id
         ORDER BY i.detectada_en DESC, i.id DESC",
    ).fetch_all(&state.db).await?;
    Ok(Json(filas))
}

async fn crear_incidencia(
    State(state): State<AppState>,
    Json(dto): Json<NuevaIncidencia>,
) -> Result<(StatusCode, Json<Incidencia>), crate::errors::AppError> {
    let tipos = ["plaga","enfermedad","brote","otro"];
    let severidades = ["baja","media","alta","critica"];
    if !tipos.contains(&dto.tipo.as_str()) { return Err(crate::errors::AppError::Validacion("Tipo de incidencia inválido".to_owned())); }
    if !severidades.contains(&dto.severidad.as_str()) { return Err(crate::errors::AppError::Validacion("Severidad inválida".to_owned())); }
    let fila = sqlx::query_as::<_, Incidencia>(
        "INSERT INTO calidad.incidencia
         (cama_id, siembra_id, tipo, nombre, severidad, estado, detectada_en, descripcion, registrado_por)
         SELECT c.id, $2, $3, $4, $5, 'abierta', COALESCE($6, current_date), $7, 'proyecto'
         FROM produccion.cama c WHERE c.codigo=$1
         RETURNING id, cama_id, (SELECT codigo FROM produccion.cama WHERE id=cama_id) AS cama_codigo,
                   siembra_id, tipo, nombre, severidad, estado, detectada_en, descripcion,
                   registrado_por, creado_en",
    ).bind(dto.cama_codigo.trim().to_ascii_uppercase()).bind(dto.siembra_id).bind(dto.tipo).bind(dto.nombre.trim())
     .bind(dto.severidad).bind(dto.detectada_en).bind(dto.descripcion)
     .fetch_optional(&state.db).await?.ok_or_else(|| crate::errors::AppError::NoEncontrado("La cama no existe".to_owned()))?;
    Ok((StatusCode::CREATED, Json(fila)))
}

async fn cambiar_incidencia(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(dto): Json<CambiarIncidencia>,
) -> Result<Json<Incidencia>, crate::errors::AppError> {
    if !["abierta","en_tratamiento","resuelta"].contains(&dto.estado.as_str()) {
        return Err(crate::errors::AppError::Validacion("Estado de incidencia inválido".to_owned()));
    }
    sqlx::query(
        "UPDATE calidad.incidencia SET estado=$2 WHERE id=$1",
    ).bind(id).bind(dto.estado).execute(&state.db).await?;
    let fila = sqlx::query_as::<_, Incidencia>(
        "SELECT i.id, i.cama_id, c.codigo AS cama_codigo, i.siembra_id, i.tipo, i.nombre,
                i.severidad, i.estado, i.detectada_en, i.descripcion, i.registrado_por, i.creado_en
         FROM calidad.incidencia i JOIN produccion.cama c ON c.id=i.cama_id WHERE i.id=$1",
    ).bind(id).fetch_optional(&state.db).await?
     .ok_or_else(|| crate::errors::AppError::NoEncontrado("La incidencia no existe".to_owned()))?;
    Ok(Json(fila))
}

fn tratamientos_router() -> Router<AppState> {
    Router::new().route("/", get(listar_tratamientos).post(crear_tratamiento))
}

async fn listar_tratamientos(State(state): State<AppState>) -> Result<Json<Vec<Tratamiento>>, crate::errors::AppError> {
    Ok(Json(sqlx::query_as::<_, Tratamiento>(
        "SELECT id, incidencia_id, producto, dosis, fecha_aplicacion, responsable, observaciones, creado_en
         FROM calidad.tratamiento ORDER BY fecha_aplicacion DESC, id DESC",
    ).fetch_all(&state.db).await?))
}

async fn crear_tratamiento(
    State(state): State<AppState>,
    Json(dto): Json<NuevoTratamiento>,
) -> Result<(StatusCode, Json<Tratamiento>), crate::errors::AppError> {
    if dto.producto.trim().is_empty() { return Err(crate::errors::AppError::Validacion("El producto es obligatorio".to_owned())); }
    let fila = sqlx::query_as::<_, Tratamiento>(
        "INSERT INTO calidad.tratamiento
         (incidencia_id, producto, dosis, fecha_aplicacion, responsable, observaciones, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,'proyecto')
         RETURNING id, incidencia_id, producto, dosis, fecha_aplicacion, responsable, observaciones, creado_en",
    ).bind(dto.incidencia_id).bind(dto.producto.trim()).bind(dto.dosis).bind(dto.fecha_aplicacion)
     .bind(dto.responsable).bind(dto.observaciones).fetch_optional(&state.db).await?
     .ok_or_else(|| crate::errors::AppError::NoEncontrado("La incidencia no existe".to_owned()))?;
    sqlx::query("UPDATE calidad.incidencia SET estado='en_tratamiento' WHERE id=$1")
        .bind(dto.incidencia_id).execute(&state.db).await?;
    Ok((StatusCode::CREATED, Json(fila)))
}

fn inspecciones_router() -> Router<AppState> {
    Router::new().route("/", get(listar_inspecciones).post(crear_inspeccion))
}

async fn listar_inspecciones(State(state): State<AppState>) -> Result<Json<Vec<Inspeccion>>, crate::errors::AppError> {
    Ok(Json(sqlx::query_as::<_, Inspeccion>(
        "SELECT i.id, i.cama_id, c.codigo AS cama_codigo, i.fecha, i.resultado, i.puntaje,
                i.observaciones, i.inspector, i.creado_en
         FROM calidad.inspeccion i JOIN produccion.cama c ON c.id=i.cama_id
         ORDER BY i.fecha DESC, i.id DESC",
    ).fetch_all(&state.db).await?))
}

async fn crear_inspeccion(
    State(state): State<AppState>,
    Json(dto): Json<NuevaInspeccion>,
) -> Result<(StatusCode, Json<Inspeccion>), crate::errors::AppError> {
    if !["aprobada","observada","rechazada"].contains(&dto.resultado.as_str()) {
        return Err(crate::errors::AppError::Validacion("Resultado de inspección inválido".to_owned()));
    }
    if let Some(puntaje) = dto.puntaje { if !(0..=100).contains(&puntaje) { return Err(crate::errors::AppError::Validacion("El puntaje debe estar entre 0 y 100".to_owned())); } }
    let fila = sqlx::query_as::<_, Inspeccion>(
        "INSERT INTO calidad.inspeccion
         (cama_id, fecha, resultado, puntaje, observaciones, inspector, registrado_por)
         SELECT c.id, COALESCE($2,current_date), $3,$4,$5,$6,'proyecto'
         FROM produccion.cama c WHERE c.codigo=$1
         RETURNING id, cama_id, (SELECT codigo FROM produccion.cama WHERE id=cama_id) AS cama_codigo,
                   fecha, resultado, puntaje, observaciones, inspector, creado_en",
    ).bind(dto.cama_codigo.trim().to_ascii_uppercase()).bind(dto.fecha).bind(dto.resultado)
     .bind(dto.puntaje).bind(dto.observaciones).bind(dto.inspector)
     .fetch_optional(&state.db).await?.ok_or_else(|| crate::errors::AppError::NoEncontrado("La cama no existe".to_owned()))?;
    Ok((StatusCode::CREATED, Json(fila)))
}
