# Kabina Hanspaulka v2.6

Produkční verze reminderů.

## Novinky v2.6
- Ostrý automatický reminder 2 kalendářní dny před zápasem.
- Reminder dostanou pouze aktivní registrovaní hráči, kteří ještě neodpověděli na účast.
- Odesílatel: `Pěstební dělníci A <kabina@pestebnidelnici.cz>`.
- E-mail obsahuje aktuální pořadí a body obou týmů, V-R-P, skóre.
- E-mail obsahuje vzájemnou bilanci od roku 2020 a až tři poslední vzájemné zápasy.
- Hřiště, adresa, Google Maps a Waze.
- Celý e-mail je nejprve česky a ve spodní části anglicky.
- Testovací reminder používá stejná produkční data, ale jde pouze přihlášenému uživateli.
- `update-v2.6.sql` zároveň obnovuje admin RPC funkce a Martina Černého jako admina.

## Nasazení
1. V Supabase spusť `supabase/update-v2.6.sql`.
2. Nahraj celý projekt na GitHub přes stávající repozitář.
3. Počkej na Vercel Deployment = Ready.
4. Pro náhled použij `Poslat test reminder sobě`.

## Automatika
V `vercel.json` zůstává denní kontrola reminderů. Endpoint odešle zprávu pouze tehdy, když je zápas přesně dva pražské kalendářní dny daleko, a pouze hráčům bez odpovědi. Záznam `reminder_log` chrání proti opakovanému odeslání stejné připomínky.


## v2.6.3
Fix TypeScript typing in reminder venue navigation links.
