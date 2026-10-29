CREATE TABLE produccion.siembra (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  fecha_siembra date NOT NULL,
  fecha_estimada_cosecha date,
  plantas_sembradas integer NOT NULL CHECK (plantas_sembradas > 0),
  estado text NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'cosechada', 'cancelada')),
  observaciones text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_estimada_cosecha IS NULL OR fecha_estimada_cosecha >= fecha_siembra)
);

CREATE UNIQUE INDEX uq_siembra_activa_por_cama
  ON produccion.siembra (cama_id) WHERE estado = 'activa';

CREATE TRIGGER trg_siembra_actualizado BEFORE UPDATE ON produccion.siembra
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
