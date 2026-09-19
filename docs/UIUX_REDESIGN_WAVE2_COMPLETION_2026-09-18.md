# UI/UX REDESIGN — WAVE 2 COMPLETION (FINISH-AND-FIX) — 2026-09-18

> Branch `redesign/foundation`, HEAD `ea700a1` (protected baseline `959b4d2` still an
> ancestor). **No git mutation of any kind was performed** (no commit, stage, stash,
> reset, checkout, clean, amend, branch switch, merge, rebase, cherry-pick). The
> working tree remains intentionally dirty.
>
> This pass finishes the work the Wave-2 implementation report explicitly left open
> and hunts for real defects. It is **not** a new design project, **not** a rebuild,
> **not** a repeat of Wave 1 or Wave 2, and **not** API activation.

## 1. Initial reconciliation (what was already done — NOT redone)

Verified against the CURRENT code and the current gates before any edit:

| Claim from the Wave-2 report | Verification |
|---|---|
| Saturated 8-hue palette + `--mr-on-palette` in all six themes | `validate-uiux-redesign.mjs` 253 PASS/0 FAIL (pre-change); `validate-theme-foundation.mjs` 50 PASS |
| Motion + density tokens identical in all six themes | same validators; `src/index.css` reduced-motion block |
| Workspace primitive system | `src/components/shared/workspace.tsx` (all primitives exported) |
| Operations Overview as the gold-standard workspace | `src/components/admin/AdminDashboard.tsx` |
| Shell, nav rail, utility header, ⌘K palette, nav badges | `AppShell`/`Sidebar`/`Header`/`CommandPalette`/`navBadges` + validator assertions |
| Animated charts + single recharts language | `MercentaCharts.tsx` + `rechartsTokens.ts` |
| Homepage redesign, TAM/SAM removed, tracker preserved | `Home.tsx` + `homepageContent.ts` + validator assertions |
| Tour coach-mark click-swallowing fix | `TourEngine.tsx` |
| Gates at the pre-change checkpoint | tsc **0** · eslint `src/` **0** · build **PASS** · wording **PASS 235 files / 0** · integrity-audit **61/0 PASS** · e5 **PASS** · e6 only the known pre-existing F6 · e7 **121/0 PASS** · verify-registry exit 0 (228 entries) |

**Confirmed NOT done (and therefore the scope of this pass):**

1. `uiux-wave2-core-surfaces-remaining` was `not_started` — the page-by-page migration.
2. `RecordDrawer` existed and was exported but was referenced by **zero** surfaces
   (`grep -rn 'RecordDrawer' src/` → definition only).
3. The Homepage Editor's `visibility` / `protection` sections were **linted but had
   no form** — the editor only edited hero fields.


## 2. What this pass implemented

### 2.1 RecordDrawer wired into the real record queues (QUEUE → PREVIEW → RECORD/ACT)

| Surface | Preview step | Hand-off to the EXISTING record workflow |
|---|---|---|
| `AdminPurchaseOrderList` | `po-preview-*` → `po-record-drawer` (identity, status + ack window, summary fields, lines, finance & logistics, activity) | `po-drawer-open-record` → the existing `AdminPurchaseOrderDetail` full record page (unchanged). The row contract the existing suites assert (`div.flex.items-center.justify-between` + `button[title="View detail"]`) is preserved verbatim. |
| `ComplianceApprovals` | `doc-preview-*` → `doc-record-drawer` (status, verification standing, document fields, last verification outcome, gate effect) | `doc-drawer-open-record` → the existing full document preview (generated-artefact iframe + review actions); `doc-drawer-approve` runs the real manual approval. |
| `ReturnsTrackingDashboard` | DataTable row click → `return-record-drawer` (status, summary, quality notes, forwarding, stage timeline) | `return-drawer-advance` runs the real `handleNextStage` store mutation. |
| `BrandPurchaseOrders` | `brand-po-preview-*` → `brand-po-record-drawer` (brand-scoped record: status, ack deadline, summary, lines) | `brand-po-drawer-acknowledge` / `brand-po-drawer-open-record` → the existing inline acknowledgment / ASN workflow. |

Rules honoured: only sections the record type actually supports are rendered (a
section with no real rows simply does not appear); no fabricated records or fields;
no fake backend; actions call the existing real actions.

### 2.2 Record-queue workspace migration

All four surfaces now compose the established Wave-2 architecture —
`WorkspaceFrame` → `WorkspaceHeader` (eyebrow, title, description, meta, actions,
**sticky toolbar**) → interactive `MetricBand` → `WorkspaceSection` record queue →
`ContextPanel` context rail (admin surfaces). Every metric tile drills down into a
real filter/state change; density is a **real** control (`data-density` changes the
rendered row padding); the status filters are real filters over the canonical status
vocabulary.

### 2.3 Homepage Editor completion

`visibility` and `protection` (headings, subheadings, every point title +
description) are now editable through the same draft → publish pipeline and the same
outward-wording lint gate, plus an explicit **Revert** control that re-reads the
persisted copy. Each write touches only its own section.

## 3. Real defects found and fixed

1. **Public homepage crashed on any persisted partial content** (high severity).
   `fetchHomepageContent()` returned the raw `homepage_content` row and
   `supabase/migrations/001_create_homepage_content.sql` seeds it as `'{}'::jsonb`;
   `Home` reads `c.hero.*` / `c.visibility.*` unguarded, and `HomeShell` passes the
   fetched `live` straight in. A Supabase-configured deployment therefore rendered
   the public homepage from an empty object and threw; the Homepage Editor had the
   same exposure. Fixed with ONE canonical `normaliseHomepageContent()` at the API
   seam (non-empty persisted values win, otherwise the canonical default; lists keep
   only entries with a real title AND description). No migration was added (the
   existing E5/E6 scope guards assert the newest migration is 027) — the runtime
   normalisation also repairs already-deployed rows.
2. **Non-deterministic returns forwarding** (`ReturnsTrackingDashboard`). The forward
   tracking number used `Math.floor(1000 + Math.random() * 9000)`, so the same
   forward produced a different number on every run. Now derived deterministically
   from the tracking record's own id.
3. **Dead interaction on the returns queue.** `selectedId` was written by the row
   click and by Advance but never read, so clicking a return row did nothing visible.
   It now drives the record drawer.
4. **Stale derived figures after a returns mutation.** The store mutates record
   objects in place, so a `useMemo` keyed only on the (unchanged) array reference
   kept serving pre-Advance counts. Fixed with the project's established
   `mutationStamp` pattern (as used by `ListingAnalyzer` / `AmazonAdsDashboard` /
   `BrandAdvertising`).
5. **Regression introduced and caught in this pass.** The compliance metric tile's
   `statusText` contained the word "rejected"; Playwright's string `hasText` matching
   is case-INSENSITIVE, so `locator('button', { hasText: 'Reject' })` matched the
   metric tile (earlier in the DOM) instead of the document row's Reject control, and
   `document-verification` test 2 failed. The label was changed to "Expired or

## 4. Validators / tests changed (all declared, none weakened)

- `scripts/validate-uiux-redesign.mjs` — sections 11 and 12 added (record-surface
  architecture + RecordDrawer wiring; persisted-content normalisation + editor form).
  **253 → 289 PASS / 0 FAIL.**
- `e2e/document-verification.spec.ts` — two selectors **REPOINTED** from the implicit
  `div.grid button` / `div.grid > div` (document-order assumptions) to the explicit
  `[data-testid="compliance-brand-card"]` contract, because the surface now composes a
  metric band (also a `div.grid`) above the queue. The asserted invariants are
  unchanged and the selectors are now stricter. Recorded inline with the
  `§UI/UX Wave 2 completion — REPOINTED` pattern.
- `e2e/record-drawer.spec.ts` — NEW, 13 tests: drawer identity/escape/hand-off, real
  density, real filter, compliance drawer, returns drawer + real Advance, brand
  tenant-scoping, editor publish → public homepage, banned wording blocks publish,
  and **responsive verification of the migrated surfaces at 1440×900, 1280×800,
  1024×768 and 390×844** (no horizontal overflow; the drawer fits a 390px viewport).
- `scripts/reconcile-uiux-wave2-completion-registry.py` — NEW reconciliation helper.
- Scope guards: the new/changed files declared in BOTH `UIUX_REDESIGN_SCOPE`
  (validate-e6) and `UIUX_REDESIGN_DECLARED` (validate-e7), including
  `src/data/api.ts` with its reason stated inline.

## 5. Genuinely remaining (NOT claimed as done)

The **non-record** operational surfaces still use their previous page composition:
Marketplace Intelligence (Brand Intelligence / Ad Spend), Finance (Billing /
Accounting), Super Admin & governance (Super Admin / Audit Log / Integrations /
Onboarding Tours) and the admin CRM / catalogue / logistics / communications panels.
Tracked accurately as `uiux-wave2-core-surfaces-remaining` (`not_started`, narrowed).

Also parked, as instructed: API/credential activation, Rakazo, Monid/Jev,
Cloudflare/Supabase migration, new provider integrations, new AI systems, new
backend search infrastructure, future functional expansion.

   missing" (still truthful) and the row action is reachable again.
