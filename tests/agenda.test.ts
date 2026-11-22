import { describe, it, expect } from 'vitest';
import { proximaRefeicao } from '../src/domain/agenda';
import { cardapio } from './helpers/ctx';

describe('proximaRefeicao', () => {
  const c = cardapio(1100); // 07:00, 12:00, 16:00, 20:00
  it('13:00 em São Paulo → lanche da tarde (16:00)', () => {
    expect(proximaRefeicao(c, new Date('2026-11-21T16:00:00Z')).horario).toBe('16:00');
  });
  it('exatamente 12:00 → almoço (ainda é a refeição da hora)', () => {
    expect(proximaRefeicao(c, new Date('2026-11-21T15:00:00Z')).horario).toBe('12:00');
  });
  it('21:00 → café da manhã do dia seguinte', () => {
    expect(proximaRefeicao(c, new Date('2026-11-22T00:00:00Z')).horario).toBe('07:00');
  });
  it('06:00 → café da manhã', () => {
    expect(proximaRefeicao(c, new Date('2026-11-21T09:00:00Z')).horario).toBe('07:00');
  });
  it('usa o fuso de São Paulo mesmo com UTC já no dia seguinte (23:30 SP)', () => {
    expect(proximaRefeicao(c, new Date('2026-11-22T02:30:00Z')).horario).toBe('07:00');
  });
});
