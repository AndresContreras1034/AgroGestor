//! Asistente de analítica con DeepSeek (API compatible con OpenAI).
//!
//! El backend arma un resumen actualizado de la finca desde PostgreSQL y lo envía
//! como contexto al modelo. La clave de API vive solo en `src-tauri/.env`; el
//! frontend nunca la ve.

use std::time::{Duration, Instant};

use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::state::AppState;

const MAX_PREGUNTA: usize = 1_000;
const MAX_TURNOS: usize = 8;
const MAX_TURNO: usize = 4_000;

// ------------------------------------------------------------------ configuración

struct ConfigIa {
    api_key: Option<String>,
    base_url: String,
    modelo: String,
    pensamiento: bool,
    max_tokens: u32,
    temperatura: f32,
    timeout: Duration,
}

fn var(nombre: &str) -> Option<String> {
    std::env::var(nombre)
        .ok()
        .map(|valor| valor.trim().to_owned())
        .filter(|valor| !valor.is_empty())
}

fn config() -> ConfigIa {
    ConfigIa {
        api_key: var("DEEPSEEK_API_KEY").filter(|clave| !clave.contains("pega-aqui")),
        base_url: var("DEEPSEEK_BASE_URL")
            .unwrap_or_else(|| "https://api.deepseek.com".to_owned())
            .trim_end_matches('/')
            .to_owned(),
        modelo: var("DEEPSEEK_MODEL").unwrap_or_else(|| "deepseek-flash".to_owned()),
        pensamiento: var("DEEPSEEK_THINKING")
            .is_some_and(|valor| matches!(valor.to_lowercase().as_str(), "enabled" | "true" | "1" | "si")),
        max_tokens: var("DEEPSEEK_MAX_TOKENS")
            .and_then(|valor| valor.parse().ok())
            .unwrap_or(1_500)
            .clamp(128, 8_000),
        temperatura: var("DEEPSEEK_TEMPERATURE")
            .and_then(|valor| valor.parse().ok())
            .unwrap_or(0.3_f32)
            .clamp(0.0, 2.0),
        timeout: Duration::from_secs(
            var("DEEPSEEK_TIMEOUT_SEGUNDOS")
                .and_then(|valor| valor.parse().ok())
                .unwrap_or(90)
                .clamp(5, 300),
        ),
    }
}

// ------------------------------------------------------------------ DTOs

#[derive(Serialize)]
pub struct EstadoAsistente {
    configurado: bool,
    modelo: String,
    pensamiento: bool,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct Turno {
    rol: String,
    contenido: String,
}

#[derive(Deserialize)]
pub struct Pregunta {
    pregunta: String,
    #[serde(default)]
    historial: Vec<Turno>,
}

#[derive(Serialize)]
pub struct Respuesta {
    respuesta: String,
    modelo: String,
    tokens_entrada: i64,
    tokens_salida: i64,
    duracion_ms: u128,
}

// ------------------------------------------------------------------ errores

pub enum ErrorIa {
    NoConfigurada,
    Validacion(String),
    Proveedor(StatusCode, String),
    Tiempo,
    Interno(String),
}

impl IntoResponse for ErrorIa {
    fn into_response(self) -> Response {
        let (status, codigo, mensaje) = match self {
            Self::NoConfigurada => (
                StatusCode::SERVICE_UNAVAILABLE,
                "ia_no_configurada",
                "El asistente no está configurado: agrega DEEPSEEK_API_KEY en src-tauri/.env y reinicia la aplicación."
                    .to_owned(),
            ),
            Self::Validacion(mensaje) => (StatusCode::BAD_REQUEST, "validacion", mensaje),
            Self::Proveedor(status, mensaje) => (status, "ia_proveedor", mensaje),
            Self::Tiempo => (
                StatusCode::GATEWAY_TIMEOUT,
                "ia_tiempo_agotado",
                "DeepSeek tardó demasiado en responder. Intenta de nuevo o sube DEEPSEEK_TIMEOUT_SEGUNDOS.".to_owned(),
            ),
            Self::Interno(detalle) => {
                tracing::error!(%detalle, "Error interno del asistente");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "error_interno",
                    "No se pudo preparar el contexto de la finca.".to_owned(),
                )
            }
        };
        (status, Json(json!({ "error": { "codigo": codigo, "mensaje": mensaje } }))).into_response()
    }
}

impl From<sqlx::Error> for ErrorIa {
    fn from(error: sqlx::Error) -> Self {
        Self::Interno(error.to_string())
    }
}

// ------------------------------------------------------------------ handlers

pub async fn estado() -> Json<EstadoAsistente> {
    let cfg = config();
    Json(EstadoAsistente {
        configurado: cfg.api_key.is_some(),
        modelo: cfg.modelo,
        pensamiento: cfg.pensamiento,
    })
}

pub async fn preguntar(
    State(state): State<AppState>,
    Json(dto): Json<Pregunta>,
) -> Result<Json<Respuesta>, ErrorIa> {
    let cfg = config();
    let api_key = cfg.api_key.clone().ok_or(ErrorIa::NoConfigurada)?;

    let pregunta = dto.pregunta.trim();
    if pregunta.is_empty() {
        return Err(ErrorIa::Validacion("Escribe una pregunta".to_owned()));
    }
    if pregunta.chars().count() > MAX_PREGUNTA {
        return Err(ErrorIa::Validacion(format!(
            "La pregunta no puede pasar de {MAX_PREGUNTA} caracteres"
        )));
    }

    let inicio = Instant::now();
    let contexto = contexto_finca(&state.db).await?;

    let mut mensajes = vec![json!({
        "role": "system",
        "content": format!("{INSTRUCCIONES}\n\n=== CONTEXTO DE LA FINCA (datos reales de PostgreSQL) ===\n{contexto}")
    })];
    let desde = dto.historial.len().saturating_sub(MAX_TURNOS);
    for turno in &dto.historial[desde..] {
        let rol = match turno.rol.as_str() {
            "usuario" => "user",
            "asistente" => "assistant",
            _ => continue,
        };
        let contenido: String = turno.contenido.chars().take(MAX_TURNO).collect();
        mensajes.push(json!({ "role": rol, "content": contenido }));
    }
    mensajes.push(json!({ "role": "user", "content": pregunta }));

    let mut cuerpo = json!({
        "model": cfg.modelo,
        "messages": mensajes,
        "max_tokens": cfg.max_tokens,
        "stream": false,
        "thinking": { "type": if cfg.pensamiento { "enabled" } else { "disabled" } },
    });
    if !cfg.pensamiento {
        cuerpo["temperature"] = json!(cfg.temperatura);
    }

    let cliente = reqwest::Client::builder()
        .timeout(cfg.timeout)
        .build()
        .map_err(|error| ErrorIa::Interno(error.to_string()))?;
    let respuesta = cliente
        .post(format!("{}/chat/completions", cfg.base_url))
        .bearer_auth(api_key)
        .json(&cuerpo)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                ErrorIa::Tiempo
            } else {
                tracing::warn!(%error, "No se pudo contactar a DeepSeek");
                ErrorIa::Proveedor(
                    StatusCode::BAD_GATEWAY,
                    "No se pudo contactar a DeepSeek. Revisa la conexión a internet.".to_owned(),
                )
            }
        })?;

    let status = respuesta.status();
    let cuerpo: Value = respuesta.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        let detalle = cuerpo["error"]["message"].as_str().unwrap_or("sin detalle").to_owned();
        tracing::warn!(status = status.as_u16(), %detalle, "DeepSeek rechazó la solicitud");
        let mensaje = match status.as_u16() {
            401 => "La clave DEEPSEEK_API_KEY no es válida (401).".to_owned(),
            402 => "La cuenta de DeepSeek no tiene saldo (402). Recarga en platform.deepseek.com.".to_owned(),
            422 | 400 => format!("DeepSeek rechazó la solicitud: {detalle}"),
            429 => "Se alcanzó el límite de solicitudes de DeepSeek (429). Espera unos segundos.".to_owned(),
            _ => format!("DeepSeek respondió con error {}: {detalle}", status.as_u16()),
        };
        return Err(ErrorIa::Proveedor(StatusCode::BAD_GATEWAY, mensaje));
    }

    let texto = cuerpo["choices"][0]["message"]["content"]
        .as_str()
        .map(str::trim)
        .filter(|texto| !texto.is_empty())
        .ok_or_else(|| {
            ErrorIa::Proveedor(StatusCode::BAD_GATEWAY, "DeepSeek devolvió una respuesta vacía.".to_owned())
        })?;

    Ok(Json(Respuesta {
        respuesta: texto.to_owned(),
        modelo: cuerpo["model"].as_str().unwrap_or(&cfg.modelo).to_owned(),
        tokens_entrada: cuerpo["usage"]["prompt_tokens"].as_i64().unwrap_or(0),
        tokens_salida: cuerpo["usage"]["completion_tokens"].as_i64().unwrap_or(0),
        duracion_ms: inicio.elapsed().as_millis(),
    }))
}

// ------------------------------------------------------------------ prompt y contexto

const INSTRUCCIONES: &str = "Eres el analista de datos y asesor agronómico de AgroGestor Ruscus, \
una finca de Ruscus hypophyllum (follaje de corte) en Santandersito, Cundinamarca, Colombia.\n\
Reglas:\n\
1. Responde en español de Colombia, de forma concisa y estructurada (viñetas o listas numeradas, **negritas** para cifras clave).\n\
2. Basa cada afirmación en el CONTEXTO. Cita las cifras exactas (tallos, %, COP, fechas, códigos de cama y lote).\n\
3. Si un dato no está en el contexto, dilo claramente y sugiere el módulo de AgroGestor donde consultarlo \
(Producción, Monitoreo IoT, Calidad, Trazabilidad, Comercial). No inventes datos.\n\
4. Cuando hagas recomendaciones, sepáralas de los hechos y explica en qué dato se apoyan.\n\
5. Para agroquímicos, recuerda verificar la etiqueta, el registro ICA y el periodo de carencia; no inventes dosis.\n\
6. Formatea dinero como COP con separador de miles (ej. $1.234.567).\n\
7. Los lotes siguen el formato RSC-AAAA-SSS (año y semana ISO de cosecha).";

async fn seccion(db: &sqlx::PgPool, titulo: &str, sql: &str) -> Result<String, ErrorIa> {
    let cuerpo = sqlx::query_scalar::<_, Option<String>>(sql)
        .fetch_one(db)
        .await?
        .unwrap_or_else(|| "(sin datos)".to_owned());
    Ok(format!("## {titulo}\n{cuerpo}\n"))
}

async fn contexto_finca(db: &sqlx::PgPool) -> Result<String, ErrorIa> {
    let secciones: [(&str, &str); 16] = [
        ("Fecha y finca", r#"
SELECT format('Hoy: %s. Camas: %s (zona A: 9, B: 8, C: 8). Estado de camas: %s. Siembras/ciclos activos: %s.',
  to_char(current_date, 'YYYY-MM-DD (TMDay)'),
  (SELECT count(*) FROM produccion.cama),
  (SELECT string_agg(estado || ' ' || n, ', ' ORDER BY estado) FROM (SELECT estado, count(*) n FROM produccion.cama GROUP BY 1) e),
  (SELECT count(*) FROM produccion.siembra WHERE estado = 'activa'))"#),
        ("Producción mensual (últimos 24 meses)", r#"
SELECT string_agg(format('%s: %s tallos | primera %s%% | segunda %s%% | descarte %s%% | %s camas cortadas',
  mes, tallos, round(100.0*p/nullif(tallos,0),1), round(100.0*s/nullif(tallos,0),1), round(100.0*d/nullif(tallos,0),1), camas), E'\n' ORDER BY mes)
FROM (SELECT to_char(fecha,'YYYY-MM') mes, sum(tallos) tallos,
             sum(tallos) FILTER (WHERE calidad='primera') p, sum(tallos) FILTER (WHERE calidad='segunda') s,
             sum(tallos) FILTER (WHERE calidad='descarte') d, count(DISTINCT cama_id) camas
      FROM produccion.cosecha WHERE fecha >= date_trunc('month', current_date) - interval '23 months' GROUP BY 1) x"#),
        ("Producción anual", r#"
SELECT string_agg(format('%s: %s tallos (descarte %s%%)%s', anio, tallos, round(100.0*d/nullif(tallos,0),1),
  CASE WHEN anio = extract(year FROM current_date)::int THEN ' – año en curso, hasta hoy' ELSE '' END), E'\n' ORDER BY anio)
FROM (SELECT extract(year FROM fecha)::int anio, sum(tallos) tallos, sum(tallos) FILTER (WHERE calidad='descarte') d
      FROM produccion.cosecha GROUP BY 1) x"#),
        ("Producción por zona: últimos 12 meses vs. 12 meses anteriores", r#"
SELECT string_agg(format('Zona %s: %s tallos (antes %s, variación %s%%), descarte %s%%', zona, act, ant,
  round(100.0*(act-ant)/nullif(ant,0),1), round(100.0*desc_/nullif(act,0),1)), E'\n' ORDER BY zona)
FROM (SELECT c.zona,
        sum(co.tallos) FILTER (WHERE co.fecha > current_date - 365) act,
        sum(co.tallos) FILTER (WHERE co.fecha <= current_date - 365 AND co.fecha > current_date - 730) ant,
        sum(co.tallos) FILTER (WHERE co.fecha > current_date - 365 AND co.calidad='descarte') desc_
      FROM produccion.cosecha co JOIN produccion.cama c ON c.id = co.cama_id GROUP BY c.zona) x"#),
        ("Producción por cama (últimos 90 días)", r#"
SELECT string_agg(format('%s [%s]: %s tallos, descarte %s%%, último corte %s', codigo, estado, coalesce(t,0),
  coalesce(round(100.0*d/nullif(t,0),1),0), coalesce(ult::text,'—')), E'\n' ORDER BY codigo)
FROM (SELECT c.codigo, c.estado, sum(co.tallos) t, sum(co.tallos) FILTER (WHERE co.calidad='descarte') d, max(co.fecha) ult
      FROM produccion.cama c LEFT JOIN produccion.cosecha co ON co.cama_id = c.id AND co.fecha > current_date - 90
      GROUP BY c.codigo, c.estado) x"#),
        ("Lotes recientes (12)", r#"
SELECT string_agg(format('%s [%s]: %s tallos de %s camas; vendidos %s tallos a %s clientes', codigo, estado, tallos, camas, vendidos, clientes), E'\n' ORDER BY anio DESC, secuencia DESC)
FROM (SELECT l.codigo, l.estado, l.anio, l.secuencia,
        (SELECT coalesce(sum(tallos),0) FROM produccion.cosecha WHERE lote_id = l.id) tallos,
        (SELECT count(DISTINCT cama_id) FROM produccion.cosecha WHERE lote_id = l.id) camas,
        (SELECT coalesce(sum(oi.tallos),0) FROM ventas.orden_item oi JOIN ventas.orden o ON o.id = oi.orden_id WHERE oi.lote_id = l.id AND o.estado <> 'cancelada') vendidos,
        (SELECT count(DISTINCT o.cliente_id) FROM ventas.orden_item oi JOIN ventas.orden o ON o.id = oi.orden_id WHERE oi.lote_id = l.id AND o.estado <> 'cancelada') clientes
      FROM produccion.lote l ORDER BY l.anio DESC, l.secuencia DESC LIMIT 12) x"#),
        ("Incidencias fitosanitarias abiertas o en tratamiento", r#"
SELECT string_agg(format('#%s %s – %s (%s, severidad %s) detectada %s, %s tratamientos aplicados', i.id, c.codigo, i.nombre, i.estado, i.severidad, i.detectada_en,
  (SELECT count(*) FROM calidad.tratamiento t WHERE t.incidencia_id = i.id)), E'\n' ORDER BY i.detectada_en DESC)
FROM calidad.incidencia i JOIN produccion.cama c ON c.id = i.cama_id WHERE i.estado <> 'resuelta'"#),
        ("Incidencias últimos 12 meses por problema", r#"
SELECT string_agg(format('%s: %s casos (%s altas/críticas), camas: %s', nombre, n, altas, camas), E'\n' ORDER BY n DESC)
FROM (SELECT regexp_replace(i.nombre, '^Brote de ', '') nombre, count(*) n,
        count(*) FILTER (WHERE i.severidad IN ('alta','critica')) altas,
        string_agg(DISTINCT c.codigo, ', ') camas
      FROM calidad.incidencia i JOIN produccion.cama c ON c.id = i.cama_id
      WHERE i.detectada_en > current_date - 365 GROUP BY 1) x"#),
        ("Inspecciones de calidad (últimos 90 días) por zona", r#"
SELECT string_agg(format('Zona %s: %s inspecciones, puntaje promedio %s, observadas %s, rechazadas %s', zona, n, prom, obs, rech), E'\n' ORDER BY zona)
FROM (SELECT c.zona, count(*) n, round(avg(i.puntaje),1) prom,
        count(*) FILTER (WHERE i.resultado='observada') obs, count(*) FILTER (WHERE i.resultado='rechazada') rech
      FROM calidad.inspeccion i JOIN produccion.cama c ON c.id = i.cama_id
      WHERE i.fecha > current_date - 90 GROUP BY c.zona) x"#),
        ("Umbrales IoT configurados", r#"
SELECT string_agg(format('%s (%s): alerta %s–%s, crítico %s–%s', variable, unidad, min_alerta, max_alerta, min_critico, max_critico), E'\n' ORDER BY variable)
FROM monitoreo.umbral"#),
        ("Nodos IoT", r#"
SELECT format('%s nodos activos. No activos: %s', count(*) FILTER (WHERE n.estado='activo'),
  coalesce(string_agg(format('%s (cama %s) %s, última conexión %s', n.identificador, c.codigo, n.estado,
    to_char(n.ultima_conexion AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI')), '; ') FILTER (WHERE n.estado <> 'activo'), 'ninguno'))
FROM monitoreo.nodo n JOIN produccion.cama c ON c.id = n.cama_id"#),
        ("Clima por zona (últimos 7 días)", r#"
SELECT string_agg(format('Zona %s: T media %s °C (mín %s, máx %s), HR %s %%, humedad suelo %s %%, pH %s, CE %s dS/m', zona, t, tmin, tmax, hr, hs, ph, ce), E'\n' ORDER BY zona)
FROM (SELECT c.zona, round(avg(l.temperatura)::numeric,1) t, round(min(l.temperatura)::numeric,1) tmin, round(max(l.temperatura)::numeric,1) tmax,
        round(avg(l.humedad_relativa)::numeric,0) hr, round(avg(l.humedad_suelo)::numeric,0) hs, round(avg(l.ph)::numeric,2) ph,
        round(avg(l.conductividad_electrica)::numeric,2) ce
      FROM monitoreo.lectura l JOIN produccion.cama c ON c.id = l.cama_id
      WHERE l.leido_en > now() - interval '7 days' GROUP BY c.zona) x"#),
        ("Lecturas fuera del rango de alerta (últimas 24 h)", r#"
SELECT coalesce(string_agg(format('%s: %s lecturas fuera de rango (%s)', codigo, n, vars), E'\n' ORDER BY n DESC), 'Ninguna')
FROM (SELECT c.codigo, count(*) n, concat_ws(', ',
          CASE WHEN bool_or(l.temperatura NOT BETWEEN ut.min_alerta AND ut.max_alerta) THEN 'temperatura' END,
          CASE WHEN bool_or(l.humedad_relativa NOT BETWEEN uh.min_alerta AND uh.max_alerta) THEN 'humedad relativa' END,
          CASE WHEN bool_or(l.humedad_suelo NOT BETWEEN us.min_alerta AND us.max_alerta) THEN 'humedad de suelo' END,
          CASE WHEN bool_or(l.ph NOT BETWEEN up.min_alerta AND up.max_alerta) THEN 'pH' END,
          CASE WHEN bool_or(l.conductividad_electrica NOT BETWEEN ue.min_alerta AND ue.max_alerta) THEN 'CE' END) vars
      FROM monitoreo.lectura l JOIN produccion.cama c ON c.id = l.cama_id
      CROSS JOIN (SELECT * FROM monitoreo.umbral WHERE variable='temperatura') ut
      CROSS JOIN (SELECT * FROM monitoreo.umbral WHERE variable='humedad_relativa') uh
      CROSS JOIN (SELECT * FROM monitoreo.umbral WHERE variable='humedad_suelo') us
      CROSS JOIN (SELECT * FROM monitoreo.umbral WHERE variable='ph') up
      CROSS JOIN (SELECT * FROM monitoreo.umbral WHERE variable='conductividad_electrica') ue
      WHERE l.leido_en > now() - interval '24 hours'
        AND (l.temperatura NOT BETWEEN ut.min_alerta AND ut.max_alerta
          OR l.humedad_relativa NOT BETWEEN uh.min_alerta AND uh.max_alerta
          OR l.humedad_suelo NOT BETWEEN us.min_alerta AND us.max_alerta
          OR l.ph NOT BETWEEN up.min_alerta AND up.max_alerta
          OR l.conductividad_electrica NOT BETWEEN ue.min_alerta AND ue.max_alerta)
      GROUP BY c.codigo) x"#),
        ("Clima mensual de la finca (últimos 12 meses)", r#"
SELECT string_agg(format('%s: T media %s °C, máx %s °C, HR %s %%, humedad suelo %s %%', mes, t, tmax, hr, hs), E'\n' ORDER BY mes)
FROM (SELECT to_char(leido_en AT TIME ZONE 'America/Bogota','YYYY-MM') mes, round(avg(temperatura)::numeric,1) t,
        round(max(temperatura)::numeric,1) tmax, round(avg(humedad_relativa)::numeric,0) hr, round(avg(humedad_suelo)::numeric,0) hs
      FROM monitoreo.lectura WHERE leido_en > date_trunc('month', now()) - interval '11 months' GROUP BY 1) x"#),
        ("Ventas mensuales (últimos 24 meses, sin órdenes canceladas)", r#"
SELECT string_agg(format('%s: %s órdenes, %s tallos, $%s COP, precio medio $%s/tallo', mes, ordenes, tallos,
  to_char(ingresos,'FM999G999G999'), round(ingresos/nullif(tallos,0))), E'\n' ORDER BY mes)
FROM (SELECT to_char(o.fecha,'YYYY-MM') mes, count(DISTINCT o.id) ordenes, sum(oi.tallos) tallos, sum(oi.tallos::bigint*oi.precio_por_tallo) ingresos
      FROM ventas.orden o JOIN ventas.orden_item oi ON oi.orden_id = o.id
      WHERE o.estado <> 'cancelada' AND o.fecha >= date_trunc('month', current_date) - interval '23 months' GROUP BY 1) x"#),
        ("Clientes y pedidos", r#"
SELECT format(E'Top clientes últimos 12 meses:\n%s\nÓrdenes abiertas: %s\nDespachos sin entregar: %s\nClientes inactivos: %s',
  (SELECT string_agg(format('- %s (%s, %s): %s tallos, $%s COP, %s órdenes', nombre, tipo, ciudad, tallos, to_char(cop,'FM999G999G999'), ordenes), E'\n' ORDER BY cop DESC)
     FROM (SELECT cl.nombre, cl.tipo, cl.ciudad, sum(oi.tallos) tallos, sum(oi.tallos::bigint*oi.precio_por_tallo) cop, count(DISTINCT o.id) ordenes
           FROM ventas.orden o JOIN ventas.orden_item oi ON oi.orden_id = o.id JOIN ventas.cliente cl ON cl.id = o.cliente_id
           WHERE o.estado <> 'cancelada' AND o.fecha > current_date - 365 GROUP BY 1,2,3) t),
  coalesce((SELECT string_agg(format('#%s %s (%s, %s)', o.id, cl.nombre, o.estado, o.fecha), '; ' ORDER BY o.fecha)
     FROM ventas.orden o JOIN ventas.cliente cl ON cl.id = o.cliente_id WHERE o.estado IN ('pendiente','confirmada')), 'ninguna'),
  coalesce((SELECT string_agg(format('#%s orden %s %s guía %s (%s)', d.id, d.orden_id, d.estado, d.guia, d.fecha), '; ' ORDER BY d.fecha)
     FROM ventas.despacho d WHERE d.estado IN ('programado','en_transito')), 'ninguno'),
  coalesce((SELECT string_agg(nombre, ', ') FROM ventas.cliente WHERE NOT activo), 'ninguno'))"#),
    ];

    let mut texto = String::new();
    for (titulo, sql) in secciones {
        texto.push_str(&seccion(db, titulo, sql).await?);
        texto.push('\n');
    }
    texto.push_str(&seccion(db, "Labores de los últimos 30 días", r#"
SELECT string_agg(format('%s: %s registros', tipo, n), ', ' ORDER BY n DESC)
FROM (SELECT tipo, count(*) n FROM produccion.labor WHERE fecha > current_date - 30 GROUP BY tipo) x"#).await?);
    Ok(texto)
}
