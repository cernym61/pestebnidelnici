# Kabina Hanspaulka v3.0.2

Oprava Kabina AI.

## Co bylo špatně
OpenRouter požadavek padal ještě před odesláním kvůli HTTP hlavičce `X-Title`, která obsahovala české znaky (`Pěstební dělníci`). Runtime ji převáděl na ByteString a vyhodil chybu:
`Cannot convert argument to a ByteString ... character ... greater than 255`.

## Oprava
- `X-Title` je nyní čisté ASCII: `Pestebni delnici A - Kabina AI`.
- OpenRouter request se tak může skutečně odeslat.
- Opraven i lokální fallback pro hráče: dotaz na „Martin Černý“ už nesmí omylem vybrat „Martin Kubala“ jen kvůli společnému křestnímu jménu.

## Nasazení
Není potřeba nový SQL ani nová environment proměnná.
Nahraj celý projekt na GitHub a počkej na Vercel Ready.
