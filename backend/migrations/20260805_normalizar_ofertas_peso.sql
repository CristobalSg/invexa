BEGIN;

UPDATE ofertas_producto o
SET cantidad_oferta = o.cantidad_oferta / 1000
FROM productos p
WHERE p.id = o.producto_id
  AND p.unidad_venta = 'PESO'
  AND o.cantidad_oferta >= 10;

COMMIT;
