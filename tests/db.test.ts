import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Emula o que o Supabase fornece: papéis, auth.jwt() e privilégios padrão.
const PREAMBULO = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(PREAMBULO);
  await db.exec(readFileSync('supabase/migrations/001_init.sql', 'utf8'));
  await db.exec(`select liberar_aluno('a@x.com'); select liberar_aluno('b@x.com'); select liberar_aluno('c@x.com'); select bloquear_aluno('c@x.com');`);
});

async function como<T>(email: string, sql: string): Promise<T[]> {
  await db.exec(`select set_config('request.jwt.claims', '{"email":"${email}"}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec(`reset role;`);
  }
}

const checkin = (email: string, dia = '2026-11-21') =>
  `insert into checkins (email, dia, agua, deus) values ('${email}', '${dia}', true, true)`;

describe('banco e regras de acesso', () => {
  it('aluno ativo grava e lê o próprio check-in', async () => {
    await como('a@x.com', checkin('a@x.com'));
    const rows = await como<{ agua: boolean }>('a@x.com', `select agua from checkins`);
    expect(rows).toEqual([{ agua: true }]);
  });

  it('aluno não lê check-in de outro aluno', async () => {
    await como('a@x.com', checkin('a@x.com'));
    expect(await como('b@x.com', `select * from checkins`)).toEqual([]);
  });

  it('aluno não grava check-in em nome de outro', async () => {
    await expect(como('a@x.com', checkin('b@x.com'))).rejects.toThrow(/row-level security/i);
  });

  it('aluno bloqueado não lê nem grava', async () => {
    await expect(como('c@x.com', checkin('c@x.com'))).rejects.toThrow(/row-level security/i);
    await db.exec(`insert into checkins (email, dia) values ('c@x.com', '2026-11-20')`);
    expect(await como('c@x.com', `select * from checkins`)).toEqual([]);
  });

  it('reembolso com o app aberto: mesmo token perde acesso na chamada seguinte', async () => {
    await como('a@x.com', checkin('a@x.com'));
    await db.exec(`select bloquear_aluno('a@x.com')`);
    expect(await como('a@x.com', `select * from checkins`)).toEqual([]);
  });

  it('e-mail desconhecido não lê nem grava', async () => {
    await expect(como('z@x.com', checkin('z@x.com'))).rejects.toThrow();
  });

  it('liberar_aluno normaliza o e-mail (espaços e maiúsculas)', async () => {
    await db.exec(`select liberar_aluno('  Maria@Gmail.com ')`);
    const r = await db.query<{ email: string; status: string }>(`select email, status from alunos where email like 'maria%'`);
    expect(r.rows).toEqual([{ email: 'maria@gmail.com', status: 'ativo' }]);
  });

  it('JWT com e-mail em maiúsculas ainda acessa os próprios dados', async () => {
    await como('A@X.COM', checkin('a@x.com'));
    expect(await como('a@x.com', `select count(*)::int as n from checkins`)).toEqual([{ n: 1 }]);
  });

  it('aluno não enxerga as tabelas alunos e eventos_eduzz', async () => {
    await expect(como('a@x.com', `select * from alunos`)).rejects.toThrow(/permission denied/i);
    await expect(como('a@x.com', `select * from eventos_eduzz`)).rejects.toThrow(/permission denied/i);
  });

  it('aluno autenticado não pode chamar liberar_aluno', async () => {
    await expect(como('a@x.com', `select liberar_aluno('z@x.com')`)).rejects.toThrow(/permission denied/i);
  });

  it('preferências só aceitam as 12 faixas de calorias', async () => {
    await expect(como('a@x.com', `insert into preferencias (email, kcal) values ('a@x.com', 1150)`)).rejects.toThrow();
    await como('a@x.com', `insert into preferencias (email, kcal) values ('a@x.com', 1500)`);
  });
});
