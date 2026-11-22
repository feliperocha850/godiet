import type { Contexto } from '../app/contexto';
import { calcular, validarEntrada, type Atividade, type Entrada } from '../domain/calorias';
import { esc, kcalTexto } from './util';

const ATIVIDADES: { v: Atividade; r: string }[] = [
  { v: 'sedentario', r: 'Sedentário (pouco ou nenhum exercício)' },
  { v: 'leve', r: 'Leve (exercício 1 a 3 dias por semana)' },
  { v: 'moderado', r: 'Moderado (exercício 3 a 5 dias por semana)' },
  { v: 'intenso', r: 'Intenso (exercício 6 a 7 dias por semana)' },
];

export function renderCalculadora(el: HTMLElement, ctx: Contexto): void {
  el.innerHTML = `
    <h1>Calcule seu gasto calórico</h1>
    <p>Responda abaixo e veja qual cardápio combina com você. Nenhum dado digitado aqui é guardado.</p>
    <form class="cartao" novalidate>
      <p><strong>Sexo</strong><br>
        <label><input type="radio" name="sexo" value="F" checked> Feminino</label>
        <label><input type="radio" name="sexo" value="M"> Masculino</label></p>
      <p><label>Idade (anos)<br><input name="idade" type="number" inputmode="numeric" min="18" max="100"></label></p>
      <p><label>Peso (kg)<br><input name="peso" type="number" inputmode="decimal" step="0.1"></label></p>
      <p><label>Altura (cm)<br><input name="altura" type="number" inputmode="numeric"></label></p>
      <p><label>Atividade física<br><select name="atividade">${ATIVIDADES.map((a) => `<option value="${a.v}">${esc(a.r)}</option>`).join('')}</select></label></p>
      <p><label>Objetivo<br><select name="objetivo"><option value="emagrecer">Emagrecer</option><option value="manter">Manter o peso</option></select></label></p>
      <button class="botao" type="submit">Calcular</button>
    </form>
    <div id="calc-saida" aria-live="polite"></div>`;
  const saida = el.querySelector('#calc-saida') as HTMLElement;
  const form = el.querySelector('form')!;
  const campo = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const entrada: Entrada = {
      sexo: (form.querySelector('[name=sexo]:checked') as HTMLInputElement).value as 'F' | 'M',
      idade: Number(campo('idade')),
      pesoKg: Number(campo('peso').replace(',', '.')),
      alturaCm: Number(campo('altura')),
      atividade: campo('atividade') as Atividade,
      objetivo: campo('objetivo') as 'emagrecer' | 'manter',
    };
    const erro = validarEntrada(entrada);
    if (erro) {
      saida.innerHTML = `<div class="cartao" role="alert"><p>${esc(erro)}</p></div>`;
      return;
    }
    const faixas = Object.keys(ctx.cardapios).map(Number);
    const r = calcular(entrada, faixas);
    const aviso =
      r.aviso === 'abaixo' ? `<p><strong>Atenção:</strong> sua meta ficou abaixo da menor faixa do curso. Mostramos a menor (${kcalTexto(r.faixa)}); converse com um profissional antes de reduzir mais.</p>`
      : r.aviso === 'acima' ? `<p><strong>Atenção:</strong> sua meta passa da maior faixa do curso. Mostramos a maior (${kcalTexto(r.faixa)}); um profissional pode ajustar para você.</p>`
      : '';
    saida.innerHTML = `
      <div class="cartao" data-testid="resultado">
        <h2>Seu resultado</h2>
        <p>Gasto estimado por dia: <strong>${kcalTexto(r.gastoTotal)}</strong></p>
        <p>Meta ${entrada.objetivo === 'emagrecer' ? 'para emagrecer' : 'para manter o peso'}: <strong>${kcalTexto(r.meta)}</strong></p>
        <p>Cardápio sugerido: <strong>${kcalTexto(r.faixa)}</strong></p>
        ${aviso}
        <button class="botao" type="button" data-acao="usar">Usar este cardápio</button>
        <p><small>Isto é uma estimativa, feita com uma fórmula padrão (Mifflin-St Jeor). Não substitui avaliação individual. Gestantes, lactantes e pessoas com condições de saúde devem seguir a orientação do seu profissional.</small></p>
      </div>`;
    saida.querySelector('[data-acao=usar]')!.addEventListener('click', () => {
      ctx.prefs.set({ ...ctx.prefs.get(), kcal: r.faixa, trocas: {} });
      window.location.hash = '#/cardapio';
    });
  });
}
