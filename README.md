# Kabina Hanspaulka v3.2.0

## Statistiky
V záložce Statistiky jsou nově vidět přímo na webu:
- zápasy
- minuty (1 start = 60 min)
- góly
- žluté karty
- červené karty
- ★ hráč zápasu

A to pro aktuální sezonu i kariéru od roku 2020.

## Historie
Každý odehraný zápas v Historii nově obsahuje dostupné události Pěstebních dělníků:
- ⚽ střelec + minuta gólu
- 🟨 žlutá karta (+ minuta, pokud je dostupná)
- 🟥 červená karta (+ minuta, pokud je dostupná)
- ★ hráč zápasu

Např.:
`⚽ 9' Landfeld Jan · 30' Jelenčiak Jakub`

Události jsou parsované z oficiálních detailů utkání PSMF od roku 2020.

## Nasazení
Pokud už byl spuštěn `supabase/update-v3.1.sql`, nový SQL není potřeba.

Po nasazení v3.2.0:
1. počkej na Vercel Ready,
2. otevři Správa,
3. klikni **Obnovit PSMF**.

Tím se detailní historie znovu načte a přepočítají se góly, karty a hvězdičky.
