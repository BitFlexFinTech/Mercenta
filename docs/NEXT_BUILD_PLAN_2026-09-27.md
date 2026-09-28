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

### 1c. Enforcement and delivery
- **S6 — CI wiring:** `.github/` holds only `dependabot.yml`; add a workflow running `npm ci`, `typecheck`,
  `lint`, `build` and `validate:all` (113 files) so a break cannot be committed unnoticed.
- Publish to `https://demo.mercenta.co.uk` via `scripts/deploy-demo.sh` and verify live (the §10 three-way leg).

**Gate for Batch 1:** a new/extended validator that asserts **every route the real clients call has a helper
file**, that each helper mirrors the mock's shape, and that no simulated call is presented as live —
**proved able to fail**. Then `npm run validate:all` **113/113**, plus the live verification.

---

## BATCH 2 — AMAZON ACCURACY (the 37 open findings; start with the HIGH ones)

**Register of record:** `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` (52 findings AV-001…AV-048)
with dispositions in `docs/AMAZON_RECONCILIATION_STATUS.md`. **As at 2026-09-27: 3 APPLIED, 37 still OPEN**
(16 INCOMPLETE · 6 UNSUPPORTED · 6 UNKNOWN · 3 CONTRADICTED · 5 INFERENCE; priority 29 HIGH · 17 MEDIUM · 6 LOW).

**Start here (named, highest business risk):**

| ID | What is wrong | Why it matters |
|---|---|---|
| **AV-019 / AV-019b** | The deduction/chargeback taxonomy and dispute window are presented as Amazon's codes; **no Amazon source publishes them** | A brand could believe they are Amazon's real codes (flagged HIGH/HIGH) |
| **AV-024** | **PO changes/revisions do not exist** in the platform, though Amazon can change an order | A brand could ship a superseded PO |
| **AV-006** | The **48-hour amendment window** is not modelled | Mercenta cannot tell a brand its real obligation |
| **AV-007** | A **rejected line can be re-acknowledged** — the channel refuses that change | The app offers an impossible action |
| **AV-010 / AV-020b** | Backorder mechanics modelled but **unverified** | Unsupported behaviour shown as fact |
| **AV-008 / AV-023** | Ack ↔ invoice price/time rules incomplete | Finance mismatch |
| **AV-032** | The compliance document set is **unsupported** by evidence | A regulatory claim without a source |
| **AV-040 / AV-042 / AV-043 / AV-045** | SP-API coverage, wording safeguards, PO vocabulary, delivery appointments incomplete | Incomplete fidelity to the channel |

**Then:** the remaining INCOMPLETE rows (AV-009/011/014/015/016/010b), the CONTRADICTED rows (AV-013/027/031),
and the INFERENCE rows that must be **relabelled** (AV-002/017/025/033/044).

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

