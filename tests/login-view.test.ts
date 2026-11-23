// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderLogin } from '../src/views/login';

const espera = () => new Promise((r) => setTimeout(r, 0));

function montar(auth: Parameters<typeof renderLogin>[1]) {
  const el = document.createElement('div');
  let entrou = false;
  renderLogin(el, auth, () => (entrou = true));
  return { el, entrou: () => entrou };
}
const enviar = async (el: HTMLElement, sel: string, valor: string) => {
  (el.querySelector(sel) as HTMLInputElement).value = valor;
  el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await espera();
};

describe('tela de login', () => {
  it('e-mail da compra → pede o código e mostra o campo do código', async () => {
    const { el } = montar({ pedirCodigo: async () => ({ ok: true }), confirmarCodigo: async () => true });
    await enviar(el, 'input[name=email]', 'maria@gmail.com');
    expect(el.textContent).toContain('Enviamos um código');
    expect(el.querySelector('input[name=codigo]')).not.toBeNull();
  });
  it('e-mail sem compra → orienta usar o e-mail da compra ou falar com o suporte', async () => {
    const { el } = montar({ pedirCodigo: async () => ({ ok: false, motivo: 'nao-encontrado' }), confirmarCodigo: async () => true });
    await enviar(el, 'input[name=email]', 'z@x.com');
    expect(el.textContent).toContain('e-mail da compra');
    expect(el.textContent).toContain('suporte');
  });
  it('falha de rede → pede para tentar de novo', async () => {
    const { el } = montar({ pedirCodigo: async () => ({ ok: false, motivo: 'erro' }), confirmarCodigo: async () => true });
    await enviar(el, 'input[name=email]', 'a@x.com');
    expect(el.textContent).toContain('tente de novo');
  });
  it('limite de envios → pede para esperar alguns minutos, sem culpar a internet', async () => {
    const { el } = montar({ pedirCodigo: async () => ({ ok: false, motivo: 'limite' }), confirmarCodigo: async () => true });
    await enviar(el, 'input[name=email]', 'a@x.com');
    expect(el.textContent).toContain('Muitos pedidos');
    expect(el.textContent).toContain('minutos');
    expect(el.textContent).not.toContain('internet');
  });
  it('código certo → entra; código errado → mensagem e continua na tela', async () => {
    const certo = montar({ pedirCodigo: async () => ({ ok: true }), confirmarCodigo: async () => true });
    await enviar(certo.el, 'input[name=email]', 'a@x.com');
    await enviar(certo.el, 'input[name=codigo]', '123456');
    expect(certo.entrou()).toBe(true);

    const errado = montar({ pedirCodigo: async () => ({ ok: true }), confirmarCodigo: async () => false });
    await enviar(errado.el, 'input[name=email]', 'a@x.com');
    await enviar(errado.el, 'input[name=codigo]', '000000');
    expect(errado.entrou()).toBe(false);
    expect(errado.el.textContent).toContain('Código incorreto');
  });
});
