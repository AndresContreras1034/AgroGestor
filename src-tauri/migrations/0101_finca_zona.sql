CREATE TABLE finca.zona (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE CHECK (codigo IN ('A', 'B', 'C')),
  nombre text NOT NULL,
  descripcion text,
  hectareas double precision CHECK (hectareas IS NULL OR hectareas >= 0),
  pos_x double precision NOT NULL DEFAULT 0,
  pos_y double precision NOT NULL DEFAULT 0,
  ancho double precision NOT NULL DEFAULT 100 CHECK (ancho > 0),
  alto double precision NOT NULL DEFAULT 60 CHECK (alto > 0),
  color text NOT NULL DEFAULT '#1F7A4D',
  actualizado_por text CHECK (actualizado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_zona_actualizado BEFORE UPDATE ON finca.zona
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
