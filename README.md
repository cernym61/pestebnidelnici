# Kabina · Hanspaulka

Samostatná webová aplikace pro tým **Pěstební dělníci A**.

## Co už funguje
- responzivní vzhled podle prototypu Kabiny
- CZ / EN přepínání
- aktuální podzimní rozpis 2026 z PSMF vložený jako výchozí data
- výsledky, tabulka a hráčské statistiky
- účast Přijdu / Nepřijdu / Zatím nevím (v této první verzi ukládáno lokálně v prohlížeči)
- odkazy na hřiště / mapu
- připravené SQL schéma pro Supabase účty, hráče, zápasy a účast

## Spuštění lokálně
1. Nainstaluj Node.js 20+
2. V adresáři projektu spusť `npm install`
3. Potom `npm run dev`
4. Otevři `http://localhost:3000`

## Nasazení na Vercel
1. Nahraj tento projekt na GitHub.
2. Na vercel.com zvol **Add New → Project** a vyber repozitář.
3. Framework se rozpozná jako Next.js, klikni **Deploy**.
4. Vercel ti dá veřejnou adresu typu `kabina-hanspaulka.vercel.app`.
5. Později v **Settings → Domains** připojíš vlastní doménu.

## Supabase — další krok
1. Založ projekt na supabase.com.
2. V SQL Editoru spusť `supabase/schema.sql`.
3. Z Project Settings zkopíruj URL a anon key do `.env.local` podle `.env.example`.
4. Doplní se přihlášení a párování účtu na hráče. Datový model už je připravený.

## PSMF data
Zdroj: https://www.psmf.cz/souteze/2026-hanspaulska-liga-podzim/5-d/tymy/pestebni-delnici-a/

První verze má ověřená data ke dni 6. 10. 2026. Automatickou synchronizaci doporučujeme řešit serverovým cronem až v další iteraci, aby nebyla závislá na HTML změnách PSMF.
