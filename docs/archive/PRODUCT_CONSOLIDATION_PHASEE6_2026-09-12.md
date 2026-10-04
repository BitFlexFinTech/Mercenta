# PHASE E6 — BRAND OPERATIONAL SURFACES
**Mercenta Partners Ltd — platform build phase report**
Date: 2026-09-12 · Branch: `redesign/foundation` · Implementation session

---

## 0. WHAT THIS PHASE IS

E1–E5 built the canonical domain state and the ADMIN operational surfaces. **E6
completes the BRAND-side operational experience** by closing four parity /
canonicality gaps — it is **not** a redesign and **not** a new brand application.

**E6 added no new surface.** Every change extends a file that already existed:

| Gap | Existing surface extended |
|---|---|
| **E6-G1** brand PO simulation provenance | `BrandPurchaseOrders` |
| **E6-G2** brand dashboard commerce awareness + deduction provenance | `BrandDashboard` |
| **E6-G3** canonical latest-submission derivation | `ProductCatalog` |
| **E6-G4** deduction notification simulation provenance | `NotificationCenter` (shared) |

**No new store, dashboard, CRM, catalog/PO/ticketing/billing system, no new
lifecycle function, no new navigation, no migration, no provider call.**

---

## 1. GIT STATE AT THIS CHECKPOINT

| Item | Value |
|---|---|
| Branch | `redesign/foundation` |
| **Pre-E6 checkpoint (revert point)** | **`d517b17`** — tag **`mercenta-pre-e6-20260912`** |
| **E6 implementation commit** | recorded at the E6 docs checkpoint (§3) |
| **E6 documentation checkpoint** | recorded at the E6 docs checkpoint (§3) |
| E5 implementation / docs | `10f5d5b` / `d517b17` |
| E5 pre-edit checkpoint | `981332f` (tag `mercenta-pre-e5-20260912`) |
| E4 implementation | `bf1ab15` |
| Protected baseline | **`959b4d2`** |
| Baseline tag | `mercenta-baseline-before-redesign-20260907` |
| Baseline is ancestor of HEAD | **YES** (`git merge-base --is-ancestor` → exit 0) |
| Rebase / amend / reset / force-push | **NONE** |
| Review Zip | regenerated at the end of the phase with the canonical script, **left unstaged** |

**Working-tree state at E6 start:** clean except the pre-existing
`M "Review Zip/mercenta-review.zip"` (35,921,658 bytes) — preserved exactly as
found, never staged, never cleaned.

---

## 2. WHAT WAS IMPLEMENTED (G1–G4)

### E6-G1 — brand PO simulation provenance (`BrandPurchaseOrders.tsx`)
The brand's own PO list rendered simulated and seeded POs identically, while the
admin list has carried `(sim)` since E5 (G2). The PO row now shows a `(sim)`
badge **derived only from the canonical `po.simulated` flag** — no inference from
naming or text. The change adds a `Badge` only: **no new button or input**, so the
existing per-line acknowledgement flow (`button hasText 'Acknowledge'` `.first()`)
and the `input[type="number"]` carton fields keep their established DOM order, and
`CommerceSimulationPanel` remains **last** in the file.

### E6-G2 — brand dashboard commerce awareness + deduction provenance (`BrandDashboard.tsx`)
The brand dashboard had no awareness of the E4 commerce state (an issued-but-unpaid
simulated invoice, or a delivered PO awaiting invoice). Two **canonically-derived**
attention groups were **appended after every existing group**:
- **`commerce-inv-*`** — issued-unpaid simulated invoices (from
  `demoCommerceInvoices` minus `demoCommercePayments`), tenant-filtered by
  `brandId === tenantId`, copy stating *"(sim) — no live payment provider contacted"*;
- **`commerce-po-inv-*`** — simulated POs that are `delivered` with no invoice yet
  (canonical PO list ∩ `invoicedPoIds`).

Existing simulated **deduction** attention rows now carry `(sim)` from the
canonical `Deduction.simulated` flag. The existing row order, the pinned **first**
row (`unacked-*`), all six KPI ids (`active-pos`, `awaiting-ack`, `in-fulfilment`,
`products-listed`, `out-of-stock`, `contract-status`) and the `po-summary-*`
test ids are **unchanged** — no new KPI cells were added.

### E6-G3 — one canonical latest-submission derivation (`ProductCatalog.tsx`)
The brand catalog built its own per-SKU submission map
(`new Map(submissions.map(s => [s.sku, s]))`) in which the **last array element
won**, duplicating logic the E3 domain already owns and — whenever more than one
row exists for a SKU — disagreeing with the canonical "newest by `submittedAt`"
rule. It now uses the canonical `demoStore.latestSubmissionForProduct` (the same
helper the E3 domain and both admin surfaces use after E5 G9), memoised on the
canonical query result so React re-renders still propagate. **Honest scope of the
defect:** `recordCatalogSubmission` is idempotent per (tenant, sku), so the shipped
demo keeps one row per SKU, where the old map happened to agree. This is therefore
a **canonicality + robustness** fix (single source of truth; correct when a second
row ever exists), not a currently user-visible wrong value.

### E6-G4 — deduction notification provenance (`NotificationCenter.tsx`)
Brand-visible deduction notifications include E4-raised **simulated** exceptions
but carried no provenance. The `deduction` kind now appends `· (sim)` **only when
the canonical `Deduction.simulated === true`**; non-simulated rows are byte-for-byte
unchanged. No second notification store; no change to notification kinds or routing.

---

## 3. EXACT FILES CHANGED (12 files: 3 new, 9 modified — NO migration)

### NEW (3)
| File | Purpose |
|---|---|
| `scripts/validate-e6-brand-surfaces.mjs` | E6 validator — 41 assertions (A–F) |
| `e2e/brand-operational-surfaces.spec.ts` | E6 browser coverage — 5 tests (A–L) |
| `docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md` | this report |

### MODIFIED SOURCE (4)
| File | Change |
|---|---|
| `src/components/brand/BrandPurchaseOrders.tsx` | **G1** `(sim)` badge from `po.simulated` (Badge only; panel still last) |
| `src/components/brand/BrandDashboard.tsx` | **G2** appended canonical `commerce-inv-*` / `commerce-po-inv-*` attention groups + `(sim)` on simulated deduction rows |
| `src/components/brand/ProductCatalog.tsx` | **G3** canonical `latestSubmissionForProduct` replaces the local last-wins map |
| `src/components/shared/NotificationCenter.tsx` | **G4** `· (sim)` on canonical simulated deduction notifications |

### MODIFIED DOCS (5)
`PROJECT_STATUS.md` · `HANDOFF.md` · `STATUS_CHECK.md` ·
`MERCENTA_MASTER_CONTEXT.md` · `MERCENTA_ARCHITECTURE.md` — whole-project E6
checkpoint blocks.

**NOT touched:** BI (`src/lib/intelligence/**`), Postiz, Rocket.Chat, Rakazo,
`src/lib/spapi/client.ts`, `src/lib/dhl/client.ts`, `src/services/xero/**`,
`src/lib/billing/invoice.ts`, `src/lib/catalog/**`, `BrandShell` navigation, the
design system, deploy scripts, **all migrations (023 remains newest)**,
`createPurchaseOrder`'s email path, `commerceLifecycle.ts`, `domainRepository.ts`,
`src/types.ts`, `src/data/api.ts`, `src/data/demoStore.ts`.

---

## 4. TESTING — EXACT RESULTS

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **PASS — 0 errors** |
| `npm run lint` (rules-of-hooks + exhaustive-deps as **error**) | **PASS — 0 problems** |
| `npm run build` | **PASS** |
| **E6 validator** `node scripts/validate-e6-brand-surfaces.mjs` | **41/41 PASS** → `E6_BRAND_SURFACES_VALIDATION_PASS`, exit 0 |
| **E6 Playwright** `npx playwright test e2e/brand-operational-surfaces.spec.ts` | **5/5 PASS** |
| **Full Playwright** `npx playwright test` | **198 passed / 4 skipped / 0 failed** (E5 baseline 193/0/4 → **+5, 0 regressions**) |
| All validators | **36 PASS / 15 FAIL** (35 legacy PASS + the new E6 validator; the **same 15 pre-existing** failures) |
| Pre-E6 vs post-E6 | clean `git worktree` at `d517b17`: after normalising the Node PID, the absolute root path and the post-verdict esbuild teardown line, **all 50 legacy validators are byte-identical**; the only semantic difference is the new `validate-e6-brand-surfaces.mjs` (absent pre-E6). **Zero drift.** |

### 4.1 E6 validator coverage (41 assertions)
| Section | Coverage |
|---|---|
| A (G1) | the simulated PO carries the canonical flags; the marker reads `po.simulated`; seeded POs carry no flag; `CommerceSimulationPanel` is still last; the marker is a Badge (no new button/input) |
| B (G2) | the dashboard reads the canonical commerce stores; both derivations are canonical; the new groups are APPENDED after `return-*`; the `unacked-` prefix is not reused; all six KPI ids and `po-summary-*` are unchanged; deduction rows carry canonical provenance; the derivation is tenant-scoped |
| C (G3) | no local submission map; the canonical helper is used; the helper is declared exactly once; no second helper; **behavioural proof** that with two rows for a SKU the canonical helper returns the newest while the removed array-last derivation would pick a different (wrong) row |
| D (G4) | the notification reads the canonical flag; non-simulated rows are unaffected; no second notification store; the ledger really holds both simulated and non-simulated rows |
| E | foreign tenant refused `CROSS_TENANT` on reads; view-only refused `FORBIDDEN`; **refusals mutate nothing** (activity count + PO status); the brand may still read its own records |
| F | `UNKNOWN`/`undefined`/`not_registered` still unsafe; `createPurchaseOrder` still performs its real notification; no provider path or `fetch` introduced; no migration added; **no protected path in the change set**; the SOURCE change set is within the approved files; no new store/dashboard module; `BrandShell` untouched; **zero external network calls** |

### 4.2 E6 browser coverage (5 tests, real Chromium, no stubs)
1. **A+B** — the simulated PO shows `(sim)` **and** the first `Acknowledge` control is still the existing PO control (the per-line ack panel still opens).
2. **C+D** — the issued-unpaid simulated invoice row renders with `SIM INVOICE DUE`, `(sim)` and "no live payment provider contacted"; the simulated deduction row shows `(sim)`; the **first** attention row is still `attention-unacked-*`.
3. **E** — the simulated deduction notification shows `(sim)`.
4. **F+G** — the E3 readiness surface is intact, and a real UI **resubmission** renders `Submitted (sim)` from the canonical latest derivation, with the `Check result` control still offered.
5. **H+I+J** — another brand sees no commerce attention state and no Zambezi PO; the real domain refuses a foreign tenant (`CROSS_TENANT`) and a view-only actor (`FORBIDDEN`), and **neither refusal mutates** the activity trail or the PO status.

Every test asserts `pageErrors === []` and `externalCalls === []`.

---

## 5. DEFECTS FIXED / ITEMS CLOSED

| # | Item | Nature | Fix |
|---|---|---|---|
| 1 | **G1** simulated POs indistinguishable brand-side | the brand PO list never read `po.simulated` | `(sim)` badge from the canonical flag (E5-G2 parity) |
| 2 | **G2** no brand awareness of E4 invoice state; simulated deductions unlabelled | the brand dashboard derived only PO/doc/ticket/return measures | appended canonical commerce groups + canonical provenance on deduction rows |
| 3 | **G3** duplicate / non-canonical latest-submission derivation | a local `Map` where the last array element won, duplicating the E3 domain helper | canonical `latestSubmissionForProduct` (E5-G9 parity) |
| 4 | **G4** simulated deduction notifications unlabelled | the `deduction` notification kind omitted provenance | `· (sim)` from `Deduction.simulated` |

**Fixed during E6 (self-inflicted, fixed before commit):**
- Three of the E6 validator's **own** assertions were wrong — a comment-satisfied
  substring test, a mis-anchored DOM check, and a provenance check that ran before
  any simulated deduction existed. Corrected at the root cause, including a
  **comment-stripping helper** so prose can neither satisfy nor break a code-shape
  assertion, and by driving the canonical lifecycle so the provenance assertion has
  real data.
- The **scope check** was corrected to ignore **generated artefacts**
  (`Review Zip/`, `test-screenshots/`, `playwright-report/`, `test-results/`),
  which had produced a false failure after the e2e run regenerated tracked
  screenshots. It now expresses its true intent — SOURCE scope — and passes on both
  a clean tree and a freshly-tested tree.

---

## 6. KNOWN LIMITATIONS

1. **Simulation only.** No live integration, no provider call, no email.
2. **Memory persistence unchanged.** No migration added or executed;
   `durable: false` remains truthful.
3. **G3 is a canonicality/robustness fix.** Because `recordCatalogSubmission` is
   idempotent per (tenant, sku), the shipped demo keeps one row per SKU — where the
   removed map happened to agree. The fix matters as a single source of truth and
   is correct the moment a second row exists (proven behaviourally in the validator).
4. **No new brand surface or nav entry** was added (deliberate — deferred to the
   UI/UX phase).
5. **`advanceCommerceShipment` / `openCommerceCase` remain unreachable from the
   brand UI** (optional parity items, deliberately out of E6 scope).
6. **No visual redesign**: existing tokens, primitives, layout and navigation.
7. **No deployment** and no manual click-through beyond the automated Chromium run.

---

## 7. COMPLETE PROGRAMME STATE

### Completed
`A` · `B` · `C` · `D1` · `D2` · `D3` · `D4` · `E1` · `E2` · `E3` · `E4` · `E5` ·
**`E6` ✅ COMPLETE (this phase)**

### Remaining
| Order | Item |
|---|---|
| next | **E7 — Embedded Postiz** |
| then | Final UI/UX redesign |
| then | Final full-platform integration / regression |
| then | Production deployment preparation |
| LAST | **Rakazo** |

### Standing statements
- **E6 COMPLETE. E7 NOT STARTED.**
- **Brand Intelligence is COMPLETE and untouched** — no BI file is in the E6 change set.
- **Simulation only.** No migration executed. **Memory persistence / `durable:false`.**
- **Rakazo remains LAST.** UI/UX redesign remains deferred. Production remains deferred.

---

## 8. E6 CHECKPOINT VERIFICATION

```bash
cd /Users/tadii/Desktop/Mercenta

# git state
git rev-parse mercenta-pre-e6-20260912    # → d517b17  (revert checkpoint)
git merge-base --is-ancestor 959b4d2 HEAD # → exit 0  (baseline IS an ancestor)
git tag -l 'mercenta-baseline*'           # → mercenta-baseline-before-redesign-20260907

# gates
npx tsc --noEmit -p tsconfig.app.json     # → 0 errors
npm run lint                              # → 0 problems
npm run build                             # → ✓ built

# E6 gates
node scripts/validate-e6-brand-surfaces.mjs                 # → E6_BRAND_SURFACES_VALIDATION_PASS (41/41)
npx playwright test e2e/brand-operational-surfaces.spec.ts  # → 5 passed
npx playwright test                                        # → 198 passed / 4 skipped / 0 failed

# validator sweep + pre/post proof
for f in scripts/validate-*.mjs; do node "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
# → 36 PASS / 15 FAIL (the same 15 pre-existing; 50 legacy validators byte-identical in a worktree at d517b17)

# canonical review zip (the ONLY authorised zip path/script)
bash ~/Desktop/Mercenta/scripts/export-review-zip.sh
```

**SIMULATION / LIVE STATUS:** SIMULATION ONLY. Zero external network calls across
the E6 validator and all five E6 browser tests. `UNKNOWN` remains unsafe; the
fail-closed provider gate is untouched.

**PERSISTENCE STATUS:** memory adapter active (`durable: false`). **No migration
added or executed** (023 remains the newest).