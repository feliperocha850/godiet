import { getClient } from './supabase';

export interface Bonus { id: string; titulo: string; descricao: string; arquivo: string }

/** Materiais bônus do curso. Os PDFs ficam cifrados em public/bonus; a chave só chega ao aluno ativo. */
export const BONUS: Bonus[] = [
  { id: 'manual', titulo: 'Manual de Organização e Planejamento', descricao: 'Como organizar a semana para seguir o plano alimentar.', arquivo: 'manual.bin' },
  { id: 'suplementos', titulo: 'Suplementos secretos que funcionam', descricao: 'Creatina, cafeína, beta-alanina, nitratos e bicarbonato, com base científica.', arquivo: 'suplementos.bin' },
  { id: 'excecoes', titulo: 'Ideias para a hora de fazer uma exceção', descricao: 'Escolhas inteligentes quando sair da dieta.', arquivo: 'excecoes.bin' },
];

const hexParaBytes = (hex: string): Uint8Array<ArrayBuffer> => {
  const limpo = hex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(limpo)) throw new Error('chave inválida');
  return new Uint8Array(limpo.match(/../g)!.map((b) => parseInt(b, 16)));
};

/** Arquivo = 12 bytes de IV + conteúdo cifrado (AES-GCM, chave de 256 bits em hexadecimal). */
export async function decifrar(dados: ArrayBuffer, chaveHex: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(dados);
  if (bytes.length < 29) throw new Error('arquivo inválido');
  const chave = await crypto.subtle.importKey('raw', hexParaBytes(chaveHex), 'AES-GCM', false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, chave, bytes.slice(12));
}

/** Busca a chave no banco: a política de acesso só devolve para aluno com acesso ativo. */
export async function buscarChave(): Promise<string> {
  const { data, error } = await getClient().from('bonus_chave').select('chave').eq('id', 1).maybeSingle();
  if (error || !data?.chave) throw new Error('sem acesso');
  return data.chave as string;
}

export async function carregarBonus(
  item: Bonus,
  deps: { chave?: () => Promise<string>; baixar?: (url: string) => Promise<ArrayBuffer> } = {},
): Promise<Blob> {
  const chave = await (deps.chave ?? buscarChave)();
  const baixar = deps.baixar ?? (async (u: string) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error('arquivo indisponível');
    return r.arrayBuffer();
  });
  const cifrado = await baixar(`${import.meta.env.BASE_URL}bonus/${item.arquivo}`);
  return new Blob([await decifrar(cifrado, chave)], { type: 'application/pdf' });
}
