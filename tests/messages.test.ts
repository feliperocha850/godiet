import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickMessage, reflexaoDoDia } from '../src/domain/messages';
import type { Mensagem } from '../src/domain/types';

const ler = (f: string): Mensagem[] => JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));
const versiculos = ler('versiculos');
const incentivos = ler('incentivos');

describe('pickMessage', () => {
  const banco: Mensagem[] = [
    { id: 'a', texto: 'A', tipo: 'incentivo', verificado: false },
    { id: 'b', texto: 'B', tipo: 'incentivo', verificado: false },
    { id: 'c', texto: 'C', tipo: 'incentivo', verificado: false },
  ];
  it('nunca repete o último em 1.000 sorteios', () => {
    let ultimo: string | null = null;
    for (let i = 0; i < 1000; i++) {
      const m = pickMessage(banco, ultimo, Math.random);
      expect(m.id).not.toBe(ultimo);
      ultimo = m.id;
    }
  });
  it('banco de 1 item devolve esse item', () => {
    expect(pickMessage([banco[0]], 'a', Math.random).id).toBe('a');
  });
  it('rng no limite (0 e quase 1) não sai do banco', () => {
    expect(banco.map((m) => m.id)).toContain(pickMessage(banco, null, () => 0).id);
    expect(banco.map((m) => m.id)).toContain(pickMessage(banco, null, () => 0.999999).id);
  });
  it('banco vazio → erro claro', () => {
    expect(() => pickMessage([], null, Math.random)).toThrow(/vazio/i);
  });
});

describe('bancos de mensagens', () => {
  it('versículos/orações: ao menos 30 versículos com referência e 10 orações', () => {
    const v = versiculos.filter((m) => m.tipo === 'versiculo');
    expect(v.length).toBeGreaterThanOrEqual(30);
    for (const m of v) expect(m.referencia).toBeTruthy();
    expect(versiculos.filter((m) => m.tipo === 'oracao').length).toBeGreaterThanOrEqual(10);
  });
  it('inclui os dois versículos que já estão nos PDFs do curso', () => {
    const refs = versiculos.map((m) => m.referencia);
    expect(refs).toContain('1 Coríntios 10:31');
    expect(refs).toContain('Romanos 12:1');
  });
  it('incentivos: ao menos 20 de incentivo e 5 de gratidão', () => {
    expect(incentivos.filter((m) => m.tipo === 'incentivo').length).toBeGreaterThanOrEqual(20);
    expect(incentivos.filter((m) => m.tipo === 'gratidao').length).toBeGreaterThanOrEqual(5);
  });
  it('todo item tem id único, texto ou tema, e marca de verificação', () => {
    const todos = [...versiculos, ...incentivos];
    expect(new Set(todos.map((m) => m.id)).size).toBe(todos.length);
    for (const m of todos) {
      expect(m.texto || m.tema).toBeTruthy();
      expect(typeof m.verificado).toBe('boolean');
    }
  });
  it('tom acolhedor: sem culpa, cobrança nem promessa de resultado', () => {
    const proibidas = /fracasso|culpa|falhou|nunca desista|emagrec|resultado|quilos|\bkg\b/i;
    for (const m of incentivos) expect(m.texto ?? '').not.toMatch(proibidas);
  });
});

describe('reflexões bíblicas do check-in', () => {
  const banco = ler('reflexoes');
  it('banco válido: ids únicos, referência e frase própria, nada marcado como verificado antes da revisão', () => {
    expect(banco.length).toBeGreaterThanOrEqual(12);
    expect(new Set(banco.map((m) => m.id)).size).toBe(banco.length);
    for (const m of banco) {
      expect(m.tipo).toBe('reflexao');
      expect(m.referencia).toMatch(/\d/);
      expect((m.texto ?? '').length).toBeGreaterThan(30);
      expect(m.verificado).toBe(false);
    }
  });
  it('a reflexão do dia é a mesma durante o dia e muda de um dia para o outro', () => {
    expect(reflexaoDoDia(banco, '2026-11-21').id).toBe(reflexaoDoDia(banco, '2026-11-21').id);
    const ids = new Set(Array.from({ length: 10 }, (_, i) => reflexaoDoDia(banco, `2026-11-${10 + i}`).id));
    expect(ids.size).toBeGreaterThan(5);
  });
});
