import type { Contexto } from '../app/contexto';
import { diaLocal, resultadoDoDia } from '../domain/streak';
import type { CheckIn } from '../domain/types';
import { htmlMensagem, sortear } from './util';

const ITENS: { nome: Exclude<keyof CheckIn, 'dia'>; rotulo: string }[] = [
  { nome: 'alimentacao', rotulo: 'Alimentação' },
  { nome: 'agua', rotulo: 'Água' },
  { nome: 'movimento', rotulo: 'Movimento' },
  { nome: 'sono', rotulo: 'Sono' },
  { nome: 'deus', rotulo: 'Momento com Deus' },
];

export function renderCheckin(el: HTMLElement, ctx: Contexto): void {
  const hoje = diaLocal(ctx.agora());
  let atual: CheckIn = ctx.checkins.get(hoje) ?? { dia: hoje, alimentacao: false, agua: false, movimento: false, sono: false, deus: false };

  el.innerHTML = `
    <h1>Check-in de hoje</h1>
    <div class="cartao">
      ${ITENS.map((i) => `<p><label><input type="checkbox" name="${i.nome}" ${atual[i.nome] ? 'checked' : ''}> ${i.rotulo}</label></p>`).join('')}
      <p class="status" data-testid="status" aria-live="polite"></p>
      <button class="botao" data-acao="concluir">Concluir o dia</button>
    </div>
    <div data-testid="area-mensagem"></div>`;

  const status = el.querySelector('[data-testid=status]')!;
  el.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((b) =>
    b.addEventListener('change', async () => {
      atual = { ...atual, [b.name]: b.checked };
      const r = await ctx.checkins.salvar(atual);
      status.textContent = r === 'salvo' ? 'Salvo.' : 'Guardado no aparelho. Vamos sincronizar quando a internet voltar.';
    }),
  );
  el.querySelector('[data-acao=concluir]')!.addEventListener('click', () => {
    const completo = resultadoDoDia(atual) === 'completo';
    const banco = ctx.incentivos.filter((m) => m.tipo === (completo ? 'gratidao' : 'incentivo'));
    const m = sortear(ctx, banco, completo ? 'ultimo-gratidao' : 'ultimo-incentivo');
    el.querySelector('[data-testid=area-mensagem]')!.innerHTML = `<div class="cartao" data-testid="mensagem" data-tipo="${m.tipo}">${htmlMensagem(m, 'texto-mensagem')}</div>`;
  });
}
