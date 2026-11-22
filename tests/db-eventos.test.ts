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
