# Kabina Hanspaulka v3.2.1

Hotfix v3.2.0.

Opravena JSX syntaktická chyba v novém přehledu událostí v Historii, kvůli které Vercel hlásil `Unexpected token` v `components/KabinaApp.tsx`.

Funkce zůstávají:
- minuty, ŽK, ČK a ★ hráč zápasu ve Statistikách,
- střelci a minuty gólů v Historii,
- karty a hráč zápasu u konkrétního utkání,
- data od roku 2020.

Není potřeba nový SQL. Po nasazení dej Správa → Obnovit PSMF.
