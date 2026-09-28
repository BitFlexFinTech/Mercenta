# AMAZON RECONCILIATION STATUS

**Status:** living document · **Created:** 2026-09-20 · **Increment:** S0 (master build reconciliation)
**Repository:** `/Users/tadii/Desktop/1. Mercenta` · **HEAD at creation:** `19be002c4b3d6a64020b4740879c56ef1550e628`
**Evidence sources (preserved, unmodified):**
`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` (967 lines, verified 2026-09-28) and
`docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` (**208 lines** as at 2026-09-28; this document said
"138", which was the register's length when this document was created and had since drifted — the register
gained its POST-REGISTER CHANGE records) — the Phase 0A audit that produced the
**52 findings AV-001…AV-048** (including sub-items `AV-010b`, `AV-014b`, `AV-019b`, `AV-020b`).

> **§20 discipline — non-negotiable.** This document does **not** convert a Mercenta rule into an Amazon
> requirement, an inference into a fact, or an unknown into assumed behaviour. Where authoritative evidence is
> unavailable the disposition is **EVIDENCE-BLOCKED** and the correct state is
> **UNKNOWN / INCOMPLETE / REQUIRES AUTHENTICATED VERIFICATION**.

---

## 1. DISPOSITION VOCABULARY

| Disposition | Meaning |
|---|---|
| **KEEP** | Mercenta's behaviour is correct and may remain exactly as-is. Where the rule is Mercenta's own, the copy must never present it as Amazon's. |
| **RELABEL** | The behaviour may stay, but the *attribution* or *wording* is wrong (Mercenta rule or inference stated as an Amazon fact). Wording-only change. |
| **BUILD** | A documented Amazon behaviour is not represented; implement it (simulation-first, fail-closed). |
| **REMOVE (pending approval)** | The mechanic is unsupported and should be removed or replaced, not relabelled. Requires the explicit approval recorded in this document. |
| **EVIDENCE-BLOCKED** | Cannot be implemented truthfully until the Amazon-side evidence in §4 is obtained. Implementing now would mean inventing Amazon behaviour. |
| **DECISION-REQUIRED** | Needs a Founder decision recorded in §3 before any change. |

**Status column:** every row is **OPEN — not applied** unless stated otherwise. The Phase 0A audit applied
nothing, and increment S0/S1-a applied nothing from this register.

---

## 2. THE 52 FINDINGS — DISPOSITION

| ID | Domain | Classification | Disposition | Owning increment | Status |
|---|---|---|---|---|---|
| AV-001 | PO ack | CONFIRMED | **KEEP** (add the "on hold" nuance via AV-010b) | S5 | OPEN — not applied |
| AV-002 | PO ack | INFERENCE | **RELABEL** — "subject to forced cancellation" → "at risk" (risk, not certainty) | S5 | OPEN — not applied |
| AV-003 | Supplier performance | UNSUPPORTED | **APPLIED 2026-09-25 (S8)** — the unverified *"vendor performance"* claim is REMOVED from its last carriers, all of them ONBOARDING surfaces that teach the purchase-order rule: the guided tours (`tourDefinitions.ts`), the legacy tour path (`TourLoader.tsx`, the `TOUR_STEPS` constant), the `kb-purchase-orders` article both acknowledgement tour steps link to, the wizard's operational-guidance step (`BrandGuidance.tsx`) and the wizard/Add-Product intros. Each now renders the rule's ONE owner (`PO_ACK_ONBOARDING_STATEMENT`) and states Mercenta's own position, labelled as Mercenta's. The `postmarkNotifier.ts` carriers recorded in the 2026-09-20 register no longer exist. Asserted by `validate:po-ack-onboarding` (repo-wide, comment-stripped, whitespace-normalised sweep = 0 remaining carriers). | S8 | **APPLIED** |
| AV-004 | Rejection codes | CONFIRMED | **KEEP** (three codes verbatim) | — | NO ACTION REQUIRED |
| AV-005 | Ack model | CONFIRMED | **KEEP** (line-level model, qty ≤ ordered) | — | NO ACTION REQUIRED |
| AV-006 | Ack update | INCOMPLETE | **BUILD** — declared amendment window | S5 | OPEN — not applied |
| AV-007 | Ack rules | INCOMPLETE | **BUILD** — block re-acknowledgement of a rejected line + test | S5 | **APPLIED (Wave 3, 2026-09-22)** — `src/lib/commerce/backorderGate.ts → ackStatusTransitionRefusal` makes a rejection permanent, and the domain boundary (`src/data/api.ts → acknowledgePurchaseOrder`) refuses the transition before any line is mutated. Asserted by `npm run validate:wave3-logistics` (56 assertions, 0 failures) and by `npm run validate:po-acknowledgement-enforcement`. **Corrected 2026-09-28 (session 43): this row previously read "OPEN — not applied" while the guard was already in the code and gated — a false statement.** |
| AV-008 | Ack ↔ invoice | INCOMPLETE | **BUILD** — match rule + warning | S5 | OPEN — not applied |
| AV-009 | Ack completeness | INCOMPLETE | **BUILD** — enforce/surface completeness at submission | S5 | OPEN — not applied |
| AV-010 | Backorders | UNSUPPORTED | **BUILD** — `isBackOrderAllowed`, fail-closed (false/missing/unknown ⇒ no backorder) | S5 | **APPLIED (Wave 3, 2026-09-22)** — the fail-closed gate exists (`src/lib/commerce/backorderGate.ts`; `true` permits, `false`/`undefined`/unknown refuse), is enforced at the domain boundary (`src/data/api.ts → acknowledgePurchaseOrder`), and the demo fixtures declare the field per line (`src/data/demoData.ts`). Asserted by `npm run validate:wave3-logistics` (backorder allowed / refused / fail-closed). **Corrected 2026-09-28 (session 43): this row previously read "OPEN — not applied" while the gate was already in the code — a false statement.** The `on_hold` half remains open as **AV-010b**. |
| AV-010b | PO on hold | INCOMPLETE | **BUILD** — `on_hold` state + reject-by-24h duty | S5 | OPEN — not applied |
| AV-011 | Ack verification | INCOMPLETE | **BUILD** — verify status when live | S7 | OPEN — not applied |
| AV-012 | Freight ↔ window | CONFIRMED | **KEEP** | — | NO ACTION REQUIRED |
| AV-013 | Routing request | CONTRADICTED | **REMOVE (pending approval)** — do not relabel an unsupported Amazon mechanic | S4 | OPEN — decision T-6 recorded |
| AV-014 | Routing lead time | INCOMPLETE | **BUILD** — declared lead time + carrier-assignment timing | S4 | OPEN — not applied |
| AV-014b | Shipment gating | CONFIRMED | **KEEP** (PO-gated shipment creation is correct) | — | NO ACTION REQUIRED |
| AV-015 | ASN timing | INCOMPLETE | **BUILD** — "ASN before receipt" | S5 | OPEN — not applied |
| AV-016 | ASN content | INCOMPLETE | **BUILD** — SSCC/pallet fields + the ≤100 rule (when live) | S7 | OPEN — not applied |
| AV-017 | Destinations | INFERENCE | **RELABEL** — Mercenta-maintained destination list; the PO is authoritative | S3 | OPEN — not applied |
| AV-018 | Receiving → deductions | MERCENTA RULE | **KEEP** — label the deduction as Mercenta-raised | S3 | OPEN — not applied |
| AV-019 | Deduction taxonomy | UNSUPPORTED | **APPLIED (Batch 2a, 2026-09-28)** — RELABEL completed: the nine categories are now declared ONCE as **Mercenta's own working taxonomy** in `src/config/deductions.ts` (`source: 'mercenta_working_taxonomy'`, `verifiedAgainstChannel: false`), with the label map owning every user-facing label and the attribution sentence rendered by the brand deductions ledger (`DeductionsLedger.tsx`) and the guided tours (`tourDefinitions.ts`). The raw enum is no longer printed as if it were a channel code. Gate: `npm run validate:amazon-attribution` (31 assertions), which asserts the attribution, the enum↔label parity and the absence of the old wording. **Real codes still to be sourced from channel reporting — that remains the open half of the finding, and no code claims otherwise.** | S11 | **APPLIED** |
| AV-019b | Dispute window | UNSUPPORTED | **APPLIED (Batch 2a, 2026-09-28)** — RELABEL completed: the window is declared once as **Mercenta's own service standard** (`DEDUCTION_DISPUTE_WINDOW`, `verifiedAgainstChannel: false`) and every surface that showed it (brand ledger, guided tour, automation note) now states that it is not a published channel deadline. `workStore.ts` re-exports the config's number rather than re-declaring `14`. Gate: `npm run validate:amazon-attribution`. | S11 | **APPLIED** |
| AV-020 | Supplier performance | UNKNOWN | **EVIDENCE-BLOCKED** — do not model Amazon performance metrics | S13 | OPEN — and the position is now recorded exactly: no channel performance scorecard is modelled from guesswork. The platform DOES hold a Mercenta-side brand score used for its own financing-track decision (`demoFulfillmentScores` — trading history, export experience, scale, working capital, category risk, reliability → `direct_fulfillment` / `financed`), whose "fulfillment score" naming is Mercenta's own and must never be presented as the channel's vendor scorecard. Surfacing it under an unambiguous Mercenta name is carried by this row, not silently done. |
| AV-020b | Backorder restock | UNSUPPORTED | **APPLIED (Batch 2a, 2026-09-28)** — RELABEL completed: the target is declared once as **Mercenta's own operational target** (`BACKORDER_RESTOCK_TARGET`, `verifiedAgainstChannel: false`), the domain boundary adds the config's `days` instead of a bare `30`, and the brand purchase-order countdown now says "Mercenta's restock reminder" with the attribution rendered beside it. The removed announcement that channel visibility had been lost is asserted absent. Gate: `npm run validate:amazon-attribution`. | S5 | **APPLIED** |
| AV-021 | Payments architecture | CONFIRMED | **KEEP** — never present as an Amazon process | — | NO ACTION REQUIRED |
| AV-022 | Invoice rules | MODELLED IN PART (P7, 2026-09-23) | **BUILD (in part) — the number/zero-value/cancel rules and the parallel-testing precondition are implemented (`src/lib/commerce/invoiceRegistry.ts` + `INVOICE_NUMBER_RULES` + `PRODUCTION_READINESS.md`); bill-to/Payee matching, credit notes and the `submitInvoices` API submission (P12) remain** | S7 | APPLIED 2026-09-23 (P7) |
| AV-023 | Ack price ↔ invoice price | INCOMPLETE | **BUILD** — enforce the match at ack/invoice time | S5 | OPEN — not applied |
| AV-024 | PO changes | INCOMPLETE | **BUILD** — PO-revision concept + change ingestion when live | S5 | OPEN — not applied |
| AV-025 | Naming | INFERENCE | **RELABEL** — rename the internal concept (e.g. "brand-direct supply") | S3 | OPEN — not applied |
| AV-026 | Supply route | MERCENTA RULE | **KEEP** — keep the wording honest | — | NO ACTION REQUIRED |

| AV-027 | Shipment stages | CONTRADICTED | **APPLIED (P5, 2026-09-23)** — re-modelled exactly as decision **T-4** required: `mercenta_hub` is DELETED from `ShipmentStage`/`ShipmentStatus`/`STAGE_ORDER`/`STAGE_LABELS`/`STATUS_LABELS` and replaced by `destination_fc` (arrival at the FC declared on the PO); `MERCENTA_UK_HUB` and the hub geo-node kind are deleted; a record naming an undeclared place resolves to `null` and is drawn as a schematic leg. **No mandatory hub remains in the enum.** (`mercenta_hub` survives only inside comments that record its deletion.) | S3 | **APPLIED** — recorded in the register's POST-REGISTER CHANGE section; corrected here on 2026-09-28 (session 43) from "OPEN — decision T-4 recorded". |
| AV-028 | Lead time target | MERCENTA RULE | **KEEP** — never present as an Amazon requirement | — | NO ACTION REQUIRED |
| AV-029 | Pack concepts | CONFIRMED | **KEEP** | — | NO ACTION REQUIRED |
| AV-030 | MOQ honesty | MERCENTA RULE | **KEEP** | — | NO ACTION REQUIRED |
| AV-031 | Compliance attribution | CONTRADICTED | **RELABEL** — attribute to UK/EU regulation + Mercenta onboarding control, never to Amazon | S2b | OPEN — not applied |
| AV-032 | Compliance set | UNSUPPORTED | **RELABEL/REMOVE** — remove or reclassify as an optional Mercenta control | S2b | OPEN — decision required |
| AV-033 | Catalogue images | INFERENCE | **EVIDENCE-BLOCKED** — verify image requirements against Amazon documentation, then cite it | S8 | OPEN — not applied |
| AV-034 | Marketplace ID | UNKNOWN | **EVIDENCE-BLOCKED** — verify before live activation | S7/S8 | OPEN — not applied |
| AV-035 | Catalogue submission | UNKNOWN | **EVIDENCE-BLOCKED — BLOCKING S8** — verify the Vendor catalogue route; `transformProductForCatalog` has no documented Vendor target | S8 | OPEN — not applied |
| AV-036 | Categories | MERCENTA RULE | **KEEP** — never describe as an Amazon rule | — | NO ACTION REQUIRED |
| AV-037 | Commercial model | MERCENTA RULE | **KEEP** — never imply Amazon endorses either model | — | NO ACTION REQUIRED |
| AV-038 | VAT | MERCENTA RULE | **KEEP** | — | NO ACTION REQUIRED |
| AV-039 | Freight economics | MERCENTA RULE | **KEEP** — collect lane must not inherit Mercenta shipping margin | S3 | OPEN — not applied |
| AV-040 | SP-API coverage | INCOMPLETE | **BUILD** — extend the seam (mock-first) to the documented Vendor operations | S7 | OPEN — not applied |
| AV-041 | Cases | MERCENTA RULE | **KEEP** | — | NO ACTION REQUIRED |
| AV-042 | Wording safeguards | INCOMPLETE | **BUILD** — extend the banned-phrase pattern list to PO/purchase-order guarantee wording | S2b | OPEN — not applied |
| AV-043 | PO vocabulary | INCOMPLETE | **BUILD** — declare an explicit bidirectional PO vocabulary mapping | S5 | OPEN — not applied |
| AV-044 | Simulation | INFERENCE | **RELABEL/REPAIR** — correct the underlying claims; scenarios then inherit the correction | S2b | OPEN — not applied |
| AV-045 | Delivery appointments | INCOMPLETE | **BUILD** — add the appointment concept | S3 | OPEN — not applied |
| AV-046 | Marketplace rules | UNKNOWN | **EVIDENCE-BLOCKED** — state "no documented UK-specific difference found"; re-check | S13 | OPEN — not applied |
| AV-047 | Receiving tolerances | UNKNOWN | **EVIDENCE-BLOCKED** — source from Vendor Central reporting before modelling | S3 | OPEN — not applied |
| AV-048 | Routing UI deadline | UNKNOWN | **EVIDENCE-BLOCKED** — verify in a signed-in Vendor Central session | S13 | OPEN — not applied |

---

## 3. SUMMARY OF THE 52 DISPOSITIONS

| Disposition | Count | IDs |
|---|---|---|
| **KEEP — no action required** (CONFIRMED + MERCENTA RULE) | **16** | AV-004, AV-005, AV-012, AV-014b, AV-021, AV-026, AV-028, AV-029, AV-030, AV-036, AV-037, AV-038, AV-041 + AV-001, AV-018, AV-039 (keep, with a labelled follow-up) |
| **RELABEL** (attribution/wording wrong, behaviour may stay) | **9** | AV-002, AV-003, AV-017, AV-019, AV-019b, AV-020b, AV-025, AV-031, AV-044 |
| **BUILD** (documented Amazon behaviour not represented) | **17** | AV-006, AV-007, AV-008, AV-009, AV-010, AV-010b, AV-011, AV-014, AV-015, AV-016, AV-022, AV-023, AV-024, AV-040, AV-042, AV-043, AV-045 |
| **REMOVE / RE-MODEL (pending approval or decision)** | **3** | AV-013 (T-6), AV-027 (T-4), AV-032 |
| **EVIDENCE-BLOCKED** (cannot be done truthfully yet) | **7** | AV-020, AV-033, AV-034, AV-035, AV-046, AV-047, AV-048 |
| **Total** | **52** | — |

**Applied so far: 8 of 52 — corrected 2026-09-28.** This section previously claimed "1 of 52 (AV-003)", which
was false (three further findings had already been applied and were still listed as open).

| Applied finding | Increment | What is now true | Gate |
|---|---|---|---|
| **AV-003** | S8, 2026-09-25 | the unsupported *"vendor performance"* claim is removed from every onboarding carrier | `npm run validate:po-ack-onboarding` (repo-wide sweep = 0 carriers) |
| **AV-007** | Wave 3, 2026-09-22 | a rejected line can never later become accepted/backordered (permanent, enforced at the domain boundary) | `npm run validate:wave3-logistics`, `npm run validate:po-acknowledgement-enforcement` |
| **AV-010** | Wave 3, 2026-09-22 | a backorder is offered ONLY where the channel's `isBackOrderAllowed` is `true`; missing/unknown fails closed | `npm run validate:wave3-logistics` |
| **AV-019** | Batch 2a, 2026-09-28 | the deduction taxonomy is declared once as Mercenta's own working taxonomy and every surface says so | `npm run validate:amazon-attribution` |
| **AV-019b** | Batch 2a, 2026-09-28 | the dispute window is declared once as Mercenta's own service standard, never as a published channel deadline | `npm run validate:amazon-attribution` |
| **AV-020b** | Batch 2a, 2026-09-28 | the restock target is declared once as Mercenta's own operational target, and the removed channel-visibility announcement cannot return | `npm run validate:amazon-attribution` |
| **AV-022** | P7, 2026-09-23 | invoice number/zero-value/cancel rules + the parallel-testing precondition implemented (`src/lib/commerce/invoiceRegistry.ts`); bill-to/Payee matching, credit notes and `submitInvoices` (P12) remain | `npm run validate:invoicing` |
| **AV-027** | P5, 2026-09-23 | the mandatory `mercenta_hub` stage is deleted and replaced by `destination_fc` (the FC declared on the PO) | register POST-REGISTER CHANGE record + code evidence above |

**The open position, derived (not asserted):** of the 52 findings, **16 are KEEP rows that need no further
work** (7 CONFIRMED + 9 MERCENTA RULE) **minus the 3 that carry a labelled follow-up (AV-001, AV-018,
AV-039)** → **13 need nothing**; **8 are APPLIED**; therefore **31 remain OPEN** — being the 28 findings
still open *by classification* (**14 INCOMPLETE · 1 UNSUPPORTED (AV-032) · 6 UNKNOWN · 2 CONTRADICTED · 5
INFERENCE**) **plus the 3 labelled follow-ups**. **7 of the 31 are EVIDENCE-BLOCKED** (AV-020, AV-033,
AV-034, AV-035, AV-046, AV-047, AV-048). The register remains a plan, not a record of work.

---

## 4. FOUNDER DECISIONS RECORDED (authoritative, 2026-09-20)

| ID | Decision | Effect on this register |
|---|---|---|
| **T-1** | **Payoneer is the canonical PRIMARY/default Mercenta business account and Amazon payment account. Wise is SECONDARY.** Amazon payments go to Payoneer. Wise must never be silently substituted when Payoneer is unavailable. | **APPLIED 2026-09-21 (runtime parity session 5).** All five sources are reconciled: `src/config/payouts.ts` (`DEFAULT_PAYOUT_RAIL = 'payoneer'`, `SECONDARY_PAYOUT_RAIL = 'wise'`), `supabase/functions/payouts-transfer/index.ts` (`DEFAULT_RAIL = 'payoneer'`), `.clinerules/mercenta-business-model.md`, `docs/MERCENTA_BUSINESS_MODEL.md` + `docs/INTEGRATIONS.md`, and the validators/registry. Payout arithmetic, the human-approval gate and the Stripe/Xero refusals are UNCHANGED; no live external account was touched. |
| **T-2** | **No external carrier users/logins**; do not create or preserve a carrier-login workflow. The Logistics Hub is Brand/Admin-facing. Existing carrier code is **not** deleted in this increment — reconcile/retire it in the later Logistics Hub increment after dependency analysis. | Affects AV-014 / AV-045 ownership; carrier views stay **INTENTIONALLY EXCLUDED** from new E2E work. |
| **T-3** | **"Mercenta Operator" is not the canonical human control role — Founder / Super Admin is.** Staff/RBAC functionality is **not** to be deleted merely to remove the terminology; relabelling happens in a later increment. | Adds a wording-reconciliation task (9 source occurrences, verified by grep) to a later increment. |
| **T-4** | **Mercenta Hub must NOT be a mandatory universal route.** Direct Brand facility → applicable Amazon destination must remain supported where appropriate. | Governs AV-027: re-model as route profiles with `mercenta_hub` optional. |
| **T-5** | Existing **Staff/RBAC functionality is retained**; tested functionality is not deleted; Founder/Super Admin remains the canonical human control role. | Governs the Super Admin `staff` sub-tab disposition. |
| **T-6** | The Brand-facing **Routing Request mechanic is to be removed/reconciled** in the later routing increment — **not merely relabelled**, and no change in S0/S1-a. | Governs AV-013: REMOVE (pending approval), owner S4. |
| **T-7** | The final credential architecture must support real Founder/Super Admin **entry, replacement, secure persistence, masked readback, validation, enable/disable and provider-specific fields**, with credentials never exposed in the frontend. | Owner S2c; recorded here so the requirement can never be lost. |

---

## 5. EVIDENCE STILL OUTSTANDING (sign-in-gated or Amazon-side)

Nothing below may be modelled until it is obtained and cited. Source: `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` Part D.

1. Vendor **performance scorecards** (AV-020, AV-003)
2. **Receiving tolerances** (AV-047)
3. **Deduction / chargeback windows, codes and dispute taxonomy** (AV-019, AV-019b)
4. The **Vendor catalogue submission route** (AV-035 — no public Vendor catalogue/item API was found)
5. The **UK marketplace ID** (AV-034)
6. Whether a **Vendor Central routing-request UI deadline** exists (AV-013, AV-048)
7. **Amazon listing-image requirements** (AV-033)
8. UK-specific **marketplace rule differences** (AV-046)

---

## 6. WHAT THIS DOCUMENT DOES NOT CLAIM

- It does **not** claim any finding has been fixed. Every row is **OPEN — not applied** unless it says
  **NO ACTION REQUIRED** (a CONFIRMED or MERCENTA-RULE row needing nothing).
- It does **not** claim Mercenta has any Amazon approval, endorsement, programme status or guaranteed purchase
  orders. `AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'` remains the canonical status
  (`src/lib/intelligence/amazonWording.ts`), enforced by `npm run validate:wording`.
- It does **not** convert the ten approved categories, the two commercial models, the compliance gate, the payout
  chain or the case-mediation rule into Amazon requirements — those remain **Mercenta rules** (discrepancy
  register Part C, 12 rows, all KEEP).
- **S1-a touched none of the 52 findings.** It fixed the MercentaCharts invalid-SVG-unit defect and added
  `scripts/validate-provider-mode-safety.mjs` (52 assertions), which protects the **MERCENTA RULE** that an
  unknown / unregistered / missing provider mode is never treated as simulation.
- Where a behaviour is an **operational target** rather than an Amazon requirement (routing lead times, hub
  stages, dispute windows), this document requires it to be **labelled as Mercenta's** — never presented as
  Amazon's.

---

*Created in increment S0 (master build reconciliation). Maintained under `.clinerules/project-state-contract.md`
as one of the five synchronised project-state sources.*
