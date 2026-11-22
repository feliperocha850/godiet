// Receptor dos avisos (webhook) da Eduzz. Sem dependências do Deno: roda no Supabase Edge Functions e nos testes.
//
// PROVISÓRIO: o formato do aviso e os nomes dos eventos abaixo são suposições. A etapa 10 do plano substitui
// por payloads reais capturados na conta da Eduzz (e as fixtures provisorio-*.json por capturas reais).
// Autenticação: segredo longo na URL do webhook (?token=...), comparado em tempo constante.

export type StatusAcesso = 'ativo' | 'bloqueado';
export type EventoAcesso = { eventId: string; email: string; status: StatusAcesso; ocorridoEm: string };
export type Resultado = 'aplicado' | 'duplicado' | 'antigo';

export interface Portas {
  /** Guarda o payload exatamente como chegou, antes de qualquer interpretação. */
  registrarBruto(payload: unknown): Promise<void>;
  aplicarEvento(ev: EventoAcesso, payload: unknown): Promise<{ resultado: Resultado; statusFinal: StatusAcesso }>;
  garantirUsuario(email: string): Promise<void>;
  encerrarSessoes(email: string): Promise<void>;
}

const EVENTOS_ATIVAR = ['myeduzz.invoice_paid'];
const EVENTOS_BLOQUEAR = ['myeduzz.invoice_refunded', 'myeduzz.invoice_canceled', 'myeduzz.invoice_chargeback'];

export function parseEduzzEvent(body: unknown): EventoAcesso | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as { id?: unknown; event?: unknown; sentDate?: unknown; data?: { buyer?: { email?: unknown } } };
  const email = b.data?.buyer?.email;
  if (typeof b.id !== 'string' || typeof b.event !== 'string' || typeof b.sentDate !== 'string' || typeof email !== 'string') return null;
  const status: StatusAcesso | null = EVENTOS_ATIVAR.includes(b.event) ? 'ativo' : EVENTOS_BLOQUEAR.includes(b.event) ? 'bloqueado' : null;
  if (!status) return null;
  return { eventId: b.id, email: email.trim().toLowerCase(), status, ocorridoEm: b.sentDate };
}

function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export async function tratarRequisicao(req: Request, segredo: string, portas: Portas): Promise<Response> {
  if (req.method !== 'POST') return resposta(405, { erro: 'método não permitido' });
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!segredo || !iguaisEmTempoConstante(token, segredo)) return resposta(401, { erro: 'não autorizado' });

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: 'corpo inválido' });
  }

  try {
    await portas.registrarBruto(corpo);
  } catch {
    return resposta(500, { erro: 'falha ao registrar; tente novamente' });
  }

  const ev = parseEduzzEvent(corpo);
  if (!ev) return resposta(200, { ignorado: true });

  try {
    const { resultado, statusFinal } = await portas.aplicarEvento(ev, corpo);
    // O efeito segue o status final (idempotente): repetições reparam falhas anteriores e "pago" antigo não reativa.
    if (statusFinal === 'ativo') await portas.garantirUsuario(ev.email);
    else await portas.encerrarSessoes(ev.email);
    return resposta(200, { resultado, statusFinal });
  } catch {
    return resposta(500, { erro: 'falha ao processar; tente novamente' });
  }
}
