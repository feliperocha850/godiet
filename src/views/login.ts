export interface AuthLogin {
  pedirCodigo(email: string): Promise<{ ok: true } | { ok: false; motivo: 'nao-encontrado' | 'erro' }>;
  confirmarCodigo(email: string, codigo: string): Promise<boolean>;
}

const MSG = {
  naoEncontrado: 'Não encontramos uma compra com este e-mail. Use o e-mail da compra do curso ou fale com o suporte.',
  erro: 'Não foi possível enviar o código agora. Verifique sua internet e tente de novo.',
  codigoErrado: 'Código incorreto ou expirado. Confira o e-mail e tente de novo.',
};

export function renderLogin(el: HTMLElement, auth: AuthLogin, aoEntrar: () => void): void {
  const telaEmail = (aviso = '') => {
    el.innerHTML = `
      <div class="cartao">
        <h1>Bem-vindo(a)</h1>
        <p>Digite o <strong>e-mail da compra</strong> do curso. Vamos enviar um código para você entrar.</p>
        <form><input name="email" type="email" autocomplete="email" required placeholder="seu@email.com" />
        <button class="botao" type="submit">Enviar código</button></form>
        <p class="aviso" role="alert">${aviso}</p>
      </div>`;
    el.querySelector('form')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (el.querySelector('input[name=email]') as HTMLInputElement).value;
      const r = await auth.pedirCodigo(email);
      if (r.ok) telaCodigo(email);
      else telaEmail(r.motivo === 'nao-encontrado' ? MSG.naoEncontrado : MSG.erro);
    });
  };

  const telaCodigo = (email: string, aviso = '') => {
    el.innerHTML = `
      <div class="cartao">
        <h1>Confira seu e-mail</h1>
        <p>Enviamos um código para <strong>${email.replace(/[<>&"]/g, '')}</strong>. Digite abaixo.</p>
        <form><input name="codigo" inputmode="numeric" autocomplete="one-time-code" required placeholder="000000" />
        <button class="botao" type="submit">Entrar</button></form>
        <p class="aviso" role="alert">${aviso}</p>
      </div>`;
    el.querySelector('form')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codigo = (el.querySelector('input[name=codigo]') as HTMLInputElement).value;
      if (await auth.confirmarCodigo(email, codigo)) aoEntrar();
      else telaCodigo(email, MSG.codigoErrado);
    });
  };

  telaEmail();
}
