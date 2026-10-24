// Lo mínimo de Supabase (cuentas, roles y almacenamiento) para probar los SQL de supabase/
// en un PostgreSQL de prueba dentro de Node (PGlite). Solo lo usan las pruebas.
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

export const SUPABASE_FALSO = `
create role anon; create role authenticated; create role service_role bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id serial primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to anon, authenticated;
grant usage on sequence storage.objects_id_seq to anon, authenticated;
`;

/** Lee un archivo de la carpeta supabase/. */
export const leer = (ruta: string) => readFileSync(new URL(`../../../supabase/${ruta}`, import.meta.url), 'utf8');

/** Ejecuta como un visitante sin cuenta ('anon') o como un usuario conectado (su id). */
export async function como<T>(db: PGlite, quien: string | 'anon', sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [quien === 'anon' ? '' : quien]);
  await db.exec(quien === 'anon' ? 'set role anon' : 'set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}
