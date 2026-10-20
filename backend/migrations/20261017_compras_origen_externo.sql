ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS origen_externo UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_compras_origen_externo
  ON compras (origen_externo);
