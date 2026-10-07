# Kabina Hanspaulka v3.5.1

## Přesná oprava ★ hráče zápasu a kapitána

Podle skutečného HTML z PSMF:

```html
<span class="is-best">Jakub Jelenčiak</span>
<span class="is-captain">Mikuláš Veselý</span>
```

PSMF nevkládá znak ★ ani C jako běžný text. Vizuální symbol je generovaný pomocí CSS `::before`.
Proto předchozí parser znak na stránce „viděl“ jen vizuálně, ale v HTML textu nebyl.

v3.5.1 čte přímo CSS třídy:
- `is-best` = ★ hráč zápasu
- `is-captain` = kapitán

Před převodem HTML na text se tak přidá:
- `[★ HRÁČ ZÁPASU]` před jméno uvnitř `span.is-best`
- `[C KAPITÁN]` před jméno uvnitř `span.is-captain`

Po nasazení je nutné:
**Správa → Obnovit PSMF**

Nový SQL není potřeba.
AI zůstává odstraněná.
