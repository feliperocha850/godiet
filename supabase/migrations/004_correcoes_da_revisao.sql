-- Correções da revisão final: acesso conferido no servidor, bloqueio de novo login, ordem de eventos
-- sem corrida e registro bruto de tudo o que a Eduzz envia.

-- O app pergunta ao servidor se o acesso continua valendo (a RLS só protege os dados do aluno).
create function public.meu_acesso() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select a.status from public.alunos a where a.email = public.email_do_token()), 'inexistente')
$$;
revoke execute on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated, service_role;

-- Bloquear = encerrar as sessões E impedir que o aluno peça um código novo.
create or replace function public.encerrar_sessoes(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  update auth.users set banned_until = now() + interval '100 years' where lower(btrim(email)) = lower(btrim(p_email));
  delete from auth.sessions where user_id in (select id from auth.users where lower(btrim(email)) = lower(btrim(p_email)));
end;
$$;

create function public.reativar_login(p_email text) returns void
language sql security definer set search_path = public, auth as $$
  update auth.users set banned_until = null where lower(btrim(email)) = lower(btrim(p_email))
$$;
revoke execute on function public.reativar_login(text) from public, anon, authenticated;
grant execute on function public.reativar_login(text) to service_role;

-- Tudo o que chega autenticado é guardado bruto antes de ser interpretado (nada se perde se o formato mudar).
create table public.eventos_brutos (
  id uuid primary key default gen_random_uuid(),
  recebido_em timestamptz not null default now(),
  payload jsonb not null
);
alter table public.eventos_brutos enable row level security;
revoke all on public.eventos_brutos from anon, authenticated;

create function public.registrar_evento_bruto(p_payload jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.eventos_brutos (payload) values (p_payload)
$$;
revoke execute on function public.registrar_evento_bruto(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_evento_bruto(jsonb) to service_role;

-- Eventos do mesmo e-mail são serializados (trava) e a escrita só vale se não houver um mais novo.
create or replace function public.aplicar_evento_eduzz(
  p_event_id text, p_email text, p_status text, p_ocorrido_em timestamptz, p_payload jsonb
) returns table (resultado text, status_final text)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(p_email));
  v_inseriu int;
  v_ultimo timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext(v_email));

  insert into public.eventos_eduzz (event_id, payload) values (p_event_id, p_payload)
  on conflict (event_id) do nothing;
  get diagnostics v_inseriu = row_count;

  if v_inseriu = 0 then
    return query select 'duplicado'::text, coalesce((select a.status from public.alunos a where a.email = v_email), p_status);
    return;
  end if;

  select a.eduzz_ultimo_evento_em into v_ultimo from public.alunos a where a.email = v_email;

  if v_ultimo is not null and v_ultimo > p_ocorrido_em then
    return query select 'antigo'::text, (select a.status from public.alunos a where a.email = v_email);
    return;
  end if;

  insert into public.alunos (email, status, eduzz_ultimo_evento_em)
  values (v_email, p_status, p_ocorrido_em)
  on conflict (email) do update set status = excluded.status, eduzz_ultimo_evento_em = excluded.eduzz_ultimo_evento_em
    where public.alunos.eduzz_ultimo_evento_em is null or public.alunos.eduzz_ultimo_evento_em <= excluded.eduzz_ultimo_evento_em;
  get diagnostics v_inseriu = row_count;

  if v_inseriu = 0 then
    return query select 'antigo'::text, (select a.status from public.alunos a where a.email = v_email);
    return;
  end if;

  return query select 'aplicado'::text, p_status;
end;
$$;
