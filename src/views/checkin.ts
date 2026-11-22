import type { Contexto } from '../app/contexto';
import { reflexaoDoDia } from '../domain/messages';
import { diaLocal, resultadoDoDia } from '../domain/streak';
import type { CheckIn } from '../domain/types';
import { esc, htmlMensagem, sortear } from './util';

const ITENS: { nome: Exclude<keyof CheckIn, 'dia' | 'notas'>; rotulo: string }[] = [
  { nome: 'alimentacao', rotulo: 'Alimentação' },
  { nome: 'agua', rotulo: 'Água' },
  { nome: 'movimento', rotulo: 'Movimento' },
  { nome: 'sono', rotulo: 'Sono' },
  { nome: 'deus', rotulo: 'Momento com Deus' },
];

/** Exemplos suaves (placeholder) para quem não sabe o que escrever. */
const EXEMPLOS: Record<(typeof ITENS)[number]['nome'], string> = {
  alimentacao: 'Ex.: consegui concluir todas as refeições do cardápio hoje.',
  agua: 'Ex.: bebi a garrafa toda e ainda completei à tarde.',
  movimento: 'Ex.: caminhei 30 minutos depois do jantar.',
  sono: 'Ex.: dormi cedo e acordei com disposição.',
  deus: 'Ex.: li um salmo e agradeci pelo dia.',
};

export function renderCheckin(el: HTMLElement, ctx: Contexto): void {
  const hoje = diaLocal(ctx.agora());
  let atual: CheckIn = ctx.checkins.get(hoje) ?? { dia: hoje, alimentacao: false, agua: false, movimento: false, sono: false, deus: false };

  const refl = ctx.reflexoes.length ? reflexaoDoDia(ctx.reflexoes, hoje) : null;
  el.innerHTML = `
    <h1>Check-in de hoje</h1>
    ${refl ? `<div class="cartao reflexao" data-testid="reflexao"><h2>Reflexão do dia</h2>
      <blockquote>${esc(refl.texto ?? '')}<cite> — ${esc(refl.referencia ?? '')}</cite></blockquote>
      <small>Reflexão em palavras nossas, inspirada em ${esc(refl.referencia ?? '')}.</small></div>` : ''}
    <div class="cartao">
      ${ITENS.map((i) => `<p><label><input type="checkbox" name="${i.nome}" ${atual[i.nome] ? 'checked' : ''}> <strong>${i.rotulo}</strong></label></p>
      <details class="nota" ${atual.notas?.[i.nome] ? 'open' : ''}><summary>Anotar</summary>
        <textarea name="nota-${i.nome}" rows="2" maxlength="280" placeholder="${esc(EXEMPLOS[i.nome])}">${esc(atual.notas?.[i.nome] ?? '')}</textarea></details>`).join('')}
      <p class="status" data-testid="status" aria-live="polite"></p>
      <button class="botao" data-acao="concluir">Concluir o dia</button>
    </div>
    <div data-testid="area-mensagem"></div>`;

  const status = el.querySelector('[data-testid=status]')!;
  el.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((b) =>
    b.addEventListener('change', async () => {
      atual = { ...atual, [b.name]: b.checked };
      const r = await ctx.checkins.salvar(atual);
      status.textContent =
        r === 'salvo' ? 'Salvo.'
        : r === 'recusado' ? 'Seu acesso não está ativo, por isso não conseguimos salvar. Saia e entre de novo com o e-mail da compra.'
        : 'Guardado no aparelho. Vamos sincronizar quando a internet voltar.';
    }),
  );
  el.querySelectorAll<HTMLTextAreaElement>('textarea[name^=nota-]').forEach((t) =>
    t.addEventListener('change', async () => {
      const item = t.name.slice('nota-'.length);
      atual = { ...atual, notas: { ...atual.notas, [item]: t.value.trim() } };
      const r = await ctx.checkins.salvar(atual);
      status.textContent = r === 'salvo' ? 'Anotação salva.' : r === 'recusado' ? 'Seu acesso não está ativo, por isso não conseguimos salvar.' : 'Guardado no aparelho. Vamos sincronizar quando a internet voltar.';
    }),
  );
  el.querySelector('[data-acao=concluir]')!.addEventListener('click', () => {
    const completo = resultadoDoDia(atual) === 'completo';
    const banco = ctx.incentivos.filter((m) => m.tipo === (completo ? 'gratidao' : 'incentivo'));
    const m = sortear(ctx, banco, completo ? 'ultimo-gratidao' : 'ultimo-incentivo');
    el.querySelector('[data-testid=area-mensagem]')!.innerHTML = `<div class="cartao" data-testid="mensagem" data-tipo="${m.tipo}">${htmlMensagem(m, 'texto-mensagem')}</div>`;
  });
}
