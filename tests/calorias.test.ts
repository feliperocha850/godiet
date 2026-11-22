import { describe, it, expect } from 'vitest';
import { calcular, validarEntrada, type Entrada } from '../src/domain/calorias';

const FAIXAS = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200];
const homem: Entrada = { sexo: 'M', idade: 30, pesoKg: 80, alturaCm: 180, atividade: 'leve', objetivo: 'manter' };
const mulher: Entrada = { sexo: 'F', idade: 30, pesoKg: 60, alturaCm: 165, atividade: 'leve', objetivo: 'manter' };

describe('calcular (Mifflin-St Jeor × fator de atividade)', () => {
  it('homem 30a 80kg 180cm: TMB 1780; leve ×1,375 = 2448', () => {
    const r = calcular(homem, FAIXAS);
    expect(r.tmb).toBe(1780);
    expect(r.gastoTotal).toBe(2448);
  });
  it('mulher 30a 60kg 165cm: TMB 1320 (arredondado); leve = 1815', () => {
    const r = calcular(mulher, FAIXAS);
    expect(r.tmb).toBe(1320);
    expect(r.gastoTotal).toBe(1815);
  });
  it.each([['sedentario', 1.2], ['leve', 1.375], ['moderado', 1.55], ['intenso', 1.725]] as const)('fator %s = %s', (a, f) => {
    expect(calcular({ ...homem, atividade: a }, FAIXAS).gastoTotal).toBe(Math.round(1780 * f));
  });
  it('emagrecer usa 80% do gasto; manter usa 100%', () => {
    expect(calcular({ ...mulher, objetivo: 'emagrecer' }, FAIXAS).meta).toBe(Math.round(1815 * 0.8));
    expect(calcular(mulher, FAIXAS).meta).toBe(1815);
  });
  it('sugere a faixa mais próxima da meta ', () => {
    expect(calcular({ ...mulher, objetivo: 'emagrecer' }, FAIXAS).faixa).toBe(1500); // meta 1452
    expect(calcular(mulher, FAIXAS).faixa).toBe(1800); // meta 1815
    expect(calcular(mulher, [1700, 1900]).faixa).toBe(1900); // 1815 está a 85 de 1900 e a 115 de 1700
  });
  it('meta abaixo da menor faixa → menor faixa, com aviso; acima da maior → maior, com aviso', () => {
    const baixa = calcular({ sexo: 'F', idade: 60, pesoKg: 45, alturaCm: 150, atividade: 'sedentario', objetivo: 'emagrecer' }, FAIXAS);
    expect(baixa.faixa).toBe(1100);
    expect(baixa.aviso).toBe('abaixo');
    const alta = calcular({ ...homem, pesoKg: 130, atividade: 'intenso' }, FAIXAS);
    expect(alta.faixa).toBe(2200);
    expect(alta.aviso).toBe('acima');
  });
});

describe('validarEntrada', () => {
  it('aceita uma entrada normal', () => expect(validarEntrada(homem)).toBeNull());
  it('menores de 18 anos não recebem cálculo', () => expect(validarEntrada({ ...homem, idade: 17 })).toMatch(/18 anos/));
  it.each([{ idade: NaN }, { idade: 101 }, { pesoKg: 29 }, { pesoKg: 301 }, { alturaCm: 119 }, { alturaCm: 231 }])('rejeita %j', (parcial) => {
    expect(validarEntrada({ ...homem, ...parcial })).not.toBeNull();
  });
});
