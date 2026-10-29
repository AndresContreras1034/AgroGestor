CREATE TABLE ventas.cliente (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  nit text UNIQUE,
  tipo text NOT NULL DEFAULT 'distribuidor_floral'
    CHECK (tipo IN ('distribuidor_floral', 'mayorista', 'exportador', 'otro')),
  email text,
  telefono text,
  ciudad text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_cliente_actualizado BEFORE UPDATE ON ventas.cliente
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
