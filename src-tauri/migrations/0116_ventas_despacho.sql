CREATE TABLE ventas.despacho (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_id integer NOT NULL REFERENCES ventas.orden(id),
  fecha date NOT NULL DEFAULT current_date,
  estado text NOT NULL DEFAULT 'programado'
    CHECK (estado IN ('programado', 'en_transito', 'entregado', 'cancelado')),
  transportador text,
  guia text,
  observaciones text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ventas.despacho_item (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  despacho_id integer NOT NULL REFERENCES ventas.despacho(id) ON DELETE CASCADE,
  orden_item_id integer NOT NULL REFERENCES ventas.orden_item(id),
  tallos integer NOT NULL CHECK (tallos > 0)
);

CREATE TRIGGER trg_despacho_actualizado BEFORE UPDATE ON ventas.despacho
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
