-- Endurecimento apontado pelo verificador de segurança do Supabase:
-- visitante sem login não executa aluno_ativo(); email_do_token() com search_path fixo.
revoke execute on function public.aluno_ativo() from public, anon;
grant execute on function public.aluno_ativo() to authenticated, service_role;
alter function public.email_do_token() set search_path = public;
