import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Cardapio } from '../src/domain/types';
import { buildShoppingList } from '../src/domain/shopping';

const carregar = (k: number): Cardapio => JSON.parse(readFileSync(`src/data/cardapios/${k}.json`, 'utf8'));
const vazio = { trocas: {}, hortalicas: [] as string[] };
const todos = (l: ReturnType<typeof buildShoppingList>) => l.flatMap((g) => g.itens);
const grupo = (l: ReturnType<typeof buildShoppingList>, g: string) => l.find((x) => x.grupo === g)?.itens ?? [];

describe('buildShoppingList', () => {
  it('cita cada alimento uma única vez, mesmo em várias refeições', () => {
    const itens = todos(buildShoppingList(carregar(1100), vazio));
    for (const nome of ['Frango, peito', 'Arroz branco', 'Banana']) {
      expect(itens.filter((i) => i === nome)).toHaveLength(1);
    }
  });

  it('não traz quantidades (sem dígitos nem gramas)', () => {
    for (const k of [1100, 1400, 2200]) {
      for (const i of todos(buildShoppingList(carregar(k), vazio))) {
        expect(i).not.toMatch(/\d/);
      }
    }
  });

  it('a troca escolhida entra e o item original sai', () => {
    const itens = todos(buildShoppingList(carregar(1100), { trocas: { 'Frango, peito': 'Peixe' }, hortalicas: [] }));
    expect(itens).toContain('Peixe');
    expect(itens).not.toContain('Frango, peito');
  });

  it('combinação "A + B" vira dois itens e não repete o que já existe', () => {
    const itens = todos(
      buildShoppingList(carregar(1400), { trocas: { 'Ovo de galinha': 'Ovo de galinha + Queijo muçarela' }, hortalicas: [] }),
    );
    expect(itens.filter((i) => i === 'Ovo de galinha')).toHaveLength(1);
    expect(itens).toContain('Queijo muçarela');
    expect(itens.some((i) => i.includes('+'))).toBe(false);
  });

  it('hortaliças marcadas entram no grupo vegetal', () => {
    const l = buildShoppingList(carregar(1100), { trocas: {}, hortalicas: ['Couve-flor', 'Abobrinha'] });
    expect(grupo(l, 'vegetal')).toEqual(expect.arrayContaining(['Couve-flor', 'Abobrinha']));
  });

  it('grupos vêm em ordem fixa e sem grupos vazios', () => {
    const l = buildShoppingList(carregar(2200), { trocas: {}, hortalicas: ['Couve-flor'] });
    const ordem = ['carboidrato', 'proteina', 'gordura', 'fruta', 'vegetal', 'outro'];
    const idx = l.map((g) => ordem.indexOf(g.grupo));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(l.every((g) => g.itens.length > 0)).toBe(true);
  });

  it('nomes iguais com caixa ou acento diferentes viram um só', () => {
    const c: Cardapio = {
      kcal: 1,
      refeicoes: [
        { id: 'a', nome: 'A', horario: '07:00', sugestoes: [], padrao: [{ nome: 'Ovo', porcao: '1', grupo: 'proteina', substituicoes: [] }] },
        { id: 'b', nome: 'B', horario: '12:00', sugestoes: [], padrao: [{ nome: 'ovo', porcao: '2', grupo: 'proteina', substituicoes: [] }] },
      ],
    };
    expect(todos(buildShoppingList(c, vazio))).toEqual(['Ovo']);
  });

  it('refeição substituta só entra quando pedida', () => {
    const c = carregar(1100);
    expect(todos(buildShoppingList(c, vazio))).not.toContain('Alface');
    expect(todos(buildShoppingList(c, { ...vazio, incluirSubstitutas: true }))).toContain('Alface');
  });
});
