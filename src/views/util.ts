import logo from '../assets/logo.png';
import { pickMessage } from '../domain/messages';
import type { Mensagem } from '../domain/types';
import type { Contexto } from '../app/contexto';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Sorteia do banco sem repetir a última mensagem mostrada daquele tipo de uso. */
export function sortear(ctx: Contexto, banco: Mensagem[], chave: string): Mensagem {
  const m = pickMessage(banco, ctx.memoria.get(chave), ctx.rng);
  ctx.memoria.set(chave, m.id);
  return m;
}

export function htmlMensagem(m: Mensagem, testid = 'texto-refeicao'): string {
  const corpo = esc(m.texto ?? m.tema ?? '');
  const ref = m.referencia ? `<cite> — ${esc(m.referencia)}</cite>` : '';
  const credito = m.tipo === 'versiculo' && m.texto ? '<small class="credito">Bíblia Livre (BLIVRE), 2018 · © Diego Santos, Mario Sérgio e Marco Teles · CC BY 4.0</small>' : '';
  return `<blockquote data-testid="${testid}" data-tipo="${m.tipo}">${corpo}${ref}</blockquote>${credito}`;
}

/** Nome do app: GOD (Deus) em negrito + IET (de "diet") normal. */
export const marcaHtml = () => '<span class="marca" aria-label="GODIET"><strong>GOD</strong>IET</span>';
export const topoHtml = () => `<header class="topo"><img class="logo" src="${logo}" alt="" width="36" height="36">${marcaHtml()}</header>`;

export const kcalTexto = (k: number) => `${k.toLocaleString('pt-BR')} kcal`;
