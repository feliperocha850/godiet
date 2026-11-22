import { describe, it, expect } from 'vitest';
import { deveRemontar } from '../src/lib/visibilidade';

describe('deveRemontar ao voltar para a aba', () => {
  it('não recomeça a tela de login enquanto o aluno digita o código', () => {
    expect(deveRemontar('sem-sessao', true)).toBe(false);
  });
  it('aluno que estava dentro do app e perdeu a sessão volta ao login', () => {
    expect(deveRemontar('sem-sessao', false)).toBe(true);
  });
  it('acesso bloqueado sempre mostra a tela de bloqueio', () => {
    expect(deveRemontar('bloqueado', true)).toBe(true);
    expect(deveRemontar('bloqueado', false)).toBe(true);
  });
  it('acesso ativo não remonta nada', () => {
    expect(deveRemontar('ativo', false)).toBe(false);
    expect(deveRemontar('ativo', true)).toBe(false);
  });
});
