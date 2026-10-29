CREATE TABLE monitoreo.nodo (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL UNIQUE REFERENCES produccion.cama(id),
  identificador text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'offline' CHECK (estado IN ('activo', 'offline', 'alerta')),
  ultima_conexion timestamptz,
  firmware text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_nodo_actualizado BEFORE UPDATE ON monitoreo.nodo
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
