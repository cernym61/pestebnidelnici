# NASAZENÍ v3.12.5

## Co je nové
Registrace nejdřív ověří kombinaci hráč + registrační kód přímo v databázi.

Teprve pokud je kód správný a hráč je stále volný, vytvoří se Supabase Auth účet
a odešle se potvrzovací e-mail.

Při chybném nebo už použitém kódu:
- nevznikne Auth účet
- neodešle se ověřovací e-mail
- uživatel uvidí chybu přímo v registraci / toastu

## Supabase
Spusť:
`supabase/update-v3.12.5.sql`

Je to kumulativní SQL navazující na aktuální balíček.

## GitHub
Nahraj celý obsah balíčku do repozitáře a commitni do `main`.
