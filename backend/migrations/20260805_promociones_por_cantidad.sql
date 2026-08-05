BEGIN;

ALTER TABLE ofertas_producto
  ADD COLUMN IF NOT EXISTS cantidad_oferta NUMERIC(10,3) NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_cantidad_oferta_positiva'
  ) THEN
    ALTER TABLE ofertas_producto
      ADD CONSTRAINT chk_cantidad_oferta_positiva CHECK (cantidad_oferta > 0);
  END IF;
END $$;

WITH ofertas_activas_ordenadas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY producto_id
      ORDER BY creado_en DESC, id DESC
    ) AS posicion
  FROM ofertas_producto
  WHERE activa = TRUE
)
UPDATE ofertas_producto o
SET activa = FALSE
FROM ofertas_activas_ordenadas ordenadas
WHERE o.id = ordenadas.id
  AND ordenadas.posicion > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ofertas_producto_activa
  ON ofertas_producto(producto_id)
  WHERE activa = TRUE;

ALTER TABLE detalle_ventas
  ADD COLUMN IF NOT EXISTS precio_normal NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_final NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE detalle_ventas
SET
  precio_normal = precio_unitario,
  total_final = subtotal
WHERE precio_normal = 0
  AND total_final = 0;

COMMIT;
