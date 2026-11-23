// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tratarAdmin, type PortasAdmin } from '../supabase/functions/admin-aluno/handler';
import { renderAdmin } from '../src/views/admin';

function portas(over: Partial<PortasAdmin> = {}) {
  const chamadas: string[] = [];
  const p: PortasAdmin = {
    emailDoToken: async (j) => (j === 'token-felipe' ? 'Felipe@X.com' : j === 'token-aluno' ? 'aluno@x.com' : null),
    ehAdmin: async (e) => e === 'felipe@x.com',
    liberar: async (e) => { chamadas.push('liberar ' + e); },
    bloquear: async (e) => { chamadas.push('bloquear ' + e); },
    consultar: async () => 'ativo',
    ...over,
  };
  return { p, chamadas };
}
const req = (corpo: unknown, token?: string, metodo = 'POST') =>
  new Request('https://x.test/admin-aluno', { method: metodo, headers: token ? { authorization: `Bearer ${token}` } : {}, body: metodo === 'POST' ? JSON.stringify(corpo) : undefined });

describe('função admin-aluno', () => {
  it('sem token: 401 e nada é feito', async () => {
    const { p, chamadas } = portas();
    expect((await tratarAdmin(req({ acao: 'liberar', email: 'a@b.com' }), p)).status).toBe(401);
    expect(chamadas).toEqual([]);
  });
  it('token inválido: 401', async () => {
    const { p, chamadas } = portas();
    expect((await tratarAdmin(req({ acao: 'liberar', email: 'a@b.com' }, 'lixo'), p)).status).toBe(401);
    expect(chamadas).toEqual([]);
  });
  it('aluno comum (não administrador): 403 e nada é feito', async () => {
    const { p, chamadas } = portas();
    expect((await tratarAdmin(req({ acao: 'bloquear', email: 'a@b.com' }, 'token-aluno'), p)).status).toBe(403);
    expect(chamadas).toEqual([]);
  });
  it('administrador libera um e-mail (normalizado)', async () => {
    const { p, chamadas } = portas();
    const r = await tratarAdmin(req({ acao: 'liberar', email: '  Novo@Aluno.COM ' }, 'token-felipe'), p);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ email: 'novo@aluno.com', status: 'ativo' });
    expect(chamadas).toEqual(['liberar novo@aluno.com']);
  });
  it('administrador bloqueia um e-mail', async () => {
    const { p, chamadas } = portas({ consultar: async () => 'bloqueado' });
    const r = await tratarAdmin(req({ acao: 'bloquear', email: 'a@b.com' }, 'token-felipe'), p);
    expect(await r.json()).toEqual({ email: 'a@b.com', status: 'bloqueado' });
    expect(chamadas).toEqual(['bloquear a@b.com']);
  });
  it('consultar não altera nada', async () => {
    const { p, chamadas } = portas({ consultar: async () => 'inexistente' });
    const r = await tratarAdmin(req({ acao: 'consultar', email: 'a@b.com' }, 'token-felipe'), p);
    expect(await r.json()).toEqual({ email: 'a@b.com', status: 'inexistente' });
    expect(chamadas).toEqual([]);
  });
  it('não deixa bloquear um administrador (evita se trancar para fora)', async () => {
    const { p, chamadas } = portas();
    expect((await tratarAdmin(req({ acao: 'bloquear', email: 'felipe@x.com' }, 'token-felipe'), p)).status).toBe(409);
    expect(chamadas).toEqual([]);
  });
  it('rejeita ação desconhecida, e-mail inválido e corpo quebrado', async () => {
    const { p } = portas();
    expect((await tratarAdmin(req({ acao: 'apagar', email: 'a@b.com' }, 'token-felipe'), p)).status).toBe(400);
    expect((await tratarAdmin(req({ acao: 'liberar', email: 'sem-arroba' }, 'token-felipe'), p)).status).toBe(400);
    expect((await tratarAdmin(req({ acao: 'liberar' }, 'token-felipe'), p)).status).toBe(400);
    const quebrado = new Request('https://x.test/', { method: 'POST', headers: { authorization: 'Bearer token-felipe' }, body: '{nao-json' });
    expect((await tratarAdmin(quebrado, p)).status).toBe(400);
  });
  it('responde ao pré-voo do navegador (OPTIONS) e recusa GET', async () => {
    const { p } = portas();
    expect((await tratarAdmin(new Request('https://x.test/', { method: 'OPTIONS' }), p)).status).toBe(204);
    expect((await tratarAdmin(new Request('https://x.test/', { method: 'GET' }), p)).status).toBe(405);
  });
});

describe('tela de acessos', () => {
  beforeEach(() => { window.confirm = vi.fn(() => true); });
  const montar = (chamar: Parameters<typeof renderAdmin>[1]) => { const e = document.createElement('div'); renderAdmin(e, chamar); return e; };
  const clicar = async (e: HTMLElement, acao: string, email: string) => {
    (e.querySelector('input[name=email]') as HTMLInputElement).value = email;
    (e.querySelector(`[data-acao=${acao}]`) as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
  };
  it('mostra o resultado de liberar', async () => {
    const chamar = vi.fn(async () => ({ email: 'a@b.com', status: 'ativo' as const }));
    const e = montar(chamar);
    await clicar(e, 'liberar', 'a@b.com');
    expect(chamar).toHaveBeenCalledWith('liberar', 'a@b.com');
    expect(e.querySelector('[role=status]')!.textContent).toContain('ATIVO');
  });
  it('pede confirmação antes de bloquear e respeita o "cancelar"', async () => {
    window.confirm = vi.fn(() => false);
    const chamar = vi.fn(async () => ({ email: 'a@b.com', status: 'bloqueado' as const }));
    const e = montar(chamar);
    await clicar(e, 'bloquear', 'a@b.com');
    expect(chamar).not.toHaveBeenCalled();
  });
  it('e-mail inválido não chama o servidor', async () => {
    const chamar = vi.fn();
    const e = montar(chamar as never);
    await clicar(e, 'liberar', 'abc');
    expect(chamar).not.toHaveBeenCalled();
    expect(e.querySelector('[role=status]')!.textContent).toMatch(/e-mail válido/);
  });
  it('mostra a mensagem de erro do servidor (sem permissão)', async () => {
    const e = montar(async () => { throw new Error('sem permissão'); });
    await clicar(e, 'consultar', 'a@b.com');
    expect(e.querySelector('[role=status]')!.textContent).toBe('sem permissão');
  });
});
