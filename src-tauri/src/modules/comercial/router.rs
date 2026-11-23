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
struct Cliente {
    id: i32, nombre: String, nit: Option<String>, tipo: String,
    email: Option<String>, telefono: Option<String>, ciudad: Option<String>,
    activo: bool, creado_en: DateTime<Utc>,
}
#[derive(Debug, Deserialize)]
struct NuevoCliente {
    nombre: String, nit: Option<String>, tipo: String,
    email: Option<String>, telefono: Option<String>, ciudad: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
struct Orden {
    id: i32, cliente_id: i32, cliente_nombre: Option<String>, fecha: NaiveDate,
    estado: String, observaciones: Option<String>, creado_en: DateTime<Utc>,
}
#[derive(Debug, Deserialize)]
struct NuevoOrden {
    cliente_id: i32, fecha: Option<NaiveDate>, observaciones: Option<String>,
}
#[derive(Debug, Deserialize)]
struct CambiarOrden { estado: String }

#[derive(Debug, Clone, Serialize, FromRow)]
struct Despacho {
    id: i32, orden_id: i32, fecha: NaiveDate, estado: String,
    transportador: Option<String>, guia: Option<String>, observaciones: Option<String>,
    creado_en: DateTime<Utc>,
}
#[derive(Debug, Deserialize)]
struct NuevoDespacho {
    orden_id: i32, fecha: Option<NaiveDate>, transportador: Option<String>,
    guia: Option<String>, observaciones: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/clientes", clientes_router())
        .nest("/ordenes", ordenes_router())
        .nest("/despachos", despachos_router())
}

fn clientes_router() -> Router<AppState> {
    Router::new().route("/", get(listar_clientes).post(crear_cliente))
}
async fn listar_clientes(State(state): State<AppState>) -> Result<Json<Vec<Cliente>>, crate::errors::AppError> {
    Ok(Json(sqlx::query_as::<_, Cliente>(
        "SELECT id,nombre,nit,tipo,email,telefono,ciudad,activo,creado_en
         FROM ventas.cliente ORDER BY activo DESC,nombre",
    ).fetch_all(&state.db).await?))
}
async fn crear_cliente(State(state): State<AppState>, Json(dto): Json<NuevoCliente>) -> Result<(StatusCode,Json<Cliente>),crate::errors::AppError> {
    if dto.nombre.trim().is_empty() { return Err(crate::errors::AppError::Validacion("El nombre del cliente es obligatorio".to_owned())); }
    if !["distribuidor_floral","mayorista","exportador","otro"].contains(&dto.tipo.as_str()) {
        return Err(crate::errors::AppError::Validacion("Tipo de cliente inválido".to_owned()));
    }
    let fila=sqlx::query_as::<_,Cliente>(
        "INSERT INTO ventas.cliente(nombre,nit,tipo,email,telefono,ciudad)
         VALUES($1,$2,$3,$4,$5,$6)
         RETURNING id,nombre,nit,tipo,email,telefono,ciudad,activo,creado_en",
    ).bind(dto.nombre.trim()).bind(dto.nit).bind(dto.tipo).bind(dto.email).bind(dto.telefono).bind(dto.ciudad)
     .fetch_one(&state.db).await?;
    Ok((StatusCode::CREATED,Json(fila)))
}

fn ordenes_router() -> Router<AppState> {
    Router::new().route("/", get(listar_ordenes).post(crear_orden))
        .route("/{id}/estado", patch(cambiar_orden))
}
async fn listar_ordenes(State(state): State<AppState>) -> Result<Json<Vec<Orden>>,crate::errors::AppError> {
    Ok(Json(sqlx::query_as::<_,Orden>(
        "SELECT o.id,o.cliente_id,c.nombre AS cliente_nombre,o.fecha,o.estado,o.observaciones,o.creado_en
         FROM ventas.orden o JOIN ventas.cliente c ON c.id=o.cliente_id
         ORDER BY o.fecha DESC,o.id DESC",
    ).fetch_all(&state.db).await?))
}
async fn crear_orden(State(state): State<AppState>,Json(dto):Json<NuevoOrden>) -> Result<(StatusCode,Json<Orden>),crate::errors::AppError> {
    let fila=sqlx::query_as::<_,Orden>(
        "INSERT INTO ventas.orden(cliente_id,fecha,estado,observaciones,registrado_por)
         VALUES($1,COALESCE($2,current_date),'pendiente',$3,'comercial')
         RETURNING id,cliente_id,(SELECT nombre FROM ventas.cliente WHERE id=$1) AS cliente_nombre,
                   fecha,estado,observaciones,creado_en",
    ).bind(dto.cliente_id).bind(dto.fecha).bind(dto.observaciones).fetch_optional(&state.db).await?
     .ok_or_else(||crate::errors::AppError::NoEncontrado("El cliente no existe".to_owned()))?;
    Ok((StatusCode::CREATED,Json(fila)))
}
async fn cambiar_orden(State(state):State<AppState>,Path(id):Path<i32>,Json(dto):Json<CambiarOrden>) -> Result<Json<Orden>,crate::errors::AppError> {
    if !["pendiente","confirmada","despachada","cancelada"].contains(&dto.estado.as_str()) {
        return Err(crate::errors::AppError::Validacion("Estado de orden inválido".to_owned()));
    }
    sqlx::query("UPDATE ventas.orden SET estado=$2 WHERE id=$1").bind(id).bind(dto.estado).execute(&state.db).await?;
    let fila=sqlx::query_as::<_,Orden>(
        "SELECT o.id,o.cliente_id,c.nombre AS cliente_nombre,o.fecha,o.estado,o.observaciones,o.creado_en
         FROM ventas.orden o JOIN ventas.cliente c ON c.id=o.cliente_id WHERE o.id=$1",
    ).bind(id).fetch_optional(&state.db).await?.ok_or_else(||crate::errors::AppError::NoEncontrado("La orden no existe".to_owned()))?;
    Ok(Json(fila))
}

fn despachos_router() -> Router<AppState> {
    Router::new().route("/",get(listar_despachos).post(crear_despacho))
}
async fn listar_despachos(State(state):State<AppState>) -> Result<Json<Vec<Despacho>>,crate::errors::AppError> {
    Ok(Json(sqlx::query_as::<_,Despacho>(
        "SELECT id,orden_id,fecha,estado,transportador,guia,observaciones,creado_en
         FROM ventas.despacho ORDER BY fecha DESC,id DESC",
    ).fetch_all(&state.db).await?))
}
async fn crear_despacho(State(state):State<AppState>,Json(dto):Json<NuevoDespacho>) -> Result<(StatusCode,Json<Despacho>),crate::errors::AppError> {
    let fila=sqlx::query_as::<_,Despacho>(
        "INSERT INTO ventas.despacho(orden_id,fecha,estado,transportador,guia,observaciones,registrado_por)
         VALUES($1,COALESCE($2,current_date),'programado',$3,$4,$5,'comercial')
         RETURNING id,orden_id,fecha,estado,transportador,guia,observaciones,creado_en",
    ).bind(dto.orden_id).bind(dto.fecha).bind(dto.transportador).bind(dto.guia).bind(dto.observaciones)
     .fetch_optional(&state.db).await?.ok_or_else(||crate::errors::AppError::NoEncontrado("La orden no existe".to_owned()))?;
    sqlx::query("UPDATE ventas.orden SET estado='despachada' WHERE id=$1").bind(dto.orden_id).execute(&state.db).await?;
    Ok((StatusCode::CREATED,Json(fila)))
}
