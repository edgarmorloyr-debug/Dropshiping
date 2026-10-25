-- Pega esto en Supabase → SQL Editor y toca Run.
-- Debe salir una fila por cada cambio cargado, todas con «OK».
select '001 · tienda' as cambio,
       case when to_regclass('public.pedidos') is not null
             and to_regprocedure('public.crear_pedido(jsonb, jsonb, text, text, text)') is not null
             and exists (select 1 from storage.buckets where id = 'comprobantes')
            then 'OK' else 'FALTA' end as estado
union all
select '002 · datos de la tienda',
       case when to_regprocedure('public.guardar_datos_tienda(text, text, jsonb)') is not null then 'OK' else 'FALTA' end
union all
select 'formas de pago activas',
       case when (select cardinality(metodos_pago) from public.ajustes where id = 1) > 0
            then 'OK' else 'FALTA (llena tus datos de cobro en el panel)' end
union all
select 'administrador', case when exists (select 1 from public.administradores) then 'OK' else 'FALTA (pega hacerme_admin.sql)' end;
