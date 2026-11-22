import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

// Emula o que o Supabase fornece: papéis, auth.jwt() e privilégios padrão.
const PREAMBULO = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function novoBanco(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PREAMBULO);
  for (const f of readdirSync('supabase/migrations').sort()) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
  }
  return db;
}

export async function como<T>(db: PGlite, email: string, sql: string): Promise<T[]> {
  await db.exec(`select set_config('request.jwt.claims', '{"email":"${email}"}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec(`reset role;`);
  }
}
