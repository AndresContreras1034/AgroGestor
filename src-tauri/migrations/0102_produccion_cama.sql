CREATE TABLE produccion.cama (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[ABC]-[0-9]{2}$'),
  zona text NOT NULL REFERENCES finca.zona(codigo) ON UPDATE CASCADE,
  numero integer NOT NULL CHECK (numero BETWEEN 1 AND 9),
  estado text NOT NULL DEFAULT 'disponible'
    CHECK (estado IN ('disponible', 'sembrada', 'cosechada', 'en_descanso')),
  observaciones text,
  actualizado_por text CHECK (actualizado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zona, numero),
  CHECK (codigo = zona || '-' || lpad(numero::text, 2, '0')),
  CHECK (
    (zona = 'A' AND numero BETWEEN 1 AND 9) OR
    (zona IN ('B', 'C') AND numero BETWEEN 1 AND 8)
  )
);

CREATE INDEX idx_cama_zona_estado ON produccion.cama (zona, estado);

CREATE TRIGGER trg_cama_actualizado BEFORE UPDATE ON produccion.cama
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
