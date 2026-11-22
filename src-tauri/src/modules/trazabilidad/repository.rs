use sqlx::PgExecutor;

use super::models::{DespachoLote, DestinoOrden, EventoLinea, LoteResumen, OrigenCama};

const SELECT_RESUMEN: &str = r#"
SELECT l.id, l.codigo, l.anio, l.estado, l.observaciones, l.creado_en,
       COALESCE((SELECT SUM(c.tallos) FROM produccion.cosecha c WHERE c.lote_id = l.id), 0)::bigint
           AS total_tallos,
       (SELECT COUNT(*) FROM produccion.cosecha c WHERE c.lote_id = l.id)::bigint
           AS cosechas,
       (SELECT COUNT(DISTINCT c.cama_id) FROM produccion.cosecha c WHERE c.lote_id = l.id)::bigint
           AS camas,
       (SELECT COUNT(DISTINCT o.cliente_id)
          FROM ventas.orden_item oi
          JOIN ventas.orden o ON o.id = oi.orden_id
         WHERE oi.lote_id = l.id AND o.estado <> 'cancelada')::bigint
           AS clientes
  FROM produccion.lote l
"#;

const ORIGEN_SQL: &str = r#"
SELECT ca.id AS cama_id, ca.codigo AS cama_codigo, ca.zona,
       s.id AS siembra_id, s.fecha_siembra, s.plantas_sembradas, s.estado AS estado_siembra,
       COUNT(c.id)::bigint AS cosechas,
       SUM(c.tallos)::bigint AS tallos,
       COALESCE(SUM(c.tallos) FILTER (WHERE c.calidad = 'primera'), 0)::bigint AS tallos_primera,
       COALESCE(SUM(c.tallos) FILTER (WHERE c.calidad = 'segunda'), 0)::bigint AS tallos_segunda,
       COALESCE(SUM(c.tallos) FILTER (WHERE c.calidad = 'descarte'), 0)::bigint AS tallos_descarte,
       MIN(c.fecha) AS primera_cosecha,
       MAX(c.fecha) AS ultima_cosecha
  FROM produccion.cosecha c
  JOIN produccion.siembra s ON s.id = c.siembra_id
  JOIN produccion.cama ca ON ca.id = c.cama_id
 WHERE c.lote_id = $1
 GROUP BY ca.id, ca.codigo, ca.zona, s.id, s.fecha_siembra, s.plantas_sembradas, s.estado
 ORDER BY ca.codigo, s.fecha_siembra, s.id
"#;

const DESTINOS_SQL: &str = r#"
SELECT cl.id AS cliente_id, cl.nombre AS cliente, cl.ciudad,
       o.id AS orden_id, oi.id AS orden_item_id,
       o.fecha AS fecha_orden, o.estado AS estado_orden,
       oi.tallos AS tallos_orden,
       COALESCE((SELECT SUM(di.tallos)
                   FROM ventas.despacho_item di
                   JOIN ventas.despacho d ON d.id = di.despacho_id
                  WHERE di.orden_item_id = oi.id AND d.estado <> 'cancelado'), 0)::bigint
           AS tallos_despachados
  FROM ventas.orden_item oi
  JOIN ventas.orden o ON o.id = oi.orden_id
  JOIN ventas.cliente cl ON cl.id = o.cliente_id
 WHERE oi.lote_id = $1
 ORDER BY o.fecha, o.id, oi.id
"#;

const DESPACHOS_SQL: &str = r#"
SELECT d.id AS despacho_id, d.orden_id, d.fecha, d.estado, d.transportador, d.guia,
       SUM(di.tallos)::bigint AS tallos
  FROM ventas.despacho_item di
  JOIN ventas.orden_item oi ON oi.id = di.orden_item_id
  JOIN ventas.despacho d ON d.id = di.despacho_id
 WHERE oi.lote_id = $1
 GROUP BY d.id, d.orden_id, d.fecha, d.estado, d.transportador, d.guia
 ORDER BY d.fecha, d.id
"#;

const LINEA_TIEMPO_SQL: &str = r#"
WITH sb AS (
    SELECT s.id AS siembra_id, s.cama_id, ca.codigo AS cama_codigo,
           s.fecha_siembra, s.plantas_sembradas, MAX(c.fecha) AS fin
      FROM produccion.cosecha c
      JOIN produccion.siembra s ON s.id = c.siembra_id
      JOIN produccion.cama ca ON ca.id = s.cama_id
     WHERE c.lote_id = $1
     GROUP BY s.id, s.cama_id, ca.codigo, s.fecha_siembra, s.plantas_sembradas
)
SELECT DISTINCT fecha, tipo, titulo, detalle, cama_codigo, referencia_id, orden_tipo
FROM (
    SELECT sb.fecha_siembra AS fecha, 'siembra'::text AS tipo, 'Siembra'::text AS titulo,
           (sb.plantas_sembradas::text || ' plantas')::text AS detalle,
           sb.cama_codigo::text AS cama_codigo, 1 AS orden_tipo, sb.siembra_id AS referencia_id
      FROM sb
    UNION ALL
    SELECT l.fecha, 'labor', 'Labor: ' || l.tipo, l.descripcion, sb.cama_codigo, 2, l.id
      FROM sb
      JOIN produccion.labor l
        ON l.siembra_id = sb.siembra_id
        OR (l.siembra_id IS NULL AND l.cama_id = sb.cama_id
            AND l.fecha BETWEEN sb.fecha_siembra AND sb.fin)
    UNION ALL
    SELECT i.detectada_en, 'incidencia', 'Incidencia (' || i.tipo || '): ' || i.nombre,
           concat_ws(' · ', i.severidad, i.descripcion), sb.cama_codigo, 3, i.id
      FROM sb
      JOIN calidad.incidencia i
        ON i.siembra_id = sb.siembra_id
        OR (i.siembra_id IS NULL AND i.cama_id = sb.cama_id
            AND i.detectada_en BETWEEN sb.fecha_siembra AND sb.fin)
    UNION ALL
    SELECT t.fecha_aplicacion, 'tratamiento', 'Tratamiento: ' || t.producto,
           NULLIF(concat_ws(' · ', t.dosis, t.observaciones), ''), sb.cama_codigo, 4, t.id
      FROM sb
      JOIN calidad.incidencia i
        ON i.siembra_id = sb.siembra_id
        OR (i.siembra_id IS NULL AND i.cama_id = sb.cama_id
            AND i.detectada_en BETWEEN sb.fecha_siembra AND sb.fin)
      JOIN calidad.tratamiento t ON t.incidencia_id = i.id
    UNION ALL
    SELECT n.fecha, 'inspeccion', 'Inspección: ' || n.resultado,
           concat_ws(' · ', 'puntaje ' || n.puntaje::text, n.observaciones), sb.cama_codigo, 5, n.id
      FROM sb
      JOIN calidad.inspeccion n
        ON n.cama_id = sb.cama_id AND n.fecha BETWEEN sb.fecha_siembra AND sb.fin
    UNION ALL
    SELECT c.fecha, 'cosecha', 'Cosecha ' || c.calidad, c.tallos::text || ' tallos',
           ca.codigo, 6, c.id
      FROM produccion.cosecha c
      JOIN produccion.cama ca ON ca.id = c.cama_id
     WHERE c.lote_id = $1
    UNION ALL
    SELECT (lo.creado_en AT TIME ZONE 'America/Bogota')::date, 'lote', 'Lote creado',
           lo.observaciones, NULL::text, 7, lo.id
      FROM produccion.lote lo
     WHERE lo.id = $1
    UNION ALL
    SELECT o.fecha, 'orden', 'Orden #' || o.id::text, cl.nombre || ' · ' || o.estado,
           NULL::text, 8, o.id
      FROM ventas.orden o
      JOIN ventas.cliente cl ON cl.id = o.cliente_id
     WHERE EXISTS (SELECT 1 FROM ventas.orden_item oi
                    WHERE oi.orden_id = o.id AND oi.lote_id = $1)
    UNION ALL
    SELECT d.fecha, 'despacho', 'Despacho #' || d.id::text,
           concat_ws(' · ', d.estado, 'guía ' || d.guia), NULL::text, 9, d.id
      FROM ventas.despacho d
     WHERE EXISTS (SELECT 1 FROM ventas.despacho_item di
                     JOIN ventas.orden_item oi ON oi.id = di.orden_item_id
                    WHERE di.despacho_id = d.id AND oi.lote_id = $1)
) AS eventos
ORDER BY fecha, orden_tipo, referencia_id
"#;

pub async fn buscar_lotes(
    db: impl PgExecutor<'_>,
    q: Option<&str>,
) -> Result<Vec<LoteResumen>, sqlx::Error> {
    sqlx::query_as::<_, LoteResumen>(&format!(
        "{SELECT_RESUMEN}
         WHERE ($1::text IS NULL OR strpos(l.codigo, upper($1)) > 0)
         ORDER BY l.anio DESC, l.secuencia DESC
         LIMIT 50"
    ))
    .bind(q)
    .fetch_all(db)
    .await
}

pub async fn obtener_lote(
    db: impl PgExecutor<'_>,
    codigo: &str,
) -> Result<Option<LoteResumen>, sqlx::Error> {
    sqlx::query_as::<_, LoteResumen>(&format!("{SELECT_RESUMEN} WHERE l.codigo = $1"))
        .bind(codigo)
        .fetch_optional(db)
        .await
}

pub async fn origen(db: impl PgExecutor<'_>, lote_id: i32) -> Result<Vec<OrigenCama>, sqlx::Error> {
    sqlx::query_as::<_, OrigenCama>(ORIGEN_SQL)
        .bind(lote_id)
        .fetch_all(db)
        .await
}

pub async fn destinos(
    db: impl PgExecutor<'_>,
    lote_id: i32,
) -> Result<Vec<DestinoOrden>, sqlx::Error> {
    sqlx::query_as::<_, DestinoOrden>(DESTINOS_SQL)
        .bind(lote_id)
        .fetch_all(db)
        .await
}

pub async fn despachos(
    db: impl PgExecutor<'_>,
    lote_id: i32,
) -> Result<Vec<DespachoLote>, sqlx::Error> {
    sqlx::query_as::<_, DespachoLote>(DESPACHOS_SQL)
        .bind(lote_id)
        .fetch_all(db)
        .await
}

pub async fn linea_tiempo(
    db: impl PgExecutor<'_>,
    lote_id: i32,
) -> Result<Vec<EventoLinea>, sqlx::Error> {
    sqlx::query_as::<_, EventoLinea>(LINEA_TIEMPO_SQL)
        .bind(lote_id)
        .fetch_all(db)
        .await
}
