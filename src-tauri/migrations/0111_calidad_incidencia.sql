CREATE TABLE calidad.incidencia (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  siembra_id integer REFERENCES produccion.siembra(id),
  tipo text NOT NULL CHECK (tipo IN ('plaga', 'enfermedad', 'brote', 'otro')),
  nombre text NOT NULL,
  severidad text NOT NULL CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_tratamiento', 'resuelta')),
  detectada_en date NOT NULL DEFAULT current_date,
  descripcion text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidencia_cama ON calidad.incidencia (cama_id, estado);

CREATE TRIGGER trg_incidencia_actualizado BEFORE UPDATE ON calidad.incidencia
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
