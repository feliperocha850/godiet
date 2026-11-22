import './theme.css';
import { montar } from './app';
import { criarContextoReal } from './app/real';
import { confirmarCodigo, pedirCodigo, sessaoAtiva } from './lib/auth';
import { sincronizarPendentes } from './lib/checkins';

const raiz = document.getElementById('app')!;

async function iniciar() {
  try {
    const ctx = await criarContextoReal();
    await montar(raiz, { ctx, sessaoAtiva, login: { pedirCodigo: (e) => pedirCodigo(e), confirmarCodigo: (e, c) => confirmarCodigo(e, c) } });
    void sincronizarPendentes();
    window.addEventListener('online', () => void sincronizarPendentes());
  } catch {
    raiz.innerHTML = '<div class="cartao"><h1>App em configuração</h1><p>Tente novamente em alguns instantes.</p></div>';
  }
}

void iniciar();
