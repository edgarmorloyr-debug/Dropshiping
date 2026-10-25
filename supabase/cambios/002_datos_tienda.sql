-- ============================================================================
-- 002 · Datos de la tienda: nombre, WhatsApp y datos de cobro, editables desde el panel.
-- Así los datos personales del dueño no quedan en GitHub.
-- Se puede ejecutar dos veces sin romper nada. No borra datos.
-- ============================================================================

alter table public.ajustes add column if not exists nombre_tienda text not null default 'Mi tienda';
alter table public.ajustes add column if not exists whatsapp text not null default '';
-- Forma: {"pago_movil": {"Banco": "…", "Teléfono": "…", "Cédula": "…"}, "zelle": {…}, …}
alter table public.ajustes add column if not exists cobro jsonb not null default '{}'::jsonb;

-- Mientras el dueño no haya puesto sus datos de cobro, ninguna forma de pago está activa:
-- así nadie paga a datos de ejemplo.
update public.ajustes set metodos_pago = '{}' where id = 1 and cobro = '{}'::jsonb;

-- ---------- Panel: guardar los datos de la tienda (solo administradores) ----------
create or replace function public.guardar_datos_tienda(p_nombre text, p_whatsapp text, p_cobro jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  -- Las mismas formas de pago que conoce la tienda (METODOS_PAGO en src/config.ts).
  v_conocidos text[] := array['pago_movil', 'zelle', 'binance', 'transferencia', 'paypal'];
  v_metodo text;
  v_datos jsonb;
  v_campo record;
  v_activos text[] := '{}';
  v_completo boolean;
begin
  if not public.es_admin() then
    raise exception using errcode = 'P0001', message = 'Solo el dueño de la tienda puede hacer esto.';
  end if;
  if coalesce(length(trim(p_nombre)), 0) not between 2 and 60 then
    raise exception using errcode = 'P0001', message = 'El nombre de la tienda debe tener entre 2 y 60 letras.';
  end if;
  if p_whatsapp is null or p_whatsapp !~ '^[0-9]{10,15}$' then
    raise exception using errcode = 'P0001', message = 'Escribe el WhatsApp con código de país, por ejemplo 584141234567.';
  end if;
  if jsonb_typeof(p_cobro) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'Faltan los datos de cobro.';
  end if;

  for v_metodo, v_datos in select * from jsonb_each(p_cobro) loop
    if not (v_metodo = any (v_conocidos)) or jsonb_typeof(v_datos) is distinct from 'object' then
      raise exception using errcode = 'P0001', message = 'Hay una forma de pago desconocida.';
    end if;
    v_completo := v_datos <> '{}'::jsonb;
    for v_campo in select * from jsonb_each(v_datos) loop
      if jsonb_typeof(v_campo.value) is distinct from 'string' or length(v_campo.value #>> '{}') > 120 then
        raise exception using errcode = 'P0001', message = 'Un dato de cobro es demasiado largo.';
      end if;
      if length(trim(v_campo.value #>> '{}')) = 0 then
        v_completo := false;
      end if;
    end loop;
    if v_completo then
      v_activos := v_activos || v_metodo;
    end if;
  end loop;

  -- Una forma de pago solo queda activa si todos sus datos están llenos (en el orden de la tienda).
  update public.ajustes
     set nombre_tienda = trim(p_nombre),
         whatsapp = p_whatsapp,
         cobro = p_cobro,
         metodos_pago = array(select m from unnest(v_conocidos) m where m = any (v_activos)),
         actualizado = now()
   where id = 1;
end $$;

revoke all on function public.guardar_datos_tienda(text, text, jsonb) from public;
grant execute on function public.guardar_datos_tienda(text, text, jsonb) to authenticated;
