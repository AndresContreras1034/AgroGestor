CREATE TABLE produccion.cosecha (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cama_id integer NOT NULL REFERENCES produccion.cama(id),
  siembra_id integer NOT NULL REFERENCES produccion.siembra(id),
  lote_id integer REFERENCES produccion.lote(id),
  fecha date NOT NULL,
  tallos integer NOT NULL CHECK (tallos >= 0),
  calidad text NOT NULL DEFAULT 'primera' CHECK (calidad IN ('primera', 'segunda', 'descarte')),
  registrado_por text NOT NULL CHECK (registrado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cosecha_cama ON produccion.cosecha (cama_id, fecha DESC);
CREATE INDEX idx_cosecha_lote ON produccion.cosecha (lote_id);
