ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS pagos_desglosados BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS pagos_venta (
  id SERIAL PRIMARY KEY,
  venta_id INT NOT NULL,
  metodo_pago metodo_pago NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_pago_venta
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,

  CONSTRAINT chk_pago_venta_metodo_real
    CHECK (metodo_pago <> 'MIXTO'),

  CONSTRAINT chk_pago_venta_monto_no_negativo
    CHECK (monto >= 0),

  CONSTRAINT uq_pago_venta_metodo
    UNIQUE (venta_id, metodo_pago)
);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta
  ON pagos_venta(venta_id);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_metodo
  ON pagos_venta(metodo_pago);

-- Las ventas historicas simples tienen un desglose inequivoco.
INSERT INTO pagos_venta (venta_id, metodo_pago, monto, creado_en)
SELECT v.id, v.metodo_pago, v.total, v.creado_en
FROM ventas v
WHERE v.metodo_pago <> 'MIXTO'
  AND NOT EXISTS (
    SELECT 1
    FROM pagos_venta pv
    WHERE pv.venta_id = v.id
  );

UPDATE ventas v
SET pagos_desglosados = TRUE
WHERE v.metodo_pago <> 'MIXTO'
  AND EXISTS (
    SELECT 1
    FROM pagos_venta pv
    WHERE pv.venta_id = v.id
  );

-- Las ventas MIXTO historicas permanecen con pagos_desglosados = FALSE y sin
-- filas inventadas en pagos_venta. Pueden corregirse manualmente mas adelante.

CREATE OR REPLACE FUNCTION validar_total_pagos_venta()
RETURNS TRIGGER AS $$
DECLARE
  venta_objetivo_id INT;
  venta_total NUMERIC(10,2);
  venta_tiene_desglose BOOLEAN;
  pagos_total NUMERIC(10,2);
BEGIN
  IF TG_TABLE_NAME = 'ventas' THEN
    venta_objetivo_id := COALESCE(NEW.id, OLD.id);
  ELSE
    venta_objetivo_id := COALESCE(NEW.venta_id, OLD.venta_id);
  END IF;

  SELECT total, pagos_desglosados
  INTO venta_total, venta_tiene_desglose
  FROM ventas
  WHERE id = venta_objetivo_id;

  IF NOT FOUND OR venta_tiene_desglose = FALSE THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(monto), 0)
  INTO pagos_total
  FROM pagos_venta
  WHERE venta_id = venta_objetivo_id;

  IF pagos_total <> venta_total THEN
    RAISE EXCEPTION
      'Pagos inconsistentes para venta %: total venta %, total pagos %',
      venta_objetivo_id,
      venta_total,
      pagos_total;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_total_pagos_venta ON pagos_venta;
CREATE CONSTRAINT TRIGGER trg_validar_total_pagos_venta
AFTER INSERT OR UPDATE OR DELETE ON pagos_venta
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_total_pagos_venta();

DROP TRIGGER IF EXISTS trg_validar_total_venta_pagos ON ventas;
CREATE CONSTRAINT TRIGGER trg_validar_total_venta_pagos
AFTER INSERT OR UPDATE OF total, pagos_desglosados ON ventas
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_total_pagos_venta();
