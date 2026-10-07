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


## v3.6.2 — build hotfix

Opraven TypeScript build error ve funkci pro horizontální posun statistik.

`useRef<HTMLDivElement>(null)` vrací referenci, jejíž `current` může být `null`.
Helper nyní správně přijímá `{ current: HTMLDivElement | null }`.

Žádná funkce se nemění a není potřeba nový SQL.


## v3.6.3 — automatické aktualizace iPhone + soukromí

### iPhone „Přidat na plochu“
iOS může standalone webovou aplikaci držet dlouho otevřenou / v cache.
v3.6.3 proto:
- při otevření aplikace kontroluje `/api/app-version`,
- stejnou kontrolu udělá při návratu aplikace do popředí,
- při novém deploymentu automaticky otevře URL s novým `appv`,
- hlavní dokument `/` dostává `no-store / no-cache` hlavičky.

Uživatel tedy nemusí mazat ikonu z plochy a přidávat web znovu.

### Soukromí
Nástěnka, příspěvky a ankety jsou dostupné pouze přihlášeným aktivním hráčům.
Záložka Nástěnka se nepřihlášenému návštěvníkovi vůbec nezobrazuje.

Účast na zápase:
- attendance tabulka je přes RLS dostupná jen přihlášeným,
- seznam hráčů se zvýrazněnou účastí je nově také pouze pro přihlášené aktivní hráče,
- `public_player_roster` už není přístupný roli `anon`,
- ID hráčů se nepřihlášenému návštěvníkovi nezobrazuje.

Veřejný návštěvník tedy neuvidí kdo jde / nejde / váhá ani počty odpovědí.

### SQL
Spusť:
`supabase/update-v3.6.3.sql`

Pokud jsi ještě nespustil SQL pro Nástěnku, spusť předtím také:
`supabase/update-v3.6.sql`


## v3.6.4 — iPhone / mobilní rozhraní

Web má nově samostatně doladěné chování pro telefony.

### Statistiky
Na mobilu se už nepoužívá široká tabulka s horizontálním scrollbarem.
Každý hráč se zobrazí jako přehledná karta:
- zápasy + minuty
- góly
- ŽK / ČK
- ★ hráč zápasu
- kapitán
- brankář
- inkasované góly, pokud chytal

Desktopová tabulka zůstává beze změny na PC.

### Další mobilní úpravy
- kompaktnější hero a zápasová karta
- sticky horizontální navigace
- lepší rozložení historie a H2H
- nástěnka a ankety optimalizované pro dotyk
- formulářová pole mají 16 px, aby Safari při psaní automaticky nezoomoval
- lepší modaly
- respektuje iPhone safe-area / Home Indicator
- užší rozestupy a radiusy vhodné pro menší displej

Není potřeba žádný nový SQL.


## v3.6.5 — mobilní Statistiky: Tabulka / Karty

Na telefonu je nahoře ve Statistikách nový přepínač:
- **Tabulka** — výchozí, kompaktní přehled hráčů
- **Karty** — detailnější mobilní karty z v3.6.4

Kompaktní mobilní tabulka zobrazuje:
- hráče
- zápasy
- góly
- ★ hráče zápasu
- kapitánství
- zápasy v bráně

Na desktopu se nic nemění a zůstává plná tabulka.

Není potřeba nový SQL.


## v3.6.6 — jednodušší účast na zápase

Účast má nově pouze dvě aktivní odpovědi:
- **Přijdu**
- **Nepřijdu**

Volba **Zatím nevím** byla z UI odstraněna.

V týmovém přehledu jsou tři skupiny:
- Přijdu
- Nepřijdu
- **Nevyjádřil se**

Do „Nevyjádřil se“ se počítají pouze aktivní hráči, kteří už mají vytvořený / propojený účet (`user_id` není NULL) a na aktuální zápas ještě neodpověděli Ano/Ne.

Horní počítadlo je nově:
`počet vyjádřených / počet registrovaných hráčů`

Staré hodnoty `maybe` v databázi se v novém UI berou jako nevyjádřená odpověď. Nový SQL není potřeba.


## v3.6.7 — push notifikace primárně nevyjádřeným

Ve Správě se při otevření sekce push automaticky předvyberou:
- aktivní hráči,
- kteří mají propojený účet,
- a u nejbližšího zápasu nemají odpověď Přijdu / Nepřijdu.

Příjemci označení „Nevyjádřil se“ jsou v seznamu zvýraznění.

Rychlé volby:
- **Nevyjádření** — znovu vybere jen ty, kteří neodpověděli
- **Vybrat všechny**
- **Zrušit výběr**

Prázdný výběr už z bezpečnostních důvodů neznamená „poslat všem“. Bez vybraného příjemce se push neodešle.

Není potřeba nový SQL.
