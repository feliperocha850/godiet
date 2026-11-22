// Ponto de entrada da Edge Function (Deno). Liga as portas do handler ao Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { tratarRequisicao, type Portas } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const portas: Portas = {
  async registrarBruto(payload) {
    const { error } = await admin.rpc('registrar_evento_bruto', { p_payload: payload });
    if (error) throw error;
  },
  async aplicarEvento(ev, payload) {
    const { data, error } = await admin.rpc('aplicar_evento_eduzz', {
      p_event_id: ev.eventId, p_email: ev.email, p_status: ev.status, p_ocorrido_em: ev.ocorridoEm, p_payload: payload,
    });
    if (error) throw error;
    const linha = Array.isArray(data) ? data[0] : data;
    return { resultado: linha.resultado, statusFinal: linha.status_final };
  },
  async garantirUsuario(email) {
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) throw error;
    // Quem foi bloqueado antes e volta a ter acesso precisa poder pedir código de novo.
    const { error: e2 } = await admin.rpc('reativar_login', { p_email: email });
    if (e2) throw e2;
  },
  async encerrarSessoes(email) {
    const { error } = await admin.rpc('encerrar_sessoes', { p_email: email });
    if (error) throw error;
  },
};

Deno.serve((req) => tratarRequisicao(req, Deno.env.get('EDUZZ_WEBHOOK_TOKEN') ?? '', portas));
