CREATE TABLE finca.cama_plano (
  cama_id integer PRIMARY KEY REFERENCES produccion.cama(id) ON DELETE CASCADE,
  pos_x double precision NOT NULL,
  pos_y double precision NOT NULL,
  ancho double precision NOT NULL CHECK (ancho > 0),
  alto double precision NOT NULL CHECK (alto > 0)
);
