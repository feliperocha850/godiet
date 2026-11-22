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
  tipo: 'versiculo' | 'oracao' | 'incentivo' | 'gratidao';
  /** Texto exibido. Nos versículos, deve ser o texto oficial da NAA (a preencher a partir de fonte licenciada). */
  texto?: string;
  referencia?: string;
  /** Resumo do tema em palavras nossas; aparece enquanto o texto da NAA não estiver preenchido. */
  tema?: string;
  /** true só depois da revisão do Felipe (e, nos versículos, da conferência no texto oficial). */
  verificado: boolean;
};
