CREATE TYPE rol_usuario AS ENUM ('OWNER', 'CASHIER');

CREATE TYPE tipo_propiedad_producto AS ENUM ('PROPIO', 'CONSIGNACION');

CREATE TYPE unidad_venta_producto AS ENUM ('UNIDAD', 'PESO');

CREATE TYPE modo_inventario_producto AS ENUM (
  'SIN_INVENTARIO',
  'FLEXIBLE',
  'ESTRICTO'
);

CREATE TYPE tipo_movimiento_inventario AS ENUM (
  'VENTA',
  'COMPRA',
  'AJUSTE',
  'MERMA',
  'DEVOLUCION',
  'ANULACION'
);

CREATE TYPE metodo_pago AS ENUM (
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'MIXTO'
);

CREATE TYPE estado_venta AS ENUM (
  'COMPLETADA',
  'ANULADA'
);

CREATE TYPE modalidad_venta AS ENUM (
  'NORMAL',
  'PRECIO_COSTO',
  'RETIRO_DUENO'
);

CREATE TYPE tipo_movimiento_caja AS ENUM ('INGRESO', 'EGRESO');

CREATE TYPE categoria_movimiento_caja AS ENUM (
  'PAGO_PROVEEDOR',
  'COMPRA_MENOR',
  'RETIRO_PROPIETARIO',
  'DEPOSITO',
  'REPOSICION',
  'OTRO'
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  rol rol_usuario NOT NULL DEFAULT 'CASHIER',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categorias_producto (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  multiplicador_ganancia NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  variacion_maxima_precio NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(50),
  porcentaje_comision NUMERIC(5,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  codigo_barras VARCHAR(100) UNIQUE,

  categoria_id INT NOT NULL,

  tipo_propiedad tipo_propiedad_producto NOT NULL DEFAULT 'PROPIO',
  unidad_venta unidad_venta_producto NOT NULL DEFAULT 'UNIDAD',
  modo_inventario modo_inventario_producto NOT NULL DEFAULT 'FLEXIBLE',
  proveedor_id INT,

  costo_actual NUMERIC(10,2),
  precio_venta NUMERIC(10,2) NOT NULL,

  stock NUMERIC(10,3) NOT NULL DEFAULT 0,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_producto_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id),

  CONSTRAINT fk_producto_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),

  CONSTRAINT chk_producto_consignacion_proveedor
    CHECK (
      tipo_propiedad = 'PROPIO'
      OR proveedor_id IS NOT NULL
    )
);

CREATE TABLE ofertas_producto (
  id SERIAL PRIMARY KEY,

  producto_id INT NOT NULL,

  nombre VARCHAR(150) NOT NULL,
  cantidad_oferta NUMERIC(10,3) NOT NULL DEFAULT 1,
  precio_oferta NUMERIC(10,2) NOT NULL,

  activa BOOLEAN NOT NULL DEFAULT TRUE,

  inicia_en TIMESTAMP NOT NULL DEFAULT NOW(),
  termina_en TIMESTAMP,

  motivo TEXT,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_oferta_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id),

  CONSTRAINT chk_precio_oferta_positivo
    CHECK (precio_oferta > 0),

  CONSTRAINT chk_cantidad_oferta_positiva
    CHECK (cantidad_oferta > 0)
);

CREATE UNIQUE INDEX uq_ofertas_producto_activa
  ON ofertas_producto(producto_id)
  WHERE activa = TRUE;

CREATE TABLE productos_destacados (
  id SERIAL PRIMARY KEY,

  producto_id INT NOT NULL UNIQUE,
  posicion INT NOT NULL DEFAULT 0,

  creado_por INT,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_producto_destacado_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,

  CONSTRAINT fk_producto_destacado_usuario
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_producto_destacado_posicion
    CHECK (posicion >= 0)
);

CREATE TABLE sesiones_caja (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,

  monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0,
  monto_cierre NUMERIC(10,2),
  monto_esperado NUMERIC(10,2),
  diferencia_cierre NUMERIC(10,2),

  abierta_en TIMESTAMP NOT NULL DEFAULT NOW(),
  cerrada_en TIMESTAMP,

  abierta BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_sesion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE movimientos_caja (
  id SERIAL PRIMARY KEY,
  sesion_caja_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo tipo_movimiento_caja NOT NULL,
  categoria categoria_movimiento_caja NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_movimiento_caja_sesion
    FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id),

  CONSTRAINT fk_movimiento_caja_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),

  CONSTRAINT chk_movimiento_caja_monto
    CHECK (monto > 0)
);

CREATE TABLE compras (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,

  total_costo NUMERIC(10,2) NOT NULL DEFAULT 0,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_compra_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE detalle_compras (
  id SERIAL PRIMARY KEY,

  compra_id INT NOT NULL,
  producto_id INT NOT NULL,

  cantidad NUMERIC(10,3) NOT NULL,

  costo_unitario NUMERIC(10,2) NOT NULL,
  costo_anterior NUMERIC(10,2),

  precio_anterior NUMERIC(10,2),
  precio_sugerido NUMERIC(10,2) NOT NULL,
  precio_final NUMERIC(10,2) NOT NULL,

  variacion_precio NUMERIC(8,4),
  tiene_alerta_precio BOOLEAN NOT NULL DEFAULT FALSE,

  subtotal_costo NUMERIC(10,2) NOT NULL,

  CONSTRAINT fk_detalle_compra_compra
    FOREIGN KEY (compra_id) REFERENCES compras(id),

  CONSTRAINT fk_detalle_compra_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id),

  CONSTRAINT chk_detalle_compra_cantidad
    CHECK (cantidad > 0)
);

CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,

  usuario_id INT NOT NULL,
  sesion_caja_id INT,

  metodo_pago metodo_pago NOT NULL DEFAULT 'EFECTIVO',

  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,

  modalidad modalidad_venta NOT NULL DEFAULT 'NORMAL',

  estado estado_venta NOT NULL DEFAULT 'COMPLETADA',
  anulada_en TIMESTAMP,
  anulada_por INT,
  motivo_anulacion TEXT,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_venta_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),

  CONSTRAINT fk_venta_sesion_caja
    FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja(id),

  CONSTRAINT fk_venta_anulada_por
    FOREIGN KEY (anulada_por) REFERENCES usuarios(id)
);

CREATE TABLE detalle_ventas (
  id SERIAL PRIMARY KEY,

  venta_id INT NOT NULL,
  producto_id INT NOT NULL,

  oferta_id INT,

  cantidad NUMERIC(10,3) NOT NULL,

  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  precio_normal NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_final NUMERIC(10,2) NOT NULL DEFAULT 0,

  tipo_propiedad tipo_propiedad_producto NOT NULL,
  proveedor_id INT,

  CONSTRAINT fk_detalle_venta_venta
    FOREIGN KEY (venta_id) REFERENCES ventas(id),

  CONSTRAINT fk_detalle_venta_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id),

  CONSTRAINT fk_detalle_venta_oferta
    FOREIGN KEY (oferta_id) REFERENCES ofertas_producto(id),

  CONSTRAINT fk_detalle_venta_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),

  CONSTRAINT chk_detalle_venta_cantidad
    CHECK (cantidad > 0)
);

CREATE TABLE movimientos_inventario (
  id SERIAL PRIMARY KEY,

  producto_id INT NOT NULL,
  usuario_id INT,

  tipo tipo_movimiento_inventario NOT NULL,

  cantidad NUMERIC(10,3) NOT NULL,

  stock_anterior NUMERIC(10,3),
  stock_nuevo NUMERIC(10,3),

  venta_id INT,
  compra_id INT,

  motivo TEXT,

  creado_en TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_movimiento_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id),

  CONSTRAINT fk_movimiento_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),

  CONSTRAINT fk_movimiento_venta
    FOREIGN KEY (venta_id) REFERENCES ventas(id),

  CONSTRAINT fk_movimiento_compra
    FOREIGN KEY (compra_id) REFERENCES compras(id)
);

CREATE INDEX idx_productos_codigo_barras
  ON productos(codigo_barras);

CREATE INDEX idx_productos_categoria
  ON productos(categoria_id);

CREATE INDEX idx_productos_tipo_propiedad
  ON productos(tipo_propiedad);

CREATE INDEX idx_productos_stock_activo
  ON productos(stock, activo);

CREATE INDEX idx_ofertas_producto
  ON ofertas_producto(producto_id);

CREATE INDEX idx_ofertas_activas
  ON ofertas_producto(activa);

CREATE INDEX idx_productos_destacados_posicion
  ON productos_destacados(posicion);

CREATE INDEX idx_ventas_creado_en
  ON ventas(creado_en);

CREATE INDEX idx_ventas_estado
  ON ventas(estado);

CREATE INDEX idx_ventas_sesion_caja
  ON ventas(sesion_caja_id);

CREATE INDEX idx_ventas_metodo_pago
  ON ventas(metodo_pago);

CREATE INDEX idx_detalle_ventas_producto
  ON detalle_ventas(producto_id);

CREATE INDEX idx_detalle_ventas_oferta
  ON detalle_ventas(oferta_id);

CREATE INDEX idx_movimientos_producto
  ON movimientos_inventario(producto_id);

CREATE INDEX idx_movimientos_creado_en
  ON movimientos_inventario(creado_en);

CREATE INDEX idx_compras_creado_en
  ON compras(creado_en);

CREATE INDEX idx_detalle_compras_producto
  ON detalle_compras(producto_id);

CREATE INDEX idx_sesiones_caja_usuario_abierta
  ON sesiones_caja(usuario_id, abierta);

CREATE INDEX idx_movimientos_caja_sesion
  ON movimientos_caja(sesion_caja_id, creado_en);

CREATE INDEX idx_movimientos_caja_tipo_categoria
  ON movimientos_caja(tipo, categoria);

INSERT INTO categorias_producto
(nombre, multiplicador_ganancia, variacion_maxima_precio)
VALUES
('Frutas y verduras', 1.50, 0.25),
('Congelados', 1.40, 0.20),
('Abarrotes', 1.30, 0.20),
('Bebidas', 1.35, 0.20),
('Consignación', 1.00, 0.30);

INSERT INTO usuarios
(nombre_usuario, contrasena_hash, nombre, email, rol)
VALUES
('admin', 'CAMBIAR_HASH', 'Dueño', NULL, 'OWNER');
