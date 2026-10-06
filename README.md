# Kabina Hanspaulka v2.8.4

Novinky:
- **Zapomenuté heslo?** na přihlašovací obrazovce,
- resetovací e-mail přes Supabase Auth,
- po kliknutí na odkaz se otevře formulář pro nové heslo přímo v Kabině,
- česká i anglická verze,
- uživatelsky srozumitelná hláška pro `email rate limit exceeded`.

DŮLEŽITÉ:
Supabase vestavěné auth e-maily mají přísný rate limit. Pro ostrý provoz doporučujeme nastavit Supabase Auth SMTP přes už ověřený Resend účet/doménu `pestebnidelnici.cz`.

Není potřeba žádný SQL update.
