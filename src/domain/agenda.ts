import type { Cardapio, Refeicao } from './types';

const hora = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Primeira refeição cujo horário ainda não passou (no fuso de São Paulo); depois da última, a primeira do dia seguinte. */
export function proximaRefeicao(c: Cardapio, agora: Date): Refeicao {
  const agoraMin = minutos(hora.format(agora));
  return c.refeicoes.find((r) => minutos(r.horario) >= agoraMin) ?? c.refeicoes[0];
}
