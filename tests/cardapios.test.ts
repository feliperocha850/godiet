import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import type { Cardapio } from '../src/domain/types';

const FAIXAS = Array.from({ length: 12 }, (_, i) => 1100 + i * 100);

function carregar(kcal: number): Cardapio {
  return JSON.parse(readFileSync(`src/data/cardapios/${kcal}.json`, 'utf8'));
}

describe('cardápios', () => {
  it.each(FAIXAS)('%i kcal: arquivo existe e a faixa confere', (kcal) => {
    expect(existsSync(`src/data/cardapios/${kcal}.json`)).toBe(true);
    expect(carregar(kcal).kcal).toBe(kcal);
  });

  it.each(FAIXAS)('%i kcal: 4 refeições até 1300 e 5 de 1400 em diante', (kcal) => {
    expect(carregar(kcal).refeicoes.length).toBe(kcal <= 1300 ? 4 : 5);
  });

  it.each(FAIXAS)('%i kcal: horários HH:MM e itens padrão preenchidos', (kcal) => {
    for (const r of carregar(kcal).refeicoes) {
      expect(r.horario).toMatch(/^\d{2}:\d{2}$/);
      expect(r.padrao.length).toBeGreaterThan(0);
      for (const i of r.padrao) expect(i.nome.trim()).not.toBe('');
      const nomes = r.padrao.map((i) => i.nome);
      expect(new Set(nomes).size).toBe(nomes.length);
    }
  });

  it('1100 kcal: horários 07:00, 12:00, 16:00, 20:00', () => {
    expect(carregar(1100).refeicoes.map((r) => r.horario)).toEqual(['07:00', '12:00', '16:00', '20:00']);
  });
});
