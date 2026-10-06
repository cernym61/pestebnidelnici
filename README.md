# Kabina Hanspaulka v2.2

Novinky:
- plný širší kádr 14 hráčů z jara + podzimu 2026,
- automatický import nových hráčů z aktuální stránky PSMF,
- automatický import zápasů, výsledků, tabulky a hráčských statistik,
- ruční tlačítko „Obnovit PSMF“,
- Vercel Cron jednou denně.

## Po nahrání na GitHub
1. Supabase SQL Editor -> Database: spusť `supabase/update-v2.2.sql`.
2. Ve Vercelu přidej tajnou proměnnou `SUPABASE_SERVICE_ROLE_KEY` (Production).
3. Redeploy.
4. Otevři `/api/sync-psmf` nebo klikni na webu „Obnovit PSMF“.

Nikdy nedávej `SUPABASE_SERVICE_ROLE_KEY` do proměnné začínající `NEXT_PUBLIC_` a neposílej ji veřejně.
