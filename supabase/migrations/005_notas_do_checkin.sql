-- Anotações livres de cada item do check-in (ex.: {"agua": "bebi 2 litros"}). Mesmas regras de acesso da tabela.
alter table public.checkins add column notas jsonb not null default '{}'::jsonb;
