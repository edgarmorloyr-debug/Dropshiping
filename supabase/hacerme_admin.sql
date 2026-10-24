-- Te da acceso al panel de pedidos. Pégalo UNA vez, DESPUÉS de crear tu usuario
-- en Supabase → Authentication → Users (debe ser el único usuario que exista).
-- Si hay más de un usuario, no hace nada, para que nadie más quede como administrador por error.
insert into public.administradores (user_id)
select id from auth.users
where (select count(*) from auth.users) = 1
on conflict (user_id) do nothing;

select u.email as administrador from public.administradores a join auth.users u on u.id = a.user_id;
