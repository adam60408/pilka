-- Wykonaj RAZ w Supabase SQL Editor przed wdrożeniem aplikacji v3.
-- Skrypt nie usuwa meczów ani wyników.

alter table public.match_results
  add column if not exists took_bibs boolean not null default false;

update public.players
set name = 'Damian Matłoka', updated_at = now()
where name = 'Mateusz Wachowski';

-- Uprawnienia pozostają zgodne z istniejącymi politykami RLS,
-- ponieważ took_bibs jest kolumną tabeli match_results.
