-- ============================================================================
-- 003 · Productos digitales: ficha completa, oferta con fin real, garantía,
-- pedidos sin dirección de envío y código secreto para «Mi pedido».
-- Se puede ejecutar dos veces sin romper nada. No borra datos: los productos
-- de hogar de ejemplo solo se ocultan.
-- ============================================================================

-- ---------- Ficha del producto digital ----------
alter table public.productos add column if not exists titular       text    not null default '';
alter table public.productos add column if not exists etiqueta      text    not null default 'Guía';
alter table public.productos add column if not exists incluye       text[]  not null default '{}';
alter table public.productos add column if not exists contenido     jsonb   not null default '[]'::jsonb;
alter table public.productos add column if not exists oferta_usd    integer check (oferta_usd > 0);
alter table public.productos add column if not exists oferta_fin    timestamptz;
alter table public.productos add column if not exists garantia_dias integer not null default 7 check (garantia_dias between 0 and 60);
alter table public.productos add column if not exists colores       text[]  not null default array['#4c1d95', '#be185d'];

-- Los productos de hogar de la primera versión se ocultan (no se borran).
update public.productos set activo = false
 where id in ('organizador-especias', 'picador-verduras', 'lampara-sensor', 'bolsas-vacio');

-- Productos digitales de ejemplo (los mismos de la demostración). El dueño los cambiará por los suyos.
insert into public.productos (id, nombre, titular, frase, etiqueta, beneficios, incluye, contenido,
                              precio_usd, oferta_usd, oferta_fin, garantia_dias, colores, destacado, orden) values
  ('guia-instagram', 'Vende por Instagram desde cero',
   'Consigue tus primeros clientes por Instagram en 14 días',
   'El paso a paso, con plantillas listas para Canva, para que tu negocio venda aunque empieces con 0 seguidores.',
   'Guía práctica',
   array['Un perfil que da confianza desde el primer vistazo', '30 ideas de publicaciones que venden, listas para copiar',
         'Cómo responder mensajes para cerrar la venta', '10 plantillas editables en Canva'],
   array['45 páginas', '10 plantillas'],
   '[{"titulo": "Tu perfil que vende", "detalle": "8 págs."}, {"titulo": "Qué publicar cada semana", "detalle": "12 págs."},
     {"titulo": "De mensaje a venta", "detalle": "10 págs."}, {"titulo": "Plantillas para Canva", "detalle": "10 diseños"}]'::jsonb,
   1200, 900, now() + interval '3 days', 7, array['#4c1d95', '#be185d'], true, 10),
  ('plantillas-menu', 'Plantillas de menú para tu negocio',
   'Un menú bonito en 10 minutos, sin saber diseñar',
   'Plantillas editables en Canva para restaurantes, panaderías y emprendimientos de comida.',
   'Plantillas',
   array['Menús listos para imprimir o compartir por WhatsApp', 'Cambias precios y fotos en minutos', 'Diseños que se ven profesionales'],
   array['20 plantillas', 'Canva'],
   '[{"titulo": "Menús de una página", "detalle": "8 diseños"}, {"titulo": "Menús para redes", "detalle": "8 diseños"},
     {"titulo": "Listas de precios", "detalle": "4 diseños"}]'::jsonb,
   800, null, null, 7, array['#064e3b', '#f59e0b'], false, 20),
  ('finanzas-bolivares', 'Finanzas en dólares y bolívares',
   'Organiza tu dinero aunque cobres en dos monedas',
   'Un método sencillo, con hoja de cálculo incluida, para saber cuánto gastas, ahorras y te queda.',
   'Guía + hoja de cálculo',
   array['Saber a dónde se va tu dinero cada mes', 'Ahorrar en dólares aunque cobres en bolívares', 'Una hoja de cálculo que hace las cuentas por ti'],
   array['32 páginas', '1 hoja de cálculo'],
   '[{"titulo": "Tu foto financiera", "detalle": "8 págs."}, {"titulo": "Gastar en dos monedas", "detalle": "12 págs."},
     {"titulo": "Tu plan de ahorro", "detalle": "12 págs."}]'::jsonb,
   1000, null, null, 7, array['#1e3a8a', '#0ea5e9'], false, 30)
on conflict (id) do nothing;

-- Un producto digital se compra una vez por pedido.
update public.ajustes set max_por_producto = 1 where id = 1;

-- ---------- Pedidos digitales: sin dirección, con correo y código secreto ----------
alter table public.pedidos alter column cedula        drop not null;
alter table public.pedidos alter column estado_ve     drop not null;
alter table public.pedidos alter column ciudad        drop not null;
alter table public.pedidos alter column empresa_envio drop not null;
alter table public.pedidos alter column oficina       drop not null;
alter table public.pedidos add column if not exists correo text;
-- Código secreto del enlace «Mi pedido». Nadie puede adivinarlo.
alter table public.pedidos add column if not exists token uuid not null default gen_random_uuid();
create unique index if not exists pedidos_token_unico on public.pedidos (token);

-- ---------- Crear un pedido digital: el total se calcula AQUÍ, con la oferta solo si sigue vigente ----------
create or replace function public.crear_pedido_digital(
  p_lineas jsonb, p_cliente jsonb, p_metodo text, p_referencia text, p_comprobante text
) returns table (numero bigint, total_usd integer, total_ves bigint, tasa numeric, token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_ajustes public.ajustes;
  v_linea jsonb;
  v_producto public.productos;
  v_precio integer;
  v_lineas jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_correo text := nullif(trim(coalesce(p_cliente ->> 'correo', '')), '');
  v_numero bigint;
  v_token uuid;
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
    if jsonb_typeof(v_linea -> 'cantidad') is distinct from 'number' or (v_linea ->> 'cantidad')::numeric <> 1 then
      raise exception using errcode = 'P0001', message = 'Cada producto digital se compra una sola vez por pedido.';
    end if;
    if v_lineas @> jsonb_build_array(jsonb_build_object('productoId', v_producto.id)) then
      raise exception using errcode = 'P0001', message = 'Un producto aparece dos veces en el carrito.';
    end if;
    -- La oferta vale solo si es más barata y su fin todavía no llegó, según la hora del servidor.
    v_precio := case
      when v_producto.oferta_usd is not null and v_producto.oferta_fin > now() and v_producto.oferta_usd < v_producto.precio_usd
        then v_producto.oferta_usd
      else v_producto.precio_usd
    end;
    v_total := v_total + v_precio;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'productoId', v_producto.id, 'nombre', v_producto.nombre, 'cantidad', 1, 'precioUsd', v_precio));
  end loop;

  if coalesce(length(trim(p_cliente ->> 'nombre')), 0) not between 2 and 120
     or coalesce(length(trim(p_cliente ->> 'telefono')), 0) not between 7 and 30 then
    raise exception using errcode = 'P0001', message = 'Escribe tu nombre y tu WhatsApp.';
  end if;
  if v_correo is not null and (length(v_correo) > 200 or v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception using errcode = 'P0001', message = 'Revisa tu correo.';
  end if;
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

  insert into public.pedidos as p (lineas, nombre, telefono, correo, metodo_id, referencia, comprobante, total_usd, total_ves, tasa)
  values (v_lineas, trim(p_cliente ->> 'nombre'), trim(p_cliente ->> 'telefono'), v_correo,
          p_metodo, trim(p_referencia), p_comprobante, v_total, round(v_total * v_ajustes.tasa), v_ajustes.tasa)
  returning p.numero, p.token into v_numero, v_token;

  return query select v_numero, v_total, round(v_total * v_ajustes.tasa)::bigint, v_ajustes.tasa, v_token;
end $$;

revoke all on function public.crear_pedido_digital(jsonb, jsonb, text, text, text) from public;
grant execute on function public.crear_pedido_digital(jsonb, jsonb, text, text, text) to anon, authenticated;

-- La función vieja (pedidos con dirección de envío) ya no se usa desde la tienda.
revoke execute on function public.crear_pedido(jsonb, jsonb, text, text, text) from anon, authenticated;
