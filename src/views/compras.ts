import type { Contexto } from '../app/contexto';
import { buildShoppingList } from '../domain/shopping';
import { esc } from './util';

const NOMES_GRUPO: Record<string, string> = {
  carboidrato: 'Carboidratos', proteina: 'Proteínas', gordura: 'Gorduras boas', fruta: 'Frutas', vegetal: 'Vegetais e legumes', outro: 'Outros',
};

export function renderCompras(el: HTMLElement, ctx: Contexto): void {
  const prefs = ctx.prefs.get();
  const c = prefs.kcal ? ctx.cardapios[prefs.kcal] : undefined;
  if (!c) {
    el.innerHTML = `<h1>Lista de compras</h1><p>Escolha primeiro o seu cardápio.</p><a class="botao" href="#/cardapio">Escolher cardápio</a>`;
    return;
  }
  const marcados: string[] = JSON.parse(ctx.memoria.get('compras-marcados') ?? '[]');
  const lista = buildShoppingList(c, prefs);
  const hortalicas = [...new Set(c.refeicoes.flatMap((r) => [...(r.hortalicas ?? []), ...(r.salada ?? [])]))];
  const itensComTroca = new Map(c.refeicoes.flatMap((r) => r.padrao).filter((i) => i.substituicoes.length).map((i) => [i.nome, i]));

  el.innerHTML = `
    <h1>Lista de compras</h1>
    ${lista.map((g) => `<section class="cartao"><h2>${NOMES_GRUPO[g.grupo]}</h2><ul class="checklist">${g.itens
      .map((n) => `<li data-nome="${esc(n)}"><label><input type="checkbox" data-marcar="${esc(n)}" ${marcados.includes(n) ? 'checked' : ''}> ${esc(n)}</label></li>`).join('')}</ul></section>`).join('')}
    <details class="cartao"><summary><strong>Ajustar a lista</strong></summary>
      <label><input type="checkbox" data-acao="substitutas" ${prefs.incluirSubstitutas ? 'checked' : ''}> Incluir os ingredientes da refeição substituta (sanduíche)</label>
      <h3>Trocas que eu faço</h3>
      ${[...itensComTroca.values()].map((i) => `<p><label>${esc(i.nome)}: <select data-item="${esc(i.nome)}">
        <option value="${esc(i.nome)}">${esc(i.nome)}</option>${i.substituicoes.map((s) => `<option value="${esc(s.nome)}" ${prefs.trocas[i.nome] === s.nome ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
      </select></label></p>`).join('')}
      <h3>Vegetais que eu vou usar</h3>
      ${hortalicas.map((h) => `<label><input type="checkbox" data-hort="${esc(h)}" ${prefs.hortalicas.includes(h) ? 'checked' : ''}> ${esc(h)}</label> `).join('')}
    </details>`;

  const salvarEVoltar = (p: typeof prefs) => { ctx.prefs.set(p); renderCompras(el, ctx); };
  el.querySelectorAll<HTMLSelectElement>('select[data-item]').forEach((s) =>
    s.addEventListener('change', () => {
      const trocas = { ...prefs.trocas };
      if (s.value === s.dataset.item) delete trocas[s.dataset.item!];
      else trocas[s.dataset.item!] = s.value;
      salvarEVoltar({ ...prefs, trocas });
    }),
  );
  el.querySelectorAll<HTMLInputElement>('input[data-hort]').forEach((b) =>
    b.addEventListener('change', () => {
      const h = b.dataset.hort!;
      salvarEVoltar({ ...prefs, hortalicas: b.checked ? [...prefs.hortalicas, h] : prefs.hortalicas.filter((x) => x !== h) });
    }),
  );
  el.querySelector<HTMLInputElement>('input[data-acao=substitutas]')!.addEventListener('change', (e) =>
    salvarEVoltar({ ...prefs, incluirSubstitutas: (e.target as HTMLInputElement).checked }),
  );
  el.querySelectorAll<HTMLInputElement>('input[data-marcar]').forEach((b) =>
    b.addEventListener('change', () => {
      const n = b.dataset.marcar!;
      ctx.memoria.set('compras-marcados', JSON.stringify(b.checked ? [...new Set([...marcados, n])] : marcados.filter((x) => x !== n)));
    }),
  );
}
