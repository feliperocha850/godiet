import { getClient } from './supabase';

export type AcaoAdmin = 'liberar' | 'bloquear' | 'consultar';
export interface RespostaAdmin { email: string; status: 'ativo' | 'bloqueado' | 'inexistente' }

/** Chama a função admin-aluno com a sessão de quem está logado. Lança Error com a mensagem do servidor. */
export async function chamarAdmin(acao: AcaoAdmin, email: string): Promise<RespostaAdmin> {
  const { data, error } = await getClient().functions.invoke('admin-aluno', { body: { acao, email } });
  if (error) {
    let msg = 'Não foi possível concluir agora.';
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.erro) msg = String(j.erro); } catch { /* sem corpo */ }
    throw new Error(msg);
  }
  return data as RespostaAdmin;
}
