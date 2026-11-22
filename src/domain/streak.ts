import type { CheckIn } from './types';

const FUSO = 'America/Sao_Paulo';
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Dia (YYYY-MM-DD) no fuso de São Paulo, não importa o fuso do aparelho. */
export const diaLocal = (d: Date): string => formato.format(d);

const MS_DIA = 24 * 60 * 60 * 1000;
const dia = (s: string) => Date.parse(`${s}T00:00:00Z`);
const texto = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Dias seguidos com check-in registrado (mesmo parcial). Se hoje ainda não tem, conta a partir de ontem. */
export function computeStreak(dias: string[], hoje: string): number {
  const set = new Set(dias);
  let t = dia(hoje);
  if (!set.has(texto(t))) t -= MS_DIA;
  let n = 0;
  while (set.has(texto(t))) {
    n++;
    t -= MS_DIA;
  }
  return n;
}

export function resultadoDoDia(c: CheckIn | null): 'completo' | 'parcial' | 'vazio' {
  if (!c) return 'vazio';
  const marcados = [c.alimentacao, c.agua, c.movimento, c.sono, c.deus].filter(Boolean).length;
  return marcados === 5 ? 'completo' : marcados === 0 ? 'vazio' : 'parcial';
}
