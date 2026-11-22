import { describe, it, expect } from 'vitest';
import { normalizarEmail, pedirCodigo, confirmarCodigo, sessaoAtiva, type ClienteAuth } from '../src/lib/auth';

function cliente(parcial: Partial<ClienteAuth['auth']> = {}) {
  const chamadas: { metodo: string; args: unknown }[] = [];
  const c: ClienteAuth = {
    auth: {
      signInWithOtp: async (args) => (chamadas.push({ metodo: 'otp', args }), { error: null }),
      verifyOtp: async (args) => (chamadas.push({ metodo: 'verify', args }), { error: null, data: { session: { id: 's' } } }),
      getSession: async () => ({ data: { session: null } }),
      ...parcial,
    },
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

describe('sessaoAtiva', () => {
  it('sem sessão → false; com sessão → true', async () => {
    expect(await sessaoAtiva(cliente().c)).toBe(false);
    const { c } = cliente({ getSession: async () => ({ data: { session: { id: 's' } } }) });
    expect(await sessaoAtiva(c)).toBe(true);
  });
});
