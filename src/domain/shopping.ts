import type { Cardapio, Grupo, Item } from './types';

export type EscolhasCompras = {
  /** `${id da refeição}:${nome do item}` -> nome da substituição escolhida (cada refeição troca separadamente) */
  trocas: Record<string, string>;
  hortalicas: string[];
  incluirSubstitutas?: boolean;
};

export type GrupoCompras = { grupo: Grupo; itens: string[] };

const ORDEM: Grupo[] = ['carboidrato', 'proteina', 'gordura', 'fruta', 'vegetal', 'outro'];

const chave = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export function buildShoppingList(c: Cardapio, escolhas: EscolhasCompras): GrupoCompras[] {
  const vistos = new Set<string>();
  const porGrupo = new Map<Grupo, string[]>();

  const adicionar = (nome: string, grupo: Grupo) => {
    const k = chave(nome);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), nome.trim()]);
  };

  const usar = (item: Item, refeicaoId: string) => {
    const troca = escolhas.trocas[`${refeicaoId}:${item.nome}`];
    const nomes = (troca ?? item.nome).split(' + ');
    for (const n of nomes) adicionar(n, item.grupo);
  };

  for (const r of c.refeicoes) {
    r.padrao.forEach((i) => usar(i, r.id));
    if (escolhas.incluirSubstitutas) r.substituta?.itens.forEach((i) => usar(i, r.id));
  }
  for (const h of escolhas.hortalicas) adicionar(h, 'vegetal');

  return ORDEM.filter((g) => porGrupo.has(g)).map((g) => ({ grupo: g, itens: porGrupo.get(g)! }));
}
