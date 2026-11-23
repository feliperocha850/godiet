// Receptor dos avisos (webhook) da Eduzz. Sem dependências do Deno: roda no Supabase Edge Functions e nos testes.
//
// Formato conferido com os avisos reais de teste da Eduzz (Developer Hub): id, event, sentDate, data.student/buyer, data.items[].productId.
// Autenticação: segredo longo na URL do webhook (?token=...), comparado em tempo constante.

export type StatusAcesso = 'ativo' | 'bloqueado';
export type EventoAcesso = { eventId: string; email: string; status: StatusAcesso; ocorridoEm: string; produtoIds: string[] };
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
  const b = body as {
    id?: unknown; event?: unknown; sentDate?: unknown;
    data?: { buyer?: { email?: unknown }; student?: { email?: unknown }; items?: { productId?: unknown }[] };
  };
  // O acesso é de quem vai estudar (aluno); sem aluno no aviso, vale o comprador.
  const email = typeof b.data?.student?.email === 'string' && b.data.student.email.trim() ? b.data.student.email : b.data?.buyer?.email;
  if (typeof b.id !== 'string' || typeof b.event !== 'string' || typeof b.sentDate !== 'string' || typeof email !== 'string') return null;
  const status: StatusAcesso | null = EVENTOS_ATIVAR.includes(b.event) ? 'ativo' : EVENTOS_BLOQUEAR.includes(b.event) ? 'bloqueado' : null;
  if (!status) return null;
  const itens = Array.isArray(b.data?.items) ? b.data!.items! : [];
  const produtoIds = itens.map((i) => i?.productId).filter((x): x is string => typeof x === 'string');
  return { eventId: b.id, email: email.trim().toLowerCase(), status, ocorridoEm: b.sentDate, produtoIds };
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

/** produtosPermitidos: códigos de produto do curso; vazio = aceita qualquer produto. */
export async function tratarRequisicao(req: Request, segredo: string, portas: Portas, produtosPermitidos: string[] = []): Promise<Response> {
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
  if (produtosPermitidos.length > 0 && !ev.produtoIds.some((id) => produtosPermitidos.includes(id))) {
    return resposta(200, { ignorado: true, motivo: 'produto' });
  }

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
