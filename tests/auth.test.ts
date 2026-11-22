import { describe, it, expect } from 'vitest';
import { normalizarEmail, pedirCodigo, confirmarCodigo, estadoAcesso, sair, type ClienteAuth } from '../src/lib/auth';

function cliente(parcial: Partial<ClienteAuth['auth']> = {}, rpc?: ClienteAuth['rpc']) {
  const chamadas: { metodo: string; args: unknown }[] = [];
  const c: ClienteAuth = {
    auth: {
      signInWithOtp: async (args) => (chamadas.push({ metodo: 'otp', args }), { error: null }),
      verifyOtp: async (args) => (chamadas.push({ metodo: 'verify', args }), { error: null, data: { session: { id: 's' } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => (chamadas.push({ metodo: 'signOut', args: null }), { error: null }),
      ...parcial,
    },
    rpc: async () => ({ data: 'ativo', error: null }),
    ...(rpc ? { rpc } : {}),
  };
  return { c, chamadas };
}

describe('normalizarEmail', () => {
  it('tira espaços e põe em minúsculas', () => {
    expect(normalizarEmail('  Maria@Gmail.com ')).toBe('maria@gmail.com');
  });
});

describe('pedirCodigo', () => {
  it('pede o código sem criar conta nova', async () => {
    const { c, chamadas } = cliente();
    expect(await pedirCodigo(' Maria@Gmail.com', c)).toEqual({ ok: true });
    expect(chamadas[0].args).toEqual({ email: 'maria@gmail.com', options: { shouldCreateUser: false } });
  });
  it('e-mail sem compra → nao-encontrado', async () => {
    const { c } = cliente({ signInWithOtp: async () => ({ error: { message: 'Signups not allowed for otp' } }) });
    expect(await pedirCodigo('z@x.com', c)).toEqual({ ok: false, motivo: 'nao-encontrado' });
  });
  it('qualquer outra falha → erro', async () => {
    const { c } = cliente({ signInWithOtp: async () => ({ error: { message: 'Failed to fetch' } }) });
    expect(await pedirCodigo('a@x.com', c)).toEqual({ ok: false, motivo: 'erro' });
  });
  it('exceção de rede → erro (não estoura)', async () => {
    const { c } = cliente({ signInWithOtp: async () => { throw new TypeError('network'); } });
    expect(await pedirCodigo('a@x.com', c)).toEqual({ ok: false, motivo: 'erro' });
  });
});

describe('confirmarCodigo', () => {
  it('aceita código com espaço ou traço e envia só os dígitos', async () => {
    const { c, chamadas } = cliente();
    expect(await confirmarCodigo('A@x.com', '123 456', c)).toBe(true);
    expect(await confirmarCodigo('a@x.com', '123-456', c)).toBe(true);
    expect(chamadas.map((x) => (x.args as { token: string }).token)).toEqual(['123456', '123456']);
    expect(chamadas[0].args).toMatchObject({ email: 'a@x.com', type: 'email' });
  });
  it('código errado → false', async () => {
    const { c } = cliente({ verifyOtp: async () => ({ error: { message: 'Token has expired or is invalid' }, data: { session: null } }) });
    expect(await confirmarCodigo('a@x.com', '000000', c)).toBe(false);
  });
});

const COM_SESSAO = { getSession: async () => ({ data: { session: { id: 's' } } }) };
const online = { online: () => true, sessaoGuardada: () => false };

describe('estadoAcesso', () => {
  it('sem sessão → sem-sessao', async () => {
    expect(await estadoAcesso(cliente().c, online)).toBe('sem-sessao');
  });
  it('com sessão e acesso ativo no servidor → ativo', async () => {
    expect(await estadoAcesso(cliente(COM_SESSAO).c, online)).toBe('ativo');
  });
  it.each(['bloqueado', 'inexistente'])('sessão válida mas servidor diz "%s" → bloqueado e sai da conta', async (status) => {
    const { c, chamadas } = cliente(COM_SESSAO, async () => ({ data: status, error: null }));
    expect(await estadoAcesso(c, online)).toBe('bloqueado');
    expect(chamadas.some((x) => x.metodo === 'signOut')).toBe(true);
  });
  it('falha de rede ao consultar o acesso não expulsa o aluno', async () => {
    const { c } = cliente(COM_SESSAO, async () => ({ data: null, error: { message: 'Failed to fetch' } }));
    expect(await estadoAcesso(c, online)).toBe('ativo');
  });
  it('sem internet e com token vencido guardado, o app abre (marcações ficam na fila)', async () => {
    const { c } = cliente();
    expect(await estadoAcesso(c, { online: () => false, sessaoGuardada: () => true })).toBe('ativo');
  });
  it('sem internet e sem nenhuma sessão guardada → sem-sessao', async () => {
    expect(await estadoAcesso(cliente().c, { online: () => false, sessaoGuardada: () => false })).toBe('sem-sessao');
  });
});

describe('sair', () => {
  it('encerra a sessão no Supabase', async () => {
    const { c, chamadas } = cliente();
    await sair(c);
    expect(chamadas.some((x) => x.metodo === 'signOut')).toBe(true);
  });
});
