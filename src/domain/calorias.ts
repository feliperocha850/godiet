// Estimativa de gasto calórico: equação de Mifflin-St Jeor × fator de atividade.
// Os dados digitados não são guardados: só a faixa escolhida vai para as preferências.

export type Atividade = 'sedentario' | 'leve' | 'moderado' | 'intenso';

export type Entrada = {
  sexo: 'F' | 'M';
  idade: number;
  pesoKg: number;
  alturaCm: number;
  atividade: Atividade;
  objetivo: 'emagrecer' | 'manter';
};

export const FATOR_ATIVIDADE: Record<Atividade, number> = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 };
/** Meta ao emagrecer = 80% do gasto estimado (ajuste profissional do Felipe pendente de confirmação). */
export const FRACAO_EMAGRECER = 0.8;

export type Resultado = { tmb: number; gastoTotal: number; meta: number; faixa: number; aviso?: 'abaixo' | 'acima' };

const entre = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

/** Devolve a mensagem de erro (em português) ou null se a entrada é válida. */
export function validarEntrada(e: Entrada): string | null {
  if (!Number.isFinite(e.idade)) return 'Informe sua idade.';
  if (e.idade < 18) return 'Este cálculo é só para maiores de 18 anos. Procure um profissional para orientar a alimentação de menores de idade.';
  if (!entre(e.idade, 18, 100)) return 'Confira a idade (de 18 a 100 anos).';
  if (!entre(e.pesoKg, 30, 300)) return 'Confira o peso (de 30 a 300 kg).';
  if (!entre(e.alturaCm, 120, 230)) return 'Confira a altura (de 120 a 230 cm).';
  return null;
}

export function calcular(e: Entrada, faixas: number[]): Resultado {
  const base = 10 * e.pesoKg + 6.25 * e.alturaCm - 5 * e.idade + (e.sexo === 'M' ? 5 : -161);
  const tmb = Math.round(base);
  const gastoTotal = Math.round(base * FATOR_ATIVIDADE[e.atividade]);
  const meta = Math.round(e.objetivo === 'emagrecer' ? gastoTotal * FRACAO_EMAGRECER : gastoTotal);
  const ordenadas = [...faixas].sort((a, b) => a - b);
  const faixa = ordenadas.reduce((melhor, f) => (Math.abs(f - meta) < Math.abs(melhor - meta) ? f : melhor), ordenadas[0]);
  const aviso = meta < ordenadas[0] ? 'abaixo' : meta > ordenadas[ordenadas.length - 1] ? 'acima' : undefined;
  return { tmb, gastoTotal, meta, faixa, ...(aviso ? { aviso } : {}) };
}
