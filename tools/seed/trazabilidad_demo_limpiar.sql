BEGIN;

DELETE FROM ventas.despacho_item di
 USING ventas.despacho d
 WHERE di.despacho_id = d.id
   AND d.guia IN ('DEMO-TRAZ-GUIA-001', 'DEMO-TRAZ-GUIA-002');

DELETE FROM ventas.despacho
 WHERE guia IN ('DEMO-TRAZ-GUIA-001', 'DEMO-TRAZ-GUIA-002');

DELETE FROM ventas.orden_item oi
 USING ventas.orden o
 WHERE oi.orden_id = o.id
   AND o.observaciones IN (
     'DEMO_TRAZABILIDAD_2099_ORDEN_1',
     'DEMO_TRAZABILIDAD_2099_ORDEN_2',
     'DEMO_TRAZABILIDAD_2099_ORDEN_CANCELADA'
   );

DELETE FROM ventas.orden
 WHERE observaciones IN (
   'DEMO_TRAZABILIDAD_2099_ORDEN_1',
   'DEMO_TRAZABILIDAD_2099_ORDEN_2',
   'DEMO_TRAZABILIDAD_2099_ORDEN_CANCELADA'
 );

DELETE FROM produccion.cosecha c
 USING produccion.siembra s, produccion.lote l
 WHERE c.siembra_id = s.id
   AND c.lote_id = l.id
   AND s.observaciones = 'DEMO_TRAZABILIDAD_2099'
   AND l.codigo = 'RSC-2099-999';

DELETE FROM produccion.siembra
 WHERE observaciones = 'DEMO_TRAZABILIDAD_2099'
   AND cama_id = (SELECT id FROM produccion.cama WHERE codigo = 'A-09');

DELETE FROM produccion.lote
 WHERE codigo = 'RSC-2099-999';

DELETE FROM ventas.cliente
 WHERE nit IN ('DEMO-TRAZ-001', 'DEMO-TRAZ-002');

COMMIT;
