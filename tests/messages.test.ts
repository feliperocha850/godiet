import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pickMessage } from '../src/domain/messages';
import type { Mensagem } from '../src/domain/types';

const ler = (f: string): Mensagem[] => JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));
const versiculos = ler('versiculos');
const incentivos = ler('incentivos');

describe('pickMessage', () => {
  const banco: Mensagem[] = [
    { id: 'a', texto: 'A', tipo: 'incentivo' },
    { id: 'b', texto: 'B', tipo: 'incentivo' },
    { id: 'c', texto: 'C', tipo: 'incentivo' },
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
