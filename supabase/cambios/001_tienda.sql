-- ============================================================================
-- 001 · Tienda: productos, ajustes, pedidos, administradores y comprobantes.
-- Se puede ejecutar dos veces sin romper nada. No borra datos.
-- ============================================================================

-- ---------- Productos (precios en centavos de dólar) ----------
create table if not exists public.productos (
  id          text primary key,
  nombre      text not null,
  frase       text not null default '',
  beneficios  text[] not null default '{}',
  precio_usd  integer not null check (precio_usd > 0),
  icono       text not null default '📦',
  color       text not null default '#e5e7eb',
  destacado   boolean not null default false,
  activo      boolean not null default true,
  orden       integer not null default 0
);

-- Productos de ejemplo (los mismos de la demostración). Se cambian por los reales de Dropi.
insert into public.productos (id, nombre, frase, beneficios, precio_usd, icono, color, destacado, orden) values
  ('organizador-especias', 'Organizador giratorio de especias', 'Todas tus especias a la vista, en un solo giro',
   array['Ahorra espacio en el mesón', 'Gira 360° para encontrar todo rápido', 'Incluye 12 frascos con tapa'], 1800, '🧂', '#f4c27a', true, 1),
  ('picador-verduras', 'Picador de verduras manual', 'Pica cebolla en segundos y sin lágrimas',
   array['3 cuchillas incluidas', 'Se lava fácil', 'Sin electricidad'], 1500, '🧅', '#9fd3a8', false, 2),
  ('lampara-sensor', 'Lámpara LED con sensor de movimiento', 'Luz automática cuando se va la electricidad',
   array['Recargable por USB', 'Se pega sin taladro', 'Se enciende sola al pasar'], 1200, '💡', '#a9c4f5', false, 3),
  ('bolsas-vacio', 'Set de bolsas al vacío (10 unidades)', 'Guarda la ropa en la mitad del espacio',
   array['Con bomba manual incluida', 'Protege de humedad y polvo', 'Reutilizables'], 2000, '🧺', '#d7b4ec', false, 4)
on conflict (id) do nothing;

-- ---------- Ajustes (una sola fila) ----------
create table if not exists public.ajustes (
  id                integer primary key default 1 check (id = 1),
  tasa              numeric(14, 4) not null check (tasa > 0),
  max_por_producto  integer not null default 5 check (max_por_producto between 1 and 99),
  metodos_pago      text[] not null default array['pago_movil', 'zelle', 'binance', 'transferencia', 'paypal'],
  actualizado       timestamptz not null default now()
);
insert into public.ajustes (id, tasa) values (1, 215.5) on conflict (id) do nothing;

-- ---------- Administradores (quién entra al panel) ----------
create table if not exists public.administradores (
  user_id uuid primary key references auth.users (id)
);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where user_id = auth.uid())
$$;

-- ---------- Pedidos ----------
create table if not exists public.pedidos (
  numero         bigint generated always as identity primary key,
  creado         timestamptz not null default now(),
  estado         text not null default 'por_revisar'
                 check (estado in ('por_revisar', 'pagado', 'enviado', 'rechazado')),
  lineas         jsonb not null,
  nombre         text not null,
  telefono       text not null,
  cedula         text not null,
  estado_ve      text not null,
  ciudad         text not null,
  empresa_envio  text not null,
  oficina        text not null,
  metodo_id      text not null,
  referencia     text not null,
  comprobante    text not null unique,
  total_usd      integer not null,
  total_ves      bigint not null,
  tasa           numeric(14, 4) not null,
  actualizado    timestamptz not null default now()
);

-- ---------- Permisos: el público solo ve productos activos y la tasa ----------
alter table public.productos enable row level security;
alter table public.ajustes enable row level security;
alter table public.administradores enable row level security;
alter table public.pedidos enable row level security;

revoke all on public.productos, public.ajustes, public.administradores, public.pedidos from anon, authenticated;
grant select on public.productos, public.ajustes to anon, authenticated;
grant select on public.pedidos to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'productos' and policyname = 'ver productos activos') then
    create policy "ver productos activos" on public.productos for select to anon, authenticated using (activo or public.es_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ajustes' and policyname = 'ver ajustes') then
    create policy "ver ajustes" on public.ajustes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pedidos' and policyname = 'admin ve pedidos') then
    create policy "admin ve pedidos" on public.pedidos for select to authenticated using (public.es_admin());
  end if;
end $$;

-- ---------- Comprobantes: carpeta privada, máximo 5 MB, solo fotos o PDF ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'clientes suben comprobantes') then
    create policy "clientes suben comprobantes" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = 'pedidos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admin ve comprobantes') then
    create policy "admin ve comprobantes" on storage.objects for select to authenticated
      using (bucket_id = 'comprobantes' and public.es_admin());
  end if;
end $$;

-- ---------- Crear un pedido: el total se calcula AQUÍ, con los precios de la tabla ----------
create or replace function public.crear_pedido(
  p_lineas jsonb, p_envio jsonb, p_metodo text, p_referencia text, p_comprobante text
) returns table (numero bigint, total_usd integer, total_ves bigint, tasa numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_ajustes public.ajustes;
  v_linea jsonb;
  v_producto public.productos;
  v_cantidad integer;
  v_lineas jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_campo text;
  v_numero bigint;
begin
  select * into v_ajustes from public.ajustes where id = 1;

  if jsonb_typeof(p_lineas) is distinct from 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception using errcode = 'P0001', message = 'El carrito está vacío.';
  end if;
  if jsonb_array_length(p_lineas) > 20 then
    raise exception using errcode = 'P0001', message = 'El pedido tiene demasiados productos.';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas) loop
    select * into v_producto from public.productos where id = v_linea ->> 'productoId' and activo;
    if not found then
      raise exception using errcode = 'P0001', message = 'Un producto del carrito ya no está disponible.';
    end if;
    if jsonb_typeof(v_linea -> 'cantidad') is distinct from 'number' or (v_linea ->> 'cantidad')::numeric % 1 <> 0
       or (v_linea ->> 'cantidad')::numeric not between 1 and v_ajustes.max_por_producto then
      raise exception using errcode = 'P0001', message = format('La cantidad debe estar entre 1 y %s.', v_ajustes.max_por_producto);
    end if;
    if v_lineas @> jsonb_build_array(jsonb_build_object('productoId', v_producto.id)) then
      raise exception using errcode = 'P0001', message = 'Un producto aparece dos veces en el carrito.';
    end if;
    v_cantidad := (v_linea ->> 'cantidad')::integer;
    v_total := v_total + v_producto.precio_usd * v_cantidad;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'productoId', v_producto.id, 'nombre', v_producto.nombre, 'cantidad', v_cantidad, 'precioUsd', v_producto.precio_usd));
  end loop;

  foreach v_campo in array array['nombre', 'telefono', 'cedula', 'estado', 'ciudad', 'empresaEnvio', 'oficina'] loop
    if coalesce(length(trim(p_envio ->> v_campo)), 0) not between 2 and 200 then
      raise exception using errcode = 'P0001', message = 'Faltan datos de envío.';
    end if;
  end loop;
  if not (p_metodo = any (v_ajustes.metodos_pago)) then
    raise exception using errcode = 'P0001', message = 'Esa forma de pago no está disponible.';
  end if;
  if coalesce(length(trim(p_referencia)), 0) not between 4 and 60 then
    raise exception using errcode = 'P0001', message = 'Escribe el número de referencia del pago.';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'comprobantes' and o.name = p_comprobante)
     or exists (select 1 from public.pedidos p where p.comprobante = p_comprobante) then
    raise exception using errcode = 'P0001', message = 'No recibimos la foto del comprobante. Adjúntala otra vez.';
  end if;

  insert into public.pedidos as p (lineas, nombre, telefono, cedula, estado_ve, ciudad, empresa_envio, oficina,
                                   metodo_id, referencia, comprobante, total_usd, total_ves, tasa)
  values (v_lineas, trim(p_envio ->> 'nombre'), trim(p_envio ->> 'telefono'), upper(trim(p_envio ->> 'cedula')),
          p_envio ->> 'estado', trim(p_envio ->> 'ciudad'), p_envio ->> 'empresaEnvio', trim(p_envio ->> 'oficina'),
          p_metodo, trim(p_referencia), p_comprobante, v_total, round(v_total * v_ajustes.tasa), v_ajustes.tasa)
  returning p.numero into v_numero;

  return query select v_numero, v_total, round(v_total * v_ajustes.tasa)::bigint, v_ajustes.tasa;
end $$;

-- ---------- Panel: cambiar el estado de un pedido (solo administradores) ----------
create or replace function public.cambiar_estado_pedido(p_numero bigint, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_actual text;
begin
  if not public.es_admin() then
    raise exception using errcode = 'P0001', message = 'Solo el dueño de la tienda puede hacer esto.';
  end if;
  select estado into v_actual from public.pedidos where numero = p_numero for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Ese pedido no existe.';
  end if;
  -- Pasos permitidos: revisar → pagado o rechazado; pagado → enviado; rechazado → volver a revisar.
  if not ((v_actual = 'por_revisar' and p_estado in ('pagado', 'rechazado'))
       or (v_actual = 'pagado' and p_estado = 'enviado')
       or (v_actual = 'rechazado' and p_estado = 'por_revisar')) then
    raise exception using errcode = 'P0001', message = 'Ese cambio no se puede hacer en este pedido.';
  end if;
  update public.pedidos set estado = p_estado, actualizado = now() where numero = p_numero;
end $$;

-- ---------- Panel: guardar la tasa del día (solo administradores) ----------
create or replace function public.guardar_tasa(p_tasa numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception using errcode = 'P0001', message = 'Solo el dueño de la tienda puede hacer esto.';
  end if;
  if p_tasa is null or p_tasa <= 0 or p_tasa > 1000000 then
    raise exception using errcode = 'P0001', message = 'Escribe una tasa válida.';
  end if;
  update public.ajustes set tasa = p_tasa, actualizado = now() where id = 1;
end $$;

revoke all on function public.crear_pedido(jsonb, jsonb, text, text, text) from public;
revoke all on function public.cambiar_estado_pedido(bigint, text) from public;
revoke all on function public.guardar_tasa(numeric) from public;
grant execute on function public.crear_pedido(jsonb, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.cambiar_estado_pedido(bigint, text) to authenticated;
grant execute on function public.guardar_tasa(numeric) to authenticated;
grant execute on function public.es_admin() to anon, authenticated;
