-- Ejecutar una sola vez en Supabase > SQL Editor.
-- El catalogo usa un ID propio de Supabase. El POS lo relaciona con la base local
-- mediante codigo_barras, por lo que no se publica el ID interno del negocio.

create extension if not exists pgcrypto;

create table if not exists public.productos (
  id bigint generated always as identity primary key,
  codigo_barras text not null unique,
  nombre text not null,
  tipo_propiedad text not null check (tipo_propiedad in ('PROPIO', 'CONSIGNACION')),
  proveedor text,
  modo_inventario text not null check (modo_inventario in ('SIN_INVENTARIO', 'FLEXIBLE', 'ESTRICTO')),
  activo boolean not null default true,
  costo numeric(12, 2),
  precio_venta numeric(12, 2) not null check (precio_venta > 0),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (costo is null or costo >= 0)
);

create table if not exists public.compras_celular (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'PROCESANDO', 'APROBADA', 'ERROR')),
  dispositivo text,
  nota text,
  error_mensaje text,
  compra_local_id bigint,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table if not exists public.compra_celular_items (
  id bigint generated always as identity primary key,
  compra_id uuid not null references public.compras_celular(id) on delete cascade,
  producto_id bigint not null references public.productos(id),
  cantidad numeric(14, 3) not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null check (costo_unitario > 0),
  actualizar_precio_venta boolean not null default false,
  precio_final numeric(12, 2),
  unique (compra_id, producto_id),
  check (
    (actualizar_precio_venta = false and (precio_final is null or precio_final > 0))
    or
    (actualizar_precio_venta = true and precio_final > 0)
  )
);

create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

drop trigger if exists productos_actualizar_fecha on public.productos;
create trigger productos_actualizar_fecha
before update on public.productos
for each row execute function public.actualizar_fecha_modificacion();

drop trigger if exists compras_celular_actualizar_fecha on public.compras_celular;
create trigger compras_celular_actualizar_fecha
before update on public.compras_celular
for each row execute function public.actualizar_fecha_modificacion();

create or replace function public.sincronizar_productos_catalogo(productos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  registro jsonb;
  producto_actual public.productos%rowtype;
  codigo text;
  nombre_producto text;
  insertados integer := 0;
  actualizados integer := 0;
  sin_cambios integer := 0;
  omitidos integer := 0;
begin
  if productos is null or jsonb_typeof(productos) <> 'array' then
    raise exception 'productos debe ser una lista JSON';
  end if;

  for registro in select value from jsonb_array_elements(productos)
  loop
    codigo := nullif(btrim(registro->>'codigo_barras'), '');
    nombre_producto := nullif(btrim(registro->>'nombre'), '');

    if codigo is null or nombre_producto is null then
      omitidos := omitidos + 1;
      continue;
    end if;

    select * into producto_actual
    from public.productos p
    where p.codigo_barras = codigo;

    if not found then
      insert into public.productos (
        codigo_barras,
        nombre,
        tipo_propiedad,
        proveedor,
        modo_inventario,
        activo,
        costo,
        precio_venta
      ) values (
        codigo,
        nombre_producto,
        registro->>'tipo_propiedad',
        nullif(btrim(registro->>'proveedor'), ''),
        registro->>'modo_inventario',
        coalesce((registro->>'activo')::boolean, true),
        nullif(registro->>'costo', '')::numeric,
        (registro->>'precio_venta')::numeric
      );
      insertados := insertados + 1;
    elsif
      producto_actual.nombre is distinct from nombre_producto
      or producto_actual.tipo_propiedad is distinct from registro->>'tipo_propiedad'
      or producto_actual.proveedor is distinct from nullif(btrim(registro->>'proveedor'), '')
      or producto_actual.modo_inventario is distinct from registro->>'modo_inventario'
      or producto_actual.activo is distinct from coalesce((registro->>'activo')::boolean, true)
      or producto_actual.costo is distinct from nullif(registro->>'costo', '')::numeric
      or producto_actual.precio_venta is distinct from (registro->>'precio_venta')::numeric
    then
      update public.productos
      set
        nombre = nombre_producto,
        tipo_propiedad = registro->>'tipo_propiedad',
        proveedor = nullif(btrim(registro->>'proveedor'), ''),
        modo_inventario = registro->>'modo_inventario',
        activo = coalesce((registro->>'activo')::boolean, true),
        costo = nullif(registro->>'costo', '')::numeric,
        precio_venta = (registro->>'precio_venta')::numeric
      where id = producto_actual.id;
      actualizados := actualizados + 1;
    else
      sin_cambios := sin_cambios + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'insertados', insertados,
    'actualizados', actualizados,
    'sin_cambios', sin_cambios,
    'omitidos', omitidos
  );
end;
$$;

-- Esta es la funcion que debe invocar la aplicacion del celular.
-- Para productos por peso, cantidad se envia en gramos: 15000 = 15 kg.
create or replace function public.crear_compra_celular(
  items jsonb,
  p_dispositivo text default null,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  compra_nueva uuid;
  item jsonb;
  producto bigint;
  cantidad_item numeric;
  costo_item numeric;
  actualiza_precio boolean;
  precio_item numeric;
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'La compra debe incluir al menos un producto';
  end if;

  insert into public.compras_celular (dispositivo, nota)
  values (nullif(btrim(p_dispositivo), ''), nullif(btrim(p_nota), ''))
  returning id into compra_nueva;

  for item in select value from jsonb_array_elements(items)
  loop
    producto := (item->>'producto_id')::bigint;
    cantidad_item := (item->>'cantidad')::numeric;
    costo_item := (item->>'costo_unitario')::numeric;
    actualiza_precio := coalesce((item->>'actualizar_precio_venta')::boolean, false);
    precio_item := nullif(item->>'precio_final', '')::numeric;

    if not exists (
      select 1 from public.productos p where p.id = producto and p.activo = true
    ) then
      raise exception 'El producto % no existe o esta inactivo', producto;
    end if;

    if cantidad_item <= 0 or costo_item <= 0 then
      raise exception 'Cantidad y costo deben ser mayores a cero';
    end if;

    if actualiza_precio and (precio_item is null or precio_item <= 0) then
      raise exception 'Falta precio_final para el producto %', producto;
    end if;

    insert into public.compra_celular_items (
      compra_id,
      producto_id,
      cantidad,
      costo_unitario,
      actualizar_precio_venta,
      precio_final
    ) values (
      compra_nueva,
      producto,
      cantidad_item,
      costo_item,
      actualiza_precio,
      precio_item
    );
  end loop;

  return compra_nueva;
end;
$$;

create or replace function public.tomar_compra_celular(p_compra_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  filas integer;
begin
  update public.compras_celular
  set estado = 'PROCESANDO', error_mensaje = null
  where id = p_compra_id
    and estado <> 'APROBADA';

  get diagnostics filas = row_count;
  return filas = 1;
end;
$$;

create or replace function public.finalizar_compra_celular(
  p_compra_id uuid,
  p_estado text,
  p_compra_local_id bigint default null,
  p_error_mensaje text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_estado not in ('APROBADA', 'ERROR') then
    raise exception 'Estado final no valido';
  end if;

  update public.compras_celular
  set
    estado = p_estado,
    compra_local_id = case when p_estado = 'APROBADA' then p_compra_local_id else compra_local_id end,
    error_mensaje = case when p_estado = 'ERROR' then left(p_error_mensaje, 1000) else null end
  where id = p_compra_id;

  if not found then
    raise exception 'Compra celular no encontrada';
  end if;
end;
$$;

alter table public.productos enable row level security;
alter table public.compras_celular enable row level security;
alter table public.compra_celular_items enable row level security;

drop policy if exists "catalogo legible con publishable key" on public.productos;
create policy "catalogo legible con publishable key"
on public.productos for select
to anon, authenticated
using (true);

drop policy if exists "compras celular legibles con publishable key" on public.compras_celular;
create policy "compras celular legibles con publishable key"
on public.compras_celular for select
to anon, authenticated
using (true);

drop policy if exists "items celular legibles con publishable key" on public.compra_celular_items;
create policy "items celular legibles con publishable key"
on public.compra_celular_items for select
to anon, authenticated
using (true);

revoke all on table public.productos from anon, authenticated;
revoke all on table public.compras_celular from anon, authenticated;
revoke all on table public.compra_celular_items from anon, authenticated;
grant select on table public.productos to anon, authenticated;
grant select on table public.compras_celular to anon, authenticated;
grant select on table public.compra_celular_items to anon, authenticated;

revoke all on function public.sincronizar_productos_catalogo(jsonb) from public;
revoke all on function public.crear_compra_celular(jsonb, text, text) from public;
revoke all on function public.tomar_compra_celular(uuid) from public;
revoke all on function public.finalizar_compra_celular(uuid, text, bigint, text) from public;

grant execute on function public.sincronizar_productos_catalogo(jsonb) to anon, authenticated;
grant execute on function public.crear_compra_celular(jsonb, text, text) to anon, authenticated;
grant execute on function public.tomar_compra_celular(uuid) to anon, authenticated;
grant execute on function public.finalizar_compra_celular(uuid, text, bigint, text) to anon, authenticated;

-- Prueba opcional despues de sincronizar productos. Los producto_id de esta lista
-- son los IDs generados por Supabase, visibles con:
-- select id, codigo_barras, nombre from public.productos order by nombre;
--
-- select public.crear_compra_celular(
--   '[
--     {"producto_id": 42, "cantidad": 10, "costo_unitario": 850, "actualizar_precio_venta": true, "precio_final": 1290},
--     {"producto_id": 18, "cantidad": 25, "costo_unitario": 500, "actualizar_precio_venta": false},
--     {"producto_id": 73, "cantidad": 15000, "costo_unitario": 2400, "actualizar_precio_venta": true, "precio_final": 3990}
--   ]'::jsonb,
--   'Celular bodega',
--   'Recepcion semanal'
-- );
