CREATE TABLE ventas.orden (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id integer NOT NULL REFERENCES ventas.cliente(id),
  fecha date NOT NULL DEFAULT current_date,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmada', 'despachada', 'cancelada')),
  observaciones text,
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ventas.orden_item (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_id integer NOT NULL REFERENCES ventas.orden(id) ON DELETE CASCADE,
  lote_id integer NOT NULL REFERENCES produccion.lote(id),
  tallos integer NOT NULL CHECK (tallos > 0),
  precio_por_tallo integer NOT NULL CHECK (precio_por_tallo >= 0)
);

CREATE INDEX idx_orden_cliente ON ventas.orden (cliente_id);
CREATE INDEX idx_orden_item_lote ON ventas.orden_item (lote_id);

CREATE TRIGGER trg_orden_actualizado BEFORE UPDATE ON ventas.orden
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
