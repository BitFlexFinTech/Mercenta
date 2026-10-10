# Bugpatrol — app guide for the explorer

APP: Mercenta Partners — the intermediary/distribution & operational layer between brands
and the retail channel (Amazon Vendor Central). Mercenta operates the channel account; a
brand never talks to the channel directly.

URL: http://localhost:5182   (dev port 5182 — pinned, strictPort: true)

## How to get in (no credentials needed — one-click demo cards)

On the sign-in screen, click a demo card. Nothing to type.

- Super Admin — Tadii  — the widest admin view (start here)
- Mercenta Admin Hub   — the standard admin view
- Brand cards (Astonish, Tapatio, and the other seeded brands) — a brand's own portal.
  A brand must only ever see its OWN records.

The left rail is the main navigation. The top-right bell is the notification centre.
Visit every rail destination at least once, and open the bell.

## What is NORMAL here (not a bug — do not report these)

- Simulation labels. Every external service (Amazon, Xero, Wise, Payoneer, DHL, Palletline,
  HMRC, Companies House, email, e-signature, AI) is deliberately SIMULATED because no
  credentials are configured. Text like (sim), SIM-ASIN-..., SIM-INV-..., "simulated" and
  "no live payment provider contacted" is CORRECT.
- Empty states and "no data" are legitimate on some screens.
- Only ten Amazon UK categories are permitted; products outside them are filtered on purpose.

## What this patrol is REALLY looking for

Click behaviour. For every clickable thing ask: did clicking it take me to the exact thing
it named? Report when:

- clicking a notification / link / button does nothing at all (panel closes, nothing changes);
- clicking something that names a specific record (a PO number, invoice, task, document,
  brand) lands on a LIST or SECTION instead of that record;
- a control looks usable (enabled) but performs no action;
- a number/metric cannot be opened to see the records behind it.

Also report: console errors, failed network requests, overlapping or cut-off controls,
unreadable text, controls too small to hit, broken images, sideways scrolling.

## NEVER DO (hard rules)

- Never delete, archive, cancel, void or reject anything.
- Never approve a payout, contract, compliance document or commercial-model change.
- Never send an email, message or notification to any address.
- Never create a purchase order, shipment or invoice.
- Never change a brand's commercial model, permissions or settings.
- Never leave http://localhost:5182
- If an action looks irreversible, REPORT IT instead of doing it.
