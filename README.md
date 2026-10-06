# Kabina Hanspaulka v2.5

Web Pěstebních dělníků A pro `pestebnidelnici.cz`.

## Co je nové ve v2.5

- společná týmová fotka v horní části webu (`public/team.jpg`),
- profilová fotka každého hráče přes Supabase Storage,
- komentáře pod každým budoucím zápasem,
- odpovědi na komentáře, editace/smazání vlastního komentáře; captain/admin může mazat komentáře,
- možnost zrušit již zadanou účast,
- odehrané zápasy: výhra zeleně, remíza oranžově, prohra červeně,
- historie sezon PSMF od podzimu 2020 do současnosti,
- souhrn každé sezony (umístění, V–R–P, skóre, body),
- historické vzájemné zápasy se soupeři,
- kariérní statistiky hráčů od roku 2020 podle dostupných dat PSMF,
- e-mailový odesílatel je vždy `Pěstební dělníci A <kabina@pestebnidelnici.cz>` a předmět je čistší.

## Nasazení aktualizace

1. V Supabase otevři **SQL Editor → Create a new snippet → Database**.
2. Vlož celý obsah `supabase/update-v2.5.sql` a klikni **Run**.
3. Nahraj celý obsah tohoto projektu do stávajícího GitHub repozitáře a potvrď přepsání souborů.
4. Počkej, až Vercel dokončí nový deployment.
5. Na webu klikni na **Obnovit PSMF**. První synchronizace naplní i historii sezon.

Nové environment variables nejsou potřeba. Stávající Supabase a Resend nastavení z v2.4 zůstává.

## Poznámka k historii

Synchronizace používá týmové stránky PSMF pro tyto sezony:

- podzim 2020,
- podzim 2021,
- jaro + podzim 2022,
- jaro + podzim 2023,
- jaro + podzim 2024,
- jaro + podzim 2025,
- jaro + podzim 2026.

Sezona označená jako „podzim 2020“ byla kvůli tehdejšímu přerušení dohrávána ještě v roce 2021; web zachovává označení sezony PSMF.

## v2.5.1 – správa týmu
Po spuštění `supabase/update-v2.5.sql` se první již propojený účet automaticky stane prvním adminem, pokud zatím žádný admin neexistuje. Admin poté ve webu u svého profilu uvidí **Správa týmu** a může měnit role Hráč/Kapitán/Admin, aktivovat/deaktivovat hráče a odpojovat účty. Databáze brání tomu, aby poslední aktivní admin sám sobě odebral admin práva, deaktivoval se nebo odpojil svůj účet.
