CREATE TABLE monitoreo.lectura (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nodo_id integer NOT NULL REFERENCES monitoreo.nodo(id),
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  leido_en timestamptz NOT NULL DEFAULT now(),
  temperatura double precision NOT NULL,
  humedad_relativa double precision NOT NULL,
  humedad_suelo double precision NOT NULL,
  ph double precision NOT NULL,
  conductividad_electrica double precision NOT NULL
);

CREATE INDEX idx_lectura_cama_tiempo ON monitoreo.lectura (cama_id, leido_en DESC);
CREATE INDEX idx_lectura_tiempo ON monitoreo.lectura (leido_en DESC);
