# Kabina Hanspaulka v2.8.1

Změna záložky **ID hráčů**:
- je dostupná úplně všem, i bez přihlášení,
- zobrazuje všechny aktivní hráče,
- u každého ukazuje ID hráče a číslo dresu,
- hráči, kteří u nejbližšího zápasu potvrdili **Přijdu**, jsou zvýrazněni zeleně,
- zelené zvýraznění se aktualizuje podle týmové docházky.

Součástí `supabase/update-v2.8.1.sql` jsou i všechny změny z v2.8.0, takže pokud v2.8.0 ještě nebyla spuštěna, stačí spustit pouze v2.8.1.

Postup:
1. Supabase → SQL Editor → spusť `supabase/update-v2.8.1.sql`.
2. Nahraj celý obsah projektu na GitHub.
3. Počkej na Vercel Ready.
