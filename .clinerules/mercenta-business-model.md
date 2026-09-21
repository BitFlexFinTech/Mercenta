# MERCENTA — CANONICAL BUSINESS MODEL (non-negotiable context)

Read this before changing anything. It exists so a future session cannot revert
to an outdated interpretation of the business. The authoritative long-form
statement is `docs/MERCENTA_BUSINESS_MODEL.md`; where they ever disagree, that
document wins and this file is corrected.

## Who Mercenta is

Mercenta is the **intermediary / proxy / distribution and operational layer**
between brands and the retail-channel (Amazon Vendor Central) relationship.
**Mercenta operates the Vendor Central account**; a brand does not.

```
retail channel  →  Mercenta  →  the correct brand
brand           →  Mercenta  →  retail channel
```

An incoming retail-channel PO is addressed to Mercenta. Mercenta identifies the
brand/tenant and routes it into that brand's workspace; the brand's
approve/reject/modify decision is an INSTRUCTION to Mercenta, which then
communicates the outcome through the retail-channel integration. The same
principle applies across POs, acknowledgements, modifications, fulfilment, ASNs,
shipments, delivery, invoices, payments, returns, deductions, chargebacks,
disputes, cases, CRM, finance, payouts, compliance, integrations and audit.

Automate the happy path. Admin intervention is the exception, and every
intervention is attributed and audited.

## The TWO commercial models (both must exist)

The commercial model is chosen during brand onboarding, stored on the brand's
commercial relationship, and is one of exactly two:

- **Model A — commission / agent-style.** Mercenta keeps an agreed commission
  and pays the brand the remainder.
  Demo: £10,000 PO @ 20% ⇒ £2,000 Mercenta commission, £8,000 brand amount.
- **Model B — buy / resell / distribution.** Mercenta acquires the goods from
  the brand and resells into the channel.
  Demo: £10,000 revenue − £7,500 acquisition = £2,500 gross spread, with every
  additional cost (shipping, payment fees, other agreed fees, VAT, deductions)
  shown SEPARATELY, then a net Mercenta margin.

Demo assignment: **Brand A runs Model A; Brand B runs Model B.**

### The relationship is BRAND-LEVEL, explicit and audited (M12 §5/§19)

- The choice is stored per brand (`demoStore` holds one commercial-relationship
  record per brand; `DEMO_MODEL_A_BRAND_ID` / `DEMO_MODEL_B_BRAND_ID` in
  `src/data/demoData.ts` are the single source of truth for the demo assignment).
- Only a Super Admin can change it, and every change requires an actor **and a
  reason** and produces an audit record (`setBrandCommercialModel`).
- An unknown/undeclared model is REFUSED — never defaulted.
- Onboarding **fails closed** without a selected model
  (`checkCommercialModelSelection`): no brand can be onboarded with an undefined
  commercial relationship.
- The brand sees its own relationship read-only in *Settings → Commercial
  Relationship*; it never sees another brand's terms.
- **Model B's £2,500 gross commercial spread is NEVER called the net margin.**
  The net Mercenta margin is the spread less carrier, payment fees, other agreed
  fees, VAT and deductions, shown separately.

Canonical code: `src/config/commercialModel.ts` (definitions, fail-closed
selection) and `src/lib/finance/commercialModel.ts` (the arithmetic and the
derived demo figures). Never re-derive a margin in a component.

### Commercial documents ≠ compliance documents

The commercial relationship's documents are INTERNAL between Mercenta and the
brand. They are **completely separate** from the retail-channel compliance
documents a product/brand needs. **Changing Model A vs Model B must never change
or bypass the regulatory/compliance documentation required for the products.**

## The retail-channel PO vs Mercenta's own brand order

These are TWO linked identities, never collapsed into one record:

- the **external retail-channel PO** (issued to Mercenta), and
- the **Mercenta → brand commercial PO/order** (issued according to that brand's
  commercial model).

Keep both identities and their relationship explicit so accounting, VAT, audit
and reporting stay unambiguous.

## Compliance is a HARD GATE

- A brand/product cannot enter the catalogue → PO workflow until every
  APPLICABLE required document is present and approved.
- Requirements are **category-aware** and rule-driven
  (`src/lib/compliance.ts → getComplianceRequirements`). Unknown stays required
  (fail-closed). Never assume a document applies to every product.
- **Manual admin approval NEVER bypasses the mandatory documentation gate.** It
  can override workflow state, not regulatory requirements.
- Documents are versioned with a verification record supporting pending /
  under_review / approved / rejected / superseded, and distinguish
  **automatically verified** from **manually verified**.

## Shipping

- **International → DHL** (Mercenta's DHL account).
- **UK domestic → Palletline** (Mercenta's Palletline account).
- A brand cannot pick an arbitrary carrier; retired/unapproved carriers are
  refused. Admin may override a single shipment, audited.
- **Shipment creation is PO-GATED**: a valid retail-channel PO for that brand
  must exist, belong to the brand, be eligible, and be within permitted
  quantity/value. A brand can never ship against another tenant's PO.
- Both carriers have deterministic simulation (`src/lib/dhl`,
  `src/lib/palletline`) — booking, label, tracking, pickup, transit, delivery,
  failed delivery, exception, retry, cancellation, carrier invoice.

## Shipping / commercial economics

Canonical in `src/config/shipping.ts` (`SHIPPING_COMMERCIAL_TERMS`). Demo
illustration: carrier list £100 → 40% negotiated discount → £60 Mercenta carrier
cost → £90 brand charge → £30 gross shipping margin. Carrier cost and brand
charge are BOTH retained and never overwritten into each other. There is **no
universal 90% mark-up rule** — everything is configurable (list rate, negotiated
discount, actual cost, brand charge, VAT, fees, handling, surcharge, margin).

## Money chain

```
PO → invoice → payment → reconciliation → Xero → payout proposal
   → HUMAN APPROVAL → Payoneer (default) → settlement
```

- **Xero is the accounting/reconciliation layer — it is NOT the bank.**
- **Payoneer is the DEFAULT payout rail (Mercenta's primary business and
  retail-channel payment account). Wise is the SECONDARY rail.** (Founder
  decision T-1 — reconciled in code on 2026-09-21.)
  Canonical: `src/config/payouts.ts`. Stripe bills the flat monthly subscription
  only and is **explicitly refused as a payout rail**, as is Xero.
- **No payout leaves Mercenta without explicit human approval** (§7). The
  automated chain stops at a proposed payout.
- Double payout is impossible: the payout is idempotent and a settled payout is
  never downgraded. A payout that looks wrong is BLOCKED as
  `requires_review`/blocked, never silently paid.

## VAT

- Canonical layer: `src/config/vat.ts`. Net / VAT / gross are always returned
  together so a gross figure can never be shown without its VAT.
- **The production treatment is NOT invented** — `src/config/commercial.ts`
  ships `VAT_TREATMENT_CONFIGURED = false`, so no production tax figure is
  computed until the business decides.
- The DEMO uses the standard UK rate (20%) as a **labelled illustration**
  (`DEMO_VAT_ILLUSTRATION`) so real arithmetic is visible. Do not present it as a
  production tax determination, and do not claim every product is standard-rated.

## Cases

Brand opens a case → linked to the PO/shipment/payment/deduction/compliance/
return → **Mercenta review** → only then may it be escalated to the retail
channel. A brand can never create an external case directly. Escalation is
idempotent; duplicate-case prevention applies.

## Integration modes — fail closed

`simulation` · `configured` · `live` · `degraded`/`error` · `unknown`/
`not_registered`.

**Never treat an unknown provider as simulation.** A provider is simulated ONLY
when its mode POSITIVELY resolves `simulation`
(`src/integrations/types.ts → isProviderSimulationSafe`). Every other state fails
closed. Never claim a provider is live when it is simulated or merely
configured.

## Simulation first, credentials later

The platform must remain **fully usable end-to-end without any live
credentials** (Amazon, Xero, Wise, Payoneer, DHL, Palletline, HMRC, Companies
House, social OAuth, …). Live credentials are an ACTIVATION step that turns on
already-built functionality — never a prerequisite for building or
demonstrating a workflow, and never a reason to leave a workflow broken or
locked.

Every simulated action must be **truthfully labelled** as simulation/demo/mock
and must make **zero live network calls**. Never represent simulated data as a
successful live external transaction.

## Admin override

Admin may correct PO mappings, routing, commercial model, calculations,
compliance review/verification, shipment information, carrier exceptions, case
review/escalation, accounting reconciliation, payout approval/retry, disputes and
data-entry errors, and may view audit history. **Every override is attributed and
audited; history is never destroyed.**

## Tenant isolation + RBAC + audit

Non-negotiable. A brand never sees another brand's POs, shipments, payments,
payouts, deductions, returns, cases, CRM, compliance, documents, commercial terms
or accounting. Cross-tenant operations fail closed at the domain layer.

Sensitive operations stay role-restricted: integrations, payouts, accounting,
case escalation, dispute resolution, compliance approval, admin overrides, audit
access. Every important business event produces a canonical audit record with
actor, role, tenant, action, object, timestamp, result and before/after where
applicable.

## Amazon product categories — ABSOLUTE LIMIT

Mercenta may only prospect, evaluate, onboard, recommend or upload brands/products
in the **ten approved Amazon UK Vendor Central categories**, declared ONCE in
`src/types.ts` as `APPROVED_CATEGORIES` (consumed through `isApprovedCategory`):

Health and Personal Care · Home · Baby · Office Products · Kitchen ·
Consumer Electronics · Automotive · Grocery · Apparel · Personal Computer.

Anything outside that list must be filtered out or explicitly marked ineligible —
including in Brand Intelligence, Brand Discovery, opportunity discovery
(sports/team, international, distributor/channel), sales estimation and
fundraising opportunity records. Do not spend AI/provider calls analysing
out-of-category products.

## Amazon wording safeguards (M12)

This is a compliance requirement, not a style preference. Mercenta NEVER uses
wording intended to conceal, evade or bypass Amazon rules, and never claims
rights, permissions, approvals, programmes or relationships it does not have.
Canonical code: `src/lib/intelligence/amazonWording.ts`
(`AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'`), enforced outward by
`npm run validate:wording`.

- Banned in outward-facing copy: "we sell directly to Amazon", "we bypass
  Amazon", "Amazon wholesale loophole", "Amazon guaranteed POs", "Amazon will buy
  your products", "guaranteed purchase orders" — unless a specific verified
  contractual fact supports the statement.
- Prefer: channel distribution · marketplace/channel operations · distribution
  support · managed retail-channel operations · purchase-order management ·
  Mercenta-managed channel.
- Every Amazon-related claim must be distinguishable as confirmed fact /
  estimate / simulation / third-party research / pending confirmation.
- Never call a channel PO "guaranteed" — use PO potential, estimated PO
  opportunity, demand potential, projected opportunity.

## Never

- Never silently bypass compliance.
- Never treat an unknown provider as simulation.
- Never fake a live provider outcome.
- Never let a payout leave Mercenta without human approval.
- Never remove functionality merely to make a validator pass, and never weaken a
  validator — repoint it to the CURRENT canonical source of truth and record the
  old contract in an inline `§Phase … — REPOINTED` comment.
- Never focus on one requirement while leaving the rest of the canonical scope
  unfinished.
