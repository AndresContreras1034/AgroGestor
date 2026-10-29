CREATE TABLE calidad.inspeccion (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  fecha date NOT NULL DEFAULT current_date,
  resultado text NOT NULL CHECK (resultado IN ('aprobada', 'observada', 'rechazada')),
  puntaje integer CHECK (puntaje BETWEEN 0 AND 100),
  observaciones text,
  inspector text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspeccion_cama ON calidad.inspeccion (cama_id, fecha DESC);
