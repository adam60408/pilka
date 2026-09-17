# Ranking wtorkowej sali

Produkcyjna aplikacja React + Supabase + GitHub Pages.

## Konfiguracja
1. Uruchom `supabase-security.sql` w Supabase SQL Editor.
2. W repozytorium GitHub dodaj Actions secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. W Settings > Pages ustaw Source: GitHub Actions.
4. Wgraj wszystkie pliki do głównego katalogu repozytorium i zatwierdź.

Nigdy nie dodawaj klucza secret/service_role do repozytorium.
