# Kabina Hanspaulka v3.4.0

## Kabina AI – kvalitnější odpovědi
Prompt byl rozšířen tak, aby AI nebyla strohá.

Při dotazu na konkrétního hráče má vracet mini-profil:
- zápasy
- minuty
- góly a průměr na zápas
- poslední známý start
- poslední známý gól včetně soupeře/minuty, pokud je v datech
- ŽK / ČK
- ★ hráč zápasu
- kapitán
- brankářské zápasy + inkasované góly/průměr, pokud hráč chytal
- krátký kariérní nebo sezonní kontext

Maximální délka odpovědi byla zvýšena.

## AI vzhled
Kabina AI má nový, čistší box:
- menší hlavičku,
- badge Historie týmu od 2015,
- kompaktní composer,
- modernější návrhy dotazů,
- oddělenou kartu odpovědi.

## Limity
Odstraněny vlastní umělé limity Kabiny:
- už není max. 5 dotazů na hráče/den,
- už není max. 40 dotazů za tým/den.

Používají se pouze skutečné bezplatné limity poskytovatelů (Gemini Free / OpenRouter Free fallback).

Pokud bezplatná AI vrátí 429 a není dostupný další free provider, uživatel uvidí:
`Bezplatný limit AI je pro tuto chvíli vyčerpaný. Zkus to znovu později.`

U odpovědi se už nezobrazuje nesmyslné „1 dotaz zbývá dnes“.

## Nasazení
Není potřeba nový SQL ani nový API klíč.
