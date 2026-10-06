# Kabina Hanspaulka v3.0.0

## Opravdový Kabina AI agent
Kabina AI nyní volá skutečný jazykový model přes **OpenRouter Free Models Router** (`openrouter/free`).

### Co umí
- volné otázky nad historií týmu,
- výpočty gólů a bodů napříč sezonami,
- porovnávání sezon,
- vzájemné zápasy,
- forma,
- hráčské statistiky,
- současná tabulka a soupeři,
- kombinované otázky typu „porovnej poslední dvě sezony a řekni, kdo byl nejlepší střelec“.

### Bezplatnost
OpenRouter Free má nulovou cenu za tokeny a Free plán má aktuálně 50 API requestů denně.
Kabina si proto hlídá vlastní rezervu:
- max. **5 AI dotazů na hráče denně**
- max. **40 AI dotazů za celý tým denně**
- při vyčerpání limitu nebo výpadku AI se automaticky použije dosavadní lokální statistický fallback.

Tím se Kabina sama nepřepne na placený model.

### Soukromí
Do AI se posílají pouze sportovní data: výsledky, tabulky, sezony a hráčské statistiky.
Neposílají se e-maily, hesla, komentáře ani auth údaje.

## Nasazení
1. Supabase → SQL Editor → spusť `supabase/update-v3.0.sql`.
2. OpenRouter → vytvoř API key.
3. Vercel → Environment Variables:
   - `OPENROUTER_API_KEY` = API key z OpenRouteru
   - Type: Secret
   - Environment: Production
4. Nahraj celý projekt na GitHub.
5. Počkej na Vercel Ready.

Správa fotografií adminem z v2.9 zůstává zachována.
