alter table public.match_results add column if not exists took_bibs boolean not null default false;
update public.players set name='Damian Matłoka',updated_at=now() where name='Mateusz Wachowski';
