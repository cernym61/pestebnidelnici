# Kabina · Hanspaulka v2.4

Next.js týmová aplikace Pěstebních dělníků A.

## Co je ve v2.4
- automatická synchronizace zápasů, výsledků, tabulky a hráčů z PSMF
- automatická synchronizace **všech hřišť** z https://www.psmf.cz/hriste/
- kliknutí na kód hřiště otevře detail s názvem, adresou, poznámkou a tlačítky Google Maps / Waze
- přihlášení a docházka přes Supabase
- bezplatné e-mailové připomínky přes Resend: cron běží každý den odpoledne a e-mail odešle jen hráčům, kteří ještě neodpověděli a zápas je přesně za 2 dny
- ochrana proti duplicitnímu reminderu přes `reminder_log`
- tlačítko pro znovuodeslání potvrzovacího e-mailu

## Nasazení v2.4
1. V Supabase SQL Editoru spusť `supabase/update-v2.4.sql`.
2. Nahraj celý obsah projektu na GitHub (přepiš stávající soubory).
3. Ve Vercelu zkontroluj stávající proměnné Supabase.
4. Pro reminder vytvoř zdarma účet na Resend, ověř doménu `pestebnidelnici.cz` a do Vercelu přidej:
   - `RESEND_API_KEY` (Secret)
   - `REMINDER_FROM_EMAIL` (Config) = `Kabina Pěstební dělníci <kabina@pestebnidelnici.cz>`
5. Redeploy.
6. Na webu klikni `Obnovit PSMF`, aby se okamžitě načetl kompletní seznam hřišť.

## Reminder logika
Vercel Cron volá `/api/send-reminders` jednou denně odpoledne. Endpoint nic neodešle, pokud není zápas přesně za dva kalendářní dny. Pokud zápas je, e-mail dostanou jen registrovaní hráči, kteří k danému zápasu ještě nemají odpověď v `attendance`.

Základní provoz lze držet na free tarifech Vercel + Supabase + Resend (v rámci jejich aktuálních limitů).


## v2.4
- Přidáno bezpečné tlačítko **Poslat test reminder sobě** pro přihlášeného hráče.
- Testovací e-mail jde pouze na e-mail aktuálně přihlášeného účtu.
- Test se nezapisuje do `reminder_log` a neovlivňuje ostré automatické připomínky.
