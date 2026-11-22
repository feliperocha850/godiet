import type { Cardapio, CheckIn, Mensagem } from '../domain/types';

export type Preferencias = {
  kcal: number | null;
  trocas: Record<string, string>;
  hortalicas: string[];
  incluirSubstitutas: boolean;
};

export const PREFS_VAZIAS: Preferencias = { kcal: null, trocas: {}, hortalicas: [], incluirSubstitutas: false };

/** Tudo de que as telas precisam; em produção vem do Supabase/localStorage, nos testes é falso. */
export interface Contexto {
  cardapios: Record<number, Cardapio>;
  versiculos: Mensagem[];
  incentivos: Mensagem[];
  prefs: { get(): Preferencias; set(p: Preferencias): void };
  checkins: {
    get(dia: string): CheckIn | null;
    todos(): CheckIn[];
    salvar(c: CheckIn): Promise<'salvo' | 'pendente'>;
  };
  memoria: { get(k: string): string | null; set(k: string, v: string): void };
  agora(): Date;
  rng(): number;
  linkAulas: string;
}
