import { describe, it, expect } from 'vitest';
import { diaLocal, computeStreak, resultadoDoDia } from '../src/domain/streak';
import type { CheckIn } from '../src/domain/types';

describe('diaLocal (America/Sao_Paulo)', () => {
  it('23:30 em São Paulo ainda é o dia anterior ao UTC', () => {
    expect(diaLocal(new Date('2026-11-22T02:30:00Z'))).toBe('2026-11-21');
  });
  it('vira o dia à meia-noite de São Paulo (03:00 UTC)', () => {
    expect(diaLocal(new Date('2026-11-21T02:59:59Z'))).toBe('2026-11-20');
    expect(diaLocal(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-21');
  });
});

describe('computeStreak', () => {
  it('sem registros → 0', () => expect(computeStreak([], '2026-11-21')).toBe(0));
  it('só hoje → 1', () => expect(computeStreak(['2026-11-21'], '2026-11-21')).toBe(1));
  it('dias seguidos até hoje', () => expect(computeStreak(['2026-11-19', '2026-11-20', '2026-11-21'], '2026-11-21')).toBe(3));
  it('hoje ainda sem check-in: a sequência até ontem continua valendo', () => {
    expect(computeStreak(['2026-11-19', '2026-11-20'], '2026-11-21')).toBe(2);
  });
  it('um dia inteiro sem registro interrompe', () => {
    expect(computeStreak(['2026-11-18', '2026-11-19'], '2026-11-21')).toBe(0);
    expect(computeStreak(['2026-11-17', '2026-11-19', '2026-11-20'], '2026-11-20')).toBe(2);
  });
  it('atravessa a virada de mês e ignora duplicados e ordem', () => {
    expect(computeStreak(['2026-11-01', '2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2);
  });
});

const c = (m: Partial<CheckIn>): CheckIn => ({ dia: '2026-11-21', alimentacao: false, agua: false, movimento: false, sono: false, deus: false, ...m });

describe('resultadoDoDia', () => {
  it('5 marcados → completo', () => {
    expect(resultadoDoDia(c({ alimentacao: true, agua: true, movimento: true, sono: true, deus: true }))).toBe('completo');
  });
  it('de 1 a 4 → parcial', () => {
    expect(resultadoDoDia(c({ agua: true }))).toBe('parcial');
    expect(resultadoDoDia(c({ alimentacao: true, agua: true, movimento: true, sono: true }))).toBe('parcial');
  });
  it('nenhum ou null → vazio', () => {
    expect(resultadoDoDia(c({}))).toBe('vazio');
    expect(resultadoDoDia(null)).toBe('vazio');
  });
});
