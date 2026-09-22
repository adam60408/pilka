# Ranking wtorkowej sali v3

## Zmiany
- brak obecności: 0 pkt,
- obecność i porażka: 1 pkt,
- remis: 2 pkt,
- zwycięstwo: 3 pkt,
- Mateusz Wachowski zmieniony na Damian Matłoka,
- administrator oznacza osobę zabierającą znaczniki przełącznikiem Z,
- czerwony znaczek Z przy nazwisku w rankingu; liczba oznacza ile razy zawodnik zabierał znaczniki,
- kolumna Forma pokazuje pięć ostatnich terminów: zielony ✓, czerwony ×, szary −, puste pole za nieobecność,
- edycja historycznych meczów obejmuje również znaczniki.

## Instalacja
1. Uruchom `supabase-migration-v3.sql` w Supabase SQL Editor.
2. Wgraj pozostałe pliki do głównego katalogu publicznego repozytorium `pilka`, zastępując stare pliki.
3. GitHub Actions wdroży aplikację automatycznie.

## Punktacja bez bonusów
Ranking obejmuje wyłącznie punkty meczowe: brak obecności 0, porażka 1, remis 2, zwycięstwo 3. Nie są naliczane żadne bonusy za kolejne obecności.
