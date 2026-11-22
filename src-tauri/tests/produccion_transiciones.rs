//! Pruebas de integración de las transiciones de producción.

use agrogestor_lib::{modules::produccion, state::AppState};
use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Method, Request, StatusCode},
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

const CAMA: &str = "A-01";

fn crear_app(pool: &PgPool) -> Router {
    Router::new()
        .nest("/api/produccion", produccion::router::router())
        .with_state(AppState { db: pool.clone() })
}

async fn llamar(
    app: &Router,
    metodo: Method,
    ruta: &str,
    cuerpo: Option<Value>,
) -> (StatusCode, Value) {
    let mut peticion = Request::builder()
        .method(metodo)
        .uri(ruta)
        .header("x-gestor", "proyecto");
    let cuerpo = match cuerpo {
        Some(valor) => {
            peticion = peticion.header("content-type", "application/json");
            Body::from(valor.to_string())
        }
        None => Body::empty(),
    };
    let respuesta = app
        .clone()
        .oneshot(peticion.body(cuerpo).unwrap())
        .await
        .unwrap();
    let estado = respuesta.status();
    let bytes = to_bytes(respuesta.into_body(), usize::MAX).await.unwrap();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (estado, json)
}

async fn sembrar(app: &Router, cama: &str) -> (StatusCode, Value) {
    llamar(
        app,
        Method::POST,
        "/api/produccion/siembras",
        Some(json!({
            "cama": cama,
            "fecha_siembra": "2026-11-01",
            "plantas_sembradas": 200
        })),
    )
    .await
}

async fn sembrar_ok(app: &Router, cama: &str) -> i64 {
    let (estado, cuerpo) = sembrar(app, cama).await;
    assert_eq!(estado, StatusCode::CREATED, "sembrar falló: {cuerpo}");
    cuerpo["id"].as_i64().expect("la siembra debe traer id")
}

async fn crear_lote_ok(app: &Router) -> i64 {
    let (estado, cuerpo) = llamar(
        app,
        Method::POST,
        "/api/produccion/lotes",
        Some(json!({ "observaciones": "lote de prueba" })),
    )
    .await;
    assert_eq!(estado, StatusCode::CREATED, "crear lote falló: {cuerpo}");
    cuerpo["id"].as_i64().expect("el lote debe traer id")
}

async fn cosechar(app: &Router, siembra_id: i64, lote_id: Option<i64>) -> (StatusCode, Value) {
    llamar(
        app,
        Method::POST,
        "/api/produccion/cosechas",
        Some(json!({
            "siembra_id": siembra_id,
            "lote_id": lote_id,
            "fecha": "2026-11-15",
            "tallos": 150,
            "calidad": "primera",
            "cerrar_siembra": true
        })),
    )
    .await
}

async fn estado_cama(app: &Router, codigo: &str) -> String {
    let (estado, cuerpo) = llamar(
        app,
        Method::GET,
        &format!("/api/produccion/camas/{codigo}"),
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::OK, "{cuerpo}");
    cuerpo["estado"].as_str().unwrap().to_owned()
}

async fn estado_siembra(app: &Router, id: i64) -> String {
    let (estado, cuerpo) = llamar(
        app,
        Method::GET,
        &format!("/api/produccion/siembras/{id}"),
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::OK, "{cuerpo}");
    cuerpo["estado"].as_str().unwrap().to_owned()
}

fn mensaje(cuerpo: &Value) -> &str {
    cuerpo["error"]["mensaje"].as_str().unwrap_or_default()
}

fn assert_rechazo(estado: StatusCode, cuerpo: &Value, fragmento: &str) {
    assert!(
        estado.is_client_error(),
        "se esperaba un 4xx y llegó {estado}: {cuerpo}"
    );
    assert!(
        mensaje(cuerpo).contains(fragmento),
        "el mensaje '{}' debería mencionar '{fragmento}'",
        mensaje(cuerpo)
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn sembrar_pone_la_cama_en_sembrada(pool: PgPool) {
    let app = crear_app(&pool);
    assert_eq!(estado_cama(&app, CAMA).await, "disponible");

    let (estado, siembra) = sembrar(&app, CAMA).await;

    assert_eq!(estado, StatusCode::CREATED, "{siembra}");
    assert_eq!(siembra["estado"], "activa");
    assert_eq!(estado_cama(&app, CAMA).await, "sembrada");
}

#[sqlx::test(migrations = "./migrations")]
async fn sembrar_una_cama_ya_sembrada_falla(pool: PgPool) {
    let app = crear_app(&pool);
    sembrar_ok(&app, CAMA).await;

    let (estado, cuerpo) = sembrar(&app, CAMA).await;

    assert_rechazo(estado, &cuerpo, "sembrada");
    let (estado, activas) = llamar(
        &app,
        Method::GET,
        &format!("/api/produccion/siembras?cama={CAMA}&estado=activa"),
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::OK, "{activas}");
    assert_eq!(activas.as_array().unwrap().len(), 1);
}

#[sqlx::test(migrations = "./migrations")]
async fn cosechar_cierra_la_siembra_y_la_cama(pool: PgPool) {
    let app = crear_app(&pool);
    let lote = crear_lote_ok(&app).await;
    let siembra = sembrar_ok(&app, CAMA).await;

    let (estado, cuerpo) = cosechar(&app, siembra, Some(lote)).await;

    assert!(estado.is_success(), "cosechar falló ({estado}): {cuerpo}");
    assert_eq!(estado_siembra(&app, siembra).await, "cosechada");
    assert_eq!(estado_cama(&app, CAMA).await, "cosechada");
}

#[sqlx::test(migrations = "./migrations")]
async fn cancelar_libera_la_cama(pool: PgPool) {
    let app = crear_app(&pool);
    let siembra = sembrar_ok(&app, CAMA).await;

    let (estado, cuerpo) = llamar(
        &app,
        Method::PATCH,
        &format!("/api/produccion/siembras/{siembra}/cancelar"),
        None,
    )
    .await;

    assert!(estado.is_success(), "cancelar falló ({estado}): {cuerpo}");
    assert_eq!(cuerpo["estado"], "cancelada");
    assert_eq!(estado_cama(&app, CAMA).await, "disponible");

    let (estado, cuerpo) = sembrar(&app, CAMA).await;
    assert_eq!(estado, StatusCode::CREATED, "{cuerpo}");
}

#[sqlx::test(migrations = "./migrations")]
async fn cosechar_en_un_lote_cerrado_falla(pool: PgPool) {
    let app = crear_app(&pool);
    let lote = crear_lote_ok(&app).await;
    let (estado, cuerpo) = llamar(
        &app,
        Method::PATCH,
        &format!("/api/produccion/lotes/{lote}/cerrar"),
        None,
    )
    .await;
    assert!(estado.is_success(), "cerrar lote falló: {cuerpo}");
    let siembra = sembrar_ok(&app, CAMA).await;

    let (estado, cuerpo) = cosechar(&app, siembra, Some(lote)).await;

    assert_rechazo(estado, &cuerpo, "cerrado");
    assert_eq!(estado_siembra(&app, siembra).await, "activa");
    assert_eq!(estado_cama(&app, CAMA).await, "sembrada");
}
