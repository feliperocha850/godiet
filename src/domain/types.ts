export type Grupo = 'carboidrato' | 'proteina' | 'gordura' | 'fruta' | 'vegetal' | 'outro';

export type Substituicao = { nome: string; porcao: string; detalhe?: string };

export type Item = {
  nome: string;
  porcao: string;
  grupo: Grupo;
  substituicoes: Substituicao[];
  detalhe?: string;
};

export type Refeicao = {
  id: string;
  nome: string;
  horario: string;
  padrao: Item[];
  hortalicas?: string[];
  hortalicasOrientacao?: string;
  salada?: string[];
  observacao?: string;
  sugestoes: string[];
  substituta?: { nome: string; itens: Item[]; observacao: string };
};

export type Cardapio = { kcal: number; refeicoes: Refeicao[] };

export type Mensagem = {
  id: string;
  tipo: 'versiculo' | 'oracao' | 'incentivo' | 'gratidao' | 'reflexao';
  /** Texto exibido. Nos versículos, é o texto da Bíblia Livre (BLIVRE, 2018, CC BY 4.0), sempre com o crédito exibido. */
  texto?: string;
  referencia?: string;
  /** Resumo do tema em palavras nossas; aparece quando o versículo não tem texto. */
  tema?: string;
  /** true só depois da revisão do Felipe (e, nos versículos, da conferência no texto oficial). */
  verificado: boolean;
};

export type CheckIn = {
  dia: string; // YYYY-MM-DD no fuso de São Paulo
  alimentacao: boolean;
  agua: boolean;
  movimento: boolean;
  sono: boolean;
  deus: boolean;
  /** Anotações livres de cada item (opcionais). */
  notas?: Partial<Record<'alimentacao' | 'agua' | 'movimento' | 'sono' | 'deus', string>>;
};
