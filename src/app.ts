import type { Contexto } from './app/contexto';
import { renderLogin, type AuthLogin } from './views/login';
import { renderHoje } from './views/hoje';
import { renderCardapio } from './views/cardapio';
import { renderCompras } from './views/compras';
import { renderCheckin } from './views/checkin';
import { ICONES_MENU } from './views/icones-menu';
import { renderCalculadora } from './views/calculadora';
import { renderAulas } from './views/aulas';
import { renderPrivacidade } from './views/privacidade';
import { renderAdmin } from './views/admin';
import { topoHtml } from './views/util';

export interface DepsApp {
  /** Contexto pronto (testes) ou, em produção, `recarregar`: monta o contexto da conta logada depois do login. */
  ctx?: Contexto;
  recarregar?(): Promise<Contexto>;
  acesso(): Promise<'ativo' | 'sem-sessao' | 'bloqueado'>;
  login: AuthLogin;
  /** Encerra a sessão e limpa os dados locais do aluno. */
  sair?(): Promise<void>;
}

const ROTAS: Record<string, (el: HTMLElement, ctx: Contexto) => void> = {
  '': renderHoje,
  '#/': renderHoje,
  '#/cardapio': renderCardapio,
  '#/compras': renderCompras,
  '#/checkin': renderCheckin,
  '#/aulas': renderAulas,
  '#/calculadora': renderCalculadora,
  '#/privacidade': (el) => renderPrivacidade(el),
  '#/admin': (el) => renderAdmin(el),
};

let ouvinte: (() => void) | null = null;

export async function montar(raiz: HTMLElement, deps: DepsApp): Promise<void> {
  const acesso = await deps.acesso();
  if (acesso !== 'ativo') {
    renderLogin(raiz, deps.login, () => void montar(raiz, deps));
    if (acesso === 'bloqueado') {
      raiz.insertAdjacentHTML('afterbegin', `<div class="cartao" role="alert"><p><strong>Seu acesso não está ativo.</strong></p>
        <p>Se você comprou o curso com outro e-mail, entre com ele abaixo. Em caso de dúvida, fale com o suporte do curso.</p></div>`);
    }
    return;
  }
  const ctx = (await deps.recarregar?.()) ?? deps.ctx;
  if (!ctx) throw new Error('contexto ausente');
  raiz.innerHTML = `
    ${topoHtml()}
    <main id="conteudo"></main>
    <nav class="inferior">
      <a href="#/">${ICONES_MENU.hoje}<span>Hoje</span></a><a href="#/cardapio">${ICONES_MENU.cardapio}<span>Cardápio</span></a><a href="#/compras">${ICONES_MENU.compras}<span>Compras</span></a><a href="#/checkin">${ICONES_MENU.checkin}<span>Check-in</span></a><a href="#/aulas">${ICONES_MENU.aulas}<span>Aulas</span></a><button type="button" class="sair" data-acao="sair">${ICONES_MENU.sair}<span>Sair</span></button>
    </nav>`;
  raiz.querySelector('[data-acao=sair]')!.addEventListener('click', async () => {
    await deps.sair?.();
    void montar(raiz, deps);
  });
  const conteudo = raiz.querySelector('#conteudo') as HTMLElement;
  const desenhar = () => {
    (ROTAS[window.location.hash] ?? renderHoje)(conteudo, ctx);
    try { window.scrollTo(0, 0); } catch { /* ambiente sem rolagem */ }
  };
  if (ouvinte) window.removeEventListener('hashchange', ouvinte);
  ouvinte = desenhar;
  window.addEventListener('hashchange', desenhar);
  desenhar();
}
