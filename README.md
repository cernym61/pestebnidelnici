# Kabina Hanspaulka v3.5.0

## AI odstraněna
Kabina AI je z webu kompletně pryč:
- žádný AI panel,
- žádné Gemini/OpenRouter volání,
- žádné AI klíče nejsou pro web potřeba.

## Oprava ★ hráče zápasu
Problém byl v HTML parseru, ne ve významu hvězdičky.

Na PSMF je vizuálně např.:
`★ Jan Dusil`

a kapitán:
`C Mikuláš Veselý`

Hvězdička a C ale mohou být v HTML jako samostatný element těsně před odkazem se jménem.
Při převodu HTML na čistý text se marker v předchozích verzích ztratil nebo oddělil od hráče.

v3.5.0:
1. zachová skutečné ★ / ⭐ před převodem HTML,
2. zachová samostatný badge C,
3. zachová ikonové varianty star/captain,
4. marker se přiřazuje jen hráči, jehož jméno je bezprostředně za ním,
5. první jméno sestavy dál znamená brankáře.

## Důležité po nasazení
Klikni:
**Správa → Obnovit PSMF**

Staré uložené detailní texty už některé hvězdičky neobsahují; nový sync je musí načíst z webu PSMF znovu.

Nový SQL není potřeba.
