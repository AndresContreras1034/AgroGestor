INSERT INTO ventas.cliente
  (nombre, nit, tipo, email, telefono, ciudad, activo)
VALUES
  ('Flores de la Sabana S.A.S.', 'DEMO-TRAZA-01', 'distribuidor_floral',
   'compras@sabana.example', '6015550201', 'Bogota', true),
  ('Mercado Floral de Antioquia', 'DEMO-TRAZA-02', 'mayorista',
   'compras@antioquia.example', '6045550202', 'Medellin', true),
  ('Central Mayorista del Valle', 'DEMO-TRAZA-03', 'mayorista',
   'compras@valle.example', '6025550203', 'Cali', true),
  ('Exportadora Flor Andina', 'DEMO-TRAZA-04', 'exportador',
   'operaciones@florandina.example', '6015550204', 'Bogota', true),
  ('Flores y Detalles del Eje', 'DEMO-TRAZA-05', 'distribuidor_floral',
   'pedidos@eje.example', '6065550205', 'Pereira', true),
  ('Abastecimiento Floral Santander', 'DEMO-TRAZA-06', 'mayorista',
   'compras@santander.example', '6075550206', 'Bucaramanga', true),
  ('Floristerias Unidas', 'DEMO-TRAZA-07', 'distribuidor_floral',
   'pedidos@floristerias.example', '6015550207', 'Bogota', true),
  ('Comercializadora Flores del Cafe', 'DEMO-TRAZA-08', 'exportador',
   'ventas@florescafe.example', '6065550208', 'Manizales', true)
ON CONFLICT (nit) DO NOTHING;

WITH temporadas AS (
  SELECT periodo.anio, estacion.mes
  FROM generate_series(
         extract(year FROM current_date)::integer - 4,
         extract(year FROM current_date)::integer
       ) AS periodo(anio)
  CROSS JOIN (VALUES (1), (5), (9)) AS estacion(mes)
),
ciclos AS (
  SELECT
    cama.id AS cama_id,
    cama.codigo AS cama_codigo,
    cama.zona,
    cama.numero,
    temporada.anio,
    temporada.mes,
    make_date(temporada.anio, temporada.mes, 1)
      + ((cama.numero + ascii(cama.zona) - 66) % 9) AS fecha_siembra
  FROM temporadas AS temporada
  CROSS JOIN produccion.cama AS cama
  WHERE make_date(temporada.anio, temporada.mes, 1)
          + ((cama.numero + ascii(cama.zona) - 66) % 9) + 91
        <= current_date
)
INSERT INTO produccion.siembra
  (cama_id, fecha_siembra, fecha_estimada_cosecha, plantas_sembradas,
   estado, observaciones, registrado_por)
SELECT
  ciclo.cama_id,
  ciclo.fecha_siembra,
  ciclo.fecha_siembra + 77,
  160 + ((ciclo.numero * 17 + ciclo.anio + ciclo.mes) % 81),
  'cosechada',
  'Historial trazable ' || ciclo.anio || '-' || lpad(ciclo.mes::text, 2, '0')
    || ' cama ' || ciclo.cama_codigo
    || ' variedad ' || CASE ciclo.zona
         WHEN 'A' THEN 'rosa Freedom'
         WHEN 'B' THEN 'clavel'
         ELSE 'alstroemeria'
       END,
  'proyecto'
FROM ciclos AS ciclo;

WITH cosechas AS (
  SELECT DISTINCT
    extract(year FROM siembra.fecha_siembra)::integer AS anio,
    siembra.fecha_siembra + corte.numero * 7 AS fecha
  FROM produccion.siembra AS siembra
  CROSS JOIN generate_series(11, 13) AS corte(numero)
  WHERE siembra.observaciones LIKE 'Historial trazable %'
),
fechas_numeradas AS (
  SELECT
    cosecha.anio,
    cosecha.fecha,
    row_number() OVER (PARTITION BY cosecha.anio ORDER BY cosecha.fecha)::integer
      AS numero
  FROM cosechas AS cosecha
),
ultima_secuencia AS (
  SELECT lote.anio, max(lote.secuencia) AS secuencia
  FROM produccion.lote AS lote
  GROUP BY lote.anio
)
INSERT INTO produccion.lote
  (codigo, anio, secuencia, estado, observaciones, registrado_por)
SELECT
  'RSC-' || fecha.anio || '-'
    || lpad((coalesce(ultima.secuencia, 0) + fecha.numero)::text, 3, '0'),
  fecha.anio,
  coalesce(ultima.secuencia, 0) + fecha.numero,
  'cerrado',
  'Lote historico de cosecha ' || fecha.fecha,
  'proyecto'
FROM fechas_numeradas AS fecha
LEFT JOIN ultima_secuencia AS ultima ON ultima.anio = fecha.anio;

INSERT INTO produccion.cosecha
  (cama_id, siembra_id, lote_id, fecha, tallos, calidad, registrado_por)
SELECT
  siembra.cama_id,
  siembra.id,
  lote.id,
  siembra.fecha_siembra + corte.numero * 7,
  90 + ((cama.numero * 13 + extract(doy FROM siembra.fecha_siembra)::integer
         + corte.numero * 11) % 70),
  CASE
    WHEN corte.numero = 13 AND cama.numero % 3 = 0 THEN 'segunda'
    ELSE 'primera'
  END,
  'proyecto'
FROM produccion.siembra AS siembra
JOIN produccion.cama AS cama ON cama.id = siembra.cama_id
CROSS JOIN generate_series(11, 13) AS corte(numero)
JOIN produccion.lote AS lote
  ON lote.anio = extract(year FROM siembra.fecha_siembra)::integer
 AND lote.observaciones =
     'Lote historico de cosecha ' || (siembra.fecha_siembra + corte.numero * 7)
WHERE siembra.observaciones LIKE 'Historial trazable %';

INSERT INTO produccion.labor
  (cama_id, siembra_id, tipo, fecha, descripcion, responsable, registrado_por)
SELECT
  siembra.cama_id,
  siembra.id,
  actividad.tipo,
  siembra.fecha_siembra + actividad.dias,
  actividad.descripcion || ' del ciclo ' || siembra.fecha_siembra,
  'Equipo de cultivo',
  'proyecto'
FROM produccion.siembra AS siembra
CROSS JOIN (VALUES
  ('riego', 7, 'Riego y verificacion de humedad'),
  ('fertilizacion', 21, 'Fertilizacion de mantenimiento'),
  ('poda', 45, 'Poda y retiro de material vegetal')
) AS actividad(tipo, dias, descripcion)
WHERE siembra.observaciones LIKE 'Historial trazable %';

WITH nuevas_incidencias AS (
  INSERT INTO calidad.incidencia
    (cama_id, siembra_id, tipo, nombre, severidad, estado, detectada_en,
     descripcion, registrado_por)
  SELECT
    siembra.cama_id,
    siembra.id,
    CASE WHEN siembra.id % 2 = 0 THEN 'plaga' ELSE 'enfermedad' END,
    CASE WHEN siembra.id % 2 = 0
      THEN 'Revision preventiva de afidos'
      ELSE 'Revision preventiva de oidio'
    END,
    CASE WHEN siembra.id % 7 = 0 THEN 'media' ELSE 'baja' END,
    'resuelta',
    siembra.fecha_siembra + 35,
    'Hallazgo historico de baja incidencia, atendido y cerrado durante el ciclo.',
    'calidad'
  FROM produccion.siembra AS siembra
  WHERE siembra.observaciones LIKE 'Historial trazable %'
    AND siembra.id % 5 = 0
  RETURNING id, siembra_id
)
INSERT INTO calidad.tratamiento
  (incidencia_id, producto, dosis, fecha_aplicacion, responsable,
   observaciones, registrado_por)
SELECT
  incidencia.id,
  CASE WHEN incidencia.id % 2 = 0 THEN 'Jabon potasico' ELSE 'Control cultural' END,
  CASE WHEN incidencia.id % 2 = 0 THEN 'Aplicacion segun etiqueta' ELSE NULL END,
  siembra.fecha_siembra + 36,
  'Equipo de calidad',
  'Seguimiento historico; incidencia resuelta antes de cosecha.',
  'calidad'
FROM nuevas_incidencias AS incidencia
JOIN produccion.siembra AS siembra ON siembra.id = incidencia.siembra_id;

INSERT INTO calidad.inspeccion
  (cama_id, fecha, resultado, puntaje, observaciones, inspector, registrado_por)
SELECT
  siembra.cama_id,
  siembra.fecha_siembra + 56,
  CASE WHEN siembra.id % 8 = 0 THEN 'observada' ELSE 'aprobada' END,
  83 + (siembra.id % 17),
  CASE WHEN siembra.id % 8 = 0
    THEN 'Inspeccion historica con observacion menor; corregida antes de cosecha.'
    ELSE 'Inspeccion historica aprobada; cultivo conforme.'
  END,
  'Inspector de calidad',
  'calidad'
FROM produccion.siembra AS siembra
WHERE siembra.observaciones LIKE 'Historial trazable %';

WITH clientes AS (
  SELECT id, row_number() OVER (ORDER BY nit)::integer AS numero
  FROM ventas.cliente
  WHERE nit LIKE 'DEMO-TRAZA-%'
),
lotes_vendidos AS (
  SELECT
    lote.id AS lote_id,
    lote.codigo,
    lote.anio,
    lote.secuencia,
    min(cosecha.fecha) + 1 AS fecha_orden,
    row_number() OVER (ORDER BY lote.anio, lote.secuencia)::integer AS numero
  FROM produccion.lote AS lote
  JOIN produccion.cosecha AS cosecha ON cosecha.lote_id = lote.id
  WHERE lote.observaciones LIKE 'Lote historico de cosecha %'
    AND lote.secuencia % 3 = 0
  GROUP BY lote.id, lote.codigo, lote.anio, lote.secuencia
)
INSERT INTO ventas.orden
  (cliente_id, fecha, estado, observaciones, registrado_por)
SELECT
  cliente.id,
  lote.fecha_orden,
  'despachada',
  'Trazabilidad demo: ' || lote.codigo,
  'comercial'
FROM lotes_vendidos AS lote
JOIN clientes AS cliente
  ON cliente.numero = ((lote.numero - 1) % 8) + 1;

INSERT INTO ventas.orden_item (orden_id, lote_id, tallos, precio_por_tallo)
SELECT
  orden.id,
  lote.id,
  sum(cosecha.tallos)::integer,
  600 + ((lote.anio - (extract(year FROM current_date)::integer - 4)) * 75)
FROM ventas.orden AS orden
JOIN produccion.lote AS lote
  ON orden.observaciones = 'Trazabilidad demo: ' || lote.codigo
JOIN produccion.cosecha AS cosecha ON cosecha.lote_id = lote.id
GROUP BY orden.id, lote.id, lote.anio;

INSERT INTO ventas.despacho
  (orden_id, fecha, estado, transportador, guia, observaciones, registrado_por)
SELECT
  orden.id,
  orden.fecha + 1,
  'entregado',
  'Transportes de flores',
  'TRZ-' || lote.codigo,
  'Entrega historica asociada al lote y a su orden comercial.',
  'comercial'
FROM ventas.orden AS orden
JOIN produccion.lote AS lote
  ON orden.observaciones = 'Trazabilidad demo: ' || lote.codigo;

INSERT INTO ventas.despacho_item (despacho_id, orden_item_id, tallos)
SELECT despacho.id, item.id, item.tallos
FROM ventas.despacho AS despacho
JOIN ventas.orden_item AS item ON item.orden_id = despacho.orden_id
JOIN ventas.orden AS orden ON orden.id = despacho.orden_id
WHERE orden.observaciones LIKE 'Trazabilidad demo: RSC-%';

INSERT INTO monitoreo.lectura
  (nodo_id, cama_id, leido_en, temperatura, humedad_relativa, humedad_suelo,
   ph, conductividad_electrica)
SELECT
  nodo.id,
  nodo.cama_id,
  serie.instante,
  round((21.5 + sin(nodo.cama_id * 0.7
    + extract(epoch FROM serie.instante) / 604800.0) * 2.5)::numeric, 2),
  round((70.0 + cos(nodo.cama_id * 0.4
    + extract(epoch FROM serie.instante) / 604800.0) * 8.0)::numeric, 2),
  round((48.0 + sin(nodo.cama_id * 0.5
    + extract(epoch FROM serie.instante) / 604800.0) * 10.0)::numeric, 2),
  round((6.2 + cos(nodo.cama_id * 0.3
    + extract(epoch FROM serie.instante) / 604800.0) * 0.25)::numeric, 2),
  round((1.35 + sin(nodo.cama_id * 0.6
    + extract(epoch FROM serie.instante) / 604800.0) * 0.22)::numeric, 2)
FROM monitoreo.nodo AS nodo
CROSS JOIN LATERAL generate_series(
  (current_date - interval '4 years')::date::timestamptz + interval '9 hours',
  current_date::timestamptz + interval '9 hours',
  interval '7 days'
) AS serie(instante);
