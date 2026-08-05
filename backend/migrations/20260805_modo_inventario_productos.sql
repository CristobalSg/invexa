BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'modo_inventario_producto'
  ) THEN
    CREATE TYPE modo_inventario_producto AS ENUM (
      'SIN_INVENTARIO',
      'FLEXIBLE',
      'ESTRICTO'
    );
  END IF;
END $$;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS modo_inventario modo_inventario_producto;

UPDATE productos
SET modo_inventario = 'FLEXIBLE'
WHERE modo_inventario IS NULL;

ALTER TABLE productos
  ALTER COLUMN modo_inventario SET DEFAULT 'FLEXIBLE',
  ALTER COLUMN modo_inventario SET NOT NULL;

COMMIT;
