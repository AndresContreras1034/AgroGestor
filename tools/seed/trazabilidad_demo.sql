BEGIN;

INSERT INTO produccion.lote
  (codigo, anio, secuencia, estado, observaciones, registrado_por)
VALUES
  ('RSC-2099-999', 2099, 999, 'abierto', 'Datos de demostración de trazabilidad.', 'proyecto')
ON CONFLICT DO NOTHING;

INSERT INTO ventas.cliente (nombre, nit, tipo, ciudad)
VALUES
  ('Cliente demo Norte', 'DEMO-TRAZ-001', 'mayorista', 'Bogotá'),
  ('Cliente demo Sur', 'DEMO-TRAZ-002', 'distribuidor_floral', 'Medellín')
ON CONFLICT (nit) DO NOTHING;

INSERT INTO produccion.siembra
  (cama_id, fecha_siembra, plantas_sembradas, estado, observaciones, registrado_por)
SELECT c.id, DATE '2099-10-01', 300, 'cosechada',
       'DEMO_TRAZABILIDAD_2099', 'proyecto'
  FROM produccion.cama c
 WHERE c.codigo = 'A-09'
   AND NOT EXISTS (
     SELECT 1
       FROM produccion.siembra s
      WHERE s.cama_id = c.id
        AND s.observaciones = 'DEMO_TRAZABILIDAD_2099'
   );

INSERT INTO produccion.cosecha
  (cama_id, siembra_id, lote_id, fecha, tallos, calidad, registrado_por)
SELECT s.cama_id, s.id, l.id, demo.fecha, demo.tallos, demo.calidad, 'proyecto'
  FROM produccion.siembra s
  JOIN produccion.lote l ON l.codigo = 'RSC-2099-999'
  CROSS JOIN (VALUES
    (DATE '2099-11-01', 120, 'primera'),
    (DATE '2099-11-05', 60, 'segunda'),
    (DATE '2099-11-08', 20, 'descarte')
  ) AS demo(fecha, tallos, calidad)
 WHERE s.observaciones = 'DEMO_TRAZABILIDAD_2099'
   AND NOT EXISTS (
     SELECT 1
       FROM produccion.cosecha c
      WHERE c.siembra_id = s.id
        AND c.lote_id = l.id
        AND c.fecha = demo.fecha
        AND c.tallos = demo.tallos
        AND c.calidad = demo.calidad
   );

INSERT INTO ventas.orden
  (cliente_id, fecha, estado, observaciones, registrado_por)
SELECT cl.id, demo.fecha, demo.estado, demo.marca, 'comercial'
  FROM (VALUES
    ('DEMO-TRAZ-001', DATE '2099-11-10', 'confirmada', 'DEMO_TRAZABILIDAD_2099_ORDEN_1'),
    ('DEMO-TRAZ-002', DATE '2099-11-11', 'despachada', 'DEMO_TRAZABILIDAD_2099_ORDEN_2'),
    ('DEMO-TRAZ-001', DATE '2099-11-12', 'cancelada', 'DEMO_TRAZABILIDAD_2099_ORDEN_CANCELADA')
  ) AS demo(nit, fecha, estado, marca)
  JOIN ventas.cliente cl ON cl.nit = demo.nit
 WHERE NOT EXISTS (
   SELECT 1 FROM ventas.orden o WHERE o.observaciones = demo.marca
 );

INSERT INTO ventas.orden_item (orden_id, lote_id, tallos, precio_por_tallo)
SELECT o.id, l.id, demo.tallos, 500
  FROM (VALUES
    ('DEMO_TRAZABILIDAD_2099_ORDEN_1', 150),
    ('DEMO_TRAZABILIDAD_2099_ORDEN_2', 90),
    ('DEMO_TRAZABILIDAD_2099_ORDEN_CANCELADA', 70)
  ) AS demo(marca, tallos)
  JOIN ventas.orden o ON o.observaciones = demo.marca
  JOIN produccion.lote l ON l.codigo = 'RSC-2099-999'
 WHERE NOT EXISTS (
   SELECT 1
     FROM ventas.orden_item oi
    WHERE oi.orden_id = o.id
      AND oi.lote_id = l.id
      AND oi.tallos = demo.tallos
 );

INSERT INTO ventas.despacho
  (orden_id, fecha, estado, transportador, guia, registrado_por)
SELECT o.id, demo.fecha, 'entregado', demo.transportador, demo.guia, 'comercial'
  FROM (VALUES
    ('DEMO_TRAZABILIDAD_2099_ORDEN_1', DATE '2099-11-13', 'Transporte demo', 'DEMO-TRAZ-GUIA-001', 100),
    ('DEMO_TRAZABILIDAD_2099_ORDEN_2', DATE '2099-11-14', 'Logística demo', 'DEMO-TRAZ-GUIA-002', 60)
  ) AS demo(marca, fecha, transportador, guia, tallos)
  JOIN ventas.orden o ON o.observaciones = demo.marca
 WHERE NOT EXISTS (
   SELECT 1 FROM ventas.despacho d WHERE d.guia = demo.guia
 );

INSERT INTO ventas.despacho_item (despacho_id, orden_item_id, tallos)
SELECT d.id, oi.id, demo.tallos
  FROM (VALUES
    ('DEMO-TRAZ-GUIA-001', 'DEMO_TRAZABILIDAD_2099_ORDEN_1', 100),
    ('DEMO-TRAZ-GUIA-002', 'DEMO_TRAZABILIDAD_2099_ORDEN_2', 60)
  ) AS demo(guia, marca, tallos)
  JOIN ventas.despacho d ON d.guia = demo.guia
  JOIN ventas.orden o ON o.observaciones = demo.marca
  JOIN ventas.orden_item oi ON oi.orden_id = o.id AND oi.tallos = CASE
    WHEN demo.marca = 'DEMO_TRAZABILIDAD_2099_ORDEN_1' THEN 150
    ELSE 90
  END
 WHERE NOT EXISTS (
   SELECT 1
     FROM ventas.despacho_item di
    WHERE di.despacho_id = d.id
      AND di.orden_item_id = oi.id
      AND di.tallos = demo.tallos
 );

COMMIT;
