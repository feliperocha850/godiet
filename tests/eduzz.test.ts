import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEduzzEvent, tratarRequisicao, type Portas, type Resultado } from '../supabase/functions/eduzz-webhook/handler';

// ATENÇÃO: as fixtures "provisorio-*" são suposições; a etapa 10 troca por payloads reais capturados da Eduzz.
const fx = (n: string) => JSON.parse(readFileSync(`supabase/functions/eduzz-webhook/fixtures/${n}.json`, 'utf8'));

describe('parseEduzzEvent', () => {
  it('pago → ativo, com e-mail normalizado', () => {
    expect(parseEduzzEvent(fx('provisorio-paga'))).toEqual({
      eventId: 'evt-1001', email: 'maria@gmail.com', status: 'ativo', ocorridoEm: '2026-11-21T10:00:00Z',
    });
  });
  it('reembolso → bloqueado', () => {
    expect(parseEduzzEvent(fx('provisorio-reembolso'))?.status).toBe('bloqueado');
  });
  it('evento que não muda acesso → null', () => {
    expect(parseEduzzEvent(fx('provisorio-irrelevante'))).toBeNull();
  });
  it('lixo → null', () => {
    expect(parseEduzzEvent(null)).toBeNull();
    expect(parseEduzzEvent({ event: 'myeduzz.invoice_paid' })).toBeNull();
  });
});

function portas(resultado: Resultado, statusFinal: 'ativo' | 'bloqueado') {
  const chamadas: string[] = [];
  const p: Portas = {
    aplicarEvento: async () => ({ resultado, statusFinal }),
    garantirUsuario: async (e) => void chamadas.push(`criar:${e}`),
    encerrarSessoes: async (e) => void chamadas.push(`encerrar:${e}`),
  };
  return { p, chamadas };
}
const req = (corpo: unknown, token = 'segredo', metodo = 'POST') =>
  new Request(`https://x.test/eduzz-webhook?token=${token}`, { method: metodo, body: metodo === 'POST' ? JSON.stringify(corpo) : undefined });

describe('tratarRequisicao', () => {
  it('sem o token certo → 401 e nada é executado', async () => {
    const { p, chamadas } = portas('aplicado', 'ativo');
    const r = await tratarRequisicao(req(fx('provisorio-paga'), 'errado'), 'segredo', p);
    expect(r.status).toBe(401);
    expect(chamadas).toEqual([]);
  });
  it('só aceita POST', async () => {
    const { p } = portas('aplicado', 'ativo');
    expect((await tratarRequisicao(req(null, 'segredo', 'GET'), 'segredo', p)).status).toBe(405);
  });
  it('pago → cria o usuário de login e responde 200', async () => {
    const { p, chamadas } = portas('aplicado', 'ativo');
    const r = await tratarRequisicao(req(fx('provisorio-paga')), 'segredo', p);
    expect(r.status).toBe(200);
    expect(chamadas).toEqual(['criar:maria@gmail.com']);
  });
  it('reembolso → encerra as sessões', async () => {
    const { p, chamadas } = portas('aplicado', 'bloqueado');
    await tratarRequisicao(req(fx('provisorio-reembolso')), 'segredo', p);
    expect(chamadas).toEqual(['encerrar:maria@gmail.com']);
  });
  it('evento duplicado ainda repete o efeito pelo status final (idempotente, cobre falha anterior)', async () => {
    const { p, chamadas } = portas('duplicado', 'ativo');
    await tratarRequisicao(req(fx('provisorio-paga')), 'segredo', p);
    expect(chamadas).toEqual(['criar:maria@gmail.com']);
  });
  it('"pago" antigo depois do reembolso não reativa: efeito segue o status final', async () => {
    const { p, chamadas } = portas('antigo', 'bloqueado');
    await tratarRequisicao(req(fx('provisorio-paga')), 'segredo', p);
    expect(chamadas).toEqual(['encerrar:maria@gmail.com']);
  });
  it('evento irrelevante → 200 sem efeitos', async () => {
    const { p, chamadas } = portas('aplicado', 'ativo');
    const r = await tratarRequisicao(req(fx('provisorio-irrelevante')), 'segredo', p);
    expect(r.status).toBe(200);
    expect(chamadas).toEqual([]);
  });
  it('falha na porta → 500 para a Eduzz tentar de novo', async () => {
    const p: Portas = { aplicarEvento: async () => { throw new Error('banco fora'); }, garantirUsuario: async () => {}, encerrarSessoes: async () => {} };
    expect((await tratarRequisicao(req(fx('provisorio-paga')), 'segredo', p)).status).toBe(500);
  });
  it('corpo que não é JSON → 400', async () => {
    const { p } = portas('aplicado', 'ativo');
    const r = await tratarRequisicao(new Request('https://x.test/f?token=segredo', { method: 'POST', body: 'não é json' }), 'segredo', p);
    expect(r.status).toBe(400);
  });
});
