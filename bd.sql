CREATE TABLE roles (
    id bigint primary key generated always as identity,
    nombre text not null unique,
    descripcion text
);

CREATE TABLE usuarios (
    id bigint primary key generated always as identity,
    nombre_usuario text not null unique,
    contraseña text not null,
    rol_id bigint references roles(id),
    creado_el timestamp with time zone default now()
);

CREATE TABLE almacenes (
    id bigint primary key generated always as identity,
    nombre text not null,
    ubicacion text,
    gerente_id bigint references usuarios(id)
);

CREATE TABLE productos (
    id bigint primary key generated always as identity,
    nombre text not null,
    descripcion text,
    codigo_barras text unique,
    creado_el timestamp with time zone default now()
);

CREATE TABLE inventario (
    id bigint primary key generated always as identity,
    producto_id bigint references productos(id),
    almacen_id bigint references almacenes(id),
    cantidad int not null default 0,
    ultima_actualizacion timestamp with time zone default now()
);

CREATE TABLE movimientos (
    id bigint primary key generated always as identity,
    producto_id bigint references productos(id),
    almacen_id bigint references almacenes(id),
    usuario_id bigint references usuarios(id),
    tipo text check (tipo in ('IN', 'OUT', 'ADJUST')),
    cantidad int not null,
    creado_el timestamp with time zone default now()
);