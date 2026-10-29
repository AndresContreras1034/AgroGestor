CREATE TABLE produccion.lote (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^RSC-[0-9]{4}-[0-9]{3}$'),
  anio integer NOT NULL,
  secuencia integer NOT NULL CHECK (secuencia > 0),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  observaciones text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, secuencia),
  CHECK (codigo = 'RSC-' || anio || '-' || lpad(secuencia::text, 3, '0'))
);

CREATE TRIGGER trg_lote_actualizado BEFORE UPDATE ON produccion.lote
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
