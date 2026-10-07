# Kabina Hanspaulka v3.3.1

## Změny

### Kabina AI
AI box je nyní pouze v záložce **Statistiky**.
Ve **Vzájemných zápasech** už se nezobrazuje.

### Vzájemné zápasy
U každého vzájemného zápasu se kromě výsledku nově zobrazí:
- střelec gólu,
- minuta gólu,
- ★ hráč zápasu, pokud je v datech PSMF.

### Brankáři
Statistiky brankářů nyní počítají:
- kolikrát byl hráč brankářem,
- kolik gólů v těchto zápasech celkem inkasoval.

Brankář se určuje podle týmového pravidla:
**první hráč uvedený v sestavě = brankář**.

Příklad:
`Adam Kolář — 8 zápasů v bráně · 21 inkasovaných gólů`

## Nasazení
Nový SQL není potřeba.
Stačí nasadit v3.3.1. Pokud po nasazení některé starší zápasy nemají detaily,
klikni **Správa → Obnovit PSMF**.
