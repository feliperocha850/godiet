-- Aplica um aviso da Eduzz de forma atômica: ignora repetidos e eventos mais antigos que o último aplicado.
create function public.aplicar_evento_eduzz(
  p_event_id text, p_email text, p_status text, p_ocorrido_em timestamptz, p_payload jsonb
) returns table (resultado text, status_final text)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(p_email));
  v_inseriu int;
  v_ultimo timestamptz;
begin
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
  on conflict (email) do update set status = excluded.status, eduzz_ultimo_evento_em = excluded.eduzz_ultimo_evento_em;

  return query select 'aplicado'::text, p_status;
end;
$$;

revoke execute on function public.aplicar_evento_eduzz(text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_evento_eduzz(text, text, text, timestamptz, jsonb) to service_role;
