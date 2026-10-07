# Kabina Hanspaulka v3.4.2

Oprava Gemini + dramatické zmenšení AI kontextu.

## Skutečný problém
Google AI Studio ukazovalo, že Gemini API klíč funguje. Předchozí verze ale:
1. posílala do Gemini obrovský balík celé historie PSMF (řádově stovky tisíc input tokenů na jediný dotaz),
2. používala v REST payloadu nesprávný camelCase název `systemInstruction`.

Oficiální REST příklad Gemini používá `system_instruction`.

## v3.4.2
- Gemini používá `gemini-3.7-flash` Free Tier.
- API klíč jde přes oficiální `x-goog-api-key` header.
- REST payload používá `system_instruction`.
- Do AI se už neposílá celé syrové HTML/text všech sezon.
- Server nejprve rozpozná hráče nebo soupeře a připraví malý strukturovaný profil.
- U dotazu na hráče server předem spočítá:
  - zápasy
  - minuty
  - góly / góly na zápas
  - sezonní rozpad
  - poslední start
  - poslední gól + zápas/minutu
  - ŽK / ČK
  - ★ hráč zápasu
  - kapitánské zápasy
  - brankářské zápasy, inkasované góly a průměr

To výrazně snižuje spotřebu Free Tieru a zrychluje odpověď.

Není potřeba SQL ani nový API klíč.
