import './theme.css';
import { montar, type DepsApp } from './app';
import { criarContextoReal, limparDadosLocais } from './app/real';
import { confirmarCodigo, estadoAcesso, pedirCodigo, sair } from './lib/auth';
import { definirUsuario, sincronizarPendentes } from './lib/checkins';
import { deveRemontar } from './lib/visibilidade';

const raiz = document.getElementById('app')!;

const deps: DepsApp = {
  acesso: () => estadoAcesso(),
  recarregar: criarContextoReal,
  login: { pedirCodigo: (e) => pedirCodigo(e), confirmarCodigo: (e, c) => confirmarCodigo(e, c) },
  async sair() {
    await sair();
    limparDadosLocais();
    definirUsuario(undefined);
  },
};

async function iniciar() {
  try {
    await montar(raiz, deps);
    void sincronizarPendentes();
    window.addEventListener('online', () => void sincronizarPendentes());
    // Ao voltar para o app (ex.: depois de um reembolso), confere de novo se o acesso continua valendo.
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible') return;
      const emLogin = !!raiz.querySelector('input[name=email], input[name=codigo]');
      if (deveRemontar(await estadoAcesso(), emLogin)) void montar(raiz, deps);
    });
  } catch {
    raiz.innerHTML = '<div class="cartao"><h1>App em configuração</h1><p>Tente novamente em alguns instantes.</p></div>';
  }
}

void iniciar();
