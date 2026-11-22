use agrogestor_lib::{
    modules::{produccion, trazabilidad},
    state::AppState,
};
use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Method, Request, StatusCode},
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

const CAMA: &str = "A-01";
const CLIENTE: &str = "Flores del Norte";

fn crear_app(pool: &PgPool) -> Router {
    Router::new()
        .nest("/api/produccion", produccion::router::router())
        .nest("/api/trazabilidad", trazabilidad::router::router())
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

struct Escenario {
    codigo: String,
}

async fn montar_escenario(app: &Router, pool: &PgPool) -> Escenario {
    let (estado, lote) = llamar(
        app,
        Method::POST,
        "/api/produccion/lotes",
        Some(json!({ "observaciones": "lote de trazabilidad" })),
    )
    .await;
    assert_eq!(estado, StatusCode::CREATED, "crear lote falló: {lote}");
    let lote_id = lote["id"].as_i64().expect("el lote debe traer id") as i32;
    let codigo = lote["codigo"].as_str().expect("el lote debe traer código");

    let (estado, siembra) = llamar(
        app,
        Method::POST,
        "/api/produccion/siembras",
        Some(json!({
            "cama": CAMA,
            "fecha_siembra": "2026-11-01",
            "plantas_sembradas": 200
        })),
    )
    .await;
    assert_eq!(estado, StatusCode::CREATED, "sembrar falló: {siembra}");
    let siembra_id = siembra["id"].as_i64().expect("la siembra debe traer id");

    let (estado, cosecha) = llamar(
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
    .await;
    assert!(estado.is_success(), "cosechar falló ({estado}): {cosecha}");

    let cliente_id: i32 = sqlx::query_scalar(
        "INSERT INTO ventas.cliente (nombre, ciudad) VALUES ($1, 'Bogotá') RETURNING id",
    )
    .bind(CLIENTE)
    .fetch_one(pool)
    .await
    .unwrap();
    let orden_id: i32 = sqlx::query_scalar(
        "INSERT INTO ventas.orden (cliente_id, registrado_por) VALUES ($1, 'proyecto') RETURNING id",
    )
    .bind(cliente_id)
    .fetch_one(pool)
    .await
    .unwrap();
    let item_id: i32 = sqlx::query_scalar(
        "INSERT INTO ventas.orden_item (orden_id, lote_id, tallos, precio_por_tallo)
         VALUES ($1, $2, 100, 500) RETURNING id",
    )
    .bind(orden_id)
    .bind(lote_id)
    .fetch_one(pool)
    .await
    .unwrap();
    let despacho_id: i32 = sqlx::query_scalar(
        "INSERT INTO ventas.despacho (orden_id, guia, registrado_por)
         VALUES ($1, 'G-001', 'proyecto') RETURNING id",
    )
    .bind(orden_id)
    .fetch_one(pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO ventas.despacho_item (despacho_id, orden_item_id, tallos) VALUES ($1, $2, 60)",
    )
    .bind(despacho_id)
    .bind(item_id)
    .execute(pool)
    .await
    .unwrap();

    Escenario {
        codigo: codigo.to_owned(),
    }
}

#[sqlx::test(migrations = "./migrations")]
async fn la_cadena_une_cama_lote_y_cliente(pool: PgPool) {
    let app = crear_app(&pool);
    let escenario = montar_escenario(&app, &pool).await;

    let (estado, cadena) = llamar(
        &app,
        Method::GET,
        &format!("/api/trazabilidad/lotes/{}/cadena", escenario.codigo),
        None,
    )
    .await;

    assert_eq!(estado, StatusCode::OK, "{cadena}");
    assert_eq!(cadena["lote"]["codigo"], escenario.codigo.as_str());
    assert_eq!(cadena["lote"]["total_tallos"], 150);
    assert_eq!(cadena["lote"]["camas"], 1);
    assert_eq!(cadena["lote"]["clientes"], 1);

    let origen = cadena["origen"].as_array().unwrap();
    assert_eq!(origen.len(), 1);
    assert_eq!(origen[0]["cama_codigo"], CAMA);
    assert_eq!(origen[0]["tallos"], 150);
    assert_eq!(origen[0]["tallos_primera"], 150);
    assert_eq!(origen[0]["plantas_sembradas"], 200);

    let destinos = cadena["destinos"].as_array().unwrap();
    assert_eq!(destinos.len(), 1);
    assert_eq!(destinos[0]["cliente"], CLIENTE);
    assert_eq!(destinos[0]["tallos_orden"], 100);
    assert_eq!(destinos[0]["tallos_despachados"], 60);

    let despachos = cadena["despachos"].as_array().unwrap();
    assert_eq!(despachos.len(), 1);
    assert_eq!(despachos[0]["guia"], "G-001");
    assert_eq!(despachos[0]["tallos"], 60);
}

#[sqlx::test(migrations = "./migrations")]
async fn la_linea_de_tiempo_incluye_produccion_y_venta(pool: PgPool) {
    let app = crear_app(&pool);
    let escenario = montar_escenario(&app, &pool).await;

    let (estado, eventos) = llamar(
        &app,
        Method::GET,
        &format!("/api/trazabilidad/lotes/{}/linea-tiempo", escenario.codigo),
        None,
    )
    .await;

    assert_eq!(estado, StatusCode::OK, "{eventos}");
    let eventos = eventos.as_array().unwrap();
    let tipos: Vec<&str> = eventos
        .iter()
        .map(|evento| evento["tipo"].as_str().unwrap())
        .collect();
    for esperado in ["siembra", "cosecha", "lote", "orden", "despacho"] {
        assert!(tipos.contains(&esperado), "falta '{esperado}' en {tipos:?}");
    }

    let fechas: Vec<&str> = eventos
        .iter()
        .map(|evento| evento["fecha"].as_str().unwrap())
        .collect();
    let mut ordenadas = fechas.clone();
    ordenadas.sort_unstable();
    assert_eq!(
        fechas, ordenadas,
        "los eventos deben venir ordenados por fecha"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn buscar_por_texto_parcial(pool: PgPool) {
    let app = crear_app(&pool);

    let (estado, lotes) = llamar(
        &app,
        Method::GET,
        "/api/trazabilidad/lotes?q=2026-014",
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::OK, "{lotes}");
    let lotes = lotes.as_array().unwrap();
    assert_eq!(lotes.len(), 1);
    assert_eq!(lotes[0]["codigo"], "RSC-2026-014");

    let (estado, todos) = llamar(&app, Method::GET, "/api/trazabilidad/lotes", None).await;
    assert_eq!(estado, StatusCode::OK, "{todos}");
    assert!(!todos.as_array().unwrap().is_empty());
}

#[sqlx::test(migrations = "./migrations")]
async fn un_lote_sin_cosechas_devuelve_cadena_vacia(pool: PgPool) {
    let app = crear_app(&pool);

    let (estado, cadena) = llamar(
        &app,
        Method::GET,
        "/api/trazabilidad/lotes/rsc-2026-014/cadena",
        None,
    )
    .await;

    assert_eq!(estado, StatusCode::OK, "{cadena}");
    assert_eq!(cadena["lote"]["codigo"], "RSC-2026-014");
    assert_eq!(cadena["lote"]["total_tallos"], 0);
    assert!(cadena["origen"].as_array().unwrap().is_empty());
    assert!(cadena["destinos"].as_array().unwrap().is_empty());
    assert!(cadena["despachos"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrations = "./migrations")]
async fn codigo_invalido_es_400_y_lote_inexistente_es_404(pool: PgPool) {
    let app = crear_app(&pool);

    let (estado, cuerpo) = llamar(
        &app,
        Method::GET,
        "/api/trazabilidad/lotes/ABC/cadena",
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::BAD_REQUEST, "{cuerpo}");
    assert!(
        cuerpo["error"]["mensaje"]
            .as_str()
            .unwrap_or_default()
            .contains("RSC-AAAA-NNN")
    );

    let (estado, cuerpo) = llamar(
        &app,
        Method::GET,
        "/api/trazabilidad/lotes/RSC-2026-999/linea-tiempo",
        None,
    )
    .await;
    assert_eq!(estado, StatusCode::NOT_FOUND, "{cuerpo}");
}
