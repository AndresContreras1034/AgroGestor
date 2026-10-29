CREATE TABLE produccion.labor (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  siembra_id integer REFERENCES produccion.siembra(id),
  tipo text NOT NULL CHECK (tipo IN ('riego', 'poda', 'fertilizacion', 'deshierbe', 'fumigacion', 'otro')),
  fecha date NOT NULL,
  descripcion text,
  responsable text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_labor_cama_fecha ON produccion.labor (cama_id, fecha DESC);
