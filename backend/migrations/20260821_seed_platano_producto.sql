INSERT INTO productos (
  nombre,
  codigo_barras,
  categoria_id,
  tipo_propiedad,
  unidad_venta,
  modo_inventario,
  costo_actual,
  precio_venta,
  stock
)
SELECT
  'Plátano',
  '780000000010',
  c.id,
  'PROPIO',
  'PESO',
  'FLEXIBLE',
  900,
  1290,
  20
FROM categorias_producto c
WHERE c.nombre = 'Frutas y verduras'
ON CONFLICT (codigo_barras) DO NOTHING;
