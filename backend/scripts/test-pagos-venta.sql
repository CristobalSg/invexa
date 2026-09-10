\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE ventas_prueba_pago (
  caso TEXT PRIMARY KEY,
  venta_id INT NOT NULL
) ON COMMIT DROP;

WITH venta AS (
  INSERT INTO ventas (
    id,
    usuario_id,
    metodo_pago,
    subtotal,
    total_sin_redondeo,
    total,
    pagos_desglosados
  )
  SELECT -900001, id, 'EFECTIVO', 10000, 10000, 10000, TRUE
  FROM usuarios
  ORDER BY id
  LIMIT 1
  RETURNING id
)
INSERT INTO ventas_prueba_pago VALUES ('EFECTIVO', (SELECT id FROM venta));

WITH venta AS (
  INSERT INTO ventas (
    id,
    usuario_id,
    metodo_pago,
    subtotal,
    total_sin_redondeo,
    total,
    pagos_desglosados
  )
  SELECT -900002, id, 'TARJETA', 10000, 10000, 10000, TRUE
  FROM usuarios
  ORDER BY id
  LIMIT 1
  RETURNING id
)
INSERT INTO ventas_prueba_pago VALUES ('TARJETA', (SELECT id FROM venta));

WITH venta AS (
  INSERT INTO ventas (
    id,
    usuario_id,
    metodo_pago,
    subtotal,
    total_sin_redondeo,
    total,
    pagos_desglosados
  )
  SELECT -900003, id, 'MIXTO', 10000, 10000, 10000, TRUE
  FROM usuarios
  ORDER BY id
  LIMIT 1
  RETURNING id
)
INSERT INTO ventas_prueba_pago VALUES ('MIXTO', (SELECT id FROM venta));

INSERT INTO pagos_venta (id, venta_id, metodo_pago, monto)
SELECT -900001, venta_id, 'EFECTIVO', 10000
FROM ventas_prueba_pago
WHERE caso = 'EFECTIVO';

INSERT INTO pagos_venta (id, venta_id, metodo_pago, monto)
SELECT -900002, venta_id, 'TARJETA', 10000
FROM ventas_prueba_pago
WHERE caso = 'TARJETA';

INSERT INTO pagos_venta (id, venta_id, metodo_pago, monto)
SELECT -900003, venta_id, 'EFECTIVO', 4000
FROM ventas_prueba_pago
WHERE caso = 'MIXTO';

INSERT INTO pagos_venta (id, venta_id, metodo_pago, monto)
SELECT -900004, venta_id, 'TARJETA', 6000
FROM ventas_prueba_pago
WHERE caso = 'MIXTO';

SET CONSTRAINTS ALL IMMEDIATE;

DO $$
DECLARE
  total_vendido NUMERIC(10,2);
  efectivo NUMERIC(10,2);
  tarjeta NUMERIC(10,2);
BEGIN
  SELECT
    SUM(v.total),
    SUM(pv.monto) FILTER (WHERE pv.metodo_pago = 'EFECTIVO'),
    SUM(pv.monto) FILTER (WHERE pv.metodo_pago = 'TARJETA')
  INTO total_vendido, efectivo, tarjeta
  FROM ventas_prueba_pago prueba
  INNER JOIN ventas v ON v.id = prueba.venta_id
  INNER JOIN pagos_venta pv ON pv.venta_id = v.id
  WHERE v.estado = 'COMPLETADA';

  -- SUM(v.total) se duplicaria por cada pago. La igualdad financiera correcta
  -- se comprueba por separado usando los importes de pagos_venta.
  SELECT SUM(v.total)
  INTO total_vendido
  FROM ventas_prueba_pago prueba
  INNER JOIN ventas v ON v.id = prueba.venta_id
  WHERE v.estado = 'COMPLETADA';

  IF total_vendido <> 30000 OR efectivo <> 14000 OR tarjeta <> 16000 THEN
    RAISE EXCEPTION
      'Desglose incorrecto: total %, efectivo %, tarjeta %',
      total_vendido,
      efectivo,
      tarjeta;
  END IF;
END;
$$;

UPDATE ventas
SET estado = 'ANULADA'
WHERE id = (SELECT venta_id FROM ventas_prueba_pago WHERE caso = 'TARJETA');

DO $$
DECLARE
  total_vendido NUMERIC(10,2);
  efectivo NUMERIC(10,2);
  tarjeta NUMERIC(10,2);
BEGIN
  SELECT SUM(v.total)
  INTO total_vendido
  FROM ventas_prueba_pago prueba
  INNER JOIN ventas v ON v.id = prueba.venta_id
  WHERE v.estado = 'COMPLETADA';

  SELECT
    SUM(pv.monto) FILTER (WHERE pv.metodo_pago = 'EFECTIVO'),
    SUM(pv.monto) FILTER (WHERE pv.metodo_pago = 'TARJETA')
  INTO efectivo, tarjeta
  FROM ventas_prueba_pago prueba
  INNER JOIN ventas v ON v.id = prueba.venta_id
  INNER JOIN pagos_venta pv ON pv.venta_id = v.id
  WHERE v.estado = 'COMPLETADA';

  IF total_vendido <> 20000 OR efectivo <> 14000 OR tarjeta <> 6000 THEN
    RAISE EXCEPTION
      'Una venta anulada sigue contabilizada: total %, efectivo %, tarjeta %',
      total_vendido,
      efectivo,
      tarjeta;
  END IF;
END;
$$;

ROLLBACK;
