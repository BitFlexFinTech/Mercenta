# NEXT BUILD PLAN — BATCHES 1, 2 and 3 (recorded 2026-09-27)

**Why this file exists:** so a brand-new chat can be told **"continue where you left off"** and resume with no
transcript. This is the *plan detail*; `PROJECT_STATUS.md → CURRENT RESUME STATE` is the *state*. Where they
disagree, the state file wins and this file is corrected.

**Agreed by the Founder on 2026-09-27** as the order of work. Nothing here overrides
`.clinerules/operating-model.md` (§5 commit/deploy, §10 three-way completion, §11 status vocabulary, §12
task-close + resume state) or the standing safety rules.

**Mapped leftovers from the §SSOT programme** (`docs/WORK_LAYER_SSOT_2026-09-26.md`): **S6 (CI wiring) → Batch 1** ·
**S7 (the contract closing path) → Batch 3**. No other stage of that programme is open — S1–S5 are DONE.

---

## BATCH 1 — MAKE THE KEY HANDOVER REAL (no credentials needed; simulation only)

**Goal (the Founder's own words):** *"when I get the API keys … I should just simply need to give them to you and
everything will sync up with no more work to be done."* Today that is **not yet true** for Amazon, DHL and
Palletline, because the real client paths call server-side helpers that do not exist.

### 1a. Build the missing server helpers (Edge Functions) the REAL clients already call

| Provider | Routes the real client calls | Evidence |
|---|---|---|
| **Amazon SP-API (12)** | `/catalog-items`, `/catalog-items/{submissionId}`, `/purchase-orders`, `/purchase-orders/status`, `/acknowledgements`, `/shipments/request`, `/shipments/{id}/details`, `/shipments/{id}/labels`, `/shipments/confirmations`, `/shipments/confirm`, `/invoices`, `/inventory` | `src/lib/spapi/client.ts` lines 356–674 |
| **DHL (3)** | `/shipments`, `/shipments/{waybill}`, `/shipments/pickup` | `src/lib/dhl/client.ts` lines 108–157 |
| **Palletline (5 routes / 5 calls)** | `/palletline/consignments` (create), `/palletline/consignments/{n}` (status), `/palletline/consignments/{n}/cancel` (cancel), `/palletline/collections`, `/palletline/consignments/{n}/invoice` | `src/lib/palletline/client.ts` lines 107–225 (**CORRECTED 2026-09-27: this row originally said "4 routes" and omitted `/cancel`; the helper gate derives the routes from the client source and found the fifth**) |

**Only these 9 Edge Functions exist today:** `catalog-import`, `discovery-directory`, `esign-envelope`,
`instantly-reply-webhook`, `payouts-transfer`, `send-email`, `social-session`, `xero-token`, `xero-webhook`
— **none** for SP-API, DHL or Palletline.

**Behaviour required with NO credentials** (the mock-first policy): each helper returns the **same simulated
response shapes the mock client returns** (mirror the mock, do not invent a second shape), makes **zero live
network calls**, is **unmistakably labelled simulated**, and **fails closed** on an unknown provider mode.
With real credentials present, the same helper performs the real call — **no application code changes**.

### 1b. Build the connect wizard's backend half (the one-click promise) — **DONE (session 41, 2026-09-28)**

The front half exists (`ConnectWizard` in `src/components/admin/integrations/IntegrationsPanel.tsx`). Missing:
step 2 (**secure key exchange + encrypted secret storage**) and step 3 (**the real harmless test call**).
**Both are now built.** `supabase/functions/_shared/providerConnect.ts` + `integration-connect/index.ts` (API-key
path) and `_shared/tokenExchange.ts` + `spapi-token-exchange/index.ts` (the OAuth exchange the wizard has always
called) run the harmless test server-side and write the credential to Vault, returning ONLY the `vault:` reference.
- ~~Real secrets must move to the vault, and demo secrets must leave `localStorage`.~~ **DONE** — the write half
  (`writeVaultSecret` / `credentialSecretName`) exists, and the connection-record schema was WRITTEN as
  `supabase/migrations/028_create_integration_connections.sql` (the cited `0002_…` never existed; the table is
  operator-level, staff-only RLS, no DELETE, `secret_ref` constrained to `vault:`, and a non-sandbox row MUST hold
  a vault reference).
- **Never relax:** a simulated connect is shown and treated as **"(Mock)"**, never as live. A simulation happens
  only on an explicit request, makes zero network calls and stores nothing.
- Definition of done: **DONE** — `scripts/validate-connect-wizard-backend.mjs` **is** the permanent fake-key
  rehearsal (49 assertions): for every declared provider a bad key is rejected by a real call with nothing stored
  and a good key is stored with only the reference returned; an undeclared provider, a missing key, a missing
  server secret and an unstorable verified key each fail with a stated code. **No code edits are needed to switch
  a key from fake to real** — only credentials.
- **Still open for a real handover (genuine blockers):** a Supabase project credential + CLI (to deploy the two
  functions, JWT verification ON), `SPAPI_CLIENT_SECRET` (+ `SPAPI_CLIENT_ID`) as a function secret, the Vault
  extension enabled, live provider credentials, and a declared harmless test endpoint for the 14 providers that do
  not yet have one (they refuse honestly with `TEST_ENDPOINT_NOT_DECLARED`).

### 1c. Enforcement and delivery — **CI WIRING DONE (session 42, 2026-09-28); DELIVERY STILL OPEN**

- **S6 — CI wiring: DONE.** `.github/workflows/ci.yml` now runs, on **every push and every pull request**:
  `npm ci` → `typecheck` → `lint` → `build` → `validate:wording` → `validate:all` (the WHOLE corpus — **116**
  validators, globbed by `scripts/validate-all.sh`; the `113` this section previously stated was the count on
  2026-09-27 and had already drifted). Before this, `.github/` held only `dependabot.yml`, so every gate ran only
  when someone remembered to run it — and the registry row `batch-4-ci-cd` cited this exact workflow path as its
  evidence for months **while no such file existed**. The workflow is kept honest by
  `scripts/validate-ci-wiring.mjs` (`npm run validate:ci-wiring`, 43 assertions): it fails if a step, a trigger,
  the action pinning, the `npm ci`-only rule, the build-before-validate ordering, or the no-deploy/no-secret
  property is removed. The wording gate is named explicitly because the corpus glob (`scripts/validate-*.mjs`)
  cannot match `scripts/lint-wording.mjs`; that coverage gap is closed here and asserted mechanically.
- **The Node version is part of the wiring, not a preference.** Two validators of the corpus
  (`validate-connect-wizard-backend`, `validate-integration-proxy`) `await import()` real `.ts` modules, which needs
  Node's type stripping (22.18/23.6+). The first workflow pinned **Node 20 and the first REAL CI run failed**
  (114 PASS / 2 FAIL of 116, `ERR_UNKNOWN_FILE_EXTENSION`) while the local rehearsal was green on Node 26. The
  requirement is now declared **once** in `package.json` → `engines.node: ">=22.18.0"`, the workflow installs
  **Node 24**, and `validate-ci-wiring` fails if the installed version drops below the declared minimum.
- **Delivery: STILL OPEN.** Publish to `https://demo.mercenta.co.uk` via `scripts/deploy-demo.sh` and verify live
  (the §10 three-way leg). The two Batch 1b Edge Functions and the migration are server-side and cannot be deployed
  from this environment (no Supabase credential, no CLI), so Batch 1's delivery leg remains deferred to the §SSOT
  programme's close (S7 = Batch 3) — as recorded in `PROJECT_STATUS.md`.

**Gate for Batch 1:** the route-coverage gate (`validate:integration-proxy`, proved able to fail) covers the
helpers, and `validate:ci-wiring` now covers **enforcement** — the leg that was missing. `npm run validate:all`
measured **116/116 PASS** on 2026-09-28. The remaining leg is the live verification.

---

## BATCH 2 — AMAZON ACCURACY (the 37 open findings; start with the HIGH ones)

**Register of record:** `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` (52 findings AV-001…AV-048)
with dispositions in `docs/AMAZON_RECONCILIATION_STATUS.md`. **As at 2026-09-28 (Batch 2b applied): 9 APPLIED
(AV-003, AV-006, AV-007, AV-010, AV-019, AV-019b, AV-020b, AV-022, AV-027), 30 still OPEN** (13 INCOMPLETE ·
1 UNSUPPORTED · 6 UNKNOWN · 2 CONTRADICTED · 5 INFERENCE = 27 by classification, plus the 3 KEEP rows
carrying a labelled follow-up — AV-001, AV-018, AV-039; 7 of the 30 EVIDENCE-BLOCKED).

### 2b. The amendment window — **DONE (session 44, 2026-09-28)**

`AV-006` — the channel's documented 48-hour UPDATE window was not modelled at all, so Mercenta could not tell
a brand its real obligation; the writer even refused ANY second acknowledgement, an over-restriction Mercenta
had invented. It is now **APPLIED**: `src/config/purchaseOrders.ts` owns the window, the four documented change
groups and the after-window set; `src/lib/commerce/poAcknowledgementWindow.ts` derives it pure and fail-closed;
the domain boundary treats a second submission as an AMENDMENT governed by that window; the brand surface and
Operational Guidance render the rule from its owner; and `npm run validate:po-amendment-window` **fails if the
window moves, if the after-window set changes, if an unreadable window is treated as open, if a quantity/price
change past the window is accepted, or if the surface re-types the rule** — proved able to fail twice.

### 2a. The attribution family — **DONE (session 43, 2026-09-28)**

`AV-019` / `AV-019b` / `AV-020b` shared one defect: a **Mercenta invention presented as the retail
channel's rule** (the deduction taxonomy, the fourteen-day dispute window, the thirty-day restock
countdown). All three are now **APPLIED**: one owning config (`src/config/deductions.ts`) declares each
value WITH its attribution (`source`, `verifiedAgainstChannel: false`, and the exact sentence every
surface renders), and `npm run validate:amazon-attribution` **fails if the attribution disappears, if a
second copy of a window is declared, or if the removed wording returns** — proved able to fail three
times. `AV-020` remains EVIDENCE-BLOCKED, and the reason is now recorded precisely: the platform's
"fulfillment score" is Mercenta's OWN financing-track score, and no channel scorecard is invented.

**Start here (named, highest business risk):**

| ID | What is wrong | Why it matters |
|---|---|---|
| ~~**AV-019 / AV-019b**~~ | ~~The deduction/chargeback taxonomy and dispute window are presented as Amazon's codes~~ — **APPLIED (Batch 2a, 2026-09-28)**: one owning config declares both as Mercenta's own, gated by `validate:amazon-attribution`. Not start work. | — |
| **AV-024** | **PO changes/revisions do not exist** in the platform, though Amazon can change an order | A brand could ship a superseded PO |
| **AV-006** | ~~The **48-hour amendment window** is not modelled~~ — **APPLIED (Batch 2b, 2026-09-28)**: the window is declared once, derived fail-closed, enforced at the domain boundary (a second submission is an AMENDMENT) and told to the brand, gated by `validate:po-amendment-window`. Not start work. | — |
| ~~**AV-007**~~ | ~~A rejected line can be re-acknowledged~~ — **APPLIED (Wave 3, 2026-09-22)**; the rejection is now permanent and enforced at the domain boundary. Not start work. | — |
| ~~**AV-020b**~~ (AV-010 is **APPLIED**, Wave 3) | ~~The invented 30-day backorder restock countdown~~ — **APPLIED (Batch 2a, 2026-09-28)**: Mercenta's own restock reminder, attribution rendered, removed wording gated absent. Not start work. | — |
| **AV-008 / AV-023** | Ack ↔ invoice price/time rules incomplete | Finance mismatch |
| **AV-032** | The compliance document set is **unsupported** by evidence | A regulatory claim without a source |
| **AV-040 / AV-042 / AV-043 / AV-045** | SP-API coverage, wording safeguards, PO vocabulary, delivery appointments incomplete | Incomplete fidelity to the channel |

**Then:** the remaining INCOMPLETE rows (AV-009/011/014/015/016/010b), the CONTRADICTED rows (AV-013/031 —
AV-027 is applied), and the INFERENCE rows that must be **relabelled** (AV-002/017/025/033/044).

**Do NOT guess the UNKNOWNs** (AV-020/034/035/046/047/048): they need a **signed-in Vendor Central session**
(founder-only) — record as EVIDENCE-BLOCKED until then.

**Rules for every row:** never present a Mercenta rule as Amazon's · simulation-first · fail-closed · update the
reconciliation row with the AV id + evidence · a validator or e2e must assert the change.

---

## BATCH 3 — PROVE WHAT WE CLAIM, AND CLOSE THE DECLARED GAPS

1. **The 126 "built but never independently re-verified" registry rows.** Run the page-by-page functional parity
   audit (global rule `06-page-by-page-functional-parity-audit.md`): render every surface with realistic seed
   data, assert the rendered count matches the canonical dataset, check name-implies-capability, check
   drill-down, and check tenant scoping on shared components. Then either promote each row to `built_and_tested`
   with evidence, or mark it honestly.
2. **S7 — the contract closing path (F5).** `demoContracts` has **no writer anywhere** and
   `ContractsAdminPanel` keeps the renewal draft in component state (`extraDrafts`). Build the canonical
   `renewContract` / `terminateContract` writer and write the draft to the canonical store, so the
   `contract_renewal` work closes by doing the work.
3. **The declared gaps** (`contract_renewal` + `founder_compliance`, `founder_setup`, `founder_integration`,
   `founder_funding`, `founder_finance`, `founder_ai_cost`): give each a closing path, or record with a reason
   why it has none. Nothing may stay silently unclosable.
4. **Blocked rows** stay blocked until credentials exist; they are reported, never faked.

---

## PENDING DECISIONS (ask if still unanswered when the work reaches them)

1. **Rules defects #5–#8** (recorded in `PROJECT_STATUS.md`): generalise them for every project, or leave them?
2. **The Amazon UNKNOWNs** need a signed-in Vendor Central session — a founder action, not code.

## RESUME PROCEDURE (one line)

Open a new chat and type **"continue where you left off"** → the session reads `PROJECT_STATUS.md →
CURRENT RESUME STATE`, starts the recorded `NEXT TASK` (Batch 1) from the recorded `EXACT NEXT STARTING POINT`,
and this file supplies the batch detail.

