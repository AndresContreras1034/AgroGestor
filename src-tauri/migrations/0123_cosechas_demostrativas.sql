INSERT INTO produccion.cosecha
  (cama_id, siembra_id, lote_id, fecha, tallos, calidad, registrado_por)
SELECT
  siembra.cama_id,
  siembra.id,
  (SELECT id FROM produccion.lote WHERE estado = 'abierto' ORDER BY id LIMIT 1),
  datos.fecha,
  datos.tallos,
  datos.calidad,
  'proyecto'
FROM produccion.siembra AS siembra
CROSS JOIN (VALUES
  (current_date - 3, 124, 'primera'),
  (current_date - 2, 86, 'primera'),
  (current_date - 1, 34, 'segunda')
) AS datos(fecha, tallos, calidad)
WHERE siembra.estado = 'activa'
  AND NOT EXISTS (
    SELECT 1
    FROM produccion.cosecha AS cosecha
    WHERE cosecha.siembra_id = siembra.id
      AND cosecha.fecha = datos.fecha
      AND cosecha.tallos = datos.tallos
  );
