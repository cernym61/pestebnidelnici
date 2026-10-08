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


## v3.7.0 — interaktivní mapa hřišť

Přibyla záložka **Mapa hřišť**.

Vzhled je inspirován mapou s modrými cluster bublinami:
- interaktivní OpenStreetMap mapa
- zoom + / −
- modré cluster bubliny při oddálení
- jednotlivé hřiště jako pin
- nejbližší hřiště / zápas je zvýrazněný oranžovo-červeným fotbalovým pinem
- kliknutí na hřiště otevře popup s názvem, adresou a počtem zápasů
- tlačítko Detail hřiště používá existující modal s Google Maps / Waze
- tlačítko ⌖ vpravo dole vrátí pohled na všechna hřiště
- mobilní mapa je optimalizovaná pro iPhone

Souřadnice se při prvním otevření doplní z adres přes OpenStreetMap Nominatim a uloží se do Supabase, takže další otevření je rychlé.

### SQL
Spusť jednou:
`supabase/update-v3.7.sql`

Přidá sloupce `latitude` a `longitude` do tabulky `venues`.


## v3.7.1 — oprava mapy hřišť

Chyba byla v kontrole souřadnic:
JavaScript převádí `null` přes `Number(null)` na `0`.
API proto považovalo prázdné `latitude/longitude` za platné `0,0` a všech 43 hřišť skončilo v Guinejském zálivu.

Oprava:
- `null`, prázdné hodnoty a `0,0` už nejsou považované za platné souřadnice,
- souřadnice mimo rozumný rozsah pro ČR se zahodí,
- hřiště bez správných souřadnic se znovu geokódují podle adresy,
- Mapa hřišť je přesunuta na konec veřejných záložek.

### SQL
Spusť jednou:
`supabase/update-v3.7.1.sql`

Tím se smažou chybné uložené souřadnice a při dalším otevření mapy se doplní správně.


## v3.7.2 — oprava dlouhého načítání mapy

Předchozí verze se při prvním otevření pokoušela geokódovat všech ~43 hřišť v jediném serverovém requestu.
Kvůli slušnému limitu cca 1 požadavek/s to trvalo přes 40 sekund a serverless request mohl skončit timeoutem.

Nově:
- API zpracuje maximálně 5 chybějících hřišť na jeden request,
- mapa se zobrazí okamžitě v Praze,
- souřadnice se doplňují postupně na pozadí,
- horní text ukazuje počet zbývajících hřišť,
- po dokončení se všechny souřadnice uloží v Supabase a další otevření mapy už je okamžité.

Není potřeba nový SQL oproti v3.7.1.


## v3.7.3 — oprava `Map data failed`

Mapové API je odolnější vůči výpadku / pomalé odpovědi OpenStreetMap geokódování:
- geokódování má timeout 3,5 s,
- zpracovávají se jen 2 nová hřiště na jeden request,
- chyba geokódování jednoho hřiště už neshodí celé API,
- hledání je omezené na ČR,
- pokud přesná adresa nevyjde, zkusí se název hřiště + Praha,
- pomocné dotazy na počty zápasů už nemohou shodit mapu,
- při chybě se zobrazí konkrétní serverová zpráva a tlačítko „Zkusit znovu“.

Nový SQL není potřeba.


## v3.7.4 — dotyková mapa + stabilní detail hřiště

Opraveny dva problémy mapy:

### 1. Po použití + / − nešlo mapou pohybovat prstem
Příčina byla v průběžném načítání souřadnic. Každá nová dávka hřišť znovu překreslovala cluster a volala `fitBounds`, takže se uživateli mapa vracela zpět a působilo to, jako kdyby dragging nefungoval.

Nově:
- Leaflet mapa se vytvoří pouze jednou,
- nové piny se jen postupně přidávají,
- po prvním ručním zoomu nebo posunu se už mapa sama nepřesouvá,
- dragging, touch zoom a double-tap zoom jsou explicitně povolené,
- mapa má vlastní touch gesture plochu na iPhonu.

### 2. Detail hřiště mizel
Callback z mapy je stabilní a mapa se při otevření detailu znovu neinicializuje.
Modal detailu se navíc už nezavírá kliknutím mimo něj.

Detail zůstane otevřený, dokud:
- uživatel nedá **X**,
- neklikne **Google Maps**,
- nebo **Waze**.

Nový SQL není potřeba.


## v3.7.5 — volitelná aktuální poloha

Na mapě přibylo tlačítko **Moje poloha**.

- poloha se nikdy nezjišťuje automaticky,
- prohlížeč / iPhone si vyžádá souhlas uživatele,
- po povolení se zobrazí modrý bod a orientační kruh přesnosti,
- mapa se přiblíží na aktuální polohu,
- hřiště a clustery zůstávají normálně ovladatelné,
- pokud uživatel polohu zakáže, mapa funguje dál bez ní.

Aktuální poloha se neukládá do Supabase ani nikam neposílá; používá se pouze lokálně v prohlížeči pro zobrazení na mapě.

Nový SQL není potřeba.


## v3.7.6 — detail hřiště nad mapou + spolehlivější poloha na iPhone

### Detail hřiště
Leaflet používá vlastní vrstvy s vysokým `z-index`, zatímco původní modal měl `z-index: 100`.
Proto se část mapy vykreslovala přes detail hřiště.

Opraveno:
- všechny modaly jsou nad Leaflet mapou,
- detail hřiště má vlastní ještě vyšší vrstvu,
- mapa už nikdy nepřekryje adresu, Google Maps ani Waze.

### Moje poloha
iPhone může při okamžitém `enableHighAccuracy: true` čekat na GPS a skončit timeoutem.

Nově:
1. aplikace nejdřív zkusí rychlou síťovou / poslední známou polohu,
2. okamžitě ji zobrazí na mapě,
3. potom ji na pozadí zpřesní pomocí GPS,
4. když první pokus selže, provede ještě jeden delší GPS pokus.

Poloha se stále nikam neukládá ani neposílá do Supabase.

Nový SQL není potřeba.


## v3.7.7 — jednodušší příspěvky na Nástěnce

- pole **Text příspěvku** bylo odstraněno
- zůstává pouze **Nadpis**
- nadpis je v editoru výraznější a tučnější
- backend stále dostane interní `body`, aby nebylo potřeba měnit databázi ani API
- pokud je interní body stejné jako nadpis, na publikovaném příspěvku se už duplicitně nezobrazuje

Nový SQL není potřeba.


## v3.7.8 — Vzájemné zápasy

- jako výchozí soupeř se automaticky vybere tým z nejbližšího naplánovaného zápasu
- pokud se nejbližší soupeř změní, výběr se automaticky přepne
- uživatel může stále ručně vybrat jiný tým
- u aktuálního soupeře se zobrazí zvýraznění „Teď hrajeme proti tomuto týmu“
- každý historický zápas nově ukazuje celý datum včetně roku
- každý zápas ukazuje rok, divizi/ligu (např. 5D) a část sezóny (jaro/podzim), pokud jsou tato data v tabulce `seasons`

Nový SQL není potřeba.


## v3.7.9 — čitelnější štítky ve Vzájemných zápasech

Rok, liga/divize a část sezóny (jaro/podzim) jsou lehce zvětšené:
- větší písmo
- o něco větší vnitřní odsazení
- stále zůstávají nenápadné vůči výsledku a týmům

Na mobilu jsou jen mírně menší, aby se dobře vešly.

Nový SQL není potřeba.


## v3.8.0 — Nástěnka jako týmové ankety / akce

### Aktivní anketa nahoře
Aktivní ankety jsou vždy úplně nahoře na Nástěnce.
Pokud uživatel ještě nehlasoval, karta je zvýrazněná a obsahuje badge „Hlasuj teď“.

### Každý může vytvořit anketu
Každý přihlášený aktivní hráč může vytvořit příspěvek / anketu.
Hromadný e-mail a push při publikaci zůstává z bezpečnostních důvodů dostupný jen adminovi a kapitánovi.

### Datum
Anketa může mít datum akce.
Po skončení daného data:
- běžným hráčům z Nástěnky zmizí,
- admin ji dál vidí v šedé sekci „Historie anket“.

### Kdo hlasoval
Pod každou možností ankety jsou vidět konkrétní hráči, kteří pro ni hlasovali.

### Reminder
Autor ankety a admin vidí tlačítka:
- Připomenout push
- Připomenout e-mailem

Reminder se pošle pouze registrovaným aktivním hráčům, kteří v dané anketě ještě nehlasovali.

### Fotka
K anketě lze nahrát JPG / PNG / WEBP do 7 MB.
Fotografie se použije jako pozadí aktivní ankety.

### SQL
Spusť jednou:
`supabase/update-v3.8.sql`

Přidá `event_date`, `background_url` a vytvoří public Storage bucket `board-images`.


## v3.8.1 — editor fotografie ankety

Po výběru fotografie do pozadí se zobrazí jednoduchý editor:

- náhled ve výsledném poměru **16:9**
- **Přiblížení** 100–250 %
- **Posun vodorovně**
- **Posun svisle**
- tlačítko **Obnovit**
- možnost fotografii odebrat

Při publikaci se fotografie v prohlížeči skutečně ořízne podle zvoleného nastavení a nahraje se už hotový výřez v rozměru 1600 × 900 px. Nastavení tedy není jen náhled — výsledná anketa používá přesně vytvořený výřez.

Nový SQL není potřeba.


## v3.8.2 — odebrání možností ankety

Každá odpověď v editoru ankety má nově vlastní tlačítko **×**.

- lze smazat libovolnou možnost, včetně předvyplněného Ano / Ne
- lze se dostat i na 0 nebo 1 možnost a následně přidat nové vlastní odpovědi
- publikování ankety zůstává chráněné: pro platnou anketu musí být alespoň 2 neprázdné možnosti
- pokud jich zbývá méně, editor na to upozorní

Nový SQL není potřeba.


## v3.9.0 — ankety: nehlasující, komentáře, notifikace + historické sestavy

### Kdo ještě nehlasoval
Každá aktivní anketa zobrazuje i registrované aktivní hráče, kteří ještě nehlasovali.

### Komentáře u ankety
Pod anketou lze:
- přidat komentář
- odpovědět na konkrétní komentář

Pokud někdo odpoví na tvůj komentář, OneSignal pošle push přímo tobě.
Běžný nový komentář neposílá push všem; místo toho ostatním zvýší červený badge u Nástěnky.
Badge kombinuje:
- nevyplněné aktivní ankety
- nové nepřečtené komentáře

Komentáře se kontrolují také při návratu do aplikace a průběžně každých 30 s.

### Datum ankety
Na desktopu je datum aktivní ankety výrazně větší.

### Historie / Vzájemné zápasy
Pokud jsou pro daný historický zápas načtená PSMF detailní data, je u zápasu nové tlačítko **Zobrazit sestavu**.
Po rozkliknutí se zobrazí naše sestava a označení:
- 🧤 brankář
- C kapitán
- ★ hráč zápasu

### Iniciály
Fallback avatary s iniciálami jsou natvrdo centrované horizontálně i vertikálně, včetně malých bublinek v anketách.

### SQL
Spusť jednou:
`supabase/update-v3.9.sql`

Vytvoří tabulky pro komentáře anket a evidenci posledního přečtení Nástěnky.


## v3.9.1 — testovací e-mail ankety + zrušení hlasu

- V editoru ankety je tlačítko **Poslat test ankety sobě**.
- Test se odešle přes Resend na e-mail právě přihlášeného uživatele.
- Použije aktuální rozepsaný nadpis, otázku, možnosti a datum.
- Pokud je editor ještě prázdný, odešle ukázkovou anketu.
- Po hlasování se zobrazuje tlačítko **Zrušit hlas**.
- Zrušení hlasu smaže vlastní hlas a hráč se znovu objeví mezi „Ještě nehlasovali“.

Nový SQL není potřeba.


## v3.10.0 — automatické přepínání sezón PSMF

Kabina už není napevno svázaná s `2026-podzim / 5D`.

### Jak přechod funguje
- každý den dál běží Vercel cron `/api/sync-psmf`
- dokud má aktuální sezóna na PSMF nadcházející zápasy, nic se nemění
- jakmile má sezóna odehrané zápasy a PSMF už pro tým nemá žádný další nadcházející zápas, Kabina ji považuje za skončenou
- automaticky vypočítá sezonu, která má následovat:
  - `jaro YYYY` → `podzim YYYY`
  - `podzim YYYY` → `jaro YYYY+1`
- na stránce nové soutěže PSMF projde zveřejněné skupiny a hledá **Pěstební dělníci A**
- jakmile tým najde, sama zjistí novou divizi i přesnou URL týmové stránky a přepne aktuální sezonu
- není tedy potřeba předem vědět, zda tým bude například v 4C, 5D nebo jiné skupině

### Stav mezi sezonami
Pokud nová sezóna ještě není zveřejněná:
- stará sezóna zůstane uložená jako poslední
- na Zápasech se zobrazí:
  **„Sezóna skončila. Čekáme na vyhlášení Jaro 2027.“**
- Kabina zároveň vysvětlí, že novou sezonu kontroluje automaticky každý den

Pokud PSMF už novou sezonu / týmovou skupinu zveřejní, ale ještě nemá rozpis zápasů:
- Kabina se přepne na novou sezonu
- zobrazí stav **„Rozpis se připravuje“**
- jakmile PSMF doplní rozpis, zápasy se načtou automaticky

### Dynamická data
Po přepnutí se automaticky změní:
- aktuální sezóna
- divize
- odkaz na PSMF
- zápasy
- tabulka
- aktuální hráčské statistiky
- označení sezóny ve Statistikách
- nová sezóna se zároveň uloží do Historie, včetně detailních dat PSMF

### SQL
Spusť jednou:
`supabase/update-v3.10.sql`

Vytvoří tabulku `season_state`, která drží aktuální sezonu a stav čekání na následující sezonu.


## v3.10.1 — responsive audit pro iPhone, Android, Samsung a iPad

Prošel jsem kritické části rozhraní pro šířky typické pro:
- 320–360 px (užší Androidy)
- 375–430 px (iPhone / Samsung / běžné Androidy)
- 768–820 px (iPad / menší tablety)
- 1024 px (tablet landscape)

Opravy:
- tabulky už nemohou roztáhnout celý web; horizontálně scrolluje pouze tabulka
- dlouhé názvy hráčů a týmů se bezpečně zalamují
- zápasové řádky mají `minmax(0,1fr)` a nepřetékají
- Historie a Vzájemné zápasy jsou bezpečnější pro dlouhé názvy
- Nástěnka, ankety, komentáře a seznam nehlasujících se vejdou i na úzké displeje
- admin formuláře se na telefonu skládají do jednoho sloupce
- source card, hlavička a tlačítka jsou upravené pro Android i tablety
- fallback pro 320–360 px skládá účast do jednoho sloupce
- opraveno přetékání textu v buňkách a čipech

Nový SQL není potřeba.


## v3.11.0 — neveřejná týmová kabina

Po otevření webu nepřihlášený návštěvník nejdřív vidí pouze vstupní bránu:

- Přihlásit
- Vytvořit účet
- Pokračovat jako host

### Člen týmu
Po přihlášení a platném propojení s aktivním hráčem vidí všechny týmové záložky.

### Host
Host vidí pouze záložku **Tabulka**.
Nevidí zápasy, účast, nástěnku, statistiky, historii, vzájemné zápasy, mapu, ID hráčů ani správu.
Hostovský režim se pamatuje jen pro aktuální relaci prohlížeče.

### Bezpečná registrace
Registrace už nestačí pouze výběrem jména.

Každý dosud nezaregistrovaný hráč má vlastní jednorázový osmimístný registrační kód.
- registrovaná jména se v nabídce registrace vůbec nezobrazují
- jméno lze propojit pouze se správným kódem
- po úspěšném propojení se kód automaticky zneplatní
- stará funkce `claim_player`, která uměla propojit hráče pouze podle jména, je zakázána

Admin vidí kódy ve **Správa týmu** pouze u hráčů bez účtu a může tlačítkem vygenerovat nový kód.
Kód hráči pošle soukromě.

### Ochrana dat
Anonymní uživatel už nemá přímé čtení:
- zápasů
- hráčů
- hřišť
- historie
- historických tabulek
- hráčských statistik

Veřejná zůstává pouze ligová **Tabulka**, protože tu smí vidět host.
API pro historické detaily a mapu nově také vyžadují přihlášeného aktivního hráče.

### SQL
Spusť jednou:
`supabase/update-v3.11.sql`


## v3.12.0 — automatické kódy pro nové hráče + ruční přidání hráče

### Co se děje automaticky
- stávající hráči, kteří už mají účet, zůstávají beze změny
- každý nový aktivní hráč bez účtu automaticky dostane jednorázový registrační kód
- to platí i pro hráče, kterého později načte synchronizace z PSMF
- po propojení účtu se registrační kód zneplatní

### Nový hráč ještě není na PSMF
Admin může ve Správě týmu použít **Přidat nového hráče**.
Stačí zadat jméno. Profil se vytvoří jako aktivní a automaticky dostane registrační kód.

Pokud se později na PSMF objeví pod stejným jménem, běžný PSMF upsert aktualizuje existující profil místo vytvoření nového.

### SQL
Pro jednoduchost je `supabase/update-v3.12.sql` samostatná kumulativní migrace:
obsahuje zabezpečení z v3.11 i nové funkce z v3.12.
Pokud v3.11 ještě nebyla spuštěna, stačí spustit pouze `update-v3.12.sql`.


## v3.12.1 — čísla dresů + odstranění hráče

- opraven desktopový vzhled čísel dresů v záložce ID hráčů; responsive globální pravidlo už nesmrští zelený badge
- admin může odstranit hráče bez účtu tlačítkem **Odstranit hráče**
- hráče s již propojeným účtem nelze omylem smazat; nejdřív je nutné účet odpojit
- pokud je odstraněný hráč stále na PSMF, další synchronizace jej může znovu načíst

SQL: spusť `supabase/update-v3.12.1.sql`. Je kumulativní a bezpečný k opětovnému spuštění.


## v3.12.2 — přepínání CZ / EN na vstupní obrazovce

- na neveřejné úvodní obrazovce je nově přepínač **CZ / EN**
- překládá přihlášení, registraci, hosta i registrační formulář ještě před vstupem do aplikace
- zvolený jazyk se uloží v prohlížeči a zůstane nastavený i při další návštěvě
- případné přepnutí jazyka uvnitř aplikace používá stejné uložené nastavení

SQL není potřeba.


## v3.12.3 — automaticky mizející oznámení

- odstraněna blokující browserová `alert()` okna, kde bylo nutné klikat na OK
- po vytvoření ankety, přidání hráče, změně fotky, synchronizaci, odeslání reminderu apod. se zobrazí jen malé oznámení nahoře
- oznámení samo zmizí přibližně po 3 sekundách
- chyby se zobrazují červeně, informační zprávy neutrálně
- potvrzení před destruktivní akcí (např. smazání hráče/příspěvku) zůstává schválně, aby nešlo něco smazat omylem

SQL není potřeba.


## v3.12.4 — GitHub deployment package

Balíček sjednocuje aktuální stav aplikace a přidává doporučenou bezpečně opakovatelnou databázovou migraci:
`supabase/update-v3.12.4.sql`.

Pro nasazení této verze stačí nahrát celý obsah do GitHubu a spustit uvedený SQL v Supabase.


## v3.12.5 — kontrola registračního kódu před ověřovacím e-mailem

Před `supabase.auth.signUp()` aplikace nově volá databázovou funkci `validate_signup_code`.
Ověří:
- hráč je aktivní
- ještě nemá účet
- registrační kód přesně odpovídá

Teprve poté se vytvoří Auth účet a Supabase odešle potvrzovací e-mail.
Neplatný / použitý kód tedy už nevytváří zbytečný účet ani ověřovací e-mail.

SQL: `supabase/update-v3.12.5.sql`
