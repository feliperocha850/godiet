import type { CheckIn } from '../domain/types';
import { getClient } from './supabase';

export interface DepsCheckin {
  enviar(c: CheckIn): Promise<void>;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** E-mail da conta logada: separa a fila de cada pessoa que usa o aparelho. */
  usuario?: string;
}

const chaveFila = (d: DepsCheckin) => (d.usuario ? `checkins-pendentes:${d.usuario}` : 'checkins-pendentes');

let usuarioAtual: string | undefined;
/** Chamado ao entrar/sair da conta; a fila e os caches passam a ser os dessa pessoa. */
export const definirUsuario = (email: string | undefined) => void (usuarioAtual = email?.trim().toLowerCase() || undefined);
export const usuarioDoAparelho = () => usuarioAtual;

/** Erro de permissão (RLS/JWT): o acesso foi bloqueado, não adianta guardar para depois. */
const recusado = (e: unknown) => {
  const x = e as { code?: string; status?: number } | null;
  return x?.code === '42501' || x?.status === 401 || x?.status === 403;
};

const padrao = (): DepsCheckin => ({
  async enviar(c) {
    const cli = getClient();
    const { data } = await cli.auth.getSession();
    const email = data.session?.user.email;
    if (!email) throw new Error('sem sessão');
    const { error } = await cli.from('checkins').upsert({ email: email.toLowerCase(), ...c }, { onConflict: 'email,dia' });
    if (error) throw error;
  },
  storage: localStorage,
  usuario: usuarioAtual,
});

function lerFila(d: DepsCheckin): Record<string, CheckIn> {
  try {
    const v = JSON.parse(d.storage.getItem(chaveFila(d)) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function gravarFila(d: DepsCheckin, fila: Record<string, CheckIn>) {
  try {
    if (Object.keys(fila).length === 0) d.storage.removeItem(chaveFila(d));
    else d.storage.setItem(chaveFila(d), JSON.stringify(fila));
  } catch {
    /* armazenamento cheio ou bloqueado: o app segue funcionando */
  }
}

/** Check-ins ainda não enviados desta conta (têm prioridade sobre o que veio do servidor). */
export const pendentes = (deps: DepsCheckin = padrao()): CheckIn[] => Object.values(lerFila(deps));

let serie: Promise<unknown> = Promise.resolve();

async function salvarAgora(c: CheckIn, deps: DepsCheckin): Promise<'salvo' | 'pendente' | 'recusado'> {
  try {
    await deps.enviar(c);
    const fila = lerFila(deps);
    if (fila[c.dia]) {
      delete fila[c.dia];
      gravarFila(deps, fila);
    }
    return 'salvo';
  } catch (e) {
    if (recusado(e)) return 'recusado';
    gravarFila(deps, { ...lerFila(deps), [c.dia]: c });
    return 'pendente';
  }
}

/** Salvamentos são enviados um de cada vez: respostas fora de ordem não deixam o estado mais antigo valer. */
export function salvarCheckin(c: CheckIn, deps: DepsCheckin = padrao()): Promise<'salvo' | 'pendente' | 'recusado'> {
  const r = serie.then(() => salvarAgora(c, deps));
  serie = r.catch(() => undefined);
  return r;
}

/** Reenvia os check-ins guardados sem internet; devolve quantos foram enviados. */
export function sincronizarPendentes(deps: DepsCheckin = padrao()): Promise<number> {
  const r = serie.then(() => sincronizarAgora(deps));
  serie = r.catch(() => undefined);
  return r;
}

async function sincronizarAgora(deps: DepsCheckin): Promise<number> {
  const fila = lerFila(deps);
  let enviados = 0;
  for (const dia of Object.keys(fila).sort()) {
    try {
      await deps.enviar(fila[dia]);
      delete fila[dia];
      enviados++;
    } catch {
      /* continua tentando os outros dias */
    }
  }
  gravarFila(deps, fila);
  return enviados;
}
