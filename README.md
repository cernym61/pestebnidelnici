# Kabina Hanspaulka v3.6.0

## Novinka: týmová Nástěnka

Přibyla samostatná záložka **Nástěnka**.

### Správce a kapitán
Role `admin` a `captain` mohou zveřejnit nový příspěvek:
- nadpis
- text
- volitelná anketa
- 2 až 8 vlastních odpovědí
- volba „Poslat všem e-mail“
- volba „Poslat všem push notifikaci“

Admin může smazat libovolný příspěvek.
Kapitán může smazat vlastní příspěvek.

### Ankety
Každý přihlášený aktivní hráč může hlasovat.
Anketa je jednovýběrová:
- jeden hráč = jeden hlas
- kliknutím na jinou možnost lze hlas změnit
- výsledky se zobrazují živě jako počet hlasů + procenta

### E-mail
Pokud autor při publikaci zapne e-mail:
- zpráva jde všem aktivním hráčům s účtem a e-mailem
- obsahuje nadpis, text, případnou anketu a tlačítko přímo na Nástěnku
- používá stávající Resend konfiguraci

### Push
Pokud autor zapne push:
- notifikace jde všem aktivním hráčům s účtem
- doručí se těm, kteří mají OneSignal push povolený
- kliknutí na notifikaci otevře přímo Nástěnku
- používá stávající OneSignal konfiguraci

## Důležité — SQL
Před použitím spusť v Supabase SQL Editoru:

`supabase/update-v3.6.sql`

Tím se vytvoří:
- `team_posts`
- `team_post_poll_options`
- `team_post_votes`

Žádné nové environment proměnné nejsou potřeba.
AI zůstává odstraněná.


## v3.6.1 — navigační upozornění a lepší statistiky

- Nástěnka je hned za Zápasy.
- Zápasy mají červený badge `1`, pokud přihlášený hráč ještě neodpověděl na účast u nejbližšího zápasu.
- Nástěnka má červený badge s počtem anket, ve kterých přihlášený hráč ještě nehlasoval.
- Po zahlasování badge z Nástěnky automaticky zmizí / sníží se.
- Po vyplnění účasti zmizí badge ze Zápasů.
- Statistiky mají tlačítka pro posun tabulky vlevo/vpravo.
- Spodní scrollbar je vyšší a lépe uchopitelný.
- První sloupec s hráčem je při horizontálním posunu sticky, takže jméno zůstává vidět.

SQL z v3.6 (`supabase/update-v3.6.sql`) zůstává stejný; žádný nový SQL pro v3.6.1 není potřeba.
