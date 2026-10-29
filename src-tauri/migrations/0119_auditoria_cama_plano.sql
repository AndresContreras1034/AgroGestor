ALTER TABLE finca.cama_plano
  ADD COLUMN actualizado_por text
    CHECK (actualizado_por IN ('proyecto', 'comercial', 'calidad', 'diseno')),
  ADD COLUMN actualizado_en timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_cama_plano_actualizado
  BEFORE UPDATE ON finca.cama_plano
  FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
