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

## 9. Automation + admin override

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

