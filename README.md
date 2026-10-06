# Kabina · Pěstební dělníci A

Next.js týmová aplikace pro Hanspaulskou ligu.

## V2 – přihlášení a týmová účast

1. V Supabase SQL Editoru (Database) spusť `supabase/update-v2.sql`.
2. Ve Vercelu nastav:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Nahraj tuto verzi do GitHub repozitáře a Vercel ji automaticky nasadí.
4. V Supabase Authentication > URL Configuration nastav Site URL na `https://www.pestebnidelnici.cz` a Redirect URLs přidej `https://www.pestebnidelnici.cz/**`.

Pozn.: PSMF data jsou v této verzi stále ve statickém `lib/data.ts`. Automatická synchronizace PSMF bude další krok.
