# SPRINT — THE AMAZON PO LIFECYCLE PROGRAMME (PO-ACK) — 2026-09-24

> **Founder directive (2026-09-24):** *the Amazon purchase-order process is a REPLICA of Amazon's documented rules —
> Mercenta invents nothing.* A deep-research pass (Amazon developer docs + the live `vendorOrders.json` schema) fixed
> the contract; this programme implements it in TEN stages (S1–S10).

## The contract (declared, with provenance)

One owner: `src/config/purchaseOrders.ts`. Every rule is either (a) an Amazon-documented rule quoted from Amazon's
own developer documentation, or (b) the NOTIFICATION SCHEDULE (when Mercenta reminds a brand), which is scheduling
and is labelled as such — never presented as an Amazon rule.

| Declaration | Basis |
|---|---|
| `PO_ACKNOWLEDGEMENT_HOURS = 24` | documented: *"Submit the acknowledgment within 24 hours, including backordered items."* / *"You have 24 hours to accept a purchase order."* |
| `PO_ACK_UPDATE_WINDOW_HOURS = 48` | documented: *"You must submit an updated acknowledgment within 48 hours for any changes to quantity, price, ship dates, or delivery dates…"* |
| `PO_ACK_NOTIFICATION_HOURS = [12, 6, 2]` | **scheduling, NOT an Amazon rule** (founder directive) |
| `PO_ACK_ON_BEHALF_WINDOW_HOURS = 2` | the final notification stage = the instant Mercenta performs the REQUIRED rejection, **before** the limit |
| `PO_ACK_AUTO_REJECT_REASON = 'TemporarilyUnavailable'` | mapped onto Amazon's three documented rejection codes (`Accepted`/`Backordered`/`Rejected`; `TemporarilyUnavailable`/`InvalidProductIdentifier`/`ObsoleteProduct`) — never a fourth, invented code; guarded at module load |
| `PO_ACK_STATUSES_WITH_OBLIGATION = ['received','under_review']` | Amazon's own `New` operational set |
| `PO_ACK_TIMELINESS = ['on_time','late','on_behalf']` | how a recorded decision met the window (S2) |
| `PO_ACK_SYSTEM_ACTOR_ID` | the declared identity every automatic Mercenta action is attributed to (S2) |

Derived by the PURE owner `src/lib/commerce/poAcknowledgementWindow.ts` (no clock, no randomness, no network, no store):
deadline `orderDate + 24h`; Amazon's lifecycle vocabulary `new` / `acknowledged` / `closed`; the queue/history split;
the notification stages; the closing window; `mustReject` past the limit; `lateAcceptanceRefusal`; `poAckTimeliness`;
`poNeedsAutoRejection`; `sortPosByUrgency`; and FAIL-CLOSED `unknown` on an unreadable order date.

## The ten stages

| Stage | Scope | Status |
|---|---|---|
| **S1** | the window OWNER (config + pure logic + gate) | **DONE** (`418d18b`) |
| **S2** | DOMAIN ENFORCEMENT + the auto-rejection | **DONE** (this sprint) |
| **S3** | WORK LAYER — `deriveWorkItems` consumes the owner (the founder-reported defect, removed at source) | **DONE** (this sprint) |
| **S4** | ON-BEHALF draft + approve | **DONE** (this sprint) |
| **S5** | ALL-CHANNEL fan-out + the instant-message seam | **DONE** (this sprint) |
| **S6** | BRAND surfaces | **DONE** (`d3da66e`) |
| **S7** | ADMIN surfaces | **DONE** (this sprint) |
| **S8** | ONBOARDING linking wizard | NOT STARTED |
| **S9** | RECEIPT → INVOICE automation | NOT STARTED |
| **S10** | SEED / gates / deploy (final pass) | NOT STARTED |

## S1 — the window owner (2026-09-24, session 26)

`src/config/purchaseOrders.ts` (NEW), `src/lib/commerce/poAcknowledgementWindow.ts` (NEW),
`scripts/validate-po-acknowledgement-window.mjs` (NEW, 60 assertions). The founder-reported defect — PO-9201 / PO-9211
(shipped, 41 days past the deadline) presented as acknowledgement work — is asserted DIRECTLY as history. Gate proved
able to fail twice (24h→48h: 14 red; `msLeft > 0`→`msLeft >= 0`: 1 red), both restored byte-identical.

## S2 — domain enforcement + the on-behalf rejection (2026-09-24, session 27)

**Built**

1. **The 24-hour window is enforced at the DOMAIN BOUNDARY**
   (`src/data/api.ts → acknowledgePurchaseOrder`). Inside the window any decision is valid. PAST the limit the
   documented action is a rejection, so an acceptance or a backorder is REFUSED and only an ALL-REJECTED submission is
   accepted — that IS Amazon's documented late action. An unreadable window fails CLOSED (nothing is accepted).
2. **A validation pass runs BEFORE the window is judged and before any line is mutated**
   (`ackSubmissionRefusal`), so a refused submission leaves the purchase order byte-for-byte unchanged, and the
   quantity/required-field refusals are byte-for-byte the ones the writer has always returned. The submission shape is
   declared once (`PoLineAckSubmission`).
3. **`AckHistoryEntry.timeliness`** (NEW, config-owned union) is recorded on EVERY acknowledgement event and on the
   canonical audit entry (`on_time` / `late` / `on_behalf`), with the deadline it met. The writer now records ONE
   instant for the whole submission instead of a per-line `new Date()`.
4. **`autoRejectPurchaseOrderOnBehalf(poId, now?)`** (NEW, `src/data/api.ts`) performs the channel-REQUIRED rejection
   on the brand's behalf at the final notification stage, BEFORE the limit: every line rejected with Amazon's
   documented reason and `timeliness: 'on_behalf'`; the PO acknowledged and moved to `rejected` with the rule as its
   stated reason; the decision issued as an INSTRUCTION to Mercenta (proxy direction) attributed to
   `PO_ACK_SYSTEM_ACTOR_ID`; ONE attributed audit entry (`purchase_order_auto_rejected`). **IDEMPOTENT** — a PO that
   already carries a decision is never re-decided; a PO not yet due is refused with the instant named; a PO with no
   obligation or an unreadable window is never touched.
5. **A caller-clock seam** on `acknowledgePurchaseOrder` (optional 4th argument). `src/lib/simulation/scenarioEngine.ts`
   passes its own deterministic instant, so a scenario replaying a fixed timestamp judges the rule in the SAME world
   that received the PO. Without this the whole simulation suite found its own PO "past the limit" — a real regression
   the `validate:provider-safety` gate caught.
6. **The demo seed's OPEN purchase orders are now genuinely inside their window**
   (`src/data/demoData.ts`). The seed dated every PO 9 or 18 days back, so under the enforced rule no seeded open PO
   could be acknowledged at all — which would have made the demo's acknowledgement workflow, and the live verification
   that exercises it, unreachable (an honest fix of factually wrong demo data, in the manner of the P8 ASIN
   correction). A PO past the decision keeps its historical date and lives in history, exactly as the rule requires.
   Surfaces render the DATE through the ONE display helper `orderDateLabel()` (`src/lib/dates.ts`).
7. **A single-source-of-truth repair:** `src/lib/work/workStore.ts` re-exports `PO_ACKNOWLEDGEMENT_HOURS` from the
   config owner instead of declaring a second `= 24` (the S1 comment already claimed this; it was false).
8. **Two inherited `validate:wording` violations fixed** (the S1 config guard message and the window's `closed` reason
   named the retail channel in copy). Rule provenance now lives in comments; outward-facing copy says "the retail
   channel".

**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-enforcement.mjs` → **45 assertions, PASS, 0 network calls**, proved able to
  fail twice (window refusal disabled → 8 red; the auto-rejection's idempotency guard removed → 3 red; both restored
  byte-identical, shasum unchanged).
- Whole-validator sweep: every `validate:*` script run — **all PASS** after the fixes above.
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · eslint 0 · `npm run build` ✓ (9.00s).
- Playwright: **131/131 passed** across 18 affected specs. One repointed test: `po-lifecycle` #6 previously asserted
  an overdue window visible on the page — a state the demo deliberately no longer contains (the platform rejects it
  before the limit); it now asserts the truthful window state in both directions, and the overdue PRESENTATION stays
  proven by gate §7.

**Honest limits / non-credential follow-ups**

- Nothing yet PRODUCES the on-behalf rejection automatically: the writer exists and is gated; the producer is S4/S5.
- ~~The notification schedule (12/6/2h) is declared and derivable but not yet fanned out (S5).~~ **§P13 / S5 — SUPERSEDED 2026-09-25 (session 30): the schedule now FANS OUT on every channel the platform can genuinely deliver on, the final stage produces the on-behalf draft, and the external instant-message seam is declared and fails closed. See §S5 below.**
- ~~`deriveWorkItems` does not yet consume the owner, so the founder-reported work-layer defect persists until S3.~~
  **§P13 / S3 — SUPERSEDED 2026-09-25 (session 28): the work layer DOES consume the owner now — see §S3 below.
  S3 removed the defect at source; the OLD work-layer predicate
  (`status !== rejected/delivered` + `!acknowledgedAt`) is recorded in the inline `REPOINTED` comment in
  `src/lib/work/workStore.ts` and in the repointed `e2e/deterministic-journey.spec.ts` assertion.**

## S3 — the work layer consumes the owner (2026-09-25, session 28)

**Built**

1. **`deriveWorkItems` derives acknowledgement work from the RULE'S OWNER, not from its own predicate.**
   §P13 / S3 — REPOINTED. The test was hand-rolled in the work layer
   (`po.status !== 'rejected' && po.status !== 'delivered' && !po.acknowledgedAt`), which is exactly why the
   founder-reported `PO-9201` / `PO-9211` — shipped, 41 days past their deadline — arrived as
   `Acknowledge PO-…` work. The item is now derived ONLY when the owner has the PO in its QUEUE
   (`poAcknowledgementWindow(po, now).inQueue` = Amazon's `New` set INSIDE the 24-hour window). The
   hand-rolled channel-closed short-circuit went with it: the owner owns that classification too.
2. **The row's wording IS the owner's own `reason`**, so the queue row, the PO surface and the writer cannot
   state three different window states. The row reads
   `… · Awaiting the brand's decision — 3h 30m left of the 24-hour window.` and, inside the closing window,
   `…; Mercenta may act on the brand's behalf inside this closing window, with the brand's approval`. The
   hand-written "at risk of cancellation after 24h" copy is gone.
3. **The deadline IS the owner's deadline** (`poAcknowledgementDeadline(po)`, its DATE part), so the duplicate
   `addDays(po.orderDate, 1)` arithmetic is gone. The VALUE is unchanged (both compute `orderDate + 24h`); what
   changed is that the arithmetic has ONE owner.
4. **THE CLOCK SEAM.** The window is an INSTANT-resolution rule, so it is judged against `now` — the same
   default instant `src/data/api.ts` enforces it with — and NEVER against `demoToday()`, the DATE-resolution
   clock tests pin for the overdue / due-soon buckets. `deriveWorkItems(now?)` exposes the seam, as S2 did for
   `acknowledgePurchaseOrder`. Judging the window on a pinned demo DATE would let the queue advertise work the
   writer REFUSES, or hide work it performs.
5. **`scripts/validate-work-layer.mjs`** carries a NOTE beside its pinned date, so a future session cannot
   "fix" the window onto that date and silently break the agreement with the writer.

**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-work.mjs` → **41 assertions, PASS, 0 network calls**: ONE owner
  (source-level) · the derived queue is a BIJECTION with the owner's `inQueue` set over the real demo POs ·
  the founder-reported stale POs derive nothing · the wording is the owner's `reason` verbatim · past the
  limit / unreadable order date / already acknowledged / channel-closed / no-obligation fixtures all derive
  nothing · the clock seam (in the queue at one instant, out of it at another) · tenant isolation · reminders
  stop on resolution. **Proved able to fail twice**: owner consumption removed → **8 red**; the window judged
  on the pinned demo DATE → **4 red**; both restored byte-identical (`workStore.ts` shasum `6fa49641…`).
- Whole-validator sweep: **all 28 `validate:*` scripts PASS**.
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · eslint 0 ·
  `npm run build` ✓ (7.73s).
- Playwright: `e2e/deterministic-journey.spec.ts` REPOINTED — it asserted the admin queue contained `PO-9003`,
  whose status is `accepted` (PAST the acknowledgement decision) and which is therefore NOT acknowledgement
  work at all. It now asserts `PO-9002` (Tapatío's genuinely OPEN PO) for the cross-tenant claim, and asserts
  the defect's ABSENCE (`Acknowledge PO-9003` must not appear). The six affected specs then passed 45/45, and a
  full-suite run is reported in the session report.

**Honest limits / non-credential follow-ups**

- ~~Nothing yet PRODUCES the on-behalf rejection automatically (the writer exists and is gated; the producer is
  S4/S5), so a PO in the closing window is still the brand's to decide.~~ **§P13 / S4 — SUPERSEDED 2026-09-25
  (session 29): the PRODUCER now exists (`src/data/api.ts → draftOnBehalfRejection`, attributed to
  `PO_ACK_SYSTEM_ACTOR_ID` and audited once per draft content) and the brand's approval executes it
  (`approveOnBehalfRejection` → the S2 writer). See §S4 below.**
- ~~The notification schedule (12/6/2h) is declared and derivable but not yet fanned out (S5).~~ **§P13 / S5 — SUPERSEDED 2026-09-25 (session 30): the schedule now FANS OUT on every channel the platform can genuinely deliver on, the final stage produces the on-behalf draft, and the external instant-message seam is declared and fails closed. See §S5 below.**
- A PO PAST the limit derives no acknowledgement work here because the owner classifies it as history; the work
  a closed window implies is Mercenta's on-behalf action, owned by S4 — **now implemented: PAST the limit the
  draft is still offered (the documented action past the limit IS a rejection), with `brandMayStillDecide: false`
  stating that the brand's own decision has closed.**

## S4 — the on-behalf draft, and the brand's approval that executes it (2026-09-25, session 29)

**Built**

1. **THE DRAFT IS DERIVED BY THE RULE'S OWNER** — `src/lib/commerce/poAcknowledgementWindow.ts →
   poOnBehalfRejectionDraft(po, now?)`. It returns the draft's CONTENT: every line rejected with the channel's
   documented reason (config-owned `PO_ACK_AUTO_REJECT_REASON`), the rule in its own words
   (`PO_ACK_WINDOW_RULE_TEXT`), both instants (the 24-hour limit and the earlier on-behalf stage), and a CONTENT
   ADDRESS (`digest`, FNV-1a — pure, no crypto) so an approval can be bound to the exact draft that was shown.
   Availability is the OWNER'S OWN predicate (`poNeedsAutoRejection` = Amazon's `New` set at/after the on-behalf
   instant), so the draft is offered exactly when the S2 writer will perform the rejection and FAILS CLOSED
   everywhere else with a stated `refusal`: not yet due (naming the instant), past the limit
   (`brandMayStillDecide: false` — the documented action past the limit is a rejection), already decided, no
   obligation, or an unreadable order date.
2. **THE PRODUCER THE S2 WRITER NEVER HAD** — `src/data/api.ts → draftOnBehalfRejection(poId, now?)`. It records
   what is NOT derivable and nothing else: the content address and the ATTRIBUTION (produced BY
   `PO_ACK_SYSTEM_ACTOR_ID`, FOR the brand whose purchase order it is), with ONE canonical audit entry
   (`purchase_order_on_behalf_draft_created`) naming the window it was drafted on. **IDEMPOTENT** (the same
   content never records a second draft, so a surface may ask on every render) and it **performs NOTHING** —
   drafting never touches the purchase order. A draft whose content changed supersedes the previous one and names
   the superseded draft in its audit entry, so history is never destroyed.
3. **THE APPROVAL IS THE ONLY PATH THAT EXECUTES THE REJECTION** —
   `src/data/api.ts → approveOnBehalfRejection(poId, approval, now?)`. It enforces, in order: UNKNOWN PO → TENANT
   ISOLATION (an `actorBrandId` that is not the PO's own brand is refused, fail-closed) → IDEMPOTENCY (a purchase
   order that already carries a decision is never re-decided) → the owner's availability → a draft MUST be on
   record → the recorded digest MUST equal the CURRENT derivation (so a PO that changed after drafting cannot be
   approved blind) → the approval's `draftId` MUST be the draft on record → and only then does it call the S2
   writer `autoRejectPurchaseOrderOnBehalf`. Every refusal leaves the purchase order byte-for-byte unchanged. The
   approval is attributed to the acting human on the record (`approvedBy` / `approvedAt`, plus `approvedByAdmin`
   for Mercenta staff) and audited ONCE (`purchase_order_on_behalf_rejection_approved`) with the draft id, its
   digest, the actor, the instruction the rejection was issued as, and whether the approval happened inside or
   after the window. The execution stays attributed separately to the writer's own
   `purchase_order_auto_rejected` entry, so the trail shows BOTH facts: WHO approved and WHO performed.
4. **BOTH PO SURFACES CARRY THE REAL CONTROL** — the brand PO surface
   (`src/components/brand/BrandPurchaseOrders.tsx`) shows Mercenta's draft (the rule, the reason code, the draft
   id, both instants, every line it rejects) and approves it as the brand (`actorBrandId` = its own tenant, so a
   cross-tenant approval is impossible); the admin PO detail
   (`src/components/admin/AdminPurchaseOrderDetail.tsx`) shows the SAME draft and records the approval as an
   ATTRIBUTED MERCENTA OVERRIDE (`actorStaffId` + `actorLabel`, audited as `approvedByAdmin`). Each surface
   PRODUCES the draft through the idempotent api call in an effect, and each renders the owner's derivation —
   neither re-derives the window, the reason code or the instants.
5. **THE SEED MAKES THE CAPABILITY REACHABLE** (`src/data/demoData.ts`): the second open PO of the first cleared
   tenant is dated into its closing window (deadline − 1h 30m, arithmetic owned by
   `PO_ACKNOWLEDGEMENT_HOURS − PO_ACK_ON_BEHALF_WINDOW_HOURS`), so the demo — and the live verification — can
   genuinely exercise the draft and the approval. It deliberately stays INSIDE the 24-hour limit, so the brand's
   own decision remains valid alongside the draft (the rule is not replaced by the automation).
6. **THE GATE** — NEW `scripts/validate-po-acknowledgement-on-behalf.mjs` (48 assertions,
   `validate:po-ack-on-behalf`).

**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-on-behalf.mjs` → **48 assertions, PASS, 0 network calls**: ONE owner
  (source-level, both surfaces included) · the draft's content is never stored twice · the derivation is pure ·
  availability across every window state (mid-window, exactly T−2h, past the limit, unreadable, decided, no
  obligation) · the content IS the channel's documented rejection at the ORDERED quantity · content addressing
  (a changed line yields a different draft) · production attributed + audited + idempotent + performs nothing ·
  every refusal path (no draft on record, before the instant, cross-tenant, wrong draft, stale draft) writes
  NOTHING · the happy path (rejected lines, `on_behalf` history, instruction to Mercenta, attributed approval
  audit, execution audit) · approval idempotency · the Mercenta override · the instant seam · the seed
  genuinely contains an on-behalf PO inside the limit. **Proved able to fail twice**: the owner's availability
  predicate removed → **7 red**; the draft-binding guard removed → **2 red** (including "the stale approval wrote
  NOTHING"); both restored byte-identical (`poAcknowledgementWindow.ts` shasum `e00fbfb8…`, `api.ts` `5d5a43f3…`,
  `demoData.ts` `907c411f…`).
- Whole-validator sweep: every `validate:*` script run — see the session report for the result.
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · eslint 0 · `npm run build` ✓.
- Playwright: the PO specs + the full suite — see the session report for the pass/fail/skip counts.

**Honest limits / non-credential follow-ups**

- **The three legacy inline countdowns still hand-roll the 24-hour arithmetic** —
  `BrandPurchaseOrders.tsx → AckDeadline` (`received + 24 * 60 * 60 * 1000`),
  `AdminPurchaseOrderDetail.tsx` (deadline via `setHours(getHours() + 24)` and `isAcknowledged` from status) and
  `AdminPurchaseOrderList.tsx → PoPreviewBody` (`+ 24 * 3600 * 1000`). They are NOT S4's code path (the draft and
  the approval go through the owner only) and they are S6/S7's surface scope — but they are a live single-source-
  of-truth violation, recorded here so a later pass repoints them onto `poAcknowledgementWindow` instead of
  leaving the claim in the owner's module header unearned.
  **§P13 / S6 — PARTIALLY SUPERSEDED 2026-09-25 (session 31):** the BRAND copies are repointed (and the list was
  incomplete — the brand surface actually carried a FOURTH, `BrandOrdersPreview`'s own
  `+ 24 * 3600 * 1000` plus its own labels; walked and repointed in S6 — see §S6 below). The TWO ADMIN countdowns
  named above remain S7's scope.
- Nothing yet FANS the draft out to the brand's channels (`S5`); today the draft is materialised when a PO
  surface reads the purchase order (idempotent, recorded once).
- The execution remains the brand's (or Mercenta staff's) explicit approval — that IS this stage's point. An
  UNATTENDED sweep that performs the rejection when nobody approves is S5/S10 territory and would need the
  founder's decision on the trigger.

## S5 — the all-channel fan-out, and the instant-message seam (2026-09-25, session 30)

**Built**

1. **THE FAN-OUT OWNER** — NEW `src/lib/commerce/poAcknowledgementNotifications.ts`. S1 declared the schedule
   (12/6/2h — SCHEDULING, never presented as a channel rule) and S4 gave the writer its producer, but nothing
   FANNED THE SCHEDULE OUT: it was derivable and delivered nowhere. This module is the one owner of:
   · WHICH channels a message may travel on — the brand's OWN declared `NotificationPreference` for
   `po_acknowledgment_deadline` (the record the brand edits in Settings); a disabled preference, or one with no
   channel selected, yields NO channels, and a brand with no preference record yields no channels at all (the
   platform never invents a subscription);
   · WHERE each channel delivers — `in_app` is internal (Mercenta operates it), `email` is the brand's declared
   contact email (`DemoBrand.email`, the canonical declaration the brand rows are generated from), and `sms` is
   the brand's declared instant-message number (the brand row's `profile.phone`). A missing destination is
   `null` and is NEVER defaulted to a plausible fake address;
   · WHETHER a channel may be used at all (`resolvePoAckChannel`, fail-closed, reason always stated);
   · WHAT the message says (`poAckNotificationCopy`, derived from the owner + the config-owned rule text, so no
   surface writes its own copy — and wording-safe by construction);
   · WHAT WAS DELIVERED (`runPoAckNotificationFanout` + the canonical delivery ledger).
   The module is PURE where it decides (`poAckNotificationPlan`) and EXPLICIT where it acts: no `setInterval`,
   no `setTimeout`, no randomness — the instant is the caller's clock, the same seam the window owner takes.
2. **THE INSTANT-MESSAGE SEAM — DECLARED, AND FAILING CLOSED.** The channel is EXTERNAL, so the canonical
   provider-safety rule applies: a provider is simulated ONLY when its mode POSITIVELY resolves `simulation`
   (`isProviderSimulationSafe`), and `live` is the configured live path. Every other mode — `available`,
   `configuring`, `degraded`, `error`, `disabled`, `unknown`, `not_registered` — REFUSES the send and says so in
   the provider's own terms ("…resolves \"available\", which is neither a positively-resolved simulation nor a
   configured live connection. An unverified provider is NEVER treated as simulation, so no instant message is
   sent (fail-closed)."). `resolveInstantMessageClient` is the ONE factory: `simulation` → `MockInstantMessageClient`
   (deterministic, synchronous, zero network, unmistakably `MOCK-IM-…`); `live` → `RealInstantMessageClient`
   (the existing Twilio-backed adapter in `src/lib/whatsapp/whatsAppClient.ts`). A live send is genuinely
   asynchronous, so the delivery is recorded as `dispatching` and completed when the provider answers — it can
   never be mistaken for a completed send. A missing destination refuses too, independently of the mode.
3. **THE FINAL STAGE PRODUCES MERCENTA'S DRAFT.** When the plan's `draftDue` (the owner's own
   `poNeedsAutoRejection`) is true, the sweep invokes S4's producer (`src/data/api.ts → draftOnBehalfRejection`),
   so the on-behalf draft exists because the SCHEDULE reached its final stage — not because a surface happened to
   render the purchase order. **Nothing is performed**: the brand's (or Mercenta staff's) approval remains the
   only path that executes, and the gate asserts the purchase order is still undecided afterwards.
4. **THE SCHEDULE RUNS THROUGH THE EXISTING AUTOMATION SEAM.** `src/lib/automation/registry.ts` gains the
   automation id `po_acknowledgement_fanout` (declared ONCE as `PO_ACK_NOTIFICATION_AUTOMATION_ID` in the fan-out
   module and consumed by the registry's type, order, definition, digest and runner, so the two can never
   disagree). The Founder Control Centre therefore gets a REAL Run control for it with no UI work — and
   `resetAutomationStore` now also clears the fan-out's ledger (`fanoutDeliveriesCleared`), because the
   registry's reset returns the platform to its initial state and a delivery is made at most once, ever.
5. **THE IN-APP CHANNEL REACHES THE BRAND.** `src/components/shared/NotificationCenter.tsx` lists the delivered
   in-app reminders through `poAckInAppDeliveries(scope, tenantId)` — the SAME ledger the fan-out writes, never a
   second notification store — with the channel and the stage on each item. TENANT SCOPING is enforced INSIDE the
   domain accessor (and fails closed for a brand scope with no tenant), so the shared shell can never present
   another brand's notification.
6. **THE SEED MAKES THE EXTERNAL CHANNEL GENUINELY REACHABLE.** `src/data/demoStore.ts` gives exactly ONE brand
   (Astonish, the tenant whose PO-9001 sits in the closing window) an instant-message subscription for the
   acknowledgement event, so the fan-out really ATTEMPTS the external channel and REFUSES it, with the refusal
   attributed and audited — otherwise the seam would be declared but unprovable in the running product. No demo
   brand or account is removed, and `DemoBrandRow.profile` is widened to carry the declared instant-message
   number (`phone?`) that the demo deliberately does NOT set for anyone.
7. **THE GATES.** NEW `scripts/validate-po-acknowledgement-notifications.mjs` (68 assertions,
   `validate:po-ack-notifications`) and NEW `e2e/po-notification-fanout.spec.ts` (2 functional tests). The two
   places that assert the automation COUNT were repointed 9 → 10 with the old contract recorded
   (`scripts/validate-founder-operating-system.mjs` and `e2e/founder-operating-system.spec.ts`).

**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-notifications.mjs` → **68 assertions PASS, 0 network calls**. Proved
  able to fail twice: a fabricated instant-message destination default → **2 red**; the duplicate-delivery guard
  removed → **4 red** (including "the second fan-out delivered NOTHING new — 6 delivered / 3 suppressed" and
  "every delivery and refusal emitted exactly ONE canonical event — 12 vs 9"); both restored byte-identical
  (`poAcknowledgementNotifications.ts` shasum `a015027e7ee5c32f43df30a5210bd69a2046f5b389fb321747178b459a173c5d`).
- Whole-validator sweep: **30/30 PASS** (the founder-OS validator initially failed on the reset → re-run
  determinism contract, which the `resetAutomationStore` fix above resolves).
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · `npx eslint .` 0 · `npm run
  build` ✓ (7.70s).
- NEW `e2e/po-notification-fanout.spec.ts` **2/2**, plus the affected specs (founder-operating-system ·
  notifications · deterministic-journey · uiux-foundation · po-onbehalf · multi-tenant) — **36/36**. The
  full-suite result is reported in the session report.

**Honest limits / non-credential follow-ups**

- **No brand has an instant-message number on record**, so the channel refuses for EVERY brand in the demo — the
  destination is a brand-supplied fact and Mercenta may not invent one. The seam's success path is therefore
  proven in the gate (a fixture destination pushed through the real store) rather than in the running demo.
- **The provider resolves `available`** (not `simulation`), so even with a number the channel would refuse until
  the provider positively resolves — which is exactly the canonical rule, and why the refusal NAMES the mode.
- **The live path is the ONE asynchronous provider call** and cannot be exercised without Twilio credentials; the
  simulation path (mock client, zero network) is what runs, and it is asserted.
- **The delivery ledger is in-memory** (the demo store), so deliveries last for the browser session — the same
  honest limit the S4 draft approval carries.
- The three legacy inline countdowns remain S6/S7 scope (unchanged from S4's record), and an UNATTENDED sweep that
  PERFORMS the rejection when nobody approves remains S10 plus a founder decision on the trigger.

## S6 — the brand surfaces (2026-09-25, session 31)

**Built**

1. **THE BRAND SURFACE CONSUMES THE RULE'S OWNER — the last hand-rolled copies are gone**
   (`src/components/brand/BrandPurchaseOrders.tsx`).
   The S4 record listed three legacy countdowns; walking the brand surface found **four** — S4 missed the second
   brand-side one. Both BRAND ones are repointed here (the two ADMIN ones are S7's scope):

   - `AckDeadline` — was `received + 24 * 60 * 60 * 1000` plus its own `Math.ceil` `hoursLeft`. It now reads
     `poAcknowledgementWindow(po)` and renders the presentation owner's own urgency
     (`ackDeadlinePresentation(window.hoursLeft)`), with the owner's `reason` as the badge's title. It renders
     NOTHING for an `acknowledged`/`closed` purchase order (the owner's own classification) and states
     `Ack window unreadable` — fail-closed — for an unreadable order date. **That last case is a real defect the
     repoint removes:** the old code rendered `Ack within NaNh` for an unreadable window.
   - `BrandPoPreviewBody` — was `Math.floor((orderDate + 24 * 3600 * 1000 − now) / 3600000)` plus its OWN
     `hoursLeft <= 0 ? 'ack_overdue' : 'ack_due'` mapping and its own labels ("Acknowledgment deadline passed" /
     "Acknowledge within Nh"). It now derives the badge from the owner and the presentation layer, so the preview
     can no longer state a different window or a different vocabulary from the row.
   - **THE ACTIONABILITY PREDICATE IS THE OWNER'S** — `actionable` was
     `po.status === 'received' || po.status === 'under_review'`, exactly the class of defect S3 removed from the
     work layer: it offered the brand an acceptance control PAST the 24-hour limit that the domain writer
     (`src/data/api.ts → acknowledgePurchaseOrder`) REFUSES, and treated an unreadable window as actionable instead
     of failing closed. It is now `poAcknowledgementWindow(po).inQueue` (Amazon's `New` set INSIDE the window).
   - **The on-behalf draft is no longer gated on `canAct`** but on the owner's own availability predicate, so past
     the limit — where an acceptance is refused and a rejection is the documented action — the brand is offered
     Mercenta's draft and approval, not a dead button.
   - **The acknowledgement panel states the window the decision is made inside**, in the owner's own words
     (`poAcknowledgementWindow(po).reason`, `data-testid="po-ack-window-state-<poNumber>"`).




2. **THE DELIVERED REMINDER'S OWN BRAND-SIDE DETAIL** — the fan-out module gains the S6 view owner
   (`src/lib/commerce/poAcknowledgementNotifications.ts`): `poAckReminderViews(scope, tenantId)` returns each
   delivered in-app reminder WITH every channel attempted for the same purchase order at the same declared stage
   (the refusals included), each carrying its label, state, destination, mode, `simulated` flag and reason — all read
   from the canonical ledger through the same tenant-scoped, fail-closed accessors.
   `poAckReminderChannelDetail(view)` is the ONE sentence: `Email → ops@… · In-app → in-app (Mercenta-operated) ·
   Instant message unavailable — <the fail-closed reason, verbatim>`.

   The notification centre (`src/components/shared/NotificationCenter.tsx`) now consumes that view and renders the
   sentence as the item's own second line (`meta`, `data-notification-meta`). **The surface writes none of that copy
   itself** — asserted at source level (no arrow sentence, no refusal copy in the centre's code).

3. **THE STAGE-24 GATE WAS REPOINTED, NOT WEAKENED.** `scripts/validate-stage24.mjs` asserted
   `bpo.includes('24 * 60 * 60 * 1000')` — it REQUIRED a second copy of the rule to exist, making the
   single-source-of-truth violation the test's success condition. It now asserts the opposite (the surface presents
   the window from the owner and re-derives nothing), with the old contract recorded inline. Comments are stripped
   for that assertion, because the rules REQUIRE the repointed code to record the old contract inline.
   `scripts/validate-po-acknowledgement-notifications.mjs`'s in-app-surface assertion was likewise repointed to the
   domain view that now wraps the same ledger accessor (old contract recorded inline).

4. **A NEW GATE** — `scripts/validate-po-acknowledgement-brand-surfaces.mjs` (`validate:po-ack-brand`).

5. **A NEW FUNCTIONAL SPEC** — `e2e/po-brand-ack-surface.spec.ts` (3 tests), and the S5 spec
   (`e2e/po-notification-fanout.spec.ts`) gained the reminder's destination + refusal-reason assertions.

**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-brand-surfaces.mjs` → **38 assertions, PASS, 0 network calls**: one owner
  (source-level, comment-stripped) · the view derived from the ledger with every channel's destination, verbatim
  refusal reason and declared stage · the seam's SUCCESS path (a fixture brand with a number on record + a
  positively-resolved `simulation` → the instant message DELIVERS and is labelled `(simulated)`) · the refusal path
  with the SAME number and an unverified mode → refused and NAMING the mode · tenant isolation (a brand scope with no
  tenant yields nothing) · the owner's queue set AGREES with the old status predicate over the real seed (the repoint
  changed no demo behaviour) · past the limit → no acceptance offered and the owner's draft is the remaining action ·
  an unreadable order date fails closed. **Proved able to fail twice:** the brand surface's hand-rolled arithmetic
  reintroduced → **1 red**; the refusal dropped from the brand-side detail sentence → **2 red**; both restored
  byte-identical (`BrandPurchaseOrders.tsx` shasum `6af5519b…`, `poAcknowledgementNotifications.ts` `b2969daa…`).
- Whole-validator sweep: **31/31 `validate:*` scripts PASS** (30 → 31 with the new gate).
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · `npx eslint` 0 on the changed
  files · `npm run build` ✓ (8.14s).
- Playwright: NEW `e2e/po-brand-ack-surface.spec.ts` **3/3** · the affected specs (po-notification-fanout ·
  po-lifecycle · po-onbehalf · notifications) **18/18** · **the ENTIRE suite: 508 passed / 2 skipped / 0 failed
  (8.6m)**.

**Honest limits / non-credential follow-ups**

- **The TWO ADMIN countdowns remain** (`AdminPurchaseOrderDetail` via `setHours(getHours() + 24)` and
  `AdminPurchaseOrderList → PoPreviewBody` via `+ 24 * 3600 * 1000`) — they are S7's surface scope, recorded here so
  the next pass repoints them onto the same owner.
- The S5 honest limits stand unchanged (no instant-message number on record for any demo brand, so the channel
  refuses in the demo — its success path is proven in the gate; the provider resolves `available`; the ledger is
  in-memory; an unattended rejection sweep is S10 plus a founder decision on the trigger).
- A brand's reminder detail is rendered as a second line, clamped to two lines, with the full sentence available on
  hover (`title`). No expandable per-reminder drawer was added — the drill-down is the purchase order the reminder is
  about, which the existing click-through already provides.


## S7 — the admin surfaces present the rule from its owner (2026-09-25, session 32)

**Built**

1. **THE RULE WAS RE-TYPED IN *SIX* PLACES** (five admin-side — the S6 record listed two — plus one brand-side
   surface the same sweep found), the same way S6 discovered a fourth brand copy. All six are repointed onto the ONE
   owner (`src/lib/commerce/poAcknowledgementWindow.ts`), the ONE presentation owner
   (`ackDeadlinePresentation`) and the ONE config array (`PO_ACK_STATUSES_WITH_OBLIGATION`):
   · **`AdminPurchaseOrderDetail.tsx`** — the window was derived on the surface: `new Date(po.orderDate)` mutated in
   LOCAL time by `setHours(getHours() + 24)` (which drifts across a DST boundary), its own
   `msLeft`/`hoursLeft`/`minutesLeft`, its own `isDeadlinePassed`, its own `EXPIRED` wording, its own header badge
   (through a SECOND presentation helper) and its own actionability predicate
   `po.status !== 'received' && po.status !== 'under_review'`. The last of those is the S3/S6 defect class: past the
   limit the surface offered an on-behalf ACCEPTANCE the domain writer REFUSES, and an unreadable order date rendered
   a countdown instead of failing closed. Now: the owner derives the window, the owner's `reason` is the badge's
   tooltip, the acceptance control is offered exactly when the owner's `inQueue` permits one (past the limit the
   remaining action is the S4 on-behalf rejection draft already on the panel), and when nothing is offered the
   surface STATES the owner's own reason (`data-testid="admin-po-ack-state-<poNumber>"`).
   · **`AdminPurchaseOrderList.tsx`** — the "Awaiting action" figure was the same status predicate, and the record
   preview was `Math.floor((orderDate + 24 * 3600 * 1000 − Date.now()) / 3600000)` with `Math.max(0, …)` clamps and
   a minutes term (`(hoursLeft % 1) * 60`) that is ALWAYS 0 once `hoursLeft` has been floored. Both now read the
   owner; the preview badge is built exactly as the brand's (parity with S6), so a decided or closed order renders
   NO window badge and an unreadable one is STATED.
   · **`AdminDashboard.tsx`** — a third copy of the obligation set (`const PO_AWAITING: new Set(['received',
   'under_review'])`) drove the "POs awaiting action" KPI ("Action needed", "received but not yet actioned"), and a
   fourth sat in the PO-pipeline bucket. The KPI now reads the owner's `inQueue` (the claim IS actionability); the
   pipeline bucket is a STATUS-FAMILY view, so it reads the CONFIG array rather than re-typing the literal — and the
   distinction between "the acknowledgement queue" and "the status family" is stated in the code.
   · **`CommerceOperationsPanel.tsx`** and **`src/lib/commerce/commerceLifecycle.ts`** — both re-typed
   `'received' || 'under_review'`; both now read the config array (values unchanged, so the simulated lifecycle's
   panel behaves identically).
   · **`src/components/shared/NotificationCenter.tsx`** — the shared centre re-typed the predicate for its "PO …
   awaiting action" items; it now reads the owner (its rows are still tenant-scoped BEFORE the filter, asserted).
   · **`src/data/demoData.ts`** — the seed re-typed it in TWO places; both now read the config array through ONE
   local derivation. The generated seed is unchanged.
   · **`src/components/brand/BrandDashboard.tsx` — A SIXTH COPY, FOUND BY THE SAME SWEEP (brand-side, and it
   was the worst of them):** the "Awaiting acknowledgement" KPI ("Action needed", "Acknowledge within 24 hours of
   receipt") hand-rolled the obligation family (`PO_AWAITING_ACK = new Set(['received', 'under_review'])`) AND its
   own unacknowledged-line check, and it NEVER consulted the 24-hour window — so a purchase order PAST its limit was
   still counted as awaiting acknowledgement, judged by a different rule from the one the domain writer enforces. The
   KPI now reads the owner's `inQueue`, and the set is removed. (S6's record asserted the brand PURCHASE-ORDER
   surface; the brand DASHBOARD is a second brand surface, which is why the copy survived.)
2. **THE SECOND ACKNOWLEDGEMENT PRESENTATION IS REMOVED** (`src/lib/statusPresentation.ts`). `ackWindowPresentation`
   took raw figures a surface had derived itself plus an `acknowledged` boolean derived from STATUS, and owned a
   second label vocabulary (`Acknowledged` / `Deadline passed` / `Nh Nm left`) beside `ackDeadlinePresentation`. After
   the repoint it had ZERO readers, and two competing renderings of one value is how a rule drifts — so it is deleted
   with the old contract recorded in full inline, and the gate asserts it cannot reappear.
3. **A NEW GATE** — `scripts/validate-po-acknowledgement-admin-surfaces.mjs` (`validate:po-ack-admin`, 34 assertions).
4. **A NEW FUNCTIONAL SPEC** — `e2e/po-admin-ack-surface.spec.ts` (3 tests), and the live verifier
   (`scripts/verify-demo-live.mjs`) gained **TEN §P13/S7 legs**.



**Tested (all evidence produced in this session)**

- NEW `scripts/validate-po-acknowledgement-admin-surfaces.mjs` → **34 assertions, PASS, 0 network calls**: one owner
  at every admin surface (source-level, comment-stripped, so the REQUIRED inline §REPOINTED records do not defeat the
  checks) · the hand-rolled arithmetic gone as code at both admin surfaces while its recorded contract survives ·
  the acceptance control IS the owner's `inQueue` · the deadline tile is the owner's classification (no `EXPIRED`) ·
  the header badge handles every channel state (unknown/acknowledged/closed/open) · the dashboard KPI reads the owner
  and its hand-written set is gone · **the brand dashboard's "Awaiting acknowledgement" KPI reads the owner and its
  hand-rolled set + line rule are gone** · the pipeline bucket, the operations panel, the simulated lifecycle and the
  seed all read the CONFIG family (no re-typed literal anywhere) · the centre's rows are tenant-scoped before the queue
  filter · there is ONE acknowledgement presentation (`ackWindowPresentation` removed) · the owner's queue set AGREES
  with the old status predicate over the real seed (**no demo behaviour changed**) · past the limit no acceptance is
  offered and Mercenta's draft is the remaining action · an unreadable order date fails closed and the admin surfaces
  STATE it. **Proved able to fail twice**: the list's hand-rolled arithmetic reintroduced → **2 red**; the owner's
  reason dropped from the detail's state paragraph → **1 red**; both restored byte-identical (shasum `OK`).
- Whole-validator sweep: **32/32 `validate:*` scripts PASS, 0 failing** (31 → 32 with the new gate), measured on
  EXIT CODES.
- `npm run typecheck` 0 · `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) 0 · `npx eslint` 0 on every changed
  file · `npm run build` ✓ (7.90s).
- Playwright: NEW `e2e/po-admin-ack-surface.spec.ts` **3/3** · the affected suites (po-lifecycle · po-onbehalf ·
  po-brand-ack-surface · po-notification-fanout · notifications · status-semantics · record-drawer ·
  commerce-operational-simulation · dashboard · domain-acceptance · rocketchat-removal · p12-channel-operations ·
  channel-po-ingestion · multi-tenant) **84/84** · the ENTIRE suite: see the session report.

**A real defect found while writing the spec**: the S6-era guard `getByText('NaN', { exact: false })` is
CASE-INSENSITIVE in Playwright, so on an admin surface it matches **"Fi-NaN-ce"**. The S7 spec and the live verifier
therefore use a REGEX locator (`/NaN/`), which is case-sensitive.

**Honest limits / non-credential follow-ups**

- The **window is still enforced only at the canonical domain writer** (`src/data/api.ts →
  acknowledgePurchaseOrder`). The SIMULATED commerce seam (`commerceLifecycle.acknowledgeCommercePurchaseOrder`) owns
  its own status machine and does not judge the 24-hour window, so its panel's `Ack` affordance reads the
  config-owned obligation family (behaviour unchanged) rather than the time-dependent queue — recorded deliberately,
  because that panel is a self-contained simulation of the commerce lifecycle.
- The admin dashboard's PO-PIPELINE bucket remains a status-family view (not the acknowledgement queue); the
  distinction is stated in the code and asserted by the gate.
- The S5/S6 honest limits stand unchanged (no brand has an instant-message number on record, so the channel refuses
  in the demo while its success path is proven in the gate; the provider resolves `available`; the ledger and the
  demo store are in-memory).
- An UNATTENDED sweep that performs the rejection without an approval remains S10 plus a founder decision on the
  trigger.
