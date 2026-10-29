INSERT INTO finca.zona (codigo, nombre, color, pos_x, pos_y, ancho, alto) VALUES
  ('A', 'Zona A', '#1F7A4D', 0, 0, 80, 56),
  ('B', 'Zona B', '#2F6FA3', 90, 0, 104, 40),
  ('C', 'Zona C', '#A86B1F', 90, 50, 104, 40);

INSERT INTO produccion.cama (codigo, zona, numero)
SELECT zona.codigo || '-' || lpad(numero::text, 2, '0'), zona.codigo, numero
FROM (VALUES ('A', 9), ('B', 8), ('C', 8)) AS zona(codigo, camas)
CROSS JOIN LATERAL generate_series(1, zona.camas) AS serie(numero);

INSERT INTO finca.cama_plano (cama_id, pos_x, pos_y, ancho, alto)
SELECT cama.id,
       zona.pos_x + 5 + ((cama.numero - 1) % distribucion.columnas) * 24,
       zona.pos_y + 5 + ((cama.numero - 1) / distribucion.columnas) * 16,
       20,
       12
FROM produccion.cama AS cama
JOIN finca.zona AS zona ON zona.codigo = cama.zona
JOIN (VALUES ('A', 3), ('B', 4), ('C', 4)) AS distribucion(zona, columnas)
  ON distribucion.zona = cama.zona;

INSERT INTO produccion.lote (codigo, anio, secuencia, registrado_por)
VALUES ('RSC-2026-014', 2026, 14, 'proyecto');

INSERT INTO monitoreo.umbral
  (variable, unidad, min_alerta, max_alerta, min_critico, max_critico)
VALUES
  ('temperatura', '°C', 8, 28, 5, 32),
  ('humedad_relativa', '%', 55, 90, 40, 95),
  ('humedad_suelo', '%', 30, 70, 20, 80),
  ('ph', 'pH', 5.5, 7.0, 5.0, 7.5),
  ('conductividad_electrica', 'dS/m', 0.5, 2.0, 0.2, 3.0);
