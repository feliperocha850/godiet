import type { Mensagem } from './types';

/** Sorteia uma mensagem do banco, sem repetir a anterior (quando houver outra opção). */
export function pickMessage(banco: Mensagem[], ultimoId: string | null, rng: () => number): Mensagem {
  if (banco.length === 0) throw new Error('banco de mensagens vazio');
  const opcoes = banco.length > 1 ? banco.filter((m) => m.id !== ultimoId) : banco;
  const i = Math.min(Math.floor(rng() * opcoes.length), opcoes.length - 1);
  return opcoes[i];
}
