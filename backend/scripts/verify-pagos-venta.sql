-- Ejecutar despues de 20260910_pagos_venta.sql.
-- No modifica datos: falla si detecta una inconsistencia.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ventas v
    LEFT JOIN pagos_venta pv ON pv.venta_id = v.id
    WHERE v.pagos_desglosados = TRUE
    GROUP BY v.id, v.total
    HAVING COALESCE(SUM(pv.monto), 0) <> v.total
  ) THEN
    RAISE EXCEPTION 'Existen ventas cuyo total no coincide con sus pagos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pagos_venta
    WHERE metodo_pago = 'MIXTO'
  ) THEN
    RAISE EXCEPTION 'MIXTO no puede existir como medio financiero en pagos_venta';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ventas v
    INNER JOIN pagos_venta pv ON pv.venta_id = v.id
    WHERE v.pagos_desglosados = TRUE
      AND v.metodo_pago <> 'MIXTO'
    GROUP BY v.id, v.metodo_pago
    HAVING COUNT(*) <> 1 OR NOT BOOL_AND(pv.metodo_pago = v.metodo_pago)
  ) THEN
    RAISE EXCEPTION 'Una venta simple no coincide con su unico medio de pago';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ventas v
    INNER JOIN pagos_venta pv ON pv.venta_id = v.id
    WHERE v.pagos_desglosados = TRUE
      AND v.metodo_pago = 'MIXTO'
    GROUP BY v.id
    HAVING COUNT(*) < 2
  ) THEN
    RAISE EXCEPTION 'Una venta MIXTO nueva debe tener al menos dos medios de pago';
  END IF;

  IF EXISTS (
    WITH ventas_por_sesion AS (
      SELECT v.sesion_caja_id, SUM(v.total) AS total_vendido
      FROM ventas v
      WHERE v.estado = 'COMPLETADA'
        AND v.pagos_desglosados = TRUE
        AND v.sesion_caja_id IS NOT NULL
      GROUP BY v.sesion_caja_id
    ),
    pagos_por_sesion AS (
      SELECT v.sesion_caja_id, SUM(pv.monto) AS total_pagado
      FROM ventas v
      INNER JOIN pagos_venta pv ON pv.venta_id = v.id
      WHERE v.estado = 'COMPLETADA'
        AND v.pagos_desglosados = TRUE
        AND v.sesion_caja_id IS NOT NULL
      GROUP BY v.sesion_caja_id
    )
    SELECT 1
    FROM ventas_por_sesion vps
    INNER JOIN pagos_por_sesion pps USING (sesion_caja_id)
    WHERE vps.total_vendido <> pps.total_pagado
  ) THEN
    RAISE EXCEPTION 'El total vendido por caja no coincide con los medios de pago';
  END IF;
END;
$$;

SELECT
  COUNT(*) FILTER (WHERE metodo_pago = 'MIXTO' AND pagos_desglosados = FALSE)
    AS ventas_mixtas_historicas_sin_desglose,
  COUNT(*) FILTER (WHERE pagos_desglosados = TRUE)
    AS ventas_con_pagos_verificados
FROM ventas;
