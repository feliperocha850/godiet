import type { Contexto } from '../app/contexto';

export function renderAulas(el: HTMLElement, ctx: Contexto): void {
  el.innerHTML = `
    <h1>Aulas e materiais</h1>
    <div class="cartao"><p>As aulas do curso continuam na sua área do aluno.</p>
    <a class="botao" href="${ctx.linkAulas}" target="_blank" rel="noopener">Abrir minhas aulas</a></div>
    <p><a href="#/privacidade">Privacidade e termos</a></p>`;
}
