import type { Contexto } from '../app/contexto';
import { iconeRefeicao } from './icones';
import type { Item, Refeicao } from '../domain/types';
import { esc, kcalTexto } from './util';

const itemHtml = (i: Item) => `
  <li><strong>${esc(i.nome)}</strong>${i.detalhe ? ` <small>(${esc(i.detalhe)})</small>` : ''} — ${esc(i.porcao)}
  ${i.substituicoes.length ? `<details><summary>pode substituir por</summary><ul>${i.substituicoes.map((s) => `<li>${esc(s.nome)}${s.porcao ? ` — ${esc(s.porcao)}` : ''}</li>`).join('')}</ul></details>` : ''}
  </li>`;

function refeicaoHtml(r: Refeicao): string {
  return `
  <section class="cartao">
    <h2 class="com-icone">${iconeRefeicao(r.id)}<span>${esc(r.nome)} · ${esc(r.horario)}</span></h2>
    <ul>${r.padrao.map(itemHtml).join('')}</ul>
    ${r.hortalicas?.length ? `<p><strong>Vegetais complementares</strong>${r.hortalicasOrientacao ? ` (${esc(r.hortalicasOrientacao)})` : ''}: ${r.hortalicas.map(esc).join(', ')}</p>` : ''}
    ${r.salada?.length ? `<p><strong>Salada verde</strong>: ${r.salada.map(esc).join(', ')}</p>` : ''}
    ${r.sugestoes.length ? `<h3>Sugestões de montagem</h3><ol>${r.sugestoes.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${r.observacao ? `<p><em>${esc(r.observacao)}</em></p>` : ''}
    ${r.substituta ? `<details><summary><strong>Refeição substituta</strong> — ${esc(r.substituta.nome)}</summary><ul>${r.substituta.itens.map(itemHtml).join('')}</ul><p>${esc(r.substituta.observacao)}</p></details>` : ''}
  </section>`;
}

export function renderCardapio(el: HTMLElement, ctx: Contexto): void {
  const prefs = ctx.prefs.get();
  const c = prefs.kcal ? ctx.cardapios[prefs.kcal] : undefined;
  if (!c) {
    const faixas = Object.keys(ctx.cardapios).map(Number).sort((a, b) => a - b);
    el.innerHTML = `
      <h1>Escolha seu cardápio</h1>
      <p>Escolha a faixa de calorias do seu plano. Se tiver dúvida, refaça o cálculo do seu gasto calórico seguindo o passo a passo da aula do curso.</p>
      <div class="faixas">${faixas.map((k) => `<button class="botao secundario" data-kcal="${k}">${kcalTexto(k)}</button>`).join('')}</div>`;
    el.querySelectorAll('button[data-kcal]').forEach((b) =>
      b.addEventListener('click', () => {
        ctx.prefs.set({ ...prefs, kcal: Number((b as HTMLElement).dataset.kcal), trocas: {} });
        renderCardapio(el, ctx);
      }),
    );
    return;
  }
  el.innerHTML = `
    <h1>Cardápio de ${kcalTexto(c.kcal)}</h1>
    ${c.refeicoes.map(refeicaoHtml).join('')}
    <button class="botao secundario" data-acao="trocar-faixa">Trocar faixa de calorias</button>`;
  el.querySelector('[data-acao=trocar-faixa]')!.addEventListener('click', () => {
    ctx.prefs.set({ ...prefs, kcal: null, trocas: {} });
    renderCardapio(el, ctx);
  });
}
