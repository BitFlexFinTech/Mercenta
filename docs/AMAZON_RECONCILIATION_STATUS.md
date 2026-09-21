# AMAZON RECONCILIATION STATUS

**Status:** living document · **Created:** 2026-09-20 · **Increment:** S0 (master build reconciliation)
**Repository:** `/Users/tadii/Desktop/1. Mercenta` · **HEAD at creation:** `19be002c4b3d6a64020b4740879c56ef1550e628`
**Evidence sources (preserved, unmodified):**
`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` (967 lines) and
`docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` (138 lines) — the Phase 0A audit that produced the
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
| AV-003 | Supplier performance | UNSUPPORTED | **RELABEL** — remove/soften the unverified "vendor performance rating" claim | S5 | OPEN — not applied |
| AV-004 | Rejection codes | CONFIRMED | **KEEP** (three codes verbatim) | — | NO ACTION REQUIRED |
| AV-005 | Ack model | CONFIRMED | **KEEP** (line-level model, qty ≤ ordered) | — | NO ACTION REQUIRED |
| AV-006 | Ack update | INCOMPLETE | **BUILD** — declared amendment window | S5 | OPEN — not applied |
| AV-007 | Ack rules | INCOMPLETE | **BUILD** — block re-acknowledgement of a rejected line + test | S5 | OPEN — not applied |
| AV-008 | Ack ↔ invoice | INCOMPLETE | **BUILD** — match rule + warning | S5 | OPEN — not applied |
| AV-009 | Ack completeness | INCOMPLETE | **BUILD** — enforce/surface completeness at submission | S5 | OPEN — not applied |
| AV-010 | Backorders | UNSUPPORTED | **BUILD** — `isBackOrderAllowed`, fail-closed (false/missing/unknown ⇒ no backorder) | S5 | OPEN — not applied |
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
| AV-019 | Deduction taxonomy | UNSUPPORTED | **RELABEL** — Mercenta working taxonomy until real codes are sourced | S11 | OPEN — not applied |
| AV-019b | Dispute window | UNSUPPORTED | **RELABEL** — Mercenta service standard, not an Amazon rule | S11 | OPEN — not applied |
| AV-020 | Supplier performance | UNKNOWN | **EVIDENCE-BLOCKED** — do not model Amazon performance metrics | S13 | OPEN — not applied |
| AV-020b | Backorder restock | UNSUPPORTED | **RELABEL** — remove the unverified 30-day countdown until evidenced | S5 | OPEN — not applied |
| AV-021 | Payments architecture | CONFIRMED | **KEEP** — never present as an Amazon process | — | NO ACTION REQUIRED |
| AV-022 | Invoice rules | INCOMPLETE | **BUILD** — invoice rules + parallel testing as an activation prerequisite | S7 | OPEN — not applied |
| AV-023 | Ack price ↔ invoice price | INCOMPLETE | **BUILD** — enforce the match at ack/invoice time | S5 | OPEN — not applied |
| AV-024 | PO changes | INCOMPLETE | **BUILD** — PO-revision concept + change ingestion when live | S5 | OPEN — not applied |
| AV-025 | Naming | INFERENCE | **RELABEL** — rename the internal concept (e.g. "brand-direct supply") | S3 | OPEN — not applied |
| AV-026 | Supply route | MERCENTA RULE | **KEEP** — keep the wording honest | — | NO ACTION REQUIRED |

| AV-027 | Shipment stages | CONTRADICTED | **DECISION-REQUIRED / re-model** — route profiles with `mercenta_hub` **optional**; direct Brand facility → Amazon destination must stay supported | S3 | OPEN — decision T-4 recorded |
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

**Applied so far: 0 of 52.** This is the honest position. The register is a plan, not a record of work.

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
