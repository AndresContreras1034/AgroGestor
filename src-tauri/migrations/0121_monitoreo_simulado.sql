INSERT INTO monitoreo.nodo (cama_id, identificador, estado, ultima_conexion, firmware)
SELECT
  cama.id,
  'ESP32-' || cama.codigo,
  CASE WHEN cama.numero % 6 = 0 THEN 'alerta' ELSE 'activo' END,
  now() - (cama.numero * interval '3 minutes'),
  '1.4.2'
FROM produccion.cama AS cama
ON CONFLICT (cama_id) DO NOTHING;

INSERT INTO monitoreo.lectura
  (nodo_id, cama_id, leido_en, temperatura, humedad_relativa, humedad_suelo, ph, conductividad_electrica)
SELECT
  nodo.id,
  nodo.cama_id,
  now() - (serie * interval '15 minutes'),
  round((21.5 + sin(nodo.cama_id + serie) * 2.8)::numeric, 2),
  round((68.0 + cos(nodo.cama_id + serie) * 8.0)::numeric, 2),
  round((48.0 + sin(nodo.cama_id * 0.7 + serie) * 12.0)::numeric, 2),
  round((6.2 + cos(nodo.cama_id + serie) * 0.35)::numeric, 2),
  round((1.35 + sin(nodo.cama_id * 0.5 + serie) * 0.25)::numeric, 2)
FROM monitoreo.nodo AS nodo
CROSS JOIN generate_series(0, 47) AS serie
WHERE NOT EXISTS (
  SELECT 1 FROM monitoreo.lectura AS lectura WHERE lectura.nodo_id = nodo.id
);
