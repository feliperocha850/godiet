import type { Contexto } from '../app/contexto';
import { iconeRefeicao } from './icones';
import { proximaRefeicao } from '../domain/agenda';
import { computeStreak, diaAnterior, diaLocal, resultadoDoDia } from '../domain/streak';
import { esc, htmlMensagem, sortear } from './util';

export function renderHoje(el: HTMLElement, ctx: Contexto): void {
  const prefs = ctx.prefs.get();
  const hoje = diaLocal(ctx.agora());
  const registros = ctx.checkins.todos();
  const dias = registros.filter((c) => resultadoDoDia(c) !== 'vazio').map((c) => c.dia);
  const sequencia = computeStreak(dias, hoje);

  let incentivo = '';
  const ontem = ctx.checkins.get(diaAnterior(hoje));
  if (registros.length > 0 && resultadoDoDia(ontem) !== 'completo') {
    const m = sortear(ctx, ctx.incentivos.filter((x) => x.tipo === 'incentivo'), 'ultimo-incentivo');
    incentivo = `<div class="cartao" data-testid="incentivo">${htmlMensagem(m, 'texto-incentivo')}</div>`;
  }

  let refeicao = `<div class="cartao"><h2>Escolha seu cardápio</h2><p>Escolha a faixa de calorias do seu plano para ver as refeições do dia.</p><a class="botao" href="#/cardapio">Escolher cardápio</a></div>`;
  const cardapio = prefs.kcal ? ctx.cardapios[prefs.kcal] : undefined;
  if (cardapio) {
    const r = proximaRefeicao(cardapio, ctx.agora());
    const m = sortear(ctx, ctx.versiculos, 'ultimo-refeicao');
    refeicao = `
      <div class="cartao">
        <h2 class="com-icone">${iconeRefeicao(r.id)}<span>${esc(r.nome)} · ${esc(r.horario)}</span></h2>
        ${htmlMensagem(m)}
        <ul>${r.padrao.map((i) => `<li><strong>${esc(i.nome)}</strong> — ${esc(i.porcao)}</li>`).join('')}</ul>
        <a href="#/cardapio">Ver cardápio completo</a>
      </div>`;
  }

  el.innerHTML = `
    <h1>Hoje</h1>
    ${incentivo}
    ${refeicao}
    <div class="cartao"><p data-testid="sequencia"><strong>${sequencia}</strong> ${sequencia === 1 ? 'dia seguido' : 'dias seguidos'} de check-in</p>
    <a class="botao" href="#/checkin">Fazer check-in</a></div>`;
}
