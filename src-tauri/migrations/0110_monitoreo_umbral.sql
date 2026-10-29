CREATE TABLE monitoreo.umbral (
  variable text PRIMARY KEY CHECK (variable IN
    ('temperatura', 'humedad_relativa', 'humedad_suelo', 'ph', 'conductividad_electrica')),
  unidad text NOT NULL,
  min_alerta double precision NOT NULL,
  max_alerta double precision NOT NULL,
  min_critico double precision NOT NULL,
  max_critico double precision NOT NULL,
  CHECK (min_critico <= min_alerta AND min_alerta < max_alerta AND max_alerta <= max_critico)
);
