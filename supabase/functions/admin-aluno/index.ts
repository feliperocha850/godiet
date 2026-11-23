import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { tratarAdmin, type PortasAdmin } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const portas: PortasAdmin = {
  async emailDoToken(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user?.email ? null : data.user.email;
  },
  async ehAdmin(email) {
    const { data, error } = await admin.from('administradores').select('email').eq('email', email).maybeSingle();
    if (error) throw error;
    return !!data;
  },
  async liberar(email) {
    const { error } = await admin.rpc('liberar_aluno', { p_email: email });
    if (error) throw error;
    const { error: e1 } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (e1 && !/already|registered|exists/i.test(e1.message)) throw e1;
    const { error: e2 } = await admin.rpc('reativar_login', { p_email: email });
    if (e2) throw e2;
  },
  async bloquear(email) {
    const { error } = await admin.rpc('bloquear_aluno', { p_email: email });
    if (error) throw error;
    const { error: e2 } = await admin.rpc('encerrar_sessoes', { p_email: email });
    if (e2) throw e2;
  },
  async consultar(email) {
    const { data, error } = await admin.from('alunos').select('status').eq('email', email).maybeSingle();
    if (error) throw error;
    return (data?.status as 'ativo' | 'bloqueado' | undefined) ?? 'inexistente';
  },
};

Deno.serve((req) => tratarAdmin(req, portas).catch(() => new Response(JSON.stringify({ erro: 'falha interna' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })));
