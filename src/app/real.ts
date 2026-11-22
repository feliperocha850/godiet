import type { Contexto, Preferencias } from './contexto';
import { PREFS_VAZIAS } from './contexto';
import type { Cardapio, CheckIn, Mensagem } from '../domain/types';
import { definirUsuario, pendentes, salvarCheckin, sincronizarPendentes } from '../lib/checkins';
import { getClient } from '../lib/supabase';
import versiculos from '../data/versiculos.json';
import incentivos from '../data/incentivos.json';

const modulos = import.meta.glob('../data/cardapios/*.json', { eager: true, import: 'default' }) as Record<string, Cardapio>;

/** Dados locais são separados por conta: no celular compartilhado ninguém vê o que é do outro. */
let usuario = '';
const chave = (k: string) => (usuario ? `${k}:${usuario}` : k);
/** Apaga do aparelho os dados locais da conta (as marcações ainda não enviadas ficam guardadas para quando ela voltar). */
export function limparDadosLocais(): void {
  try {
    for (const k of ['prefs', 'checkins-cache']) localStorage.removeItem(chave(k));
    for (const k of Object.keys(localStorage)) if (k.startsWith(chave('mem:'))) localStorage.removeItem(k);
  } catch { /* armazenamento indisponível */ }
}

const lerJson = <T>(k: string, padrao: T): T => {
  try {
    return JSON.parse(localStorage.getItem(chave(k)) ?? '') as T;
  } catch {
    return padrao;
  }
};
const gravar = (k: string, v: unknown) => {
  try { localStorage.setItem(chave(k), JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
};

/** Monta o contexto do app: dados locais primeiro, sincronizando com o Supabase quando houver internet. */
export async function criarContextoReal(): Promise<Contexto> {
  const cardapios = Object.fromEntries(Object.values(modulos).map((c) => [c.kcal, c]));
  usuario = '';
  try {
    usuario = (await getClient().auth.getSession()).data.session?.user.email?.toLowerCase() ?? '';
  } catch { /* sem internet nem sessão legível */ }
  try {
    // Sem internet o token vencido não renova: vale a última conta que usou este aparelho.
    if (usuario) localStorage.setItem('ultimo-usuario', usuario);
    else if (!navigator.onLine) usuario = localStorage.getItem('ultimo-usuario') ?? '';
  } catch { /* armazenamento indisponível */ }
  definirUsuario(usuario || undefined);
  let prefs: Preferencias = { ...PREFS_VAZIAS, ...lerJson<Partial<Preferencias>>('prefs', {}) };
  const checkins = new Map<string, CheckIn>(lerJson<CheckIn[]>('checkins-cache', []).map((c) => [c.dia, c]));

  try {
    const cli = getClient();
    const email = usuario || undefined;
    if (email) {
      await sincronizarPendentes(); // o que ficou sem internet vai primeiro; o servidor já tem a versão mais nova
      const { data: p } = await cli.from('preferencias').select('kcal,trocas,hortalicas').eq('email', email).maybeSingle();
      if (p) prefs = { ...prefs, kcal: p.kcal, trocas: p.trocas ?? {}, hortalicas: p.hortalicas ?? [] };
      const { data: lista } = await cli.from('checkins').select('dia,alimentacao,agua,movimento,sono,deus').eq('email', email).order('dia', { ascending: false }).limit(120);
      for (const c of lista ?? []) checkins.set(c.dia, c as CheckIn);
      for (const c of pendentes()) checkins.set(c.dia, c); // o que ainda não subiu vale mais que a linha do servidor
      gravar('prefs', prefs);
      gravar('checkins-cache', [...checkins.values()]);
    }
  } catch {
    /* sem internet: segue com o que está guardado no aparelho */
  }

  return {
    cardapios,
    versiculos: versiculos as Mensagem[],
    incentivos: incentivos as Mensagem[],
    prefs: {
      get: () => prefs,
      set(p) {
        prefs = p;
        gravar('prefs', p);
        void (async () => {
          try {
            const cli = getClient();
            const email = (await cli.auth.getSession()).data.session?.user.email?.toLowerCase();
            if (email && p.kcal) await cli.from('preferencias').upsert({ email, kcal: p.kcal, trocas: p.trocas, hortalicas: p.hortalicas });
          } catch { /* tenta de novo na próxima alteração */ }
        })();
      },
    },
    checkins: {
      get: (dia) => checkins.get(dia) ?? null,
      todos: () => [...checkins.values()],
      async salvar(c) {
        checkins.set(c.dia, c);
        gravar('checkins-cache', [...checkins.values()]);
        return salvarCheckin(c);
      },
    },
    memoria: { get: (k) => localStorage.getItem(chave(`mem:${k}`)), set: (k, v) => { try { localStorage.setItem(chave(`mem:${k}`), v); } catch { /* ignora */ } } },
    agora: () => new Date(),
    rng: Math.random,
    linkAulas: (import.meta.env.VITE_AULAS_URL as string | undefined) ?? '#/aulas',
  };
}
