-- Chave que abre os PDFs bônus (cifrados no site). Só aluno ativo consegue ler.
-- O valor da chave NÃO fica no repositório: é inserido depois, direto no banco.
create table if not exists public.bonus_chave (
  id int primary key check (id = 1),
  chave text not null
);
alter table public.bonus_chave enable row level security;
drop policy if exists bonus_chave_leitura on public.bonus_chave;
create policy bonus_chave_leitura on public.bonus_chave for select to authenticated using (public.aluno_ativo());
revoke all on public.bonus_chave from anon, authenticated;
grant select on public.bonus_chave to authenticated;
