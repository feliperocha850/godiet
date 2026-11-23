// Painel do Felipe: liberar, bloquear e consultar o acesso de um e-mail. Sem dependências do Deno (roda nos testes).
// Segurança: só quem entrou no app com um e-mail da tabela `administradores` pode chamar; o e-mail vem do token, nunca do corpo.

export type Acao = 'liberar' | 'bloquear' | 'consultar';
export interface PortasAdmin {
  /** E-mail do dono do token (validado pelo Supabase), ou null se o token é inválido. */
  emailDoToken(jwt: string): Promise<string | null>;
  ehAdmin(email: string): Promise<boolean>;
  liberar(email: string): Promise<void>;
  bloquear(email: string): Promise<void>;
  consultar(email: string): Promise<'ativo' | 'bloqueado' | 'inexistente'>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function tratarAdmin(req: Request, portas: PortasAdmin): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { erro: 'método' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const quem = jwt ? await portas.emailDoToken(jwt) : null;
  if (!quem) return json(401, { erro: 'entre no app primeiro' });
  if (!(await portas.ehAdmin(quem.toLowerCase()))) return json(403, { erro: 'sem permissão' });

  let corpo: { acao?: unknown; email?: unknown };
  try { corpo = await req.json(); } catch { return json(400, { erro: 'corpo inválido' }); }
  const acao = corpo.acao;
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (acao !== 'liberar' && acao !== 'bloquear' && acao !== 'consultar') return json(400, { erro: 'ação inválida' });
  if (!EMAIL.test(email) || email.length > 200) return json(400, { erro: 'e-mail inválido' });

  if (acao === 'bloquear' && (await portas.ehAdmin(email))) return json(409, { erro: 'não é possível bloquear um administrador' });
  if (acao === 'liberar') await portas.liberar(email);
  if (acao === 'bloquear') await portas.bloquear(email);
  return json(200, { email, status: await portas.consultar(email) });
}
