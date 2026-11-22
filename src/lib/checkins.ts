import type { CheckIn } from '../domain/types';
import { getClient } from './supabase';

export interface DepsCheckin {
  enviar(c: CheckIn): Promise<void>;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

const CHAVE = 'checkins-pendentes';

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
});

function lerFila(s: DepsCheckin['storage']): Record<string, CheckIn> {
  try {
    const v = JSON.parse(s.getItem(CHAVE) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function gravarFila(s: DepsCheckin['storage'], fila: Record<string, CheckIn>) {
  try {
    if (Object.keys(fila).length === 0) s.removeItem(CHAVE);
    else s.setItem(CHAVE, JSON.stringify(fila));
  } catch {
    /* armazenamento cheio ou bloqueado: o app segue funcionando */
  }
}

export async function salvarCheckin(c: CheckIn, deps: DepsCheckin = padrao()): Promise<'salvo' | 'pendente'> {
  try {
    await deps.enviar(c);
    const fila = lerFila(deps.storage);
    if (fila[c.dia]) {
      delete fila[c.dia];
      gravarFila(deps.storage, fila);
    }
    return 'salvo';
  } catch {
    gravarFila(deps.storage, { ...lerFila(deps.storage), [c.dia]: c });
    return 'pendente';
  }
}

/** Reenvia os check-ins guardados sem internet; devolve quantos foram enviados. */
export async function sincronizarPendentes(deps: DepsCheckin = padrao()): Promise<number> {
  const fila = lerFila(deps.storage);
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
  gravarFila(deps.storage, fila);
  return enviados;
}
