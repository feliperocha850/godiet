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
