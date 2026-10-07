# Kabina Hanspaulka v3.3.2

Hotfix k v3.3.1.

V `components/KabinaApp.tsx` byly po postupných úpravách duplicitní překladové klíče v objektu `copy`.
Next.js proto při TypeScript kontrole hlásil:

`An object literal cannot have multiple properties with the same name.`

v3.3.2 duplicitní klíče odstranila.

Funkce z v3.3.1 zůstávají:
- AI pouze ve Statistikách,
- vzájemné zápasy se střelci a minutami gólů,
- brankáři: počet zápasů + inkasované góly,
- historie od roku 2015,
- kapitáni a ★ hráč zápasu,
- Gemini jako primární free AI provider a OpenRouter jako fallback.

Není potřeba nový SQL.
