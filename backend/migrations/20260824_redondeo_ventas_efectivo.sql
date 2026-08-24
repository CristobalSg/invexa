BEGIN;

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS total_sin_redondeo NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS redondeo NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS vuelto NUMERIC(10,2);

UPDATE ventas
SET total_sin_redondeo = total
WHERE total_sin_redondeo IS NULL;

ALTER TABLE ventas
  ALTER COLUMN total_sin_redondeo SET NOT NULL;

COMMIT;
