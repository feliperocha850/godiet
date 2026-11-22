-- Encerra todas as sessões de login de um e-mail (usado quando a compra é reembolsada ou contestada).
create function public.encerrar_sessoes(p_email text) returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.sessions where user_id in (select id from auth.users where lower(email) = lower(btrim(p_email)))
$$;

revoke execute on function public.encerrar_sessoes(text) from public, anon, authenticated;
grant execute on function public.encerrar_sessoes(text) to service_role;
