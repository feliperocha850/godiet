import { getClient } from './supabase';

type Erro = { message: string } | null;

/** Parte do cliente do Supabase que usamos (facilita testar). */
export interface ClienteAuth {
  auth: {
    signInWithOtp(args: { email: string; options: { shouldCreateUser: boolean } }): Promise<{ error: Erro }>;
    verifyOtp(args: { email: string; token: string; type: 'email' }): Promise<{ error: Erro; data: { session: unknown | null } | null }>;
    getSession(): Promise<{ data: { session: unknown | null } }>;
  };
}

const padrao = () => getClient() as unknown as ClienteAuth;

export const normalizarEmail = (s: string) => s.trim().toLowerCase();

export type ResultadoPedido = { ok: true } | { ok: false; motivo: 'nao-encontrado' | 'erro' };

export async function pedirCodigo(email: string, c: ClienteAuth = padrao()): Promise<ResultadoPedido> {
  try {
    const { error } = await c.auth.signInWithOtp({ email: normalizarEmail(email), options: { shouldCreateUser: false } });
    if (!error) return { ok: true };
    return { ok: false, motivo: /signups? not allowed|user not found/i.test(error.message) ? 'nao-encontrado' : 'erro' };
  } catch {
    return { ok: false, motivo: 'erro' };
  }
}

export async function confirmarCodigo(email: string, codigo: string, c: ClienteAuth = padrao()): Promise<boolean> {
  try {
    const { error, data } = await c.auth.verifyOtp({ email: normalizarEmail(email), token: codigo.replace(/\D/g, ''), type: 'email' });
    return !error && !!data?.session;
  } catch {
    return false;
  }
}

export async function sessaoAtiva(c: ClienteAuth = padrao()): Promise<boolean> {
  const { data } = await c.auth.getSession();
  return !!data.session;
}
