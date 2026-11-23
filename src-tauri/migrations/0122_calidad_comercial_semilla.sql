INSERT INTO calidad.incidencia
  (cama_id, tipo, nombre, severidad, estado, detectada_en, descripcion, registrado_por)
SELECT cama.id, 'plaga', 'Manejo preventivo de áfidos',
       'media', 'en_tratamiento', current_date - 3,
       'Incidencia demostrativa para seguimiento y aplicación de tratamiento.', 'calidad'
FROM produccion.cama AS cama
WHERE cama.codigo = 'A-01'
  AND NOT EXISTS (
    SELECT 1 FROM calidad.incidencia WHERE nombre = 'Manejo preventivo de áfidos'
  );

INSERT INTO calidad.tratamiento
  (incidencia_id, producto, dosis, fecha_aplicacion, responsable, observaciones, registrado_por)
SELECT incidencia.id, 'Aceite horticultural', '1.5 ml/L', current_date - 2,
       'Auxiliar de cultivo', 'Aplicación demostrativa durante control preventivo.', 'calidad'
FROM calidad.incidencia AS incidencia
WHERE incidencia.nombre = 'Manejo preventivo de áfidos'
  AND NOT EXISTS (
    SELECT 1 FROM calidad.tratamiento
    WHERE incidencia_id = incidencia.id AND producto = 'Aceite horticultural'
  );

INSERT INTO calidad.inspeccion
  (cama_id, fecha, resultado, puntaje, observaciones, inspector, registrado_por)
SELECT cama.id, current_date - 1, 'aprobada', 92,
       'Inspección demostrativa sin hallazgos críticos.', 'Inspector de calidad', 'calidad'
FROM produccion.cama AS cama
WHERE cama.codigo = 'A-01'
  AND NOT EXISTS (
    SELECT 1 FROM calidad.inspeccion
    WHERE cama_id = cama.id AND observaciones LIKE 'Inspección demostrativa%'
  );

INSERT INTO ventas.cliente
  (nombre, nit, tipo, email, telefono, ciudad, activo)
VALUES
  ('Flores Andinas S.A.S.', '900.123.456-1', 'distribuidor_floral', 'compras@floresandinas.example', '6015550101', 'Bogotá', true),
  ('Mercado Floral Central', '900.654.321-2', 'mayorista', 'ventas@mercadofloral.example', '6015550102', 'Bogotá', true)
ON CONFLICT (nit) DO NOTHING;

INSERT INTO ventas.orden
  (cliente_id, fecha, estado, observaciones, registrado_por)
SELECT cliente.id, current_date - 1, 'confirmada',
       'Orden demostrativa para seguimiento comercial.', 'comercial'
FROM ventas.cliente AS cliente
WHERE cliente.nit = '900.123.456-1'
  AND NOT EXISTS (
    SELECT 1 FROM ventas.orden
    WHERE cliente_id = cliente.id
      AND observaciones = 'Orden demostrativa para seguimiento comercial.'
  );

INSERT INTO ventas.despacho
  (orden_id, fecha, estado, transportador, guia, observaciones, registrado_por)
SELECT orden.id, current_date, 'programado',
       'Transportes del Centro', 'GUIA-DEMO-001',
       'Despacho demostrativo asociado a la orden.', 'comercial'
FROM ventas.orden AS orden
WHERE orden.observaciones = 'Orden demostrativa para seguimiento comercial.'
  AND NOT EXISTS (
    SELECT 1 FROM ventas.despacho
    WHERE orden_id = orden.id AND guia = 'GUIA-DEMO-001'
  );
