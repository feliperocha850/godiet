// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { webcrypto, randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { novoBanco, como } from './helpers/pg';
import { BONUS, decifrar, carregarBonus } from '../src/lib/bonus';
import { renderAulas } from '../src/views/aulas';
import { criarCtx } from './helpers/ctx';

const CHAVE = randomBytes(32).toString('hex');
async function cifrar(texto: string, chaveHex: string): Promise<ArrayBuffer> {
  const k = await webcrypto.subtle.importKey('raw', Buffer.from(chaveHex, 'hex'), 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(12);
  const c = Buffer.from(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, Buffer.from(texto)));
  const out = Buffer.concat([iv, c]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

describe('PDFs bônus cifrados', () => {
  it('decifra com a chave certa', async () => {
    const out = await decifrar(await cifrar('%PDF-1.7 conteudo', CHAVE), CHAVE);
    expect(Buffer.from(out).toString()).toBe('%PDF-1.7 conteudo');
  });
  it('recusa com a chave errada', async () => {
    await expect(decifrar(await cifrar('segredo', CHAVE), randomBytes(32).toString('hex'))).rejects.toThrow();
  });
  it('recusa chave mal formada e arquivo curto demais', async () => {
    await expect(decifrar(await cifrar('x', CHAVE), 'abc')).rejects.toThrow();
    await expect(decifrar(new ArrayBuffer(5), CHAVE)).rejects.toThrow();
  });
  it('carregarBonus baixa o arquivo cifrado e devolve um PDF', async () => {
    const cifrado = await cifrar('%PDF-1.7 ok', CHAVE);
    let url = '';
    const blob = await carregarBonus(BONUS[0], { chave: async () => CHAVE, baixar: async (u) => { url = u; return cifrado; } });
    expect(url).toMatch(/bonus\/manual\.bin$/);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe('%PDF-1.7 ok'.length);
  });
  it('sem chave (sem acesso) nada é baixado', async () => {
    let baixou = false;
    await expect(carregarBonus(BONUS[0], { chave: async () => { throw new Error('sem acesso'); }, baixar: async () => { baixou = true; return new ArrayBuffer(0); } })).rejects.toThrow();
    expect(baixou).toBe(false);
  });
  it('catálogo: ids únicos e um arquivo por bônus', () => {
    expect(new Set(BONUS.map((b) => b.id)).size).toBe(BONUS.length);
    expect(new Set(BONUS.map((b) => b.arquivo)).size).toBe(BONUS.length);
  });
});

describe('chave dos bônus no banco', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = await novoBanco();
    await db.exec(`select liberar_aluno('a@x.com'); select liberar_aluno('c@x.com'); select bloquear_aluno('c@x.com');
      insert into bonus_chave (id, chave) values (1, 'chave-de-teste');`);
  });
  it('aluno ativo lê a chave', async () => {
    expect(await como(db, 'a@x.com', `select chave from bonus_chave`)).toEqual([{ chave: 'chave-de-teste' }]);
  });
  it('aluno bloqueado (reembolso) não lê a chave', async () => {
    expect(await como(db, 'c@x.com', `select chave from bonus_chave`)).toEqual([]);
  });
  it('quem não é aluno não lê a chave', async () => {
    expect(await como(db, 'estranho@x.com', `select chave from bonus_chave`)).toEqual([]);
  });
  it('aluno não consegue alterar a chave', async () => {
    await expect(como(db, 'a@x.com', `update bonus_chave set chave='x'`)).rejects.toThrow();
  });
});

describe('Aulas e bônus', () => {
  it('lista os bônus e abre o escolhido', async () => {
    const { ctx } = criarCtx();
    const e = document.createElement('div');
    const abertos: string[] = [];
    renderAulas(e, ctx, async (b) => { abertos.push(b.id); });
    expect(e.querySelectorAll('[data-bonus]').length).toBe(BONUS.length);
    expect(e.textContent).toContain('Suplementos secretos que funcionam');
    (e.querySelector('[data-bonus=suplementos]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(abertos).toEqual(['suplementos']);
  });
  it('mostra aviso se o bônus não abrir', async () => {
    const { ctx } = criarCtx();
    const e = document.createElement('div');
    renderAulas(e, ctx, async () => { throw new Error('x'); });
    (e.querySelector('[data-bonus=manual]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(e.querySelector('[role=alert]')?.textContent).toMatch(/não foi possível/i);
  });
});

import versiculos from '../src/data/versiculos.json';
import { htmlMensagem } from '../src/views/util';
import { renderPrivacidade } from '../src/views/privacidade';

describe('Versículos: Bíblia Livre com crédito', () => {
  const lista = (versiculos as Array<{ tipo: string; referencia?: string; texto?: string }>).filter((m) => m.tipo === 'versiculo');
  it('todo versículo tem texto e referência', () => {
    expect(lista.length).toBeGreaterThanOrEqual(30);
    for (const m of lista) { expect((m.texto ?? '').length).toBeGreaterThan(30); expect(m.referencia).toBeTruthy(); }
  });
  it('nenhum texto traz sobras da página de origem', () => {
    for (const m of lista) expect(m.texto).not.toMatch(/©|<|>|Diego Santos|\d{1,3}\s*$/);
  });
  it('o crédito exibido é da Bíblia Livre, nunca da NAA', () => {
    const html = htmlMensagem({ id: 'x', tipo: 'versiculo', texto: lista[0].texto!, referencia: lista[0].referencia, verificado: false } as never);
    expect(html).toContain('Bíblia Livre');
    expect(html).toContain('CC BY 4.0');
    expect(html).not.toMatch(/NAA|Sociedade Bíblica/);
  });
  it('a página de privacidade traz a licença da Bíblia Livre', () => {
    const e = document.createElement('div'); renderPrivacidade(e);
    expect(e.textContent).toContain('Bíblia Livre');
    expect(e.textContent).toContain('Creative Commons');
  });
});
