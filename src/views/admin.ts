import { chamarAdmin, type AcaoAdmin, type RespostaAdmin } from '../lib/admin';

const ROTULO: Record<RespostaAdmin['status'], string> = { ativo: 'ATIVO', bloqueado: 'BLOQUEADO', inexistente: 'Não cadastrado' };

/** Painel do administrador (#/admin). Não aparece no menu; o servidor decide quem pode usar. */
export function renderAdmin(el: HTMLElement, chamar: (a: AcaoAdmin, e: string) => Promise<RespostaAdmin> = chamarAdmin): void {
  el.innerHTML = `
    <h1>Acessos</h1>
    <div class="cartao">
      <form novalidate>
        <label>E-mail do aluno<input type="email" name="email" autocomplete="off" autocapitalize="none" placeholder="aluno@exemplo.com" required></label>
        <div class="acoes">
          <button type="button" class="botao" data-acao="consultar">Consultar</button>
          <button type="button" class="botao" data-acao="liberar">Liberar acesso</button>
          <button type="button" class="botao" data-acao="bloquear">Bloquear acesso</button>
        </div>
      </form>
      <p role="status" aria-live="polite"></p>
    </div>
    <p><small>Liberar cria o login do aluno. Bloquear encerra as sessões e impede novos códigos.</small></p>`;
  const campo = el.querySelector('input[name=email]') as HTMLInputElement;
  const msg = el.querySelector('[role=status]') as HTMLElement;
  el.querySelectorAll<HTMLButtonElement>('[data-acao]').forEach((b) => b.addEventListener('click', async () => {
    const acao = b.dataset.acao as AcaoAdmin;
    const email = campo.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Digite um e-mail válido.'; return; }
    if (acao === 'bloquear' && !window.confirm(`Bloquear o acesso de ${email}? A pessoa será desconectada.`)) return;
    el.querySelectorAll<HTMLButtonElement>('[data-acao]').forEach((x) => (x.disabled = true));
    msg.textContent = 'Aguarde...';
    try {
      const r = await chamar(acao, email);
      msg.textContent = `${r.email}: ${ROTULO[r.status]}`;
    } catch (e) {
      msg.textContent = e instanceof Error ? e.message : 'Não foi possível concluir agora.';
    } finally {
      el.querySelectorAll<HTMLButtonElement>('[data-acao]').forEach((x) => (x.disabled = false));
    }
  }));
}
