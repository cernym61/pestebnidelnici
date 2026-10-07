# Kabina Hanspaulka v3.5.2

## ★ Hráč zápasu – oprava přímo z raw HTML

Předchozí chyba byla v architektuře:
`/api/history-events` stále počítalo role z `details_text`.

To znamenalo, že i když jsme při synchronizaci začali rozpoznávat `is-best`,
statistiky byly pořád závislé na již převedeném textu.

v3.5.2 proto čte přímo uložené `details_html`.

PSMF skutečně používá:
- `<span class="is-best">...` = ★ hráč zápasu
- `<span class="is-captain">...` = kapitán

CSS `::before` se už vůbec neřeší. Server vezme samotnou class z DOM,
vloží interní marker před konkrétní jméno a až potom parsuje zápas.

Hráč může být současně:
- `is-best`
- `is-captain`
- první v sestavě (brankář)

Role se navzájem nevylučují.

## Diagnostika
Přidán endpoint:
`/api/history-events-debug`

U každé sezony vrátí:
- kolikrát je v raw HTML `is-best`
- kolikrát `is-captain`
- kolik hráčů zápasu parser skutečně přiřadil
- konkrétní jména a datum

Díky tomu už nemusíme hádat, kde se role ztrácí.

## Po nasazení
Pokud už je `details_html` v databázi, nový sync není pro samotné čtení class nutný.
Pro jistotu aktuálnosti dat ale doporučeno:
Správa → Obnovit PSMF

SQL není potřeba.
AI zůstává odstraněná.
