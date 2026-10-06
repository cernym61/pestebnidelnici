# Kabina Hanspaulka v2.7

Pěstební dělníci A – týmová webová aplikace.

## Novinky v2.7
- Web Push přes OneSignal pro Android i iPhone/iPad.
- Android: přihlášený hráč klikne na **Zapnout upozornění** a povolí je v prohlížeči.
- iPhone/iPad: web je PWA; hráč musí nejdřív dát **Sdílet → Přidat na plochu**, otevřít Kabinu z ikony a pak zapnout upozornění.
- OneSignal subscription se páruje s profilem hráče přes jeho interní `player.id` jako `external_id`.
- Automatický 2denní reminder teď posílá e-mail + push pouze hráčům bez odpovědi.
- Přihlášený hráč může poslat **test push sobě**.
- Admin může ve **Správě** poslat ruční push všem hráčům s účtem nebo vybraným hráčům.
- PWA manifest + ikony + OneSignal service worker jsou součástí projektu.

## Vercel Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

## Nasazení
Pro v2.7 není potřeba nový SQL update. Nahraj celý obsah projektu na GitHub a Vercel vytvoří nový deployment.
