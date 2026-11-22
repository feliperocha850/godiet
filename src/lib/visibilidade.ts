import type { EstadoAcesso } from './auth';

/** Ao voltar para a aba, decide se o app recomeça do zero. Quem está digitando e-mail ou código no login não pode perder a tela. */
export function deveRemontar(estado: EstadoAcesso, emLogin: boolean): boolean {
  if (estado === 'bloqueado') return true;
  return estado === 'sem-sessao' && !emLogin;
}
