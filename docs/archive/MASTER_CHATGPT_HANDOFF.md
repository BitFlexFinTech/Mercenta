> ## ⚠ HISTORICAL DOCUMENT — NO AUTHORITY (marked 2026-09-21)
>
> This is a **context-transfer document written 2026-09-20** for a ChatGPT
> conversation that had lost its history. It is **NOT an active operating rule**
> and MUST NOT be used to gate, block, delay or reverse current work. It is named
> explicitly in `.clinerules/operating-model.md` §1 as a document the canonical
> operating model OVERRIDES.
>
> - Canonical operating model: **`.clinerules/operating-model.md`**
> - Current project position: **`PROJECT_STATUS.md`** (+ `HANDOFF.md`)
> - Business invariants: **`.clinerules/mercenta-business-model.md`**
> - Granular capability matrix: **`requirements-registry.json`**
>
> **EXPIRED clauses inside this document** (do not follow them): "Design Freeze";
> "do NOT reset / stash / clean / revert" as a *blanket prohibition on reconciling a
> dirty tree* (safe reconciliation is now REQUIRED — `operating-model.md` §6, and a
> clean `git status --porcelain` is a completion requirement); "Do NOT touch
> `ave1-check.mjs`" (that stray 0-byte file was REMOVED on 2026-09-21); and any
> statement that **Wise** is the default payout rail — Founder decision **T-1**
> makes **Payoneer** the default with Wise secondary (`src/config/payouts.ts`).
> Its repository state (HEAD `19be002`) and status sections are historical.

---
# MERCENTA — MASTER CHATGPT HANDOFF

> **Document type:** CONTEXT TRANSFER DOCUMENT (not a technical README).
> **Written for:** a brand-new ChatGPT conversation that has NEVER seen the previous conversation.
> **Authoritative repository:** `/Users/tadii/Desktop/1. Mercenta`
> **Repository state at time of writing:** branch `redesign/foundation`, HEAD `19be002c4b3d6a64020b4740879c56ef1550e628` (`19be002`), protected baseline `959b4d2`.
> **Document created:** 2026-09-20
> **Evidence basis:** the repository itself was inspected to produce this document. Every code reference, count and status below was read from the repo in the session that created it. Anything that could not be verified in the repository is explicitly marked **UNKNOWN** or **NOT IN REPOSITORY**.
>
> **This document changed no application code, no configuration, no database, no git state and no protected asset.**

---

## 1. Purpose of This Handoff

The previous ChatGPT conversation hit its length limit. This document exists so the next ChatGPT can continue the Mercenta project **without losing**:

- the business model and what Mercenta is / is not
- the UK-only scope and the Amazon **Vendor Central** operating model (not Seller/FBA)
- the evidence and research discipline the user enforces
- decisions already made, assumptions already challenged, and questions still open
- what has already been built and verified (so it is **not rebuilt**)
- the current repository state, checkpoint, Master Matrix status and known defects
- how Cline and ChatGPT each work, and how the user expects to be spoken to
- how future prompts to Cline must be constructed

Treat this as the **accumulated project context**. It is deliberately detailed. Do not summarise it away, and do not ask the user to re-explain anything contained here.

---

## 2. Critical Non-Negotiable Rules

Read these before anything else. They are the invariants of this project.

1. **UK ONLY.** Amazon **UK** Vendor Central is the operating scope. Not US, DE, FR, ES, IT, CA, AU.
2. **Amazon Vendor Central — NOT Seller Central / NOT FBA / NOT FBM.** These are fundamentally different models. FBA/Seller information must never silently become a Mercenta business rule.
3. **Research before substantive externally-verifiable claims.** Especially about Amazon.
4. **Never invent Amazon rules.** Documented fact / inference / Mercenta rule / UNKNOWN must be labelled as such.
5. **Never present a Mercenta PO-opportunity assessment as Amazon's internal purchase-order probability.**
6. **Default launch supply route is brand facility → the required Amazon UK destination** where commercially and operationally feasible. Do not assume UK inventory or UK warehousing is required.
7. **`<14 days` end-to-end lead time is a MERCENTA TARGET — not an Amazon rule** and not yet evidenced.
8. **Do not invent Amazon UK fulfilment-centre counts.** No "100+ FCs" assumption.
9. **Do not assume Vendor POs inherit FBA shipment-splitting logic.** Vendor PO destinations must be modelled from actual Vendor evidence.
10. **MOQ, production MOQ, case pack, master carton, pallet, PO quantity and wholesale economics must connect** — they are distinct first-class concepts, never one field.
11. **Commercial readiness must precede catalogue readiness.**
12. **The Master Matrix (`requirements-registry.json`) must always be reconciled.**
13. **Do not rebuild completed functionality.**
14. **Do not lose existing work.** A previous redesign caused real work loss; that must never recur.
15. **Do NOT reset / stash / clean / revert / amend / force-push / switch branches** without an explicit instruction from the user.
16. **Do NOT touch the protected design files.** (Listed in §23.)
17. **Do NOT touch Rakazo.** Untouched to date.
18. **Do NOT touch `ave1-check.mjs`** (a known stray 0-byte file at the repo root).
19. **Cline reports must be comprehensive and complete**, automatically, at the end of every substantial task.
20. **Business outcome matters more than technical elegance.**

---

## 3. Current Business Scope — UK ONLY

**MERCENTA IS CURRENTLY UK ONLY.**

The Vendor Central account is for **Amazon UK only**. The immediate business target is:

```
BRANDS  →  MERCENTA  →  AMAZON UK VENDOR OPERATING MODEL
```

- Do **not** describe Mercenta as currently operating a global Amazon Vendor network.
- Do **not** introduce a generic "marketplace-specific layer" as though Mercenta must support multiple Amazon marketplaces.
- Do **not** design around Amazon US, Germany, France, Spain, Italy, Canada, Australia, etc.
- Do **not** turn country localisation into a current business requirement.
- Any mention of other countries must be clearly labelled **future expansion / context only** and must not affect current UK business rules.

### 3.1 The one legitimate global-vs-UK distinction

The previous conversation settled this. It is **not** a licence to build multi-marketplace architecture:

```
GLOBAL / CORE AMAZON VENDOR TRUTH      ← established from authoritative Amazon documentation
            ↓
UK APPLICATION OF THAT TRUTH          ← only genuinely UK-specific, evidence-supported differences
            ↓
MERCENTA UK BUSINESS RULES            ← Mercenta's own commercial/operational decisions
```

**Important conversational correction (carry this forward):** the previous ChatGPT conversation repeatedly drifted toward multi-country Amazon marketplace architecture. The user explicitly corrected this. **Do not reintroduce a marketplace-specific layer unless the user explicitly asks about future expansion.**

### 3.2 Repository evidence for UK scope

| Evidence | Location |
|---|---|
| UK marketplace id for the vendor account | `src/lib/spapi/transform.ts` — "§UK marketplace id for the vendor account", line 39 |
| UK-only public positioning | `src/config/homepageContent.ts` — hero eyebrow `Managed retail-channel operations — United Kingdom`, trust badge `UK ESTABLISHED` |
| UK-only carrier lanes | `src/config/shipping.ts`, `src/lib/shipping/carrierRouting.ts` — International → DHL; UK domestic → Palletline |

---

## 4. Mercenta Business Model

Mercenta is the **intermediary / proxy / distribution and operational layer** between brands and the retail-channel (Amazon Vendor Central) relationship. **Mercenta operates the Vendor Central account. A brand does not.**

```
retail channel  →  Mercenta  →  the correct brand
brand           →  Mercenta  →  retail channel
```

An incoming retail-channel PO is addressed to **Mercenta**. Mercenta identifies the brand/tenant and routes it into that brand's workspace. The brand's approve / reject / modify decision is an **INSTRUCTION to Mercenta**, which then communicates the outcome through the retail-channel integration. The same principle applies across POs, acknowledgements, modifications, fulfilment, ASNs, shipments, delivery, invoices, payments, returns, deductions, chargebacks, disputes, cases, CRM, finance, payouts, compliance, integrations and audit.

**Automate the happy path. Admin intervention is the exception, and every intervention is attributed and audited.**

**Canonical source:** `docs/MERCENTA_BUSINESS_MODEL.md` (declared CANONICAL — where any other artefact contradicts it, that document wins and the other artefact must be corrected). `.clinerules/mercenta-business-model.md` is its rule-file projection.

### 4.1 What Mercenta is NOT (public positioning)

Mercenta's public positioning must **never** falsely claim:

- Amazon partnership
- Amazon endorsement
- guaranteed Amazon purchase orders
- guaranteed acceptance
- guaranteed sales
- guaranteed Vendor status

The platform explains what Mercenta does **without unsupported Amazon claims**.

### 4.2 Public-facing terminology rule (note a live conflict — see §29)

`docs/MERCENTA_PRODUCT_CONTRACT.md` §7 records the rule in its strictest form:

> **Public-facing copy:** "UK market", "UK retail channels", "brand distribution" only. **NEVER public:** Amazon, Vendor Central, 1P, VaaS.
> No fabricated claims about Amazon partnership/certification/authorization/contractual status. Mark uncertain copy **FOR OWNER/LEGAL REVIEW**. Do not reproduce Amazon branding/proprietary UI.

This is **stricter** than the M12 wording-safeguard rule (which permits Amazon-specific language where operationally necessary and supportable). See §29 for the reconciliation flag.

### 4.3 Brand self-service journey (the intended platform arc)

A brand should be able to:

1. understand Mercenta
2. assess UK opportunity
3. identify suitable products/ASINs
4. understand commercial viability
5. establish supply capability
6. complete readiness requirements
7. become a Mercenta partner
8. supply products through the agreed operating model
9. receive operational visibility
10. participate in the ongoing Vendor supply process

### 4.4 The TWO commercial models (both must exist)

Chosen during brand onboarding, stored on the brand's **commercial relationship**, one of exactly two:

- **Model A — commission / agent-style.** Mercenta keeps an agreed commission and pays the brand the remainder.
  Demo: **£10,000 PO @ 20% ⇒ £2,000 Mercenta commission, £8,000 brand amount.**
- **Model B — buy / resell / distribution.** Mercenta acquires the goods from the brand and resells into the channel.
  Demo: **£10,000 revenue − £7,500 acquisition = £2,500 gross spread**, with every additional cost (shipping, payment fees, other agreed fees, VAT, deductions) shown **separately**, then a net Mercenta margin.

**Demo assignment: Brand A runs Model A; Brand B runs Model B.**

Brand-level, explicit, audited rules:

- Stored per brand (`demoStore` holds one commercial-relationship record per brand; `DEMO_MODEL_A_BRAND_ID` / `DEMO_MODEL_B_BRAND_ID` in `src/data/demoData.ts` are the single source of truth for the demo assignment).
- Only a **Super Admin** can change it, and every change requires an **actor and a reason** and produces an audit record (`setBrandCommercialModel`).
- An unknown/undeclared model is **REFUSED — never defaulted**.
- Onboarding **fails closed** without a selected model (`checkCommercialModelSelection`).
- The brand sees its own relationship read-only in *Settings → Commercial Relationship*; it never sees another brand's terms.
- **Model B's £2,500 gross commercial spread is NEVER called the net margin.** The net Mercenta margin is the spread less carrier, payment fees, other agreed fees, VAT and deductions, shown separately.

**Canonical code:** `src/config/commercialModel.ts` (definitions, fail-closed selection) and `src/lib/finance/commercialModel.ts` (the arithmetic + derived demo figures). **Never re-derive a margin in a component.**

**Commercial documents ≠ compliance documents.** The commercial relationship's documents are INTERNAL between Mercenta and the brand, and are **completely separate** from the retail-channel compliance documents a product/brand needs. **Changing Model A vs Model B must never change or bypass the regulatory/compliance documentation required for the products.**

### 4.5 The two linked PO identities (never collapsed)

```
external retail-channel PO (issued to Mercenta)   ←→   Mercenta → brand commercial PO / order
```

Both identities and their relationship stay explicit so accounting, VAT, audit and reporting remain unambiguous.

### 4.6 Compliance is a HARD GATE

- A brand/product cannot enter the catalogue → PO workflow until every **applicable** required document is present and approved.
- Requirements are **category-aware and rule-driven** (`src/lib/compliance.ts → getComplianceRequirements`). Unknown stays required (**fail-closed**). Never assume a document applies to every product.
- **Manual admin approval NEVER bypasses the mandatory documentation gate.** It can override workflow state, not regulatory requirements.
- Documents are versioned with a verification record supporting pending / under_review / approved / rejected / superseded, and distinguish **automatically verified** from **manually verified**.
- Four universal documents exist (never conditional, because **Mercenta is the vendor of record**) plus category rules whose **condition** is stated (`touchesFood`, `isElectrical`, `isCosmetic`, `isTextile`, `isAutomotive`, `isBaby`, `isPerishable`).

### 4.7 Approved Amazon UK categories — ABSOLUTE LIMIT

Mercenta may only prospect, evaluate, onboard, recommend or upload brands/products in the **ten approved Amazon UK Vendor Central categories**, declared ONCE in `src/types.ts` as `APPROVED_CATEGORIES` and consumed through `isApprovedCategory`:

**Home · Baby · Office Products · Health & Personal Care · Kitchen · Consumer Electronics · Automotive · Grocery · Personal Computer · Apparel**

(Exact strings as declared in `src/types.ts` lines 16–27 — note `Health & Personal Care`, not "Health and Personal Care".)

Anything outside that list must be filtered out or explicitly marked ineligible — including in Brand Intelligence, Brand Discovery, opportunity discovery (sports/team, international, distributor/channel), sales estimation and fundraising opportunity records. **Do not spend AI/provider calls analysing out-of-category products.**

### 4.8 Amazon wording safeguards (M12)

A **compliance requirement**, not a style preference. Mercenta never uses wording intended to conceal, evade or bypass Amazon rules, and never claims rights, permissions, approvals, programmes or relationships it does not have.

Canonical code: `src/lib/intelligence/amazonWording.ts` (`AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'`), enforced outward by `npm run validate:wording`.

- Banned in outward-facing copy: "we sell directly to Amazon", "we bypass Amazon", "Amazon wholesale loophole", "Amazon guaranteed POs", "Amazon will buy your products", "guaranteed purchase orders" — unless a specific verified contractual fact supports the statement.
- Prefer: channel distribution · marketplace/channel operations · distribution support · managed retail-channel operations · purchase-order management · Mercenta-managed channel.
- Every Amazon-related claim must be distinguishable as **confirmed fact / estimate / simulation / third-party research / pending confirmation**.
- **Never call a channel PO "guaranteed"** — use *PO potential, estimated PO opportunity, demand potential, projected opportunity*.

### 4.9 Money chain

```
PO → invoice → payment → reconciliation → Xero → payout proposal
   → HUMAN APPROVAL → Payoneer (default) → settlement
```

- **Xero is the accounting/reconciliation layer — it is NOT the bank.**
- **Wise is the DEFAULT payout rail. Payoneer is the SECONDARY rail.** Canonical: `src/config/payouts.ts`.
- **Stripe bills the flat monthly subscription only and is EXPLICITLY REFUSED as a payout rail** — as is Xero (`assertPayoutRail` refuses rather than silently re-routing brand money).
- **No payout leaves Mercenta without explicit human approval.** The automated chain stops at a *proposed* payout.
- Double payout is impossible (idempotent; a settled payout is never downgraded). A payout that looks wrong is **BLOCKED** (`requires_review`) and surfaced — never silently paid.

### 4.10 VAT

- Canonical layer: `src/config/vat.ts` — net / VAT / gross always returned **together**, so a gross figure can never be shown without its VAT.
- **The production treatment is NOT invented.** `src/config/commercial.ts` ships `VAT_TREATMENT_CONFIGURED = false`, so no production tax figure is computed until the business decides.
- The **DEMO uses the standard UK rate (20%) as a labelled illustration** (`DEMO_VAT_ILLUSTRATION`) so real arithmetic is visible. It is never presented as a production tax determination, and no product/category is claimed to be standard-rated.

### 4.11 Cases

Brand opens a case → linked to the PO/shipment/payment/deduction/compliance/return → **Mercenta review** → only then may it be escalated to the retail channel. **A brand can never create an external case directly.** Escalation is idempotent; duplicate-case prevention applies.

### 4.12 Integration modes — fail closed

`simulation` · `configured` · `live` · `degraded`/`error` · `unknown`/`not_registered`.

**Never treat an unknown provider as simulation.** A provider is simulated ONLY when its mode **positively** resolves `simulation` (`src/integrations/types.ts → isProviderSimulationSafe`). Every other state fails closed. **Never claim a provider is live when it is simulated or merely configured.**

### 4.13 Tenant isolation + RBAC + audit

Non-negotiable. A brand never sees another brand's POs, shipments, payments, payouts, deductions, returns, cases, CRM, compliance, documents, commercial terms or accounting. **Cross-tenant operations fail closed at the domain layer.**

Sensitive operations stay role-restricted: integrations, payouts, accounting, case escalation, dispute resolution, compliance approval, admin overrides, audit access. Every important business event produces a canonical audit record with actor, role, tenant, action, object, timestamp, result and before/after where applicable.

### 4.14 Simulation first, credentials later

The platform must remain **fully usable end-to-end without any live credentials** (Amazon, Xero, Wise, Payoneer, DHL, Palletline, HMRC, Companies House, social OAuth, …). Live credentials are an **activation step** that turns on already-built functionality — never a prerequisite for building or demonstrating a workflow, and never a reason to leave a workflow broken or locked.

Every simulated action must be **truthfully labelled** as simulation/demo/mock and must make **zero live network calls**. **Never represent simulated data as a successful live external transaction.**

### 4.15 Admin override

Admin may correct PO mappings, routing, commercial model, calculations, compliance review/verification, shipment information, carrier exceptions, case review/escalation, accounting reconciliation, payout approval/retry, disputes and data-entry errors, and may view audit history. **Every override is attributed and audited; history is never destroyed.**

### 4.16 Carrier model

- **International → DHL** (Mercenta's DHL account).
- **UK domestic → Palletline** (Mercenta's Palletline account).
- A brand cannot pick an arbitrary carrier; retired/unapproved carriers are refused. Admin may override a single shipment, audited.
- **Shipment creation is PO-GATED**: a valid retail-channel PO for that brand must exist, belong to the brand, be eligible, and be within permitted quantity/value. **A brand can never ship against another tenant's PO.**
- Both carriers have deterministic simulation (`src/lib/dhl`, `src/lib/palletline`) — booking, label, tracking, pickup, transit, delivery, failed delivery, exception, retry, cancellation, carrier invoice.

### 4.17 Shipping / commercial economics

Canonical in `src/config/shipping.ts` (`SHIPPING_COMMERCIAL_TERMS`). Demo illustration: carrier list £100 → 40% negotiated discount → £60 Mercenta carrier cost → £90 brand charge → £30 gross shipping margin. **Carrier cost and brand charge are BOTH retained and never overwritten into each other.** There is **no universal 90% mark-up rule** — everything is configurable (list rate, negotiated discount, actual cost, brand charge, VAT, fees, handling, surcharge, margin).

---

## 5. Amazon Vendor Central Model

**MERCENTA IS A WHOLESALER / DISTRIBUTION PLATFORM OPERATING THROUGH AMAZON VENDOR CENTRAL.**

Mercenta is the vendor of record. Amazon issues POs **to Mercenta**. Brands supply Mercenta; Mercenta supplies the channel.

### 5.1 What is already modelled in the repository (verified evidence)

The canonical Vendor PO model lives in `src/types.ts` (`PurchaseOrder`, lines 1104–1144) and `docs/MERCENTA_PRODUCT_CONTRACT.md` §3.1. Verified facts from the repository:

| Vendor concept | Repository fact |
|---|---|
| PO statuses | `received \| under_review \| accepted \| rejected \| ready_to_fulfil \| shipped \| delivered` |
| Acknowledgment | **line-item level**, not a whole-PO toggle — `LineAckStatus: unacknowledged \| accepted \| rejected \| backordered` |
| Acknowledgement deadline | Hard business rule: unacknowledged after **24h** from receipt = at risk of forced cancellation; deadline = `orderDate + 24h`, surfaced as a countdown |
| Rejection codes | Real Vendor Central codes declared as a constant (`PO_REJECTION_CODES`): `TemporarilyUnavailable`, `InvalidProductIdentifier`, `ObsoleteProduct` — never free text |
| **Freight term drives the window type** | `collect` → **Ship Window** (`shipWindowStart` / `shipWindowEnd`); `prepaid` → **Delivery Window** (`deliveryWindowStart` / `deliveryWindowEnd`) |
| Routing Request note | `shipWindowEnd` is documented in-code as "Latest ship date — Routing Request due by 10am Pacific day before this closes" |
| Provenance | An OPERATIONAL-SIMULATION PO carries `mode`/`simulated`. **Absent on legacy seed rows — unknown provenance is never re-labelled as simulation.** |

**Important distinction to preserve (research discipline):**

- The **freight-term → window-type** relationship above is a **documented Amazon Vendor concept captured in this repository** (the code comments cite a "§Vendor-Central deep-dive" and "§Stage-24 Vendor Central semantics").
- The **24-hour acknowledgement deadline and the rejection-code list** are recorded in the repository as **Mercenta's hard business rule** derived from Vendor Central semantics. They must not be upgraded to "Amazon publishes exactly this" without a current, cited Amazon source. **Status: documented in-repo; external re-verification recommended (see §28).**
- The `10am Pacific` routing-request note is a **specific documented Vendor operational detail** — treat it as documented, but re-verify against current Amazon Vendor documentation during the §28 validation work.

### 5.2 The Vendor PO lifecycle as Mercenta models it

```
channel PO received (addressed to Mercenta)
  → Mercenta identifies the brand/tenant and routes it into that brand's workspace
  → brand decision (accept / reject / modify) — an INSTRUCTION to Mercenta
  → Mercenta communicates the outcome through the retail-channel integration
  → acknowledgement (line-level) within the 24h window
  → fulfilment / ASN / shipment
  → delivery to the required Amazon UK destination
  → invoice → payment → reconciliation → payout proposal → human approval → Wise settlement
```

### 5.3 Vendor replenishment, receiving, chargebacks, deductions

These exist in the platform as **modelled workflows** (deductions/chargebacks with evidence, dispute and resolution; supplier-performance-shaped exception handling; case escalation). **Mercenta must not invent Amazon's internal receiving tolerances, chargeback rates or supplier-performance formulae.** Where a number is needed it must be labelled as a Mercenta assumption, a demo illustration, or UNKNOWN until researched.

---

## 6. Vendor vs Seller / FBA

**Amazon Vendor Central and Amazon Seller Central are fundamentally different models.**

Mercenta is **NOT**:

- an Amazon Seller Central business
- an FBA business
- an FBM business
- a seller-marketplace arbitrage platform
- a Seller Central inventory model
- an FBA replenishment model

**Rules:**

- FBA/Seller Central information **MUST NOT silently become Mercenta business rules.**
- FBA information may only be used where genuinely useful as general context or for a calculation, and **must be explicitly identified as FBA/Seller information.**
- **Never use FBA rules to define Vendor operations.**
- **Never assume Seller Central workflows apply to Vendor Central.**
- **Do not assume Vendor POs are split across destinations merely because FBA shipments can be split.** Each Vendor PO and its destination data must be modelled from **actual Vendor evidence**.

A practical consequence the next ChatGPT should hold: questions like "how do we handle multi-destination PO splits?" are **FBA-shaped** and must not be answered with FBA logic. For Vendor, the source of truth is the PO's own destination data and its delivery window.

---

## 7. Amazon Research / Evidence Rules

The user has established a strict, non-negotiable standard:

> **RESEARCH BEFORE MAKING SUBSTANTIVE EXTERNALLY-VERIFIABLE CLAIMS.**

Research before making claims about:

- Amazon Vendor Central
- Vendor purchase orders
- Vendor lead times
- delivery windows
- Amazon receiving
- supplier performance
- chargebacks
- deductions
- invoicing
- payments
- catalogue requirements
- product readiness
- Vendor economics
- Vendor replenishment
- Amazon logistics
- Amazon facilities
- Amazon policies
- Amazon APIs
- SP-API
- Carrier Central
- Vendor Central rules

**Never invent Amazon rules.** Every claim must be one of:

| Label | Meaning |
|---|---|
| **Documented** | Amazon publicly documents it — cite it |
| **Inference** | A reasoned conclusion — say it is an inference |
| **Mercenta rule** | Mercenta's own business decision — say it is Mercenta's |
| **UNKNOWN** | Say UNKNOWN. Do not fill the gap with invention |

**Do not turn assumptions into facts.**

### 7.1 Known research already done (preserve these)

From the previous conversation and the repository:

- **Amazon Developer documentation** was consulted for Vendor Central URLs / marketplace access.
- **Vendor Retail Procurement API concepts** were researched, including **delivery windows for vendor-paid freight** and **ship windows for Amazon-paid freight** — exactly the conceptual pair now encoded in `src/types.ts` (see §5.1).
- **Carrier Central** research indicated that **Vendor freight is delivered within the PO delivery window / requested delivery date window**.

**Status of these:** recorded as **documented Amazon Vendor concepts**. Treat them as the starting baseline and **re-verify against current Amazon documentation** during the §28 validation work rather than restating them as timeless truths.

### 7.2 Repository research artefacts present

| Artefact | Path |
|---|---|
| Amazon Vendor Central listing requirements (working file) | `Amazon Vendor Central/Listing Requirements/Listing_requirement_updates 2.numbers` |
| UK distribution prospect spreadsheets | `Distribution Prospects/Amazon_UK_Distribution_Prospects_First_Pass.xlsx`, `Distribution Prospects/Amazon_UK_Vendor_Distribution_Opportunity_Map.xlsx` |
| Business-model evidence docs | `docs/MERCENTA_BUSINESS_MODEL.md`, `docs/MERCENTA_PRODUCT_CONTRACT.md`, `MERCENTA_MASTER_CONTEXT.md`, `MERCENTA_ARCHITECTURE.md`, `AUDIT_REPORT.md`, `MERCENTA_FORENSIC_AUDIT.md`, `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md` |

---

## 8. UK Market Fit

**UK Market Fit is NOT the same thing as generic brand quality.**

Relevant factors include:

- source-market demand
- reviews
- ratings
- UK category demand
- UK competition
- UK price opportunity
- UK availability
- brand strength
- differentiation
- regulatory feasibility
- logistics feasibility
- margin potential
- catalogue depth
- expansion potential

The founder acquisition workspace uses these factors to determine whether a product/brand deserves further commercial investigation. **No unsupported scoring may be presented as Amazon's own scoring.**

### 8.1 What is already built (Phase 1 — do NOT rebuild)

Canonical config: `src/config/ukMarketFit.ts`. Verified contents:

- The CTA constant `EXPLORE_UK_MARKET_FIT_CTA = 'Explore UK Market Fit'` (line 43).
- **Six UK presence classes A–F** (lines 73–110):
  - A — Exact UK listing already exists
  - B — Same product under another UK listing
  - C — Brand present, this product absent
  - D — Limited UK catalogue
  - E — No meaningful UK presence
  - F — UK demand evidence, product unavailable
- **Seven assessment dimensions** (lines 154–205): Source-market demand · UK market presence · UK category opportunity · Product fit · Commercial opportunity · Supply / replenishment viability · Compliance / readiness.
- **Three separate indicators** (lines 218–243): **Catalogue eligibility · Commercial opportunity · Supply / replenishment viability** — and **no single "success score"**. The separation is declared as a constant (`NO_SINGLE_SUCCESS_SCORE`), forbidden by the snapshot type, and asserted by the validator. **Collapsing them is how an assessment starts lying.**
- A declared qualification vocabulary (Not qualified yet · Needs more information · Qualified for review · Not eligible for this route).
- Hedged vocabulary, a prohibited-promise list, declared research sources, an educational-gap catalogue, six event types and test ids.

Companion artefacts (all verified present):

| File | Role |
|---|---|
| `src/lib/preaudit/fixtures.ts` | Six unmistakably-labelled deterministic simulation fixtures covering every presence class A–F, selected by a declared hash (**no `Math.random`, no clock, no network**) |
| `src/lib/preaudit/researchProvider.ts` | The mock-first / fail-closed research seam. Resolves availability from the CANONICAL integration registry; **the real provider REFUSES rather than fabricating** |
| `src/types.ts` (Phase 1 section) | `PreAuditOwner`, `PreAuditEvidence`, `PreAuditRule`, `PreAuditIndicator`, `UkMarketFitDimensionResult`, `UkOpportunitySnapshot`, `PreAuditInput`, `ProductOpportunity`, `SupplyProfile`, `BrandOpportunity`, `PreAuditAssessment`, `PreAuditAcquisitionFeed` |
| `scripts/validate-uk-market-fit.mjs` region + `e2e/uk-market-fit.spec.ts` | The pinning evidence |

**Key architectural decision (Phase 1):** the pre-audit writes into the **canonical BI prospect store, the canonical acquisition lifecycle, the canonical event feed, the canonical audit registry and the canonical domain persistence port**. There is **no second pipeline, no second prospect universe, no second event system and no second store.**

---

## 9. Acquisition / ASIN Model

**The acquisition unit is: BRAND + ASIN + SOURCE MARKETPLACE.**

Relevant ASIN states (these map onto the six declared presence classes A–F in `src/config/ukMarketFit.ts`):

| Class | Meaning |
|---|---|
| **A** | Exact UK ASIN exists |
| **B** | Same product exists under another ASIN |
| **C** | Brand exists in UK but product is absent |
| **D** | Limited UK catalogue |
| **E** | No meaningful UK presence |
| **F** | Product appears to have UK demand but is not meaningfully offered |

**Product identity must distinguish:**

- source ASIN
- destination UK ASIN
- GTIN / EAN / UPC
- brand
- model
- product identifier
- normalized product identity
- marketplace
- exact / probable / related relationship

**The current target is UK opportunity discovery.**

Canonical entities already declared in `src/types.ts` (Phase 1 section): `ProductOpportunity`, `BrandOpportunity`, `SupplyProfile`, `PreAuditAssessment`, `PreAuditAcquisitionFeed`. **Do not create parallel entities for Phase 3 — extend these.**

---

## 10. Commercial Viability

A product should not simply enter the Vendor catalogue because it exists.

### 10.1 The declared commercial sequence

```
Pre-audit CTA
→ Brand Intelligence
→ Product / ASIN Discovery
→ UK Market Intelligence
→ Catalogue Readiness
→ Commercial Economics
→ Demand / Replenishment Viability
→ Supply Route Viability
→ Partnership Model
→ Outreach
→ Onboarding
```

### 10.2 Canonical records

- **Brand Opportunity**
- **Product Opportunity**
- **Supply Profile**
- **Commercial Relationship**

### 10.3 Distinguish these three decisions — they are NOT the same

```
CATALOGUE ELIGIBILITY          (may this legally/operationally be listed?)
COMMERCIAL OPPORTUNITY         (is the economics worth pursuing?)
SUPPLY / REPLENISHMENT VIABILITY (can it actually be supplied, repeatedly, in time?)
```

The Phase 1 engine produces exactly these three as separate indicators and **a single "success score" is structurally forbidden** (`NO_SINGLE_SUCCESS_SCORE`).

### 10.4 The Vendor PO / opportunity model

Mercenta may build an **evidence-based "Vendor PO Opportunity Assessment"** — but it must **NOT** be represented as Amazon's internal purchase-order probability unless Amazon publicly documents such a formula.

Observable factors the platform may assess:

- UK demand
- product availability
- competition
- catalogue strength
- pricing
- commercial viability
- supply reliability
- lead time
- delivery feasibility
- product readiness
- operational readiness
- catalogue completeness
- historical signals where legitimately available

The result is **a Mercenta assessment**. It is **NOT** "Amazon says you have a 78% chance of receiving a PO." **Do not invent Amazon's internal procurement algorithm.** Also remember the wording rule: **never call a channel PO "guaranteed"** — use PO potential / estimated PO opportunity / demand potential / projected opportunity.

---

## 11. Commercial Readiness — Phase 2

**PHASE 2 IS COMPLETE AND VERIFIED.** Canonical report: `docs/SPRINT_PHASE2_COMMERCIAL_READINESS_2026-09-20.md`.

**The governing question it answered:** *can a real brand be told exactly what commercial information Mercenta needs, understand why it is needed, supply it, and see the product move — while the Founder/Admin can see, explain and act on the same record?* **The answer is yes, and it is proven in a browser.**

### 11.1 What was built (nothing existing was rebuilt)

| # | Built | Canonical file(s) |
|---|---|---|
| 1 | **Canonical commercial readiness record store** — deterministic record id, reassessment REVISES the same row, a repeat is SUPPRESSED and reported (`duplicateSuppressed`), audit → the canonical `demoAuditLog`, events → the EXISTING feed, persistence through the SAME domain port (new additive table `commercial_readiness_records`), the ONE visibility rule reused from the routing store | `src/data/commercialReadinessStore.ts`, `src/data/domainRepository.ts` |
| 2 | **Assessment workflow (one path for every caller)** — `runCommercialAssessment(input)` = gate → canonical routing decision; `assessCommercialReadiness` also writes the record; `reassessCommercialReadiness(recordId)` rebuilds the gate input **from the record itself**; `submitCommercialTermsAndReassess` = the brand action + reassessment | `src/lib/commercial/commercialAssessment.ts`, `src/lib/commercial/commercialReadinessRecorder.ts` |
| 3 | **Declared delivery vocabulary** — 2 declared commercial work sources with SLAs, brand-facing `what`/`why`/`action` guidance for EVERY term and condition (each naming a REAL Knowledge Base article and a real Phase 4 `academyStage`), the outcome disclaimer, surface test ids. **The six thresholds ship UNSET (fail-closed to `human_review`).** | `src/config/commercialReadiness.ts` |
| 4 | **Founder surface** — a new **Commercial** section of the EXISTING Super-Admin Control Centre: real route counts, a queue of every canonical record with brand/owner/SLA/next step, a "commercial work raised" queue, and a drawer showing WHY per condition + the missing information + the canonical work item | `src/lib/commandCentre/controlCentre.ts`, `src/components/admin/FounderControlCentre.tsx` |
| 5 | **Brand surface** — tenant-scoped, plain-language why + action + real guide per field, and a REAL brand action that reassesses. Wired into the brand shell's Catalogue group | `src/components/brand/CommercialReadiness.tsx`, `src/lib/commercial/brandGuidance.ts` |
| 6 | **Work integration** — derives `commercial_remediation` / `commercial_review` work from the records; resolving the underlying issue removes the item automatically (derived, so a repeat cannot duplicate work) | `src/lib/work/workStore.ts` §10 |
| 7 | **Automation** — `commercial_readiness_monitor` registered in the EXISTING automation registry: a drift check that reports the route mix and escalates critical items, **never changes a route**, idempotent | `src/lib/automation/registry.ts` |
| 8 | **Demo cases** — one canonical case per declared route, built from canonical brands + products + a REAL Phase 1 assessment through the real research seam (**zero network**) | `src/data/commercialReadinessSeed.ts` |

### 11.2 The commercial viability gate (Phase 2 vocabulary)

- **4 viability routes — exactly ONE proceeds** (blocked → remediation → human review → ready).
- **6 value bases**: actual / observed / calculated / estimated / assumed / unknown.
- **7 first-class distinct pack concepts** — brand MOQ, production MOQ, case pack, master carton, PO quantity, shipment quantity, pallet profile.
- **Declared pack maths**: `master_carton ÷ case_pack = casesPerCarton`, applied **only when exact** — this is what lets a brand's submitted pack terms actually take effect.
- **6 thresholds that all ship UNSET (fail-closed)** — an unset threshold routes to `human_review`; it does not block delivery.
- **7-condition catalogue** and a **declared precedence ladder**.
- **The MOQ-honour disclaimer** is declared.
- **No VAT is computed** by the commercial calculator.

Canonical files: `src/config/commercialReadiness.ts`, `src/lib/commercial/commercialGate.ts`, `src/lib/commercial/economics.ts`.

### 11.3 The real journeys verified in a browser

**Brand:**

```
Brand Catalogue → Commercial Readiness → Own Products → Guidance → GBP
→ Human Review → case_pack 6 → master_carton 24 → Ready
```

**Founder:**

```
Founder Control Centre → Commercial → four products → remediation drawer
→ observed value → missing currency → owner/SLA → canonical work item
→ routing-decision ID
```

### 11.4 Phase 2 defects already found and fixed (do not rediscover)

1. `missingTermFieldIds`
2. pack arithmetic
3. duplicate suppression
4. seed routing
5. synchronous research seam
6. tour skip modal
7. **Founder OS assertion repointed to nine automations**

Additional in-session fixes recorded in the canonical report:

- **False-positive contradiction refusal (blocking)** — the structural analyser treated "two conditions sharing one declared rule that disagree" as a contradiction, so **every** commercial gate evaluation was refused. A contradiction now means the SAME condition id declared twice with disagreeing outcomes, or two conditions owning the SAME route under the SAME rule. *One shared rule evaluated per-route is NOT a contradiction.*
- **A refusal was reported as terminal completion** — `terminal` was derived from branch outcomes alone. Fix: `terminal` is forced `false` for every refusal.
- **A fixable gap escalated to human review** — the declared precedence is now **blocked → remediation → human review → ready**, distinguishing "unmet by the observed values" from "could not be evaluated".
- A full-run regression (the automation-catalogue count of 8) was fixed by **REPOINTING** the assertion to the current canonical count with the old contract recorded inline — **not** by weakening or deleting a test.

### 11.5 Phase 2 verification evidence (as reported by Cline)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run build` | compiles (`✓ built in 3.33s`) |
| `node scripts/validate-commercial-readiness.mjs` | **78 assertions / 0 failures** (includes the zero-network assertion) |
| `node scripts/validate-routing-gateways.mjs` | **101 / 0** |
| `npm run validate:wording` | **268 / 0** |
| Targeted E2E `e2e/commercial-readiness.spec.ts` | **6 / 6** |
| Full Playwright | **371 passed / 0 failed / 2 skipped** (373 collected; the 2 skips are pre-existing conditional `test.fixme` guards elsewhere) |

### 11.6 Explicitly NOT done in Phase 2 (no silent deferral)

- No commit, no push, no deploy (none authorised).
- **No Supabase migration was applied.** The additive table is written through the port; creating the migration is a separate deliberate step. The status is honestly reported as `memory-only` (`durable: false`; `hydrate` returns nothing durable).
- No external provider was activated or called — every one remains deterministic simulation; the run made **zero** provider calls (asserted twice: the validator's fetch trap and the e2e external-call watcher).
- The 15 remaining roadmap phases (Phase 3 onward) are untouched.
- `uiux-wave2-core-surfaces-remaining` migrations remain outstanding (unchanged).
- Miro was not touched; it remains a downstream representation of the one canonical state.
- The 174 pre-existing `verify-registry.mjs` findings were **not** fixed (out of scope) — but **none** is in the ten Phase 2 rows (a targeted grep returns nothing).
- **Financial/capital functionality was NOT built** (Phase 6/7 territory). The commercial record was simply kept **compatible**: it retains the terms, pack profile, economics basis and supply references a future financing assessment will need, without exposing any financing-provider detail to brands.

---

## 12. Supply / Logistics Model

> **STATUS: NOT BUILT. This is the next intended business phase (Phase 3). Treat everything in this section as the intended model to be validated — not as implemented behaviour.**

### 12.1 The intended default supply route

```
BRAND FACILITY  →  THE REQUIRED AMAZON UK DESTINATION
```

The user's commercial logic:

> Brands do **not** want to pre-position pallets in the UK without evidence that Amazon will actually generate POs.

Therefore **direct origin → required Amazon UK destination** is the default route **where commercially and operationally feasible**.

**UK 3PL / cross-dock / buffer inventory should only be introduced where justified by:**

- actual PO frequency
- volume
- reliability
- economics
- lead time
- customs
- operational requirements
- consolidation
- demonstrated need

**The user's target is: END-TO-END LEAD TIME < 14 DAYS WHERE FEASIBLE.**

**IMPORTANT:** 14 days is a **Mercenta target**, NOT an assumed universal Amazon rule. Do not present it as Amazon policy unless research proves it.

### 12.2 A pre-existing modelling conflict to reconcile (IMPORTANT — verified in the repository)

The **currently declared** shipment-stage model in `src/types.ts` (lines 66–92) already presumes a UK hub step:

```
factory_intake
  → bak_depot                ("Regional Hub / Depot Processing")
  → international_forwarding
  → uk_port_hmrc             ("UK Port / HMRC Clearance")
  → mercenta_hub             ("Mercenta UK Distribution Hub")
  → live_amazon              ("Live on retail-channel")
```

`STAGE_ORDER` fixes that sequence, and `CarrierId` is declared as `'dhl' | 'fedex' | 'bak' | 'palletline'` (note `fedex` and `bak` alongside the canonical `dhl` / `palletline` lanes).

**Why this matters:** a linear pipeline that always passes through `mercenta_hub` **assumes UK warehousing**, which contradicts the launch principle in §12.1 ("prove demand first; introduce UK warehousing only when justified"). This must be reconciled in Phase 3 — either by:

- re-modelling the route as **profiles** (a direct route and a buffered route) rather than one fixed linear order, or
- declaring that the existing stages are a *presentation* of milestones rather than a mandate to hold stock.

**Do not silently leave both models in place.** This is exactly the class of inconsistency the Master Matrix reconciliation is meant to catch, and it should be raised with the founder **before** Phase 3 implementation.

Also note: `uk_port_hmrc` and `mercenta_hub` carry **no live implementation** — a repository-wide search finds **no supply/logistics engine and no supply/logistics validator script**. `SupplyProfile` exists only as a **Phase 1 pre-audit** entity (`src/types.ts` line 3233), and the Phase 2 commercial pack concepts are deliberately **not** folded into it (`src/types.ts` line 3719 states the commercial pack profile is deliberately separate).

### 12.3 Supply Route Profile (the eventual model)

Should eventually account for:

- origin country
- origin facility
- ship-from location
- production lead time
- export preparation
- freight mode
- transit estimate
- customs
- customs buffer
- UK final-mile
- appointment requirements
- total door-to-Amazon-destination time
- safety buffer
- planning lead time
- capacity
- variability
- contingency
- replenishment implications

**The Logistics Escalation Engine** should consider: variability · PO windows · customs uncertainty · rework · consolidation · buffer requirements · supply reliability.

### 12.4 What the Phase 1 `SupplyProfile` already carries (extend it — do not duplicate)

`src/types.ts` lines 3233–3253: `origin`, `shipFrom`, `productionLeadTimeDays`, `exportLeadTimeDays`, `freightMode` (`air`/`sea`/`road`/`unknown`), `transitEstimateDays`, `customsRequired`, `ukFinalMile`, `safetyBufferDays` (explicitly *"Declared planning buffer — never presented as a carrier commitment"*), `planningLeadTimeDays`, `variability` (`low`/`medium`/`high`/`unknown`), `moq`, `casePack`, and — importantly — `unknowns: string[]` (*"What is still unknown about supply — stated, never guessed"*).

**Phase 3 must extend this shape, not create a parallel one.**

### 12.5 Public supply wording (strategic decision — NOT YET IN THE REPOSITORY)

The wording the user has established for public supply messaging:

> "You don't necessarily need UK inventory. Mercenta works with you to establish a supply and delivery schedule that fits agreed requirements. Depending on location, product, order profile and transit times, products may be supplied directly from existing facility or through an appropriate UK logistics/fulfilment route."

> **⚠️ VERIFICATION NOTE:** a repository-wide search for this wording (and for `"UK inventory"` / `"supply and delivery schedule"`) returns **nothing in `src/`**. It is therefore a **decision held in the conversation, not yet committed to the product**. If it is intended to be public copy, it must be added to the canonical content source (`src/config/homepageContent.ts` is the homepage SSOT) and pass `npm run validate:wording`.

---

## 13. Amazon UK Destination Model

> **STATUS: NOT BUILT (Phase 3 territory).**

**Do NOT invent the number of Amazon UK fulfilment centres.** **Do NOT use a generic "100+ fulfilment centres" assumption.**

The platform should eventually maintain an **evidence-backed Amazon UK destination directory**, with fields including:

- facility / site name
- facility type
- address
- city
- postcode
- region
- source
- source date
- confidence
- status
- notes

**Actual Vendor PO destination information, once live Amazon data is available, becomes operational truth and should update/confirm the directory.**

**Critical rule:** do **not** assume Vendor POs are split across destinations merely because FBA shipments can be split. **Vendor and FBA are different models.** Each Vendor PO and its destination data must be modelled from **actual Vendor evidence**.

---

## 14. MOQ / Pricing / Economics

These must **NOT** be treated as isolated fields. Distinguish:

- brand MOQ
- production MOQ
- recommended commercial MOQ
- case pack
- master carton
- pallet quantity
- Amazon PO quantity
- recommended replenishment quantity

Wholesale economics should account for evidenced costs such as:

- product cost
- export costs
- freight
- customs / duties where applicable
- UK handling
- destination delivery
- other evidenced logistics costs
- financing cost where applicable
- commercial margin

**Do not imply that Mercenta's calculated wholesale price is automatically accepted by Amazon.** Commercial calculations inform **Mercenta's** decision-making.

**Already built (Phase 2 — reuse, do not duplicate):** the deterministic calculator `src/lib/commercial/economics.ts` — pack profile + carton-arithmetic validation, unit economics carrying the full formula, the missing inputs and the stated assumptions, and **no VAT computed**; plus the §20 commercial ↔ supply interaction observations. The **7 distinct pack concepts** are declared in `src/config/commercialReadiness.ts`; the declared pack maths (`master_carton ÷ case_pack = casesPerCarton`, only when exact) is what lets a brand's submitted pack terms take effect. The MOQ-honour disclaimer is already declared.

---

## 15. Capital / Financing

> **STATUS: NOT BUILT (Phase 6/7 territory). Phase 2 deliberately kept the commercial record compatible with it.**

Two broad models:

1. **Brand supplies / self-funded**
2. **Mercenta purchases / funds supply**

The internal capital engine can be represented as:

```
Brand
→ Mercenta agreement / LOA
→ Mercenta purchases
→ Capital / financing engine
→ Supplier payment
→ Inventory / supply
→ Amazon Vendor
→ PO
→ Fulfilment
```

**Brand-facing wording should remain simple: "Mercenta purchase confirmed."** The brand does not need to understand internal PO financing mechanics.

**LOA is an operating requirement established by Mercenta's model — NOT a universal Amazon requirement** unless authoritative research proves otherwise.

**Known prior work in this area (Founder OS, M13 §10/§31):** a founder funding pipeline with 3 real opportunities and an approval-gated stage machine was built in commit `883652d`. Do not rebuild it; check it first.

---

## 16. Brand Education / Academy

**Principle:**

> **"Never make the brand know something Mercenta can teach them."**

### Academy stages

1. Understand Mercenta
2. Commercial
3. Product & Packaging
4. Product Readiness
5. Operations

### Learning loop

```
LEARN → WATCH → DO → VALIDATE → COMPLETE
```

- Tutorials should use the **actual Mercenta UI** where practical.
- Contextual help should appear **where the user needs it**.
- The Phase 2 work already carries a real `academyStage` per commercial term/condition — the seam exists. **Phase 4 = Brand Education / Academy; Phase 5 = Tutorials / Contextual Education.**

---

## 17. Public Website / Positioning

### 17.1 Rules

- **Primary CTA: "Explore UK Market Fit".**
- **Partner Login remains separate in the header.** Do **NOT** put Partner Login next to the main hero CTA in a way that confuses the public acquisition journey.
- **Public language should be channel-neutral by default.** Amazon-specific language should only be used where operationally necessary and supportable.
- Do not make unsupported Amazon partnership / endorsement / guarantee claims.
- **Authenticated Brand dashboards may display actual Amazon Vendor PO information when available.**

### 17.2 Verified current state (canonical content source: `src/config/homepageContent.ts`)

| Item | Verified value |
|---|---|
| Primary CTA | `primaryCta: 'Explore UK Market Fit'` (line 101; also `buttonLabel` at line 262) |
| CTA constant | `EXPLORE_UK_MARKET_FIT_CTA` in `src/config/ukMarketFit.ts` line 43 |
| Partner Login | `secondaryCta: 'Partner Login'` — and the in-file comment (lines ~106–112) explicitly states: *"§Phase 1 — this is the HEADER utility action label, not a hero button. Partner Login must not sit beside the primary hero CTA (the two actions serve different audiences and need distinct hierarchy), so it is rendered by PublicNav in the header and the field is retained here as the single source for its label (and for the Homepage Editor)."* |
| Hero eyebrow | `Managed retail-channel operations — United Kingdom` |
| Hero heading | `Your brand, listed, ordered` / `and paid — without the infrastructure.` |
| Trust badges | `UK ESTABLISHED`, `COMPLIANCE-GATED ONBOARDING`, `EVERY ACTION AUDITED` |
| About section | `How Mercenta works with your brand` — *"Three moves. No new systems, no new team, no infrastructure build"* |

The pre-audit public surface is implemented in `src/components/marketing/Home.tsx` (§Phase 1 — Explore UK Market Fit, around line 107).

**Note the wording conflict in §29** — the product contract bans Amazon/Vendor Central/1P/VaaS from public copy outright, which is stricter than "channel-neutral by default".

---

## 18. Integrations

### 18.1 Known integrations / services

HMRC · Companies House · Wise Business · Payoneer · Stripe · Xero · NameCheap · DHL UK · OpenRouter · DigitalOcean · Rakazo · Supabase · Instantly.ai · Explee · Postmark · Hunter.io · PandaDoc · Keepa · Firecrawl · LinkedIn · Facebook · Instagram · X · WhatsApp Business · Amazon SP-API / Vendor-related APIs.

**Rakazo is untouched and must not be touched.**

### 18.2 Integration strategy

- **SIMULATION FIRST.**
- Live providers are connected only when genuinely required.
- Paid services may be simulated until needed.
- The **Super Admin / Control Centre** should eventually allow credentials to be entered and then move the integration from simulation to live operation.
- **Never fake a live integration.**
- **Never claim a provider is live merely because the UI exists.**

### 18.3 Architecture (proved in the repository)

```
USER ACTION
→ MERCENTA DOMAIN WORKFLOW   (src/data/api.ts, src/lib/dhl/domain.ts,
                              src/lib/compliance/complianceSync.ts — the SAME
                              code paths for simulation and live; never a fork)
→ PROVIDER CONTRACT          (src/lib/dhl/client.ts, src/lib/compliance/*.ts,
                              src/lib/spapi/client.ts, src/lib/billing/stripe.ts)
→ SIMULATION ADAPTER (…/mockClient.ts)  OR  LIVE ADAPTER (…/client.ts)
   — chosen by factory (…/index.ts) from connection state ONLY
   — a `mock:` secret ref is NEVER forwarded to a live transport (unit-proven)
→ PROVIDER RESPONSE / EVENT
→ DOMAIN PROCESSING → STATE TRANSITION → AUDIT EVENT → NOTIFICATION → UI UPDATE
```

**Safe mock credential rule:** mock values are unmistakable (`mock:` prefix, `MOCK-DHL-…`, `SIM-TRK-…`, `XX-PENDING-REGISTRATION`-style placeholders), deterministic, never real secrets, and never sent to a live endpoint. An operator never invents values for simulation — the Integrations Hub surfaces the exact mock configuration each simulated provider uses. **Live activation later is credentials-only: enter real credentials; the factory returns the live client; NO domain rewrite.**

### 18.4 Current mode reality (from `docs/INTEGRATIONS.md` §8)

| Service | Mode today | Credential |
|---|---|---|
| DigitalOcean | LIVE (paid infra) | PRESENT |
| Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter, Instantly | LIVE | PRESENT |
| Namecheap FTP | LIVE (deploy) | PRESENT |
| Xero | DEMO (28-day reset, auto-reseed) | PRESENT + `MODE=demo` |
| Amazon SP-API | SIMULATION | absent |
| DHL UK | SIMULATION | absent (safe mock: `mock:dhl-eu-demo-key` / `MOCK-DHL-ACCOUNT-0001`) |
| Companies House | SIMULATION | absent (safe mock: `mock:ch-demo-key`) |
| HMRC | SIMULATION | absent (safe mock: `mock:hmrc-demo-client` / `mock:hmrc-demo-secret`) |
| Stripe / Keepa | SIMULATION / UNCONFIGURED | absent |

**Not a single fixed global mode** — it must be per-integration and swappable by credentials alone.

**Canonical registry:** `src/integrations/registry.ts` (+ `src/integrations/types.ts` for the mode vocabulary and `isProviderSimulationSafe`). `docs/ARCHITECTURE.md` records the registry as holding **15 definitions** (Amazon SP-API, Amazon Ads, …). Providers added by the simulation-first pass: **DHL UK**, **Companies House**, **HMRC**.

**Scenario coverage (Super Admin → Simulation Control):** `NORMAL_PO` · `PARTIAL_PO` · `DELAYED_DELIVERY` · `FINANCIAL_EXCEPTION` · `CASE` · `PRODUCT_FAILURE` · `INTEGRATION_FAILURE` · `SHIPMENT_PROGRESSION` · `COMPLIANCE_VERIFICATION` — all deterministic, resettable and safety-gated.

**Live activation table (exact, for GO_LIVE):**

| Provider | Live credentials | Where entered | Extra code needed |
|---|---|---|---|
| Amazon SP-API | LWA Client ID + Secret + OAuth consent | Integrations → Amazon SP-API | Edge Functions `/functions/v1/spapi/*`; store refresh token as a `vault:` secretRef |
| DHL | DHL Express API key + billing account | Integrations → DHL UK | EF `/functions/v1/dhl/*` |
| Companies House | free-tier API key | Integrations → Companies House | EF `/functions/v1/companies-house` |
| HMRC | MTD OAuth client id/secret + fraud headers | Integrations → HMRC | EF `/functions/v1/hmrc` |
| Xero | client id/secret + tenant | Accounting panel / `XERO_MODE` | **none (existing)** |

**Secret handling today:** in-memory `apiKeyMemory` + localStorage. **Keys/tokens/passwords are never rendered in plaintext after storage; diagnostics report only `PRESENT`.** Moving to Edge Function secret storage is a documented production prerequisite (`PRODUCTION_READINESS.md`).

---

## 19. Founder OS

**Founder OS has already been built. Do not rebuild it.** Canonical report: `docs/SPRINT_FOUNDER_OPERATING_SYSTEM_2026-09-19.md`.

Key areas:

- deterministic work engine
- `WorkWorkspace`
- `WorkManagement`
- reminder runner
- automation registry
- audit / event feed
- deterministic tasks
- exception journeys
- tenant isolation
- idempotency
- **Control Centre**
- acquisition engine
- BI / intelligence layer
- Founder Ops AI
- project-state contract

Known files include:

```
src/lib/work/*
src/lib/commandCentre/controlCentre.ts
src/components/admin/FounderControlCentre.tsx
src/lib/acquisition/acquisitionEngine.ts
src/lib/intelligence/intelligenceLayer.ts
briefFacts.ts
founderAiClient.ts
founderOpsAi.ts
```

**Automation registry had reached NINE deterministic automations — verified in the repository** (`src/lib/automation/registry.ts`, exactly 9 `id:` entries):

1. `work_projection`
2. `reminder_sweep`
3. `overdue_escalation`
4. `compliance_gate_monitor`
5. `finance_overdue_monitor`
6. `acquisition_followup_monitor`
7. `commission_review`
8. `founder_brief`
9. `commercial_readiness_monitor`

Automations have: deterministic IDs · run ledger · input-fingerprint idempotency · failure/retry · enable/disable · approval gate · next-run dates · optional dependency degradation · **free-first scheduler**.

**Related, already built (do not rebuild):** the canonical work/task + derived-calendar operating layer (`docs/SPRINT_WORK_LAYER_2026-09-19.md`); the deterministic completion sprint (`docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md`) which added the **proactive reminder runner** (`src/lib/work/reminderRunner.ts`) — explicitly invoked, idempotent, **no `setInterval`/`setTimeout`, no `Math.random()`, no `Date.now()` ids**, using the pinned demo clock and `<workItemId>|<bucket>` boundary keys so a repeat sweep raises 0 and reports the boundaries as suppressed.

---

## 20. Master Matrix

**The Master Matrix is `requirements-registry.json` at the repository root. It is a central project control mechanism. It must NOT be forgotten.**

**Every major Cline phase/report should be reconciled against it.**

### 20.1 The user's completeness standard

A feature is **not** genuinely complete merely because code exists. The standard is:

```
BUILT
+ INTEGRATED
+ IMPACT ASSESSED
+ DEPENDENCIES VERIFIED
+ FAILURE PATH
+ IDEMPOTENCY
+ PERMISSIONS
+ TENANT ISOLATION
+ AUDIT
+ END-TO-END JOURNEY
```

### 20.2 The status vocabulary

The Matrix must distinguish:

`built` · `built_and_tested` · `in_progress` · `blocked` · `deferred` · `regressed` · `not_started`

**Repository-enforced rule (verified):** this vocabulary reserves `built_and_tested` for rows whose evidence **names an e2e spec**, and `verify-registry.mjs` enforces exactly that. `_meta.status_enum` was **EXTENDED** (never narrowed) with `in_progress`, `deferred` and `blocked`. The reconciler **refuses** to write duplicate ids, unknown statuses, or a `built_and_tested` row whose e2e spec does not exist on disk.

### 20.3 Verified current counts (read from `requirements-registry.json` at HEAD `19be002`)

**349 entries total.** Status breakdown:

| Status | Count |
|---|---|
| `built_and_tested` | **190** |
| `built` | **113** |
| `not_started` | **38** |
| `in_progress` | **3** |
| `regressed` | **2** |
| `blocked` | **2** |
| `deferred` | **1** |

This matches exactly the Phase 2 reconciliation report (10 Phase 2 rows replaced in place with `built_and_tested`; **no row added or deleted**; 0 historical rows deleted; re-running the reconciler is byte-identical).

### 20.4 Matrix history (preserve — prevents accidental re-work)

| Point in time | Entries | Note |
|---|---|---|
| Before the Phase 1 reconciliation | 257 | |
| After Phase 1 (UK Market Fit) | **331** | 74 added, 0 deleted: 29 Phase 1 `built_and_tested`, 43 Phases 2–15 roadmap rows, 2 Phase 0 extensions, 2 blocked/discovered |
| After the Phase 2 reconciliation | **349** | 18 more added; Phase 2 rows moved to `built_and_tested` |
| Also recorded in project history | **187** | the functional-completion workstream count (Clusters A/B/C) |
| Also recorded | **172 → 187** | the integration entitlement / credential provenance audit (15 `integration-audit-*` rows) |
| Also recorded | **198** | the count after the functional-completion rows were added |

**Future ChatGPT should ALWAYS reconcile the latest Cline report against the latest Matrix rather than trusting isolated claims.**

### 20.5 Matrix defects / known exceptions

- `verify-registry.mjs` reports **174 pre-existing findings** elsewhere in the matrix (not fixed; out of scope). **None** is attributable to the Phase 2 rows.
- `scripts/validate-stage26.mjs` prints `STAGE26_VALIDATION_FAIL (8)` but **always exits 0** — its 8 pre-existing failures (5 edge-function assertions + 3 render failures caused by the harness omitting `ThemeProvider`) are **invisible to the gate**. Recorded as discovered work, deliberately NOT fixed (outside authorised scope). **No Phase 1 file is involved.**
- `layout-audit.mjs` has a pre-existing undefined `text-brass-200` class in `AcquisitionWorkflow.tsx` (fixing it would change styling, which is forbidden).

---

## 21. End-to-End Business Journeys

**Important cross-role journeys that must connect:**

### Brand

```
Acquisition → UK Market Fit → Qualification → Brand → Onboarding → Product
→ Commercial → Supply → Catalogue → PO → Acknowledgement → Shipment
→ Delivery → Invoice → Payment → Reconciliation
```

### Exception

```
PO Exception → Support → Task → Notification → Resolution → Audit
```

### Finance

```
Invoice → Deduction / Chargeback → Finance Case → Evidence → Dispute
→ Resolution → Reconciliation → Audit
```

### Acquisition

```
Acquisition → ASIN Opportunity → Commercial Viability → Outreach
→ Brand Conversion → Onboarding
```

### Automation

```
Trigger → Work → Reminder → Action → Resolution → Idempotent Rerun
```

---

## 22. Roles / Personas

Final certification must test realistic functions for:

1. Brand
2. QA Tester
3. Customer Support
4. Sales / Outreach
5. Chargebacks / Finance Ops
6. Super Admin / Founder
7. Operations / Logistics
8. Finance / Accounting
9. Communications
10. Integration / API

**Role tiers already implemented** (`docs/MERCENTA_PRODUCT_CONTRACT.md` §2): Brand Partner (`brand`, pinned to one tenantId) · Mercenta Admin (`admin_staff`, ops views; cannot enter super_admin/integrations views) · Super Admin (`super_admin`, `VIEW_ALLOWLIST = '*'`) · 3PL Carrier (`3pl`, only `manifest`/`bak`/`auditor`). Staff have a permission tier (`full` vs view-only); **only `full` + `active` staff may mutate admin state** (`staffCanMutate`).

**Shared-component tenant-scoping check (standing rule):** any component used in both admin and brand (or any multi-tenant) contexts must be **explicitly checked for role/tenant filtering before being reported done**. A shared component silently showing more data than it should will never crash or fail a build — it must be verified by reading the actual filtering logic (`assertBrandScope`, `isCrossTenantAccess`), not by the component rendering without an error. **Cross-brand fetch must return EMPTY, never leak existence.**

---

## 23. Current Repository State

### 23.1 Authoritative repository — CONFIRMED

| Path | Status |
|---|---|
| **`/Users/tadii/Desktop/1. Mercenta`** | **AUTHORITATIVE — EXISTS, confirmed** |
| `/Users/tadii/Desktop/Mercenta` | **DOES NOT EXIST** — verified: `ls: /Users/tadii/Desktop/Mercenta: No such file or directory` |

> The brief described the second path as "the wrong/empty location". The verified truth is that **it does not exist at all**. Always work in `/Users/tadii/Desktop/1. Mercenta`.

### 23.2 Branch and checkpoints (verified via git)

| Item | Value |
|---|---|
| Current branch | **`redesign/foundation`** |
| **HEAD** | **`19be002c4b3d6a64020b4740879c56ef1550e628`** (`19be002`) — *"feat(sprint-2): deterministic platform completion — reminder runner, invoice_due + onboarding_step derivations, all remaining surfaces migrated, browser-verified investor + exception journeys"* |
| Protected baseline | **`959b4d2`** — *"baseline: preserve current working state before master redesign (tracked test artifacts only)"* — confirmed an **ancestor** |
| Tags | `mercenta-baseline-before-redesign-20260907`, `mercenta-pre-e5-20260912`, `mercenta-pre-e6-20260912` |

**Known important checkpoints (verified present in git):**

| Commit | Meaning |
|---|---|
| `959b4d2` | Baseline before the redesign (tagged `mercenta-baseline-before-redesign-20260907`) |
| `ba99266` | Mode / provider-health work — *"integrations: add health-check runner + standardized wizard stepper, mode badge, health panel (Increment 2B)"* |
| `3379523` | Project-memory reconciliation — *"docs: reconcile persistent project memory — record canonical status file, latest checkpoint, branch, baseline"* |
| `fed3bb3` | Phase-readiness checkpoint — *"docs: advance verified checkpoint to d58fc4c in canonical status (doc sync with Git)"* |
| `19be002` | **Current known verified checkpoint** (Phase 2 complete) |

**No commit was created for Phase 1, Founder OS, the work layer, the deterministic completion sprint or Phase 2** — each sprint explicitly recorded that `.clinerules/protection-rules.md` requires an explicit instruction to commit and none was given.

### 23.3 The working tree is INTENTIONALLY DIRTY — preserve it

`git status` at the time this document was written shows a large, deliberate, pre-existing dirty state. **Do NOT reset / stash / clean / revert / amend / force-push / switch branches unless the user explicitly authorises it.**

Modified (tracked) files include:

```
HANDOFF.md · PROJECT_STATUS.md · Review Zip/mercenta-review.zip · package.json
requirements-registry.json
scripts/integrity-audit.mjs · scripts/lint-wording.mjs
scripts/validate-e6-brand-surfaces.mjs · scripts/validate-e7-embedded-social.mjs
scripts/validate-uiux-redesign.mjs
src/components/layout/AdminShell.tsx · src/components/layout/BrandShell.tsx
src/components/marketing/Home.tsx · src/components/marketing/PublicNav.tsx
src/components/shared/WorkWorkspace.tsx
src/config/homepageContent.ts · src/data/domainRepository.ts · src/data/prospectStore.ts
src/lib/costs/modelPolicy.ts · src/lib/events/types.ts
src/lib/work/types.ts · src/lib/work/useWork.ts · src/lib/work/workStore.ts
src/types.ts
test-screenshots/** (many tracked generated artefacts)
```

**The Phase 2 sprint added 12 new files and modified 10 more on top of this state.** A previous redesign **caused loss of work** — that is why the protection rules exist and why future Cline prompts must establish safe checkpoints only where explicitly authorised.

### 23.4 Protected design assets — NEVER touch or commit

```
design/Mercenta Banner Dark 2.png
design/Mercenta Banner Dark.png
design/Mercenta Logo Black.png
design/ChatGPT Image Sep 17, 2026, 03_46_58 AM.png
```

These are **untracked** and deliberately **not** committed. `validate-e6-brand-surfaces` F5/F5b/F6 fail on exactly 5 unchanged pre-existing offenders: **`ave1-check.mjs` + the four protected `design/*.png` files**. **This is not a product defect.** Do not "fix" it by deleting or committing them.

Also present and NOT to be touched: `design/Main Dash 1.avif`, `design/Main dash 2.jpg`, `design/legacy-boxbee-design/`.

### 23.5 Known stray file

`ave1-check.mjs` — a **0-byte** file at the repository root. **Do not touch it.** It is deliberately excluded from commits (so the e6 F6 offender set stays at 5).

### 23.6 Rakazo

**Untouched.** Do not touch it.

### 23.7 Review zip policy

- The review zip lives at **`Review Zip/mercenta-review.zip`** (currently ~50.8 MB, tracked in git and refreshed as a generated artefact).
- The export script is **`scripts/export-review-zip.sh`** (executable, 1675 bytes). Run it at the end of every session: `bash scripts/export-review-zip.sh`.
- **Do NOT create numbered zips.** **Do NOT save zips directly to `~/Desktop/`.** (A generic numbered-zip rule has circulated in the rules files; the project-specific `protection-rules.md` explicitly overrides it and requires the single `mercenta-review.zip` in the `Review Zip/` folder.)
- `Review Zip/INCIDENT-LOG.md` records prior incidents.

### 23.8 Deploy rules

- **Do NOT deploy unless the user explicitly says "deploy".**
- Only deploy to **`demo.mercenta.co.uk`** (Namecheap shared hosting).
- The deploy script is **`scripts/deploy-demo.sh`** — do NOT create any other deploy script.
- **Never deploy to `mercenta.co.uk` (live domain) until the `GO_LIVE.md` playbook is executed.**

---

## 24. UI / UX Direction

The user wants a **premium, expressive B2B platform**.

### 24.1 Desired direction

- premium · polished · expressive · saturated · modern · trustworthy · professional · enterprise-grade

### 24.2 What the user specifically dislikes

- cheap AI-built appearance
- pastel-heavy design
- grey-heavy design
- brass-heavy visual language
- generic bootstrapped SaaS appearance

### 24.3 Desired visual system

- saturated premium colours
- workspace system
- navigation rail
- utility header
- **Cmd-K**
- **Operations Overview**
- consolidated charts
- premium public homepage
- responsive layouts
- expressive but controlled visual hierarchy

### 24.4 Standing styling rule

> **Do NOT change any visual styling, layout, fonts, or colours unless explicitly told to in the current task.**

Related documents already in the repo: `docs/DESIGN_SYSTEM.md`, `docs/UIUX_FOUNDATION_PASS_2026-09-18.md`, `docs/UIUX_REDESIGN_WAVE2_2026-09-18.md`, `docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md`, and the guard `scripts/validate-uiux-redesign.mjs` (357 assertions / 0 at the Founder OS checkpoint).

**A previous redesign caused loss of work**, so future Cline prompts must protect existing functionality and establish safe checkpoints where explicitly authorised.

---

## 25. Cline Working Rules

### 25.1 The user is non-technical

Cline prompts must therefore be:

- **one copy-paste prompt**
- comprehensive
- explicit
- sequential
- business-oriented
- protective of existing work
- clear about what Cline must **inspect**
- clear about what Cline must **change**
- clear about what Cline must **NOT** change
- clear about **tests**
- clear about **documentation**
- clear about **Matrix reconciliation**
- clear about the **final report**

### 25.2 What the user strongly dislikes

- fragmented multi-part prompts
- having to ask Cline for the report afterward
- repeated audits
- rediscovering already completed functionality
- technical jargon without business meaning
- vague instructions
- missing dependencies
- Cline silently skipping requirements

**Cline should generate a complete report automatically at the end of every substantial task.**

### 25.3 The Cline protection rule (approval gates) **[HISTORICAL — RETIRED 2026-09-21]**

> **[RETIRED — no authority.]** The file-count approval gates recorded in this section were retired by the
> 2026-09-21 rule migration and must not gate work again. File count, surface count and sprint size are never
> approval gates; destructive changes remain a genuine hard stop. See `.clinerules/operating-model.md` §2, §3 and §7.
> The original text is kept struck through below as history only.

~~Explicit approval is required before: touching **more than three source files** · major phases · destructive changes · broad refactors.~~

~~**Do not bypass those protections.** If Cline reaches such a gate, it should **report the proposed scope and wait for approval**.~~

~~*(A stricter variant of the standing rule says: more than five files → stop and list them first, then wait. In either case, **stop and ask**.)*~~

### 25.4 Before claiming a task complete — the six standing requirements

1. `npx tsc --noEmit` — confirm 0 new errors
2. `npm run build` — confirm it compiles
3. If the task involves UI/user-facing changes: run the relevant Playwright tests and report **pass / fail / skip** counts
4. Show `git diff --stat`
5. Show the test results
6. Run `bash scripts/export-review-zip.sh`

**Do NOT say "DONE" or "complete" until all six steps are shown.** If a test fails, report it honestly. **Do not mark tests as `fixme` to hide failures.**

### 25.5 Bug protocol

```
DETECT → REPRODUCE → DIAGNOSE → FIX → REGRESSION TEST → JOURNEY TEST
→ FULL REGRESSION → DOCUMENT
```

**Do not just patch the visible symptom.**

### 25.6 Zero placeholders vs mock-first — where the line sits

- **ZERO placeholders, TODOs or stub logic** for anything **Mercenta itself builds and controls** (Brand CRM, messaging, PO workflow, shipment creation, catalog management, notifications, RBAC, billing). A component that renders a UI but does not actually perform the action it implies counts as a placeholder **even without a literal `// TODO`**.
- The **mock-first adapter policy** remains in force for genuinely **EXTERNAL** third-party services Mercenta does not yet hold credentials for (Amazon SP-API being the main case). A `Mock*Client` behind the same interface as the real client is **not** a placeholder in the prohibited sense.
- **Tie-breaker:** does Mercenta control this code end to end? Internal — must be fully real. Does it require another company's credentials or approval? External — mock-first applies.

### 25.7 UI-facing stage completion — the five checks

Before reporting any UI-facing stage complete:

1. **Lint for runtime hook violations** — `eslint-plugin-react-hooks` with `rules-of-hooks` and `exhaustive-deps` as errors, every session.
2. **Smoke-render every page** — for every route/admin view/brand view, a test that renders with realistic seed data and asserts no error. **Compiling is not rendering**; a Rules-of-Hooks violation passes typecheck and build and only fails at render.
3. **Dataset completeness check** — the rendered count must match the canonical dataset's count. An intentional curated subset must be **explicit and stated** — never silently show 3 when 11 exist.
4. **Name-implies-capability check** — a component named CRM, Hub or Manager must actually implement that capability inline, not redirect elsewhere. List the capabilities the name implies and confirm each is present **in that component**.
5. **Interactivity check** — any summary/metric card must open to more detail on click. A static number with no drill-down is incomplete.

### 25.8 Reference-implementation parity check

When extending an existing working pattern to cover more cases (e.g. "3 one-click demo logins" → "11 one-click demo logins"), the new code path must be verified to match the **OLD path's actual behaviour and data depth** — not just its outward symptom. Diff what **state** each path sets, not just what UI each renders.

### 25.9 Evidence discipline

A claim of "done" requires evidence produced in the **SAME session**: a validator that prints PASS/FAIL, a fresh grep count before/after, real command output, a diff. A stated path or a remembered result is never sufficient.

### 25.10 Single source of truth

- One database schema, one types file (`src/types.ts`). No component keeps its own hardcoded duplicate of shared shapes or enums.
- Identity-like values (brand name, legal entity, domain, key rates) live in a single config module. Never hardcode them elsewhere.
- Before finishing any rename or data-shape change: grep case-insensitively for the old value and confirm every remaining hit reads from the source of truth or is an explicitly-historical record. **Report the before/after counts.**
- When two representations of the same data exist, **generate one from the other** so they structurally cannot drift.
- **Never remove functionality merely to make a validator pass, and never weaken a validator** — repoint it to the CURRENT canonical source of truth and record the old contract in an inline `§Phase … — REPOINTED` comment.

### 25.11 Project-state files Cline must maintain

- **`PROJECT_STATUS.md`** must always contain a clearly identifiable **CURRENT PLATFORM POSITION** block with nine numbered headings: 1 COMPLETED / VERIFIED · 2 IN PROGRESS · 3 REMAINING — CURRENT ROADMAP · 4 DEFERRED / PARKED · 5 BLOCKED / DEPENDENCIES · 6 KNOWN EXCEPTIONS · 7 CURRENT CHECKPOINT · 8 VERIFICATION STATUS · 9 NEXT EXECUTION SCOPE.
- There must always be a **numbered remaining roadmap** derived from the Matrix and the real state (never copied from a template, never vague).
- Completing an item → move it to completed history, remove it from the CURRENT list, preserve its historical record, and update Matrix + PROJECT_STATUS + HANDOFF.
- Discovering work → classify it, add it to the Matrix, and place it in current scope / future roadmap / deferred / blocked. **Never silently drop discovered work. Never leave completed work falsely listed as remaining.**
- **Never declare a sprint COMPLETE while a current-scope item is unfinished.**
- Before declaring COMPLETE, verify the **five synchronised sources** agree (Matrix · PROJECT_STATUS · HANDOFF · the sprint doc · the session report). If they disagree, reconcile them first. **This is product infrastructure, not documentation polish.**

### 25.12 Session end (mandatory)

- Run `bash scripts/export-review-zip.sh`; the zip must be at `Review Zip/mercenta-review.zip`. Report it if not.
- Do NOT create any other zip. Do NOT save zips to `~/Desktop/` directly.
- Do NOT commit or push unless the user explicitly says "commit" or "push".

---

## 26. ChatGPT Working Rules

This is especially important. **The user uses ChatGPT as the strategic / business / product / research counterpart to Cline.**

### 26.1 ChatGPT's job

1. understand the business objective
2. research external facts where necessary
3. challenge unsupported assumptions
4. distinguish facts from assumptions
5. reconcile the platform against the business model
6. determine what actually needs to be built
7. produce precise Cline prompts
8. review Cline reports
9. reconcile the Master Matrix
10. determine the next business capability

**Do NOT simply agree with every assumption.** If research shows an earlier assumption was wrong:

- identify it
- explain it plainly
- determine the impact
- specify what must change
- update the operating model
- make sure Cline fixes affected functionality

**But do not invent facts to fill gaps.**

### 26.2 Communication style the user expects

Be: direct · confident · practical · clear · decisive about facts · honest about uncertainty · business-first · not overly academic · not patronising · not repetitive.

Avoid:

- excessive disclaimers
- unnecessary lectures
- generic consulting language
- excessive architecture jargon
- repeatedly explaining things already settled
- asking the user to restate known context
- pretending something is complete when it is not

**When something is wrong, say so clearly. When something is verified, say so clearly. When something is an assumption, say so clearly. When something is unknown, say UNKNOWN.**

### 26.3 Report thoroughness overrides brevity

Full **BUILT / TESTED / RESULT / NEXT** reports are mandatory, never shortened. Complete page-by-page audits are mandatory, never summarised away. Real evidence always accompanies claims — **truncating evidence to save tokens is forbidden.** Concise narration between tool calls is fine; concise **reports** are not.

### 26.4 Development philosophy

**Business-first.** The primary question is:

> **"Does the platform perform the way it is supposed to based on the business model?"**

- Avoid unnecessary technical architecture discussion.
- Do not keep auditing architecture simply because an audit is possible.
- Do not rebuild working systems unnecessarily.
- Do not create abstraction for abstraction's sake.
- **The system is one connected business platform.** A feature is only useful if it works within the end-to-end business journey.

### 26.5 Universal system integrity

**Mercenta is ONE SYSTEM.** Do not treat modules as isolated applications. State must be:

- canonical · controlled · traceable · tenant-safe · permission-aware · auditable · idempotent

**Failures must be explicit. Workflows must propagate state correctly. Business journeys must connect. No disconnected fake UI islands.**

---

## 27. Known Issues / Phase 4

### 27.1 Simulation safety — the IMPORTANT existing issue

**A known Phase 4 issue was identified: UNKNOWN provider mode was being treated as SIMULATION. That is unsafe.**

Only explicitly identified `simulation` mode should be considered safe for simulation operations. These must **NOT** be treated as simulation-safe merely because a mode is missing:

`unknown` · `not registered` · `unconfigured` · `disabled` · `configuring` · `live` · `degraded` · `error`

Known relevant files from the Phase 4 scoping:

```
src/integrations/types.ts
src/integrations/registry.ts
src/lib/simulation/scenarioEngine.ts
src/components/admin/integrations/SimulationControl.tsx
src/data/api.ts
```

**Known issue (as recorded):** `dhl` and `xero` were absent from the integration ID registry / mode map while scenarios required them.

**Another known functional defect (as recorded):** `submitCatalogItem` in `src/data/api.ts` was calling `evaluateComplianceGate(docs, hasAgreement)` with insufficient arguments — so the logistics SLA agreement and chargeback indemnity agreement defaulted `false` and could incorrectly block submission.

### 27.2 ⚠️ VERIFIED STATUS OF THOSE ISSUES AT HEAD `19be002` (read the repository)

**All three items above appear to be ALREADY FIXED in the current working tree.** Evidence read directly from the repository during this handoff:

1. **`isProviderSimulationSafe` is strictly simulation-only.** `src/integrations/types.ts` lines 290–294:
   ```ts
   export function isProviderSimulationSafe(
     mode: ProviderResolutionMode | undefined
   ): mode is 'simulation' {
     return mode === 'simulation';
   }
   ```
   And `resolveProviderMode` (lines 300–306) returns `mode ?? 'not_registered'` — the in-file comment states: *"Not present in the map → `not_registered` (unsafe, never simulation)."* The type `ProviderResolutionMode = IntegrationMode | 'unknown' | 'not_registered'` is declared at line 284.

2. **`dhl` and `xero` ARE registered.** `src/integrations/registry.ts` contains `dhl:` (line 226) and `xero:` (line 250), both in the ID list (lines 363, 365) and both in the mode-defaults map (`dhl: { category: 'logistics', defaultMode: 'simulation' }` line 411; `xero: { category: 'finance', defaultMode: 'simulation' }` line 417). `src/integrations/types.ts` also declares them in the `IntegrationId` union (lines 21, 26) and in the default connection-state map (lines 217, 221), under a `§Phase 4` comment explaining they are simulation-capable only because current repository state confirms DHL = waiting/simulation and Xero = demo/simulation. `palletline`, `companies_house`, `hmrc`, `wise`, `payoneer` and `google` are registered alongside them.

3. **`submitCatalogItem` no longer calls `evaluateComplianceGate` with insufficient arguments.** `src/data/api.ts` now resolves the gate inputs in exactly ONE place — `evaluateBrandCatalogGate(brandId)` (lines 236–250) — which fetches docs, `hasAgreement`, `logisticsSlaAccepted`, `chargebackIndemnityAccepted` and calls `evaluateComplianceGate(docs, undefined, hasAgreement, logisticsSlaAccepted, chargebackIndemnityAccepted)`. `submitCatalogItem` (line 289 onward) calls `evaluateBrandCatalogGate(brandId)` at line 308. The in-file comment (around lines 230–235) explicitly records the historical argument-shift defect and states the two call sites "can no longer disagree".

**Conclusion to carry forward:** the brief's Phase 4 defect list is **out of date relative to the working tree**. Before any Phase 4 work, **re-verify all three directly against the code at the current HEAD** — do not re-fix what is already fixed, and do not assume the older report still applies. If a genuine residual gap exists (e.g. a *scenario* still requiring a provider absent from the mode map), it must be reproduced fresh with evidence.

### 27.3 Phase 4 testing requirements (planned)

Planned Phase 4 E2E coverage:

- simulation control
- **zero real network calls**
- screenshots
- responsive viewports
- Super Admin access
- non-Super Admin refusal
- run
- refusal
- result
- reset
- focus behaviour

**Known planned file:** `e2e/simulation-control.spec.ts` — **verified to EXIST in the repository**, alongside `e2e/commercial-readiness.spec.ts`, `e2e/commercial-model.spec.ts`, `e2e/uk-market-fit.spec.ts` and `e2e/commerce-operational-simulation.spec.ts`.

### 27.4 Other known defects / exceptions (verified)

| Issue | Status |
|---|---|
| `scripts/validate-stage26.mjs` prints FAIL(8) but **always exits 0** | Recorded, deliberately NOT fixed (outside authorised scope). Invisible to the gate. |
| `layout-audit.mjs` undefined `text-brass-200` in `AcquisitionWorkflow.tsx` | Pre-existing. Fixing it would change styling, which is forbidden. |
| `verify-registry.mjs` — 174 pre-existing findings | Not fixed (out of scope). None attributable to the Phase 2 rows. |
| `validate-e6-brand-surfaces` F5/F5b/F6 | Fail on the unchanged 5 pre-existing offenders (`ave1-check.mjs` + 4 protected `design/*.png`). **Not a product defect.** |
| `scripts/lint-wording.mjs` excludes ONE internal-only BI file | In-file justification, following the existing `prospectIntelligence.ts` precedent. The gate itself is unchanged (248 files scanned, 0 violations). |
| Supabase unconfigured | Persistence honestly reported as `memory-only`; `hydrate` returns nothing durable. |
| Legacy `CarrierId` values `'fedex'` and `'bak'` | Still declared alongside the canonical `dhl` / `palletline` lanes — worth reconciling in Phase 3 (see §12.2). |

---

## 28. Current Phase / Next Strategic Step

### 28.1 Where the project actually is

| Phase | State |
|---|---|
| Phase 0 | Functional truth matrix + reconciliation — done |
| **Phase 1 — Explore UK Market Fit / pre-audit engine** | **COMPLETE + VERIFIED** |
| **Phase 2 — Commercial Readiness + Product Economics** | **COMPLETE + VERIFIED** (current checkpoint) |
| Phase 3 — Supply Route / Logistics Intelligence | **NOT STARTED** (the next business phase) |
| Phase 4 — Brand Education / Academy | NOT STARTED (seam exists: a real `academyStage` per commercial term/condition) |
| Phase 5 — Tutorials / Contextual Education | NOT STARTED |
| Phase 6 — Capital & Financing Engine | NOT STARTED |
| Phase 7 — Real Financing Partner Network | NOT STARTED |
| Phase 8 — Financier Pitch / Capital Workspace | NOT STARTED |
| Phase 9 — Global Localization / Market Experience | NOT STARTED (future expansion only — **does not change current UK rules**) |
| Phase 10 — Acquisition Intelligence at Scale | NOT STARTED |
| Phase 11 — Founder Intelligence / BI Expansion | NOT STARTED |
| Phase 12 — Integrated Acquisition → Capital → Operations | NOT STARTED |
| Phase 13 — Amazon Relationship Governance | NOT STARTED |
| Phase 14 — Live Integrations / API Activation | **BLOCKED** (credentials + Amazon approval) |
| Phase 15 — Production Readiness + Launch Gate | NOT STARTED (**15 rows** in the Matrix: 14 `not_started` + 1 `in_progress`) — **MANDATORY before any public production launch** |

Also outstanding: `uiux-wave2-core-surfaces-remaining` (Brand Intelligence brand+admin, Ad Spend, Accounting, Super Admin, Integrations, Onboarding Tours, admin CRM/Catalogue/Logistics/Communications panels); Phase 0 remaining extensions; Phase 1 live research activation (BLOCKED on credentials).

### 28.2 The next major strategic task (do NOT skip this)

Before blindly continuing Phase 3, the user wants the **Amazon Vendor operating assumptions validated**.

**The next major strategic task is:**

> **AMAZON VENDOR TRUTH VALIDATION + MERCENTA BUSINESS MODEL RECONCILIATION**

Its purpose is to research:

- actual Vendor Central operating model
- Vendor PO structure
- Vendor PO lifecycle
- delivery windows
- ship windows
- receiving
- supplier performance
- catalogue / product readiness
- replenishment
- commercial factors
- economics
- delivery requirements
- logistics
- chargebacks / deductions
- invoicing / payment
- UK destination data
- actual public Amazon UK facilities
- supply routes
- public freight / logistics evidence
- customs considerations
- actual cost evidence
- **what is genuinely required versus merely assumed**

**Then, in order:**

1. identify incorrect assumptions
2. identify missing functionality
3. identify incomplete functionality
4. identify unnecessary functionality
5. fix what should be fixed
6. update documentation
7. update the Master Matrix
8. test affected journeys
9. **only then** proceed with **Phase 3 — Supply Route / Logistics Intelligence**

> **Do NOT build Phase 3 blindly on top of assumptions that have not been validated.**

### 28.3 Phase 3 input and constraints (from the Phase 2 handover)

Phase 3 consumes the **READY commercial record** (validated pack profile, supply basis, declared next stage) as its input. Phase 2 deliberately handed it a product with a validated pack profile and supply basis.

Phase 3 must also resolve the **§12.2 modelling conflict** (the existing linear stage order assumes a `mercenta_hub` step, which contradicts the "direct facility → Amazon UK destination, prove demand first" launch principle) and must not invent Amazon UK facility counts or Vendor PO splitting behaviour.

### 28.4 Alternative next step if the founder prioritises launch

**Phase 15 — Production Readiness / Launch Gate**, which is **MANDATORY before any public production launch** and is fully enumerated in the Matrix (15 rows). Related artefacts already exist: `PRODUCTION_READINESS.md`, `GO_LIVE.md`, `scripts/deploy-demo.sh`, `deploy/`.

### 28.5 Do NOT re-open completed phases

**Do NOT re-open Phase 1 or Phase 2 unless a regression is found.** Phase 14 and the Phase 1 live-research activation stay **BLOCKED** on real credentials.

---

## 29. Important Historical Decisions

### 29.1 Decisions already MADE (settled — do not relitigate)

1. **UK only.** Amazon UK Vendor Central.
2. **Vendor Central, not Seller Central / FBA.**
3. **Mercenta operates the Vendor Central account; a brand does not.**
4. **Two commercial models must both exist** — Model A commission, Model B buy/resell. Demo: Brand A = Model A, Brand B = Model B.
5. **Model B's £2,500 gross spread is never called the net margin.**
6. **Compliance is a hard gate**; admin approval overrides workflow state, never regulatory requirements.
7. **Ten approved Amazon UK categories**, declared once in `src/types.ts`.
8. **Xero is accounting/reconciliation, not the bank. Payoneer is the default payout rail (Founder decision T-1) and Wise the secondary; Stripe and Xero are refused as payout rails.**
9. **No payout without human approval.**
10. **DHL for international, Palletline for UK domestic**; both simulated.
11. **Shipment creation is PO-gated.**
12. **Simulation-first; credentials are an activation step.**
13. **Integration modes fail closed — unknown is never simulation.**
14. **The three-indicator split** (catalogue eligibility / commercial opportunity / supply viability) with **no single success score**.
15. **Commercial readiness precedes catalogue readiness.**
16. **Direct facility → Amazon UK destination is the default launch supply route** where feasible; UK warehousing only when justified.
17. **`<14 days` is a Mercenta target, not an Amazon rule.**
18. **Primary public CTA = "Explore UK Market Fit"; Partner Login stays in the header, separate from the hero CTA.**
19. **Phase 2 is complete and verified; the six commercial thresholds ship UNSET (fail-closed) pending a business decision.**
20. **Every sprint ran without committing**, because no explicit commit instruction was given — and that is the correct behaviour under the protection rules.

### 29.2 Assumptions ALREADY CHALLENGED in the previous conversation

1. **"Amazon Vendor rules differ fundamentally by country."** → Resolved: establish the **common/core Vendor operating model** from authoritative Amazon documentation first, then identify only genuinely UK-specific differences that are supported by evidence. This is **not** a mandate for a multi-marketplace platform.
2. **"Mercenta needs multi-marketplace architecture."** → **Rejected by the user.** UK only.
3. **"UK inventory is required at launch."** → **Rejected.** Brands do not want to pre-position pallets without evidence Amazon will generate POs.
4. **"A universal 90% shipping mark-up applies."** → **Rejected.** There is no universal mark-up rule; everything is configurable.
5. **"The number of Amazon UK fulfilment centres is ~100+."** → **Rejected.** Do not invent FC counts.
6. **"Vendor POs split across destinations like FBA shipments."** → **Rejected as an assumption.** Model Vendor PO destinations from actual Vendor evidence.
7. **"14-day lead time is an Amazon rule."** → **Rejected.** It is a Mercenta target.
8. **"A single success score is the right output of an assessment."** → **Rejected.** Three separate indicators.
9. **"The Phase 4 defect list is still open."** → **Challenged during this handoff:** the three named Phase 4 defects are **already fixed in the working tree** (see §27.2). Re-verify before acting.
10. **"The public supply wording is implemented."** → **Challenged during this handoff:** it is **NOT in the repository** (see §12.5).

### 29.3 Questions that remain UNRESOLVED

| # | Open question | Why it matters |
|---|---|---|
| 1 | **The six commercial readiness thresholds are UNSET** — what are the real values? | Until set, every commercial assessment routes to `human_review` (fail-closed). Needs a business decision. |
| 2 | **The §12.2 stage-order conflict** — is the existing `mercenta_hub` pipeline stage a milestone presentation or a stock-holding mandate? | Determines whether Phase 3 re-models the supply route as profiles. **Should be raised before Phase 3 implementation.** |
| 3 | **Public Amazon wording** — the strict `MERCENTA_PRODUCT_CONTRACT.md` rule (never public: Amazon / Vendor Central / 1P / VaaS) vs the M12 wording-safeguard rule (permitted where necessary and supportable). | Needs one canonical rule. Currently two documents give different strictness. |
| 4 | **Actual Amazon UK destination data** | Needed for the Phase 3 destination directory; must be evidence-backed. |
| 5 | **Actual Vendor lead times / delivery windows / receiving tolerances / chargeback rates** | Must be researched, never invented. |
| 6 | **UK-specific Vendor differences** | To be identified from evidence only, after the core model is established. |
| 7 | **Whether the public supply wording should be published**, and where it belongs in the canonical content source. | It is currently only a conversational decision. |
| 8 | **Real supply economics** (freight rates, customs, UK handling, destination delivery) | Phase 3 needs actual cost evidence, not assumptions. |

---

## 30. What Must Never Be Forgotten

The following are non-negotiable. **Repeated deliberately — this is the highest-value section of the document.**

1. **UK ONLY.**
2. **Amazon Vendor Central, NOT Seller Central / FBA.**
3. **Research before substantive external claims.**
4. **Never invent Amazon rules.**
5. **Never present Mercenta's PO opportunity assessment as Amazon's internal probability.**
6. **Direct brand facility → Amazon UK destination is the default launch supply route where feasible.**
7. **Do not assume UK warehousing is required.**
8. **`<14 days` is a Mercenta target, not an Amazon universal rule.**
9. **Do not invent Amazon UK facility counts.**
10. **Do not assume FBA shipment logic applies to Vendor POs.**
11. **MOQ, case packs, pallets, wholesale price and supply economics must connect.**
12. **Commercial readiness must precede catalogue readiness.**
13. **Master Matrix must always be reconciled.**
14. **Do not rebuild completed functionality.**
15. **Do not lose existing work.**
16. **Do not reset / stash / clean / revert / amend / switch branches without explicit approval.**
17. **Do not touch protected design files.**
18. **Do not touch Rakazo.**
19. **Cline reports must be comprehensive.**
20. **Business outcome matters more than technical elegance.**

**Additional invariants worth stating explicitly:**

21. **Do not touch `ave1-check.mjs`.**
22. **Do not deploy unless explicitly told to; only to `demo.mercenta.co.uk`; never to `mercenta.co.uk` before `GO_LIVE.md` is executed.**
23. **Do not create numbered zips; use `scripts/export-review-zip.sh` → `Review Zip/mercenta-review.zip`.**
24. **Do not commit or push unless explicitly told to.**
25. **Never remove functionality or weaken a validator to make a gate pass — repoint it and record the old contract inline.**
26. **Never claim a provider is live when it is simulated or merely configured.**
27. **Never fake a live provider outcome.**

---

## 31. Repository Evidence / Files Consulted

### 31.1 Project-state documents (the five synchronised sources)

| File | Role | Size / note |
|---|---|---|
| `requirements-registry.json` | **The Master Matrix** — granular per-capability status + evidence | 239,425 bytes · **349 entries** |
| `PROJECT_STATUS.md` | Human-readable current platform position | 532,047 bytes · 5,902 lines — the **newest authoritative block is at the TOP**; older checkpoints retained below as history |
| `HANDOFF.md` | Continuation/context document | 118,361 bytes · 1,540 lines |
| `docs/SPRINT_*_<date>.md` | Historical record of a sprint | see §31.2 |
| the final session report | Summary of the same state | held by the user / chat |

### 31.2 Sprint and phase reports consulted

```
docs/SPRINT_PHASE2_COMMERCIAL_READINESS_2026-09-20.md      (canonical Phase 2 report)
docs/SPRINT_UK_MARKET_FIT_PHASE1_2026-09-19.md             (canonical Phase 1 report)
docs/SPRINT_FOUNDER_OPERATING_SYSTEM_2026-09-19.md         (Founder OS)
docs/SPRINT_WORK_LAYER_2026-09-19.md                       (work/task layer)
docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md         (sprint 2 — reminder runner)
docs/UIUX_FOUNDATION_PASS_2026-09-18.md
docs/UIUX_REDESIGN_WAVE2_2026-09-18.md
docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md
docs/PRODUCT_CONSOLIDATION_PHASE*_2026-09-*.md             (Phases 0/A/B/C/D1-D4/E1-E9/G1)
docs/BI_FORENSIC_IMPLEMENTATION_AUDIT_2026-09-11.md
```

### 31.3 Business / architecture / governance documents consulted

```
docs/MERCENTA_BUSINESS_MODEL.md      (declared CANONICAL business model)
docs/MERCENTA_PRODUCT_CONTRACT.md    (business rules, roles, terminology, "things NOT to break")
docs/INTEGRATIONS.md                 (provider registry, modes, live activation, secret rules)
docs/ARCHITECTURE.md                 (registry counts, SP-API trio)
docs/DESIGN_SYSTEM.md · docs/FUNCTIONAL_RISK_MAP.md · docs/MERCENTA_BASELINE.md
PRODUCTION_READINESS.md              (go-live checklist; integration credentials;
                                      placeholder business data; structural debt)
GO_LIVE.md · README.md
MERCENTA_ARCHITECTURE.md · MERCENTA_MASTER_CONTEXT.md · MERCENTA_FORENSIC_AUDIT.md
AUDIT_REPORT.md · MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md
STATUS_CHECK.md · Review Zip/INCIDENT-LOG.md
```

### 31.4 Rule files (`.clinerules/`) consulted

```
.clinerules/mercenta-business-model.md
.clinerules/project-state-contract.md
.clinerules/protection-rules.md
.clinerules/always-export-review-zip.md
```

### 31.5 Code read directly to verify this document

```
src/types.ts                 (APPROVED_CATEGORIES 16-27; ShipmentStage/STAGE_ORDER 66-92;
                              PurchaseOrder 1104-1144; PO_REJECTION_CODES 1150-1155;
                              SupplyProfile 3233-3253; Phase 1 entities)
src/integrations/types.ts    (IntegrationMode; ProviderResolutionMode 284;
                              isProviderSimulationSafe 290-294; resolveProviderMode 300-306;
                              default connection state incl. dhl/xero 217/221)
src/integrations/registry.ts (dhl 226/363/411; xero 250/365/417)
src/lib/simulation/scenarioEngine.ts        (assertSimulationOnly safety gate)
src/components/admin/integrations/SimulationControl.tsx
src/data/api.ts              (evaluateBrandCatalogGate 236-250; submitCatalogItem 289-330)
src/lib/automation/registry.ts              (9 automations)
src/config/ukMarketFit.ts    (CTA 43; presence classes 73-110; dimensions 154-205;
                              indicators 218-243; qualification vocabulary)
src/config/homepageContent.ts (hero 95-115; CTA 101/262; Partner Login note 106-112)
src/components/marketing/Home.tsx           (public pre-audit surface, ~line 107)
src/components/admin/FounderControlCentre.tsx (Commercial section + pre-audit queue)
src/lib/spapi/transform.ts                  (UK marketplace id, line 39)
```

### 31.6 Commands run to verify state (all READ-ONLY — no mutation)

```
ls -la /Users/tadii/Desktop/1. Mercenta
ls -la /Users/tadii/Desktop/Mercenta                 → No such file or directory
git status --short · git rev-parse --abbrev-ref HEAD · git log --oneline -20
git log --oneline -1 <959b4d2|ba99266|3379523|fed3bb3>
git tag
node -e "…requirements-registry.json counts…"        → 349 entries, 190/113/2/38/1/3/2
grep/ls across src/, docs/, scripts/, e2e/, design/, Review Zip/
```

**Every command was read-only. No file was modified, staged, stashed, reset, cleaned, checked out or committed. No migration, no install, no deploy, no network call.**

### 31.7 Conflicts found between documents (recorded, NOT silently resolved)

| # | Conflict | Where | Resolution recommended |
|---|---|---|---|
| 1 | **Public Amazon wording strictness** — "NEVER public: Amazon, Vendor Central, 1P, VaaS" vs the M12 wording-safeguard rule which permits supportable Amazon-specific language | `docs/MERCENTA_PRODUCT_CONTRACT.md` §7 vs `.clinerules/mercenta-business-model.md` ("Amazon wording safeguards (M12)") | The rule file declares `docs/MERCENTA_BUSINESS_MODEL.md` CANONICAL, but neither it nor the product contract explicitly reconciles this point. **Ask the founder for the single rule**, then align both documents. |
| 2 | **Supply route vs shipment-stage order** — "direct facility → Amazon UK destination, no assumed UK warehouse" vs the fixed linear `… → mercenta_hub → live_amazon` stage order | §12.1 (strategy) vs `src/types.ts` 66–92 (code) | Resolve **before** Phase 3 (see §12.2 / §29.3 #2). |
| 3 | **Phase 4 defect list vs working tree** — the brief lists 3 defects as open; the code shows them fixed | §27.1 (report) vs §27.2 (verified code) | **The code is newer.** Re-verify at HEAD before any Phase 4 work; treat the old list as historical. |
| 4 | **Public supply wording** — quoted as established copy in the brief; absent from the repository | §12.5 | Add it to the canonical content source, or stop treating it as implemented. |
| 5 | **Zip policy** — a generic numbered-zip rule (`homekava-review-N.zip` → `~/Desktop/`) vs the project rule (single `mercenta-review.zip` in `Review Zip/`) | `.clinerules/always-export-review-zip.md` vs `.clinerules/protection-rules.md` | `protection-rules.md` declares itself overriding; **use `scripts/export-review-zip.sh` only.** The generic rule's filename pattern references a *different project* (`homekava`) — a copied-rule artefact. |

---

## 32. Handoff Verification

This document was verified after creation by reading it back from disk. Verification checks performed:

| # | Check | Result |
|---|---|---|
| 1 | File exists at `/Users/tadii/Desktop/1. Mercenta/MASTER_CHATGPT_HANDOFF.md` | ✅ |
| 2 | Valid Markdown (headings, tables, fenced blocks) | ✅ |
| 3 | All major sections present (see §32.1) | ✅ |
| 4 | **UK ONLY explicitly stated** | ✅ §3, §2 rule 1, §30 rule 1 |
| 5 | **Vendor vs Seller/FBA distinction explicit** | ✅ §6 (whole section) + §2 rule 2 |
| 6 | **Current business model explicit** | ✅ §4 |
| 7 | **Phase 2 state included** | ✅ §11 |
| 8 | **Current repo state included** | ✅ §23 |
| 9 | **Master Matrix state included** | ✅ §20 |
| 10 | **Phase 4 known issues included** | ✅ §27 |
| 11 | **Next strategic phase included** | ✅ §28 |
| 12 | **ChatGPT working style included** | ✅ §26 |
| 13 | **Cline working style included** | ✅ §25 |
| 14 | No source code modified | ✅ (read-only session) |
| 15 | No application files modified | ✅ (only this new document created) |
| 16 | No git state changed | ✅ (no stage/stash/reset/clean/checkout/amend/branch-switch) |
| 17 | No protected files touched | ✅ (`design/*.png`, `ave1-check.mjs`, Rakazo all untouched) |

### 32.1 Section index

1. Purpose of This Handoff · 2. Critical Non-Negotiable Rules · 3. Current Business Scope — UK ONLY · 4. Mercenta Business Model · 5. Amazon Vendor Central Model · 6. Vendor vs Seller/FBA · 7. Amazon Research / Evidence Rules · 8. UK Market Fit · 9. Acquisition / ASIN Model · 10. Commercial Viability · 11. Commercial Readiness — Phase 2 · 12. Supply / Logistics Model · 13. Amazon UK Destination Model · 14. MOQ / Pricing / Economics · 15. Capital / Financing · 16. Brand Education / Academy · 17. Public Website / Positioning · 18. Integrations · 19. Founder OS · 20. Master Matrix · 21. End-to-End Business Journeys · 22. Roles / Personas · 23. Current Repository State · 24. UI / UX Direction · 25. Cline Working Rules · 26. ChatGPT Working Rules · 27. Known Issues / Phase 4 · 28. Current Phase / Next Strategic Step · 29. Important Historical Decisions · 30. What Must Never Be Forgotten · 31. Repository Evidence / Files Consulted · 32. Handoff Verification — plus **CURRENT CLINE REPORT / PROJECT STATE** and **INSTRUCTIONS TO THE NEXT CHATGPT** below.

---

## CURRENT CLINE REPORT / PROJECT STATE

> **Status of this section:** the repository **DOES contain** the canonical record of the latest Cline phase — it is **not** a separately pasted report, but the repository's own project-state artefacts, which this handoff read directly. The user may still paste/upload the latest verbatim Cline report separately.

**Latest verified Cline phase in the repository:** **PHASE 2 — COMMERCIAL READINESS + PRODUCT ECONOMICS (2026-09-20)**, recorded in five synchronised places:

| Source | Path |
|---|---|
| Sprint doc | `docs/SPRINT_PHASE2_COMMERCIAL_READINESS_2026-09-20.md` |
| PROJECT_STATUS block | `PROJECT_STATUS.md` (top block: "🧭 STAGE — PHASE 2 COMPLETE … — CURRENT CHECKPOINT") |
| HANDOFF | `HANDOFF.md` (top block, dated September 20, 2026) |
| Master Matrix | `requirements-registry.json` (349 entries; 10 Phase 2 rows `built_and_tested`) |
| Session report | the same state, with verbatim command output |

### Cline's reported Phase 2 state (summary of the repository record)

- **Branch** `redesign/foundation`, **HEAD** `19be002c4b3d6a64020b4740879c56ef1550e628` — **no commit was created** (no explicit authorisation given).
- Protected baseline `959b4d2` confirmed an **ancestor**.
- **ZERO git mutation.** No deploy. No credential added, read or activated. **Zero live provider calls** (asserted twice). No protected design asset modified, renamed or added to git. The intentionally dirty working tree was **preserved and extended**, never reset.
- **BUILT:** the canonical commercial readiness record store · the single assessment path (gate → routing decision → record) · the declared delivery vocabulary · the Founder Commercial section in the existing Control Centre · the tenant-scoped Brand Commercial Readiness surface · work-layer integration · the `commercial_readiness_monitor` automation · four canonical demo cases built from real Phase 1 assessments.
- **REAL JOURNEYS VERIFIED IN A BROWSER:** brand (Catalogue → Commercial Readiness → Own Products → Guidance → GBP → Human Review → case_pack 6 → master_carton 24 → Ready) and founder (Control Centre → Commercial → four products → remediation drawer → observed value → missing currency → owner/SLA → canonical work item → routing-decision ID).
- **DEFECTS FIXED:** `missingTermFieldIds`, pack arithmetic, duplicate suppression, seed routing, synchronous research seam, tour skip modal, Founder OS assertion repointed to nine automations — plus the three in-session routing/gate defects recorded in §11.4.
- **VERIFICATION:** tsc 0 · build PASS · validator 78/0 · routing validator 101/0 · wording validator 268/0 · targeted E2E 6/6 · **full Playwright 371 passed / 0 failed / 2 skipped**.
- **NOT DONE:** no commit/push/deploy; **no Supabase migration** (persistence honestly `memory-only`); no provider activated; Phases 3+ untouched; `uiux-wave2-core-surfaces-remaining` outstanding; Miro untouched; 174 pre-existing registry findings not fixed; financial/capital functionality not built.
- **NEXT (Cline's own statement):** *"Phase 3 — Supply Route / Logistics Intelligence, consuming the READY commercial record (validated pack profile, supply basis, declared next stage) as its input. Review this Phase 2 delivery first."*

### Immediately preceding checkpoints (also in the repository)

1. **Explicit workflow routing / gateway architecture + Phase 2 commercial-ready seam (2026-09-19)** — `src/config/routing.ts` (3 gateway kinds, 7 branch outcomes, 12 refusal reasons each mapped to a declared disposition, 4 join policies, 10 required routing semantics, 3 canonical worked examples, declared idempotency-key format), `src/lib/routing/gateways.ts` (pure functions, zero network, zero wall-clock, zero AI), `src/lib/commercial/economics.ts`, `src/lib/commercial/commercialGate.ts`. **Phase 2 delivery was deliberately deferred at that point — and the checkpoint said so honestly rather than claiming completion.**
2. **Deterministic completion sprint 2 (2026-09-19)** — commit `19be002` (99 files, +3919/−354); the proactive reminder runner.
3. **Work layer (2026-09-19)** — commit `7983a88`.
4. **Founder Operating System (2026-09-19)** — nine automations, Control Centre, acquisition engine, BI layer.
5. **Phase 1 — Explore UK Market Fit / pre-audit engine (2026-09-19)** — 257 → 331 Matrix entries.

**If the user pastes a newer Cline report than the above, reconcile it against the Master Matrix and the five synchronised sources before acting on it.** Do not assume this snapshot is newer than what the user provides.

---

# INSTRUCTIONS TO THE NEXT CHATGPT

**Read this entire document before responding.** Then hold the following:

1. **Treat this document as the accumulated project context.** The user should not have to re-explain any of it.
2. **Treat UK ONLY as the current business scope.** Do not raise multi-marketplace architecture unless the user explicitly asks about future expansion.
3. **Treat Amazon Vendor Central as the business model.** Mercenta operates the Vendor account; brands do not.
4. **Do not substitute FBA / Seller Central rules** for Vendor rules — and label any FBA-derived context explicitly as FBA/Seller information.
5. **Do not invent Amazon policies.** Research before substantive external claims. Label every claim as **documented fact / inference / Mercenta rule / UNKNOWN**.
6. **Preserve established decisions** (§29.1) — do not relitigate them.
7. **Identify assumptions that still need validation** (§29.2 and §29.3) and say plainly which are open.
8. **Reconcile new Cline reports against this context** — including the five synchronised sources and the Master Matrix counts (§20).
9. **Never rebuild completed work unnecessarily.** Phase 1, Phase 2, Founder OS, the work layer, the routing/gateway architecture and the deterministic completion sprints are **done and verified**.
10. **Always reconcile the Master Matrix**, and treat `built_and_tested` vs `built` honestly — `built_and_tested` requires a real, on-disk e2e spec.
11. **Keep the user-facing conversation business-first.** The governing question is: *"does the platform perform the way it is supposed to based on the business model?"*
12. **Produce ONE comprehensive Cline prompt** when the user asks for implementation — copy-pasteable in a single block, covering: scope · files to inspect · files to change · files NOT to change · tests · documentation · Master Matrix reconciliation · the required final report.
13. **Include testing, documentation and Matrix reconciliation requirements in every Cline prompt**, plus the six standing completion requirements (§25.4) and the review-zip step.
14. **Remember the user is non-technical.** Explain important business consequences plainly, with numbers and outcomes — not architecture jargon.
15. **Continue the conversation naturally.** Do not make the user start from scratch, and do not re-ask for context that is already in this document.
16. **Challenge, do not flatter.** If an earlier assumption is wrong, say so, explain the impact, and specify what must change — but never invent facts to fill a gap.
17. ~~**Respect the protection rules.** More than three source files, a major phase, a destructive change or a broad refactor requires the user's explicit approval first.~~ **[RETIRED 2026-09-21 — there is no file-count or phase-approval gate. Destructive changes remain a genuine hard stop. See `.clinerules/operating-model.md` §2, §3 and §7.]**

### And specifically, when the user asks what to do next

The answer is the **AMAZON VENDOR TRUTH VALIDATION + MERCENTA BUSINESS MODEL RECONCILIATION** (§28.2) **before** Phase 3 — plus the five document conflicts in §31.7 and the eight open questions in §29.3, which are the most valuable things you can raise early.

**Do not start Phase 3 — Supply Route / Logistics Intelligence — until those assumptions are validated and the §12.2 stage-order conflict is resolved with the founder.**
