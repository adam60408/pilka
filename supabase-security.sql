-- Uruchom ten skrypt RAZ w Supabase SQL Editor.
-- Publiczny odczyt rankingu i historii; zapis tylko dla użytkownika z tabeli admins.

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.admins enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.players, public.matches, public.match_results to anon, authenticated;
grant select on public.admins to authenticated;
grant insert, update, delete on public.matches, public.match_results to authenticated;
grant update on public.players to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Usuń stare polityki o tych nazwach, aby skrypt był powtarzalny.
drop policy if exists "public read players" on public.players;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "public read match results" on public.match_results;
drop policy if exists "admin can see own role" on public.admins;
drop policy if exists "admin write matches" on public.matches;
drop policy if exists "admin update matches" on public.matches;
drop policy if exists "admin delete matches" on public.matches;
drop policy if exists "admin write results" on public.match_results;
drop policy if exists "admin update results" on public.match_results;
drop policy if exists "admin delete results" on public.match_results;
drop policy if exists "admin update players" on public.players;

create policy "public read players" on public.players for select to anon, authenticated using (true);
create policy "public read matches" on public.matches for select to anon, authenticated using (true);
create policy "public read match results" on public.match_results for select to anon, authenticated using (true);
create policy "admin can see own role" on public.admins for select to authenticated using (user_id = auth.uid());

create policy "admin write matches" on public.matches for insert to authenticated with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin update matches" on public.matches for update to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin delete matches" on public.matches for delete to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin write results" on public.match_results for insert to authenticated with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin update results" on public.match_results for update to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin delete results" on public.match_results for delete to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admin update players" on public.players for update to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
