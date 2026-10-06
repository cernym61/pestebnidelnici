# Kabina Hanspaulka v3.1.1

Upřesnění statistik podle pravidel týmu.

## Minuty
Správce určil jednoduché pravidlo:
- každý evidovaný start = 60 minut,
- 1 zápas = 60 min,
- 5 zápasů = 300 min,
- 10 zápasů = 600 min.

AI dostává `assumed_minutes = games × 60` přímo v datovém kontextu a má toto pravidlo používat i pro historii od roku 2020.

## Hráč zápasu
Na PSMF je hráč zápasu označen hvězdičkou u jména.
Synchronizace se nyní pokouší převést hvězdičkové obrázky/markery na:
`[★ HRÁČ ZÁPASU]`

AI má hvězdičku u jména chápat jako oficiální označení hráče zápasu a nesmí si hráče zápasu vybírat sama.

## Karty
AI hledá žluté a červené karty v oficiálních detailech PSMF od roku 2020.
Pokud karta v datech uvedena není, nesmí ji domýšlet.

## Jazyk
Český kanál → pouze česky.
Anglický kanál → pouze anglicky.

## Nasazení
Není potřeba nový SQL.
Nahraj v3.1.1 na GitHub, počkej na Vercel Ready a potom ve Správě klikni na **Obnovit PSMF**, aby se znovu zpracovaly detailní stránky a hvězdičky.
