CREATE TABLE calidad.tratamiento (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incidencia_id integer NOT NULL REFERENCES calidad.incidencia(id),
  producto text NOT NULL,
  dosis text,
  fecha_aplicacion date NOT NULL,
  responsable text,
  observaciones text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now()
);
