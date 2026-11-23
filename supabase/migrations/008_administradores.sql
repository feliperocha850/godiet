-- Quem pode usar o painel de liberar/bloquear (função admin-aluno). Só a função (service_role) lê esta tabela.
create table if not exists public.administradores (email text primary key check (email = lower(btrim(email))));
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;
-- Os e-mails dos administradores são inseridos direto no banco, fora do repositório.
