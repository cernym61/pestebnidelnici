# Kabina Hanspaulka v3.0.1

Diagnostická oprava Kabina AI.

- Správce nyní uvidí skutečný důvod, proč OpenRouter požadavek selhal.
- Rozliší se například:
  - chybějící `OPENROUTER_API_KEY`,
  - OpenRouter 401 / 402 / 429 / jiná chyba,
  - chybějící tabulka `ai_requests`,
  - chyba některé sportovní tabulky nebo sloupce v Supabase.
- Běžní hráči stále dostanou jen bezpečný fallback bez technických detailů.
- AI zůstává na `openrouter/free`.

Po nasazení polož jako admin jeden dotaz a pošli přesný řádek `Technická diagnostika: ...`.
