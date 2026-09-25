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
| **S5** | ALL-CHANNEL fan-out + the instant-message seam | NOT STARTED |
| **S6** | BRAND surfaces | NOT STARTED |
| **S7** | ADMIN surfaces | NOT STARTED |
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
- The notification schedule (12/6/2h) is declared and derivable but not yet fanned out (S5).
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
- The notification schedule (12/6/2h) is declared and derivable but not yet fanned out (S5).
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
- Nothing yet FANS the draft out to the brand's channels (`S5`); today the draft is materialised when a PO
  surface reads the purchase order (idempotent, recorded once).
- The execution remains the brand's (or Mercenta staff's) explicit approval — that IS this stage's point. An
  UNATTENDED sweep that performs the rejection when nobody approves is S5/S10 territory and would need the
  founder's decision on the trigger.

