import { readFileSync } from 'node:fs';
import type { Cardapio, CheckIn, Mensagem } from '../../src/domain/types';
import { PREFS_VAZIAS, type Contexto, type Preferencias } from '../../src/app/contexto';

export const cardapio = (k: number): Cardapio => JSON.parse(readFileSync(`src/data/cardapios/${k}.json`, 'utf8'));
const ler = (f: string): Mensagem[] => JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));

export function criarCtx(opcoes: { agora?: string; prefs?: Partial<Preferencias>; checkins?: CheckIn[] } = {}) {
  let prefs: Preferencias = { ...PREFS_VAZIAS, ...opcoes.prefs };
  const checkins = new Map((opcoes.checkins ?? []).map((c) => [c.dia, c]));
  const memoria = new Map<string, string>();
  const salvos: CheckIn[] = [];
  const ctx: Contexto = {
    cardapios: Object.fromEntries([1100, 1400, 2200].map((k) => [k, cardapio(k)])),
    versiculos: ler('versiculos'),
    incentivos: ler('incentivos'),
    reflexoes: ler('reflexoes'),
    prefs: { get: () => prefs, set: (p) => void (prefs = p) },
    checkins: {
      get: (d) => checkins.get(d) ?? null,
      todos: () => [...checkins.values()],
      salvar: async (c) => (checkins.set(c.dia, c), salvos.push(c), 'salvo'),
    },
    memoria: { get: (k) => memoria.get(k) ?? null, set: (k, v) => void memoria.set(k, v) },
    agora: () => new Date(opcoes.agora ?? '2026-11-21T16:00:00Z'), // 13:00 em São Paulo
    rng: () => 0,
    linkAulas: 'https://exemplo.test/aulas',
  };
  return { ctx, salvos, getPrefs: () => prefs };
}
