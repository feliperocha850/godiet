import type { Contexto } from './app/contexto';
import { renderLogin, type AuthLogin } from './views/login';
import { renderHoje } from './views/hoje';
import { renderCardapio } from './views/cardapio';
import { renderCompras } from './views/compras';
import { renderCheckin } from './views/checkin';
import { renderAulas } from './views/aulas';
import { renderPrivacidade } from './views/privacidade';

export interface DepsApp {
  ctx: Contexto;
  sessaoAtiva(): Promise<boolean>;
  login: AuthLogin;
}

const ROTAS: Record<string, (el: HTMLElement, ctx: Contexto) => void> = {
  '': renderHoje,
  '#/': renderHoje,
  '#/cardapio': renderCardapio,
  '#/compras': renderCompras,
  '#/checkin': renderCheckin,
  '#/aulas': renderAulas,
  '#/privacidade': (el) => renderPrivacidade(el),
};

export async function montar(raiz: HTMLElement, deps: DepsApp): Promise<void> {
  if (!(await deps.sessaoAtiva())) {
    renderLogin(raiz, deps.login, () => void montar(raiz, deps));
    return;
  }
  raiz.innerHTML = `
    <main id="conteudo"></main>
    <nav class="inferior">
      <a href="#/">Hoje</a><a href="#/cardapio">Cardápio</a><a href="#/compras">Compras</a><a href="#/checkin">Check-in</a><a href="#/aulas">Aulas</a>
    </nav>`;
  const conteudo = raiz.querySelector('#conteudo') as HTMLElement;
  const desenhar = () => (ROTAS[window.location.hash] ?? renderHoje)(conteudo, deps.ctx);
  window.addEventListener('hashchange', desenhar);
  desenhar();
}
