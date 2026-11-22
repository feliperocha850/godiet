import { getClient } from './supabase';

type Erro = { message: string } | null;

/** Parte do cliente do Supabase que usamos (facilita testar). */
export interface ClienteAuth {
  auth: {
    signInWithOtp(args: { email: string; options: { shouldCreateUser: boolean } }): Promise<{ error: Erro }>;
    verifyOtp(args: { email: string; token: string; type: 'email' }): Promise<{ error: Erro; data: { session: unknown | null } | null }>;
    getSession(): Promise<{ data: { session: unknown | null } }>;
    signOut(): Promise<{ error: Erro }>;
  };
  rpc(nome: string): PromiseLike<{ data: unknown; error: Erro }>;
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

export type EstadoAcesso = 'ativo' | 'sem-sessao' | 'bloqueado';

export interface AmbienteAcesso {
  online(): boolean;
  /** Existe uma sessão guardada no aparelho (mesmo que o token já tenha vencido)? */
  sessaoGuardada(): boolean;
}

const ambientePadrao: AmbienteAcesso = {
  online: () => typeof navigator === 'undefined' || navigator.onLine,
  sessaoGuardada: () => {
    try {
      return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
    } catch {
      return false;
    }
  },
};

/** Sessão local + confirmação no servidor de que a compra continua valendo. */
export async function estadoAcesso(c: ClienteAuth = padrao(), amb: AmbienteAcesso = ambientePadrao): Promise<EstadoAcesso> {
  let tem = false;
  try {
    tem = !!(await c.auth.getSession()).data.session;
  } catch {
    tem = false;
  }
  if (!tem) {
    // Sem internet o token vencido não pode ser renovado: o aluno ainda abre o app e marca o dia (vai para a fila).
    return !amb.online() && amb.sessaoGuardada() ? 'ativo' : 'sem-sessao';
  }
  let situacao: unknown = null;
  try {
    const { data, error } = await c.rpc('meu_acesso');
    if (!error) situacao = data;
  } catch {
    /* sem rede: não expulsa; os dados no servidor continuam protegidos pela RLS */
  }
  if (situacao === null || situacao === 'ativo') return 'ativo';
  await sair(c);
  return 'bloqueado';
}

export async function sair(c: ClienteAuth = padrao()): Promise<void> {
  try {
    await c.auth.signOut();
  } catch {
    /* sem internet: a sessão local some quando o app for reaberto online */
  }
}
