import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

/** Cliente do Supabase, criado só quando necessário (a URL e a chave vêm do .env do build). */
export function getClient(): SupabaseClient {
  if (!cliente) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !chave) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
    cliente = createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return cliente;
}
