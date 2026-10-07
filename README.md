# Kabina Hanspaulka v3.4.1

Oprava Kabina AI.

## Proč v3.4.0 stále padala do fallbacku
Gemini REST požadavek používal nesprávný název pole `system_instruction`.
Správně je `systemInstruction`.

Současně byla AI přesunuta na stabilní bezplatný model:
`gemini-3.7-flash`

Google u Gemini 3.7 Flash aktuálně uvádí Free Tier zdarma.

## Chování při limitech
- Žádný vlastní limit Kabiny už neexistuje.
- 429 z free poskytovatele → uživatel dostane:
  `Bezplatný limit AI je pro tuto chvíli vyčerpaný. Zkus to znovu později.`
- Jiná chyba →:
  `Kabina AI je právě dočasně nedostupná. Zkus dotaz znovu za chvíli.`
- Web už při chybě AI nepředstírá odpověď lokálním fallbackem.

## Vzhled
AI box byl kompletně překreslen:
- tmavá zelená hlavička,
- nový prompt bar,
- čtyři kompaktní rychlé dotazy,
- samostatná karta odpovědi,
- viditelný badge `v3.4.1`, takže lze na první pohled ověřit, že běží správný deployment.

## Nasazení
Není potřeba SQL ani nový API key.
