import { describe, it, expect, beforeEach } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { novoBanco, como } from './helpers/pg';

let db: PGlite;
beforeEach(async () => {
  db = await novoBanco();
});

type Linha = { resultado: string; status_final: string };
const aplicar = async (id: string, email: string, status: string, quando: string) =>
  (await db.query<Linha>(`select * from aplicar_evento_eduzz($1, $2, $3, $4::timestamptz, '{}'::jsonb)`, [id, email, status, quando])).rows[0];

describe('aplicar_evento_eduzz', () => {
  it('pago libera o aluno', async () => {
    expect(await aplicar('e1', 'a@x.com', 'ativo', '2026-11-21T10:00:00Z')).toEqual({ resultado: 'aplicado', status_final: 'ativo' });
  });

  it('o mesmo evento duas vezes é duplicado e não muda nada', async () => {
    await aplicar('e1', 'a@x.com', 'ativo', '2026-11-21T10:00:00Z');
    expect(await aplicar('e1', 'a@x.com', 'bloqueado', '2026-11-21T11:00:00Z')).toEqual({ resultado: 'duplicado', status_final: 'ativo' });
  });

  it('reembolso mais novo bloqueia', async () => {
    await aplicar('e1', 'a@x.com', 'ativo', '2026-11-21T10:00:00Z');
    expect(await aplicar('e2', 'a@x.com', 'bloqueado', '2026-11-21T11:00:00Z')).toEqual({ resultado: 'aplicado', status_final: 'bloqueado' });
  });

  it('"pago" antigo chegando depois do reembolso não reativa', async () => {
    await aplicar('e2', 'a@x.com', 'bloqueado', '2026-11-21T11:00:00Z');
    expect(await aplicar('e1', 'a@x.com', 'ativo', '2026-11-21T10:00:00Z')).toEqual({ resultado: 'antigo', status_final: 'bloqueado' });
  });

  it('normaliza o e-mail (espaços e maiúsculas)', async () => {
    await aplicar('e1', ' Maria@Gmail.com ', 'ativo', '2026-11-21T10:00:00Z');
    const r = await db.query<{ email: string }>(`select email from alunos`);
    expect(r.rows).toEqual([{ email: 'maria@gmail.com' }]);
  });

  it('aluno autenticado não pode chamar a função', async () => {
    await expect(
      como(db, 'a@x.com', `select * from aplicar_evento_eduzz('e9', 'a@x.com', 'ativo', now(), '{}'::jsonb)`),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe('encerrar_sessoes', () => {
  it('apaga só as sessões do e-mail informado (sem diferenciar maiúsculas)', async () => {
    await db.exec(`
      insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'Maria@Gmail.com'), ('00000000-0000-0000-0000-00000000000b', 'joao@x.com');
      insert into auth.sessions (user_id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
    `);
    await db.query(`select encerrar_sessoes(' maria@gmail.com ')`);
    const r = await db.query<{ user_id: string }>(`select user_id from auth.sessions`);
    expect(r.rows).toEqual([{ user_id: '00000000-0000-0000-0000-00000000000b' }]);
  });

  it('aluno autenticado não pode chamar', async () => {
    await expect(como(db, 'a@x.com', `select encerrar_sessoes('b@x.com')`)).rejects.toThrow(/permission denied/i);
  });
});

describe('meu_acesso (o app confere o acesso no servidor)', () => {
  it('ativo, bloqueado e desconhecido', async () => {
    await db.exec(`select liberar_aluno('a@x.com'); select bloquear_aluno('b@x.com');`);
    expect((await como<{ s: string }>(db, 'a@x.com', `select meu_acesso() as s`))[0].s).toBe('ativo');
    expect((await como<{ s: string }>(db, 'B@x.com', `select meu_acesso() as s`))[0].s).toBe('bloqueado');
    expect((await como<{ s: string }>(db, 'c@x.com', `select meu_acesso() as s`))[0].s).toBe('inexistente');
  });
});

describe('bloqueio no login', () => {
  const id = '00000000-0000-0000-0000-00000000000a';
  it('encerrar_sessoes também impede novo login, e reativar_login devolve', async () => {
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'Maria@Gmail.com')`);
    await db.query(`select encerrar_sessoes('maria@gmail.com')`);
    expect((await db.query<{ b: boolean }>(`select banned_until > now() as b from auth.users`)).rows[0].b).toBe(true);
    await db.query(`select reativar_login(' MARIA@gmail.com ')`);
    expect((await db.query<{ b: unknown }>(`select banned_until as b from auth.users`)).rows[0].b).toBeNull();
  });
  it('aluno não chama reativar_login', async () => {
    await expect(como(db, 'a@x.com', `select reativar_login('a@x.com')`)).rejects.toThrow(/permission denied/i);
  });
});

describe('payload bruto', () => {
  it('registrar_evento_bruto guarda o que chegou; aluno não chama', async () => {
    await db.query(`select registrar_evento_bruto('{"x":1}'::jsonb)`);
    expect((await db.query<{ payload: unknown }>(`select payload from eventos_brutos`)).rows).toEqual([{ payload: { x: 1 } }]);
    await expect(como(db, 'a@x.com', `select registrar_evento_bruto('{}'::jsonb)`)).rejects.toThrow(/permission denied/i);
  });
});

describe('concorrência em aplicar_evento_eduzz', () => {
  // PGlite tem uma única conexão: não dá para provocar a corrida de verdade. Este teste só garante que as duas
  // proteções (trava por e-mail e escrita condicionada ao horário) continuam na função; a corrida real fica para o Supabase (T10).
  it('serializa por e-mail e só grava se não houver evento mais novo', async () => {
    const { rows } = await db.query<{ def: string }>(`select pg_get_functiondef('aplicar_evento_eduzz(text,text,text,timestamptz,jsonb)'::regprocedure) as def`);
    expect(rows[0].def).toMatch(/pg_advisory_xact_lock\(hashtext\(v_email\)\)/);
    expect(rows[0].def).toMatch(/where public\.alunos\.eduzz_ultimo_evento_em is null or public\.alunos\.eduzz_ultimo_evento_em <= excluded\.eduzz_ultimo_evento_em/);
  });
});
