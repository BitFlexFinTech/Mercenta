# MERCENTA_BUSINESS_MODEL.md

> **CANONICAL.** This document is the single authoritative statement of the
> Mercenta operating business model. Where any other document, code comment,
> rule file, script or test description contradicts it, **this document wins**
> and the other artefact must be corrected — not the other way round.
>
> Companion documents: `MERCENTA_ARCHITECTURE.md` (how it is built),
> `docs/INTEGRATIONS.md` (provider registry + seams), `PRODUCTION_READINESS.md`
> (what is mocked and what each credential replaces), `GO_LIVE.md` (go-live
> playbook), `PROJECT_STATUS.md` (what is actually built).

---

## 1. The model in one paragraph

Mercenta is the **proxy / distribution and operational layer between brands and
the retail-channel (Amazon Vendor Central) relationship**. **Mercenta operates
the Vendor Central account**; a brand does not. Operationally:

```
retail channel  →  Mercenta  →  the correct brand
brand           →  Mercenta  →  retail channel
```

Mercenta automates this flow wherever an integration/API permits it, and
Mercenta Admin retains the ability to intervene, correct, approve, reject,
retry, reconcile and override where an operational exception requires a human.

## 2. The two platform modes

| Mode | Network | Purpose |
|---|---|---|
| **Deterministic simulation/demo** | zero external calls | full end-to-end lifecycle, realistic failures + recovery, reset/replay, investor-presentable |
| **Production integration** | real provider APIs | same architecture — activated by credentials/configuration only |

Simulation executes the **real canonical seams and domain rules** (it is not a
relabelled fake UI). A provider is only simulated when its connection
**positively** resolves `simulation`; every other state
(`unknown`/`not_registered`/`disabled`/`configuring`/`available`/`live`
without credentials/`degraded`/`error`) is fail-closed and never silently
simulated (`src/integrations/types.ts` → `isProviderSimulationSafe`).

## 3. Brand onboarding + compliance (hard gate)

- A brand applies; onboarding must be **completed**.
- Approval is **subject to compliance**. Admin "Approve" is an operational
  override of *workflow state* — **never** of regulatory/compliance
  requirements.
- The platform distinguishes, and never collapses into one boolean:
  application approval · onboarding completion · document completeness ·
  document verification · retail-channel/provider verification · compliance
  gate clearance · operational activation.
- **A brand/product cannot enter the catalogue → PO workflow until every
  applicable required compliance document is present and approved**
  (`src/lib/compliance.ts` → `evaluateComplianceGate`,
  `getRequiredDocumentsForCategory`). Documentation is requirements-driven:
  universal + category-specific + conditional, with expiry, versioning,
  verification state/source, reviewer, rejection reason, re-upload and audit.

### 3.1 Implementation anchors (M2, 14 Sep 2026)

- **Requirements are rules, not a checklist.** `src/lib/compliance.ts` exposes
  `getComplianceRequirements()` / `getApplicableRequirements()`: four **universal**
  documents (never conditional, because Mercenta is the vendor of record) plus
  category rules whose **condition** is stated (`touchesFood`, `isElectrical`,
  `isCosmetic`, `isTextile`, `isAutomotive`, `isBaby`, `isPerishable`). A
  conditional requirement is dropped ONLY when the platform positively knows the
  condition does not apply — unknown stays required (fail-closed).
- **Verification is a provider seam, not a hardcoded service.**
  `src/lib/verification/documentVerification.ts` selects between
  `internal_structural_rules` (automated, deterministic, **`external: false`** —
  this is Mercenta's own rule engine, not a third-party verification),
  `simulated_document_verification` (reachable only in a positively identified
  `simulation` mode; unmistakably `SIM-DOC-VERIFY-…`), `manual_mercenta_admin`
  (a first-class operator path that records identity, method and reason) and
  `unavailable_document_verification` (fail-closed for every other mode). No
  external provider is claimed unless an external provider actually answered.
- **A submission is not a verdict.** Submitting moves the document to
  `under_review` and opens a **pending** verification record; the gate stays
  blocked. A failed verification sets `rejected`, and the requirement can then
  only be satisfied by a **replacement**; the replaced version becomes
  `superseded` and is retained with its verification history (never deleted). The
  gate always judges the **latest version** of a requirement. `missing`,
  `uploaded`, `under_review`, `rejected`, `superseded`, `expiring` and `expired`
  all block — only `approved` clears.
- **Manual approval cannot bypass the requirement**: an operator approval with no
  document artefact on file FAILS and changes no state.

## 4. Retail-channel PO flow (the core workflow)

```
retail-channel PO → Mercenta imports it → Mercenta identifies the correct brand
→ Mercenta routes it to that brand → brand approves / rejects / modifies
→ decision recorded in Mercenta → Mercenta relays the response to the channel
```

- Routing is **deterministic and auditable**; a PO is never arbitrarily
  assigned to the wrong brand.
- Brand access is **tenant-scoped** (a brand sees only its own POs); Admin sees
  operationally relevant POs across tenants per RBAC.
- The acknowledgement model is preserved: 24-hour window, **line-level**
  acknowledgement, duplicate refusal, lifecycle, money maths, auditability.
- Every outbound provider operation is **idempotent** and recoverable: if the
  channel is unavailable the operation is **never** marked successful, the
  pending/error state is retained, Admin can intervene and retry safely.

## 5. PO-gated shipping

- **No PO = no shipment.** A shipment may only be derived from a valid,
  eligible PO belonging to the acting brand, with quantities consistent with
  the acknowledged PO lines and all required shipment data present
  (`src/data/api.ts` → `createShipmentForPO`, tenant- and status-gated).
- **Carrier routing is centralised** in `src/lib/shipping/carrierRouting.ts`
  and `src/config/shipping.ts` — never duplicated in a UI:

  | Lane | Carrier (Mercenta account) |
  |---|---|
  | International | **DHL** (Mercenta's DHL UK account) |
  | UK domestic | **Palletline** (Mercenta's Palletline account) |

  The partnered carrier is permitted **only** on retail-channel-arranged
  (Freight Collect) POs. There is no arbitrary carrier selection.
- **Shipping commercial model** (`shippingCalculator.computeShippingCommercials`):
  carrier list cost → negotiated discount → **actual carrier invoice cost** →
  mark-up + surcharge + handling → brand charge → VAT treatment → shipping
  margin → net Mercenta revenue. **Both sides of the transaction are recorded
  and auditable** — the carrier cost is never overwritten by the customer
  price. All rates/fees/VAT treatment are **configurable placeholders** in
  `src/config/shipping.ts`; nothing hardcodes a mark-up such as 90%.
- The brand pays shipping **up front**; the shipment proceeds only once the
  configured payment condition is satisfied.

## 6. Cases / tickets

- A brand case is **never** sent straight to the channel. The workflow is:
  brand opens case → **Mercenta Admin review/correction** → approve / request
  info / reject → (approved only) escalate → channel response → Mercenta
  records it → brand sees the update → resolve → close
  (`src/lib/helpdesk/ticketStore.ts`, seam
  `src/lib/helpdesk/amazonCaseClient.ts`).
- Cases carry tenant, brand, category, priority, status, description, related
  PO/shipment/deduction/payment/compliance item, channel case reference,
  Mercenta owner, messages, escalation state, provider state and a full audit
  trail. Escalation is **idempotent** and **fail-closed**.

## 7. Deductions / chargebacks

Same proxy model: channel financial/operational events enter Mercenta → the
correct brand is identified → the brand sees only its own records and may
supply evidence → **Mercenta retains operational control** of evidence, case
opening, dispute, resolution, channel submission and reconciliation. A brand can
**never** award itself a dispute outcome (`resolveCommerceDispute` refuses a
brand-pinned actor; only an operator resolves).

## 8. Money: channel payment → Mercenta finance → brand payout

```
PO → goods received → channel payment → Mercenta receives it → matched against
the PO → gross amount → Mercenta commission → shipping economics → other fees
→ VAT treatment → deductions/adjustments → net brand payable → payout →
reconciled → audited
```

- The finance model must separately represent: PO value, payment received,
  payment reference/date, PO reconciliation, commission + rate, shipping
  revenue, carrier cost, shipping margin, other fees, VAT where applicable,
  deductions/chargebacks, refunds/adjustments, net owed to brand, payout
  amount/status/reference, reconciliation status.
- **Commission** uses the canonical model (single source of truth, no
  percentage/fraction ambiguity — `resolveCommissionRatePct`,
  `computeBrandNetShare`).
- **VAT is configurable, never assumed.** The model distinguishes VAT charged /
  recoverable / included in price / payable / exempt/zero-rated. Where the
  legal/accounting treatment is not finalised the assumption is **explicit and
  configurable**, never silently encoded as a legal conclusion.
- **Xero** is the accounting system for canonical financial events — a real
  seam (`src/services/xero/`), not a decorative tile, with deterministic
  accounting identity so one PO/payment cannot create duplicate entries.
- **Payouts** run through the existing payout seam
  (`src/lib/billing/payouts.ts`): a failed payout never becomes paid; a
  successful payout is never paid twice; every payout links brand → PO/payment
  → calculation → transaction → audit. A brand's payout destination must be
  **verified** before the account is payable.

### 8.1 Implementation anchors (M6, 14 Sep 2026)

- **One reconciliation per payment, ever.** `src/lib/finance/financialReconciliation.ts`
  → `reconcilePayment()` writes `rec-<paymentId>` linking payment → invoice → PO
  → brand, with amount, currency, payment source, payment date and reconciliation
  state (`pending` / `reconciled` / `exception`). A payment is **never assumed**
  to belong to a PO: an asserted PO that does not match the payment's recorded PO
  produces an **exception**, and a duplicate reconciliation is refused.
- **Money comes from canonical facts.** PO value and commission come from the PO
  store (rate normalised through `resolveCommissionRatePct`); deductions are kept
  as two separate numbers — **applied** (accepted/resolved) and **unresolved**
  (open/disputed) — because only the first reduces the payable and only the
  second blocks it.
- **The accounting representation goes through one seam**
  (`src/lib/finance/accountingSeam.ts`): simulated representation in positive
  `simulation` mode (zero network), the existing `src/services/xero` client in
  `live` mode, and a fail-closed provider otherwise. A posting that was not
  written is recorded as **not represented**, with the real error.
- **The payout gate is explicit.** `evaluatePayoutEligibility()` requires ALL of:
  a reconciled payment for the PO; no unresolved deduction; a **verified**
  destination; no already-paid commission; no payout already submitted/settled.
  Every refusal records a **blocked** payout plus an audit row; the one
  settlement path (`api.settleBrandPayout`) enforces it and never downgrades a
  settled payout.
- **VAT is configuration, not a conclusion.** `src/config/commercial.ts` ships
  `VAT_TREATMENT = 'configuration_required'` with `VAT_TREATMENT_CONFIGURED =
  false`; until that decision is taken no tax amount is computed and every
  record says so.

## 3.2 The two commercial models (canonical §3)

Mercenta supports **exactly two** commercial relationships with a brand, chosen
during onboarding and stored on the brand's commercial relationship:

- **Model A — commission / agent-style.** The retail channel pays Mercenta;
  Mercenta retains an agreed commission and the remainder is the brand's
  economic amount.
  *Investor example: £10,000 PO at 20% ⇒ £2,000 Mercenta commission, £8,000 brand
  economic amount.*
- **Model B — buy / resell / distribution.** Mercenta acquires the goods from the
  brand and resells them into the channel.
  *Investor example: £10,000 retail-channel revenue − £7,500 brand acquisition
  cost = £2,500 gross commercial spread; every additional cost (shipping,
  payment fees, other agreed fees, deductions) is then shown SEPARATELY, giving a
  net Mercenta margin.*

The demo runs **Brand A on Model A and Brand B on Model B**, through the same
platform, so both models are visibly operating.

Canonical implementation: `src/config/commercialModel.ts` (definitions, internal
documents, fail-closed selection) and `src/lib/finance/commercialModel.ts` (the
arithmetic + the derived demo figures). No component re-derives a margin.

**Separation that must never be broken.** The commercial relationship's
documents are INTERNAL between Mercenta and the brand. They are completely
separate from the retail-channel compliance documentation a product needs, and
**changing Model A vs Model B must never change or bypass the regulatory/
compliance documentation required for the products.** An unreported model
resolves to `not_selected` (fail-closed) rather than being silently assumed.

### 3.2.1 Brand-level selection is COMPLETE (M12, 14 Sep)

The M11 report recorded brand-level commercial-model selection as incomplete. It
is now built and verified end to end:

- **Chosen at onboarding, and mandatory.** The wizard's agreement step requires
  the brand to pick Model A or Model B; `checkCommercialModelSelection` refuses to
  continue without one (`COMMERCIAL_MODEL_SELECTION_IS_MANDATORY = true`), and the
  UI states the requirement rather than defaulting.
- **Stored per brand, in one place.** `demoStore.getBrandCommercialModelRecord` /
  `setBrandCommercialModel` hold one record per brand (model, agreed terms, source,
  actor, reason, timestamp). The demo assignment is DERIVED from each brand's own
  declaration in `src/data/demoData.ts` (`DEMO_MODEL_A_BRAND_ID` = Brand A →
  Model A; `DEMO_MODEL_B_BRAND_ID` = Brand B → Model B) — never retyped.
- **Changeable only by the Super Admin, and always audited.**
  `COMMERCIAL_MODEL_CHANGEABLE_BY = ['Super Admin']`; an operator change requires
  BOTH an actor and a reason, appends a canonical audit row
  (`entityType: 'brand_commercial_relationship'`) recording
  `complianceUnchanged: true`, and history is never destroyed.
- **Fail-closed everywhere.** An unknown or absent model is refused
  (`not_selected`), never guessed. The investor demo proves this at runtime by
  attempting an unknown model and requiring the store to reject it.
- **Surfaces.** Super Admin → *Commercial Models* (both worked illustrations, the
  per-brand table with the computed retail-channel requirement count beside each
  model, and the audit trail); Brand → *Settings → Commercial Relationship*
  (read-only, with the separation stated in the product).
- **Evidence.** `scripts/validate-commercial-model-selection.mjs` (18 checks) plus
  the investor-demo `commercial_models` stage (both £-figures, fail-closed probe,
  audit row, computed compliance independence) and `e2e/commercial-model.spec.ts`.

**Two linked identities, never collapsed.** The external retail-channel PO
(issued to Mercenta) and the Mercenta → brand commercial PO/order (issued per the
brand's model) are both retained and explicitly related, so accounting, VAT,
audit and reporting stay unambiguous.

## 8.1 VAT (canonical §9)

`src/config/vat.ts` is the ONLY place a VAT amount is derived. It returns net,
VAT and gross **together**, so a gross figure can never be shown without the
arithmetic behind it, and it supports standard-rated, zero-rated, exempt,
reverse-charge and explicitly-unconfigured treatments, plus configurable
per-item treatment.

Two facts that must never be collapsed:

- **Production treatment is NOT invented.** `src/config/commercial.ts` ships
  `VAT_TREATMENT_CONFIGURED = false`, so no production tax figure is computed
  until the business takes the decision — every record says
  `configuration_required`.
- **The demo uses the standard UK rate (20%) as a labelled illustration**
  (`DEMO_VAT_ILLUSTRATION`) so real arithmetic is visible. It is never presented
  as a production tax determination, and no product/category is claimed to be
  standard-rated.

## 8.2 Payout rails (canonical §6/§7)

- **Payoneer is the DEFAULT payout rail and the canonical retail-channel payment
  account; Wise is the SECONDARY rail** (Founder decision T-1, reconciled across
  all sources on 2026-09-21)
  (`src/config/payouts.ts`).
- **Xero is the accounting/reconciliation layer — not the bank.**
- **Stripe is not a payout rail.** It bills the flat monthly brand subscription
  only, and `assertPayoutRail` refuses both `stripe` and `xero` as rails rather
  than silently re-routing brand money.
- **No payout leaves Mercenta without explicit human approval** (§7): the
  automated chain stops at a *proposed* payout; an authorised operator must
  approve it. `payouts-transfer` refuses any request without `approved: true`.
- A payout whose amount looks wrong is BLOCKED (`requires_review`/blocked) and
  surfaced for reconciliation — never silently paid. Double payout is impossible
  (idempotent, and a settled payout is never downgraded).

## 8.3 Both carriers are simulated (§13)

`src/lib/dhl` and `src/lib/palletline` each implement the same mock-first seam:
a fully functional deterministic simulation (booking, consignment/waybill,
label, tracking, pickup/collection, transit, delivery, **failed delivery**,
**exception**, **retry recovery**, cancellation where the carrier supports it,
and the carrier invoice/cost) alongside a real client activated purely by
credentials. Simulation performs ZERO network calls and every identifier is
unmistakably fake (`MOCK-DHL-…`, `MOCK-PLL-…`).



- The **happy path is automatic**; Mercenta Admin intervention is reserved for
  exceptions: rejected documents, provider failures, incorrect brand data,
  disputes, case review, reconciliation exceptions, manual corrections,
  compliance review and operational overrides.
- **Every automated action still writes an audit record.**
- **Admin override never destroys history**: original state, new state, actor,
  timestamp, reason, affected entity and audit event are all retained. No
  silent database mutation from the UI.

## 10. Providers

Reconciled through the canonical registry
(`src/integrations/registry.ts` + `docs/INTEGRATIONS.md`): retail-channel
SP-API, DHL, Palletline, Xero, payout provider(s), HMRC, Companies House,
e-signature, social engine, compliance verification sources. A provider that
does not exist yet is added to the **canonical registry** — never as an
isolated integration. Unconfigured providers are labelled truthfully
(simulation / available / live) and never presented as live.

## 11. Testing intent

Every provider-backed workflow has a deterministic failure path (channel
unavailable, duplicate/incorrectly-mapped PO, rejected/expired document,
carrier quote/booking failure, delayed/rejected shipment, case-escalation
failure, Xero posting failure, payment mismatch, declined/duplicate payout,
duplicate accounting entry, dispute refusal, tenant mismatch, unauthorised
action). Every failure produces a truthful UI state, a recoverable state, an
audit event, a safe retry where appropriate, and **no false success**.

The canonical end-to-end lifecycle is exercised by
`src/lib/simulation/investorDemo.ts` (zero network calls, deterministic reset
and replay) and pinned by `scripts/validate-investor-demo.mjs` and
`e2e/investor-demo.spec.ts`. The rules in this document are pinned by
`scripts/validate-canonical-model.mjs`.

