-- Mesa com Propósito: alunos, eventos da Eduzz, preferências e check-ins.
-- Acesso: o aluno só enxerga as próprias linhas e só enquanto estiver ativo.

create table public.alunos (
  email text primary key check (email = lower(btrim(email))),
  status text not null check (status in ('ativo', 'bloqueado')),
  eduzz_ultimo_evento_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.eventos_eduzz (
  event_id text primary key,
  recebido_em timestamptz not null default now(),
  payload jsonb not null
);

create table public.preferencias (
  email text primary key references public.alunos (email) on delete cascade,
  kcal int check (kcal between 1100 and 2200 and kcal % 100 = 0),
  trocas jsonb not null default '{}'::jsonb,
  hortalicas jsonb not null default '[]'::jsonb
);

create table public.checkins (
  email text not null references public.alunos (email) on delete cascade,
  dia date not null,
  alimentacao boolean not null default false,
  agua boolean not null default false,
  movimento boolean not null default false,
  sono boolean not null default false,
  deus boolean not null default false,
  primary key (email, dia)
);

alter table public.alunos enable row level security;
alter table public.eventos_eduzz enable row level security;
alter table public.preferencias enable row level security;
alter table public.checkins enable row level security;

-- Privilégios mínimos: o aluno só mexe em preferências e check-ins (e ainda filtrado por RLS).
revoke all on public.alunos, public.eventos_eduzz from anon, authenticated;
revoke all on public.preferencias, public.checkins from anon;
grant select, insert, update, delete on public.preferencias, public.checkins to authenticated;

-- E-mail do token, sempre normalizado.
create function public.email_do_token() returns text
language sql stable as $$ select lower(btrim(auth.jwt() ->> 'email')) $$;

-- Verdadeiro só se o e-mail do token pertence a um aluno ativo (lê a tabela alunos como dono).
create function public.aluno_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.alunos where email = public.email_do_token() and status = 'ativo')
$$;

create policy preferencias_do_aluno on public.preferencias
  for all to authenticated
  using (email = public.email_do_token() and public.aluno_ativo())
  with check (email = public.email_do_token() and public.aluno_ativo());

create policy checkins_do_aluno on public.checkins
  for all to authenticated
  using (email = public.email_do_token() and public.aluno_ativo())
  with check (email = public.email_do_token() and public.aluno_ativo());

-- Liberação e bloqueio manuais (painel do Supabase, SQL Editor). Também usadas pelo webhook.
-- Liberar manualmente exige criar o usuário em Authentication → Add user (e-mail confirmado).
create function public.liberar_aluno(p_email text) returns void
language sql security definer set search_path = public as $$
  insert into public.alunos (email, status) values (lower(btrim(p_email)), 'ativo')
  on conflict (email) do update set status = 'ativo'
$$;

create function public.bloquear_aluno(p_email text) returns void
language sql security definer set search_path = public as $$
  insert into public.alunos (email, status) values (lower(btrim(p_email)), 'bloqueado')
  on conflict (email) do update set status = 'bloqueado'
$$;

revoke execute on function public.liberar_aluno(text), public.bloquear_aluno(text) from public, anon, authenticated;
grant execute on function public.liberar_aluno(text), public.bloquear_aluno(text) to service_role;
