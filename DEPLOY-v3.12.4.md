# NASAZENÍ AKTUÁLNÍ VERZE v3.12.4

Tento ZIP obsahuje aktuální stav webu připravený k nahrání do GitHub repozitáře.

## GitHub
Nahraj/nahraď obsah repozitáře těmito soubory a commitni do `main`.
Vercel následně nasadí novou verzi automaticky.

## Supabase
Spusť v SQL Editoru:

`supabase/update-v3.12.4.sql`

Tento SQL soubor je upravený tak, aby šel bezpečně spustit opakovaně a nezastavil se na již existujících policies.

## Aktuálně zahrnuto
- neveřejná týmová kabina
- přihlášení / registrace / host
- host vidí pouze tabulku
- registrační kódy pro nové hráče
- automatické kódy pro nové PSMF hráče
- ruční přidání hráče
- odstranění hráče
- CZ / EN přepínač už na úvodní obrazovce
- responsive opravy pro iPhone / Android / Samsung / iPad
- oprava čísel dresů na desktopu
- neblokující toast oznámení místo systémových OK oken
