import type { Contexto, Preferencias } from './contexto';
import { PREFS_VAZIAS } from './contexto';
import type { Cardapio, CheckIn, Mensagem } from '../domain/types';
import { salvarCheckin } from '../lib/checkins';
import { getClient } from '../lib/supabase';
import versiculos from '../data/versiculos.json';
import incentivos from '../data/incentivos.json';

const modulos = import.meta.glob('../data/cardapios/*.json', { eager: true, import: 'default' }) as Record<string, Cardapio>;

const lerJson = <T>(k: string, padrao: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '') as T;
  } catch {
    return padrao;
  }
};
const gravar = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
};

/** Monta o contexto do app: dados locais primeiro, sincronizando com o Supabase quando houver internet. */
export async function criarContextoReal(): Promise<Contexto> {
  const cardapios = Object.fromEntries(Object.values(modulos).map((c) => [c.kcal, c]));
  let prefs: Preferencias = { ...PREFS_VAZIAS, ...lerJson<Partial<Preferencias>>('prefs', {}) };
  const checkins = new Map<string, CheckIn>(lerJson<CheckIn[]>('checkins-cache', []).map((c) => [c.dia, c]));

  try {
    const cli = getClient();
    const { data: sessao } = await cli.auth.getSession();
    const email = sessao.session?.user.email?.toLowerCase();
    if (email) {
      const { data: p } = await cli.from('preferencias').select('kcal,trocas,hortalicas').eq('email', email).maybeSingle();
      if (p) prefs = { ...prefs, kcal: p.kcal, trocas: p.trocas ?? {}, hortalicas: p.hortalicas ?? [] };
      const { data: lista } = await cli.from('checkins').select('dia,alimentacao,agua,movimento,sono,deus').eq('email', email).order('dia', { ascending: false }).limit(120);
      for (const c of lista ?? []) checkins.set(c.dia, c as CheckIn);
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
    memoria: { get: (k) => localStorage.getItem(`mem:${k}`), set: (k, v) => { try { localStorage.setItem(`mem:${k}`, v); } catch { /* ignora */ } } },
    agora: () => new Date(),
    rng: Math.random,
    linkAulas: (import.meta.env.VITE_AULAS_URL as string | undefined) ?? '#/aulas',
  };
}
