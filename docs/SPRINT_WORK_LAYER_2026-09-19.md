# MERCENTA — DETERMINISTIC PLATFORM COMPLETION SPRINT (2026-09-19)

> Branch `redesign/foundation` · starting HEAD `ea700a1` · protected baseline `959b4d2` (still an ancestor).
> This document is the canonical record of what this sprint actually did, verified, and did NOT finish.

## 0. What was reconciled first (nothing was redone)

Read before changing anything: `PROJECT_STATUS.md`, `HANDOFF.md`,
`requirements-registry.json` (the canonical completion ledger — 233 entries; **no file named
"matrix" exists in this repo**), `docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md`, `git status`.

Confirmed already complete and **preserved untouched**: the canonical 20-brand universe, RBAC,
tenant isolation, Amazon operational simulation, compliance gate, PO workflow, fulfilment/returns,
finance, CRM/catalogue/logistics/communications, integration registry + simulation safety, AI
FREE-only governance, deterministic scenario engine, event substrate, the validator suite, the UI/UX
Wave 1/2 token + workspace + shell + chart + homepage work, `RecordDrawer` wiring, the Homepage
Editor visibility/protection form, the tour-overlay fix.

Confirmed **genuinely open** at the start of this sprint:

| # | Item | Ledger status at start |
|---|---|---|
| 1 | `uiux-wave2-core-surfaces-remaining` (the non-record operational surfaces) | `not_started` |
| 2 | The canonical operating layer had **no Calendar** and **no unified work/task layer** | absent |
| 3 | `workstreamBD-seed-expansion-deferred` | `not_started` (owner-DEFERRED, correctly parked) |

## 1. BUILT — canonical work / task + calendar operating layer (NEW)

The sprint's core requirement (`§5`/`§6`/`§14`/`§22`) was a shared deterministic operating model:

```
canonical record → WORK ITEM (event) → TASK → NOTIFICATION → CALENDAR
                 → ACTION → RESOLUTION → ACTIVITY/AUDIT
```

New files:

| File | Purpose |
|---|---|
| `src/lib/work/types.ts` | ONE shape (`WorkItem`, `CalendarEntry`, `WorkSource`, `WorkPriority`, `WorkStatus`) for every unit of operational work |
| `src/lib/work/workStore.ts` | The canonical store: deterministic derivation from real records, lifecycle (open → in progress → blocked → done), resolution/reopen, audit + event emission, the ONE tenant filter, deterministic reset |
| `src/lib/work/calendar.ts` | The DERIVED calendar: every entry projects a work item; pure Monday-first month grid; no wall-clock/locale dependence |
| `src/lib/work/useWork.ts` | React bindings (`useSyncExternalStore`) so a resolution anywhere re-renders every other view |
| `src/components/shared/WorkWorkspace.tsx` | The shared operating workspace: **LIST · KANBAN · CALENDAR**, metric band, record drawer, context rail, real task creation |
| `src/components/admin/WorkManagement.tsx` | Admin/Super-Admin destinations (Work Management + Operations Calendar) |
| `src/components/brand/WorkManagement.tsx` | Brand destinations (Tasks & Deadlines + Your Calendar), tenant-scoped from the session |

**Derivation sources — all REAL canonical records, nothing invented:** PO acknowledgement (24h rule),
PO ship/delivery window, compliance document missing/rejected/expiring, contract renewal, open or
disputed deduction, shipment exception/delay, returns warehouse stage, prospect outreach follow-up.

**Determinism:** ids are `work-<source>-<entityId>`; deadlines are the record's own dates plus
DECLARED terms (`PO_ACKNOWLEDGEMENT_HOURS`, `INVOICE_TERM_DAYS`, `DEDUCTION_DISPUTE_WINDOW_DAYS`,
`RETURN_ACTION_WINDOW_DAYS`, `OUTREACH_FOLLOW_UP_DAYS`, `EXPIRY_HORIZON_DAYS`). **No `Math.random()`,
no `Date.now()`-derived ids, no random dates, prices or tracking numbers** — asserted by the validator.

**Reminders stop on resolution:** `getWorkItems` excludes resolved items in ONE place, and the
notification centre projects work items through the same call — so completing the action removes the
notification. Asserted in the validator and verified in the browser.

**Wiring (integration, not a feature island):**
- Admin nav: new **Operations** section → *Work Management*, *Calendar*.
- Brand nav: new **Operations** section → *Tasks & Deadlines*, *Calendar*.
- RBAC allowlist extended for both tiers (`src/lib/auth/rbac.ts`).
- Nav attention badges + overdue counts from the canonical store (`src/lib/nav/navBadges.ts`).
- Notification centre gains a `work` kind for sources no other kind covers.
- `EventType` extended additively: `work_item_raised`, `work_item_resolved`.
- Every mutation is attributed (`workActor(session)`) and written to `demoAuditLog`.

## 2. BUILT — remaining-surface migration (partial, honestly reported)

`uiux-wave2-core-surfaces-remaining` — migrated this sprint:

| Surface | What changed |
|---|---|
| `src/components/admin/BillingPanel.tsx` | `WorkspaceFrame` + `WorkspaceHeader` + sticky toolbar (`SegmentedControl` focus) + interactive `MetricBand` (4 real drill-downs that narrow the brand list) + context rail with period summary. All existing billing behaviour (`generateInvoice`, `generateRemittanceStatement`, `downloadCsv`, statement popup) preserved verbatim. |
| `src/components/admin/AdminAuditLog.tsx` | `WorkspaceFrame` + `WorkspaceHeader` + sticky toolbar (search + action filter + **new real range filter**) + interactive `MetricBand` (drill-down into the most frequent action / 24h window) + context rail. The canonical `DataTable` (responsive cards below md) is retained. |

Still **NOT migrated** (unchanged this sprint): Brand Intelligence
(`src/components/brand/BrandIntelligence.tsx`, `src/components/admin/BrandIntelligencePanel.tsx`),
Ad Spend (`AmazonAdsDashboard.tsx`), Accounting (`AccountingPanel.tsx`), Super Admin
(`SuperAdminPanel.tsx`), Integrations (`admin/integrations/IntegrationsPanel.tsx`), Onboarding Tours
(`UsertourAdminPanel.tsx`), and the admin CRM / Catalogue / Logistics / Communications panels. These
remain tracked by `uiux-wave2-core-surfaces-remaining` (still `not_started`, now partially progressed).

## 3. REAL DEFECTS FOUND AND FIXED

1. **`RecordDrawer` footer actions were unclickable (HIGH).** The drawer used `z-50`, the same
   z-index as the fixed demo environment switcher, which is later in the DOM and therefore won the
   hit test — *Resolve* / *Open record* on **all five** drawer surfaces (including the four migrated
   in the previous pass) could not be clicked when the switcher was present. Raised to `z-[60]` with
   an inline explanation. Verified by browser test.
2. **`Button` silently dropped `data-testid`.** Hyphenated JSX attributes pass TypeScript but are not
   forwarded by a component with an explicit props interface, so specs could not select any button
   reliably. Added an explicit, additive `'data-testid'` passthrough.
3. **Resolve left the record drawer open**, so the operator could not return to the queue; resolving
   now closes the drawer (the work is done).
4. **Regression introduced and caught in-session:** the Billing rewrite dropped the literal
   `Brand Subscriptions` label that three validators assert (`validate-mock-providers`,
   `validate-review-s1`, `validate-stage8`). Restored in the workspace header description — the
   validators were NOT weakened and no assertion was changed.

## 4. TESTED — evidence from this session

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) | **0 errors** |
| `npm run build` | **PASS** (✓ built in ~3.0s) |
| `npm run lint` (eslint incl. `react-hooks` rules as errors) | **0 problems** |
| `node scripts/validate-work-layer.mjs` (**NEW**, 49 assertions) | **PASS — 0 failures** |
| `node scripts/validate-uiux-redesign.mjs` | **306 PASS / 0 FAIL** (was 289) |
| `node scripts/validate-event-feed.mjs` | **PASS** (0 failures) |
| `node scripts/integrity-audit.mjs` | **61 PASS / 0 FAIL — 100%** |
| `npx playwright test e2e/work-layer.spec.ts` (**NEW**, 10 tests) | **10 passed / 0 failed** |
| `record-drawer + po-lifecycle + compliance-gate + admin-operational + brand-operational + app-shell + notifications` | **60 passed / 0 failed** |
| `billing + app-shell + dashboard + domain-acceptance + multi-tenant` | **52 passed / 0 failed** |
| Full validator sweep (77 validators) | **74 PASS / 3 FAIL** — see §5 |

The new browser suite proves, in real Chromium: the workspace composition, the metric band, real
filters/search, the record drawer with its activity trail, the kanban board, **reminders stopping on
resolution**, the derived month grid (42 cells, month navigation), brand-vs-admin tenant isolation
(a brand's rows are a strict subset of the admin's), real task creation appearing across all three
views, deterministic reset, and **no horizontal overflow at 390px**. Screenshots:
`test-screenshots/work-layer/`.

## 5. KNOWN FAILING GATES (honest classification)

1. **`validate-e6-brand-surfaces.mjs` — F6 only.** After this sprint's declaration the offender set
   is **exactly the 5 pre-existing entries** (`ave1-check.mjs` + the 4 protected `design/*.png`,
   including the three SACRED assets). Unchanged from the pre-sprint baseline; not a product defect;
   the protected design assets were **not** modified and were **not** added to git. F8 (brand nav)
   was REPOINTED to the new canonical 17-item order with the old 15-item contract recorded inline.
2. **`validate-e7-embedded-social.mjs` — was failing, now PASS.** The change-set scope guard needed
   this sprint's files declared (same mechanism as every prior phase). A file outside EVERY declared
   set is still refused — the guard is not weakened.
3. **`validate-stage26.mjs`** — prints ✗ for the compliance-gate-check / catalog-import Edge-Function
   API contract but exits 0. **PROVEN pre-existing at `ea700a1`** (documented in the previous pass,
   reproduced on a pristine clone). Unrelated to this sprint.

## 6. NOT DONE (explicit, no silent deferral)

- The remaining `uiux-wave2-core-surfaces-remaining` surfaces listed in §2 (8 surfaces).
- The `invoice_due` / `onboarding_step` work sources are typed and declared but have no live
  derivation path yet (the commerce invoice lifecycle is driven by the E4 simulation, not a job).
- A scheduled/event-driven proactive reminder *runner* (Monday brief / Friday update / chase cadence)
  is not added; the reminder *state* is fully deterministic and testable, but no cron/timer executes
  it in this build. The platform's existing `src/lib/automation/digest.ts` remains the digest seam.
- No live provider activation, no credential change, no deploy, no Rakazo change, no Supabase/D1
  migration, no Jev/Monid work, no social-media scope expansion.

## 7. SIMULATION / SECURITY STATE

- Simulation only. **Zero live provider calls** in this sprint; `validate-e6` F9 asserts zero external
  network calls across its suite and `validate-mock-providers` asserts the DHL/Palletline simulations
  perform zero network calls.
- Provider safety unchanged: UNKNOWN/unregistered/unconfigured/disabled/configuring/live/degraded/error
  are never treated as simulation-safe.
- Tenant isolation: the work layer filters in ONE place (`getWorkItems`) and the browser suite proves a
  brand sees a strict subset of the admin set; the brand work surface takes its tenantId from the
  session only.


