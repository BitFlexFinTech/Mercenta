# PRODUCTION_READINESS.md — go-live checklist

**Last updated: session 21 (23 Sep) — the DASHBOARD + LOGISTICS CLEANUP PROGRAMME. P0, P0.4, P1, P2, P3, P4, P5, P6, P7
and P8 are DONE, committed and (for the product phases) verified live on the demo; P9–P12 are NOT STARTED. Plan + the
11 binding Founder decisions: `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` (each completed phase's
evidence is in `PROJECT_STATUS.md` and in that document's per-phase sections). Everything below is still simulated;
nothing was re-labelled live.**

## SESSION 13 — dashboard + logistics cleanup programme: what is still simulated / placeholder

- **The ASIN is a clearly-simulated placeholder UNTIL the channel returns a real identifier (P8 — DONE 2026-09-23).**
  Founder decision 10: a brand may supply the identifier itself **only for a product that already exists on the
  channel** (the confirmation is required and the declaration is refused without it), and otherwise **Mercenta
  populates it when the channel accepts the product**. In simulation that value is the unmistakable `SIM-ASIN-…`
  placeholder (`src/lib/catalog/asin.ts` — the ONE owner); **the code never invents a plausible-looking ASIN**, and
  the seed's previously INVENTED `B0<sku>` identifier was removed in P8. The identifier's SOURCE
  (`brand_declared` / `channel_assigned`) and whether it is simulated are recorded and shown, so a brand
  declaration is never presented as channel-confirmed. **Live activation:** the SP-API seam (**P12 — DONE 2026-09-24**) returns the real
  identifier behind the same interface — **zero code changes**. **Remaining non-credential work:** none — the model,
  the rules, the channel path and the surfaces are built. Note the register's finding (`AV-035`) that **no public
  Vendor catalogue/item API exists**, so there is no documented API an ASIN could be fetched from.
- **THE INVENTORY MODEL IS MERCENTA'S OWN (P8 — DONE 2026-09-23).** On-hand, committed, inbound and available are
  **DERIVED from an append-only movement ledger** (`src/lib/inventory/inventoryRecord.ts` — the ONE owner), entered
  by the brand **inside Mercenta**. There is **no Vendor inventory-availability API** (truth validation §769:
  "Inventory assumptions — REQUIRES BUSINESS DECISION", `AV-035`), so these figures are **never a channel reading**
  and the platform never claims one. Stock is entered in **Eaches or Cases** (the channel's own vocabulary,
  `AV-029` CONFIRMED) and a case entry converts through the product's own case pack — **refused when no case pack
  is declared**. **Live activation:** pushing stock TO the channel is `submitInventoryUpdate`, which
  **P12 DELIVERED (DONE 2026-09-24)** — `src/lib/inventory/channelInventoryPush.ts` derives the quantity it
  reports from THIS ledger (never a typed-in figure) and pushes it through the SP-API seam; the admin
  inventory tab carries the attributed action. **Remaining non-credential work:** none.
- **Payment terms 14 / 30 / 60 are MERCENTA'S OWN CONFIGURATION, not channel data (P7 — DONE 2026-09-23).** The terms
  are chosen **per invoice** and the due date is **DERIVED** from the invoice's own date plus its own terms
  (`src/lib/commerce/invoiceTerms.ts` — the ONE owner). The repo's truth register records that **no public Vendor
  Payments API exists** (S14), so nothing may claim Amazon-published payment terms or a Vendor Payments feed, and every
  payment date is labelled as derived. **Live activation:** a real payment notice/receipt imported from accounting
  (Xero) behind the existing seam. **Remaining non-credential work:** none — the terms, the derivation, the receivables
  definition and the surfaces are built.
- **The invoice-number registry is modelled and enforced, but INVOKING THE CHANNEL'S INVOICING API IS AN ACTIVATION
  STEP (P7 — DONE 2026-09-23).** `src/lib/commerce/invoiceRegistry.ts` implements the documented rules (`AV-022`):
  numbers are **unique and never reused**, a **zero-value invoice fails**, and a wrong invoice is **cancelled and
  re-sent under a NEW Invoice ID** (the cancelled number stays consumed for ever — the ledger is append-only). Issuing
  and cancelling contact **no** accounting provider and no channel API. **Documented activation precondition (register
  S11): API invoicing requires PARALLEL TESTING WITH THE CHANNEL'S ACCOUNTS-PAYABLE TEAM before payments process.** That
  is a business/activation step, not a code change; the four rules are stated on the admin surface
  (`INVOICE_NUMBER_RULES`) so the precondition cannot be forgotten. **Remaining non-credential work:**
  **NONE — P12 DELIVERED `submitInvoices` (DONE 2026-09-24)** in
  `src/lib/commerce/channelInvoiceSubmission.ts`: the invoice goes AS THE REGISTRY ISSUED IT, is idempotent,
  and refuses a cancelled invoice, a zero-value invoice and a reused number. The admin channel-operations
  console carries the action; the register's `S11` parallel-testing precondition above still applies before
  payments process.
- **The receiving status is derived from MERCENTA'S OWN receiving step (P7 — DONE 2026-09-23), AND the
  CHANNEL'S OWN reading is now available (P12 — DONE 2026-09-24).** `receivingStatus`
  (not received / partially received / received) is derived from the per-line received quantities
  (`src/lib/commerce/receivingStatus.ts`, `AV-018`) and gates invoicing — an unreceived PO cannot be invoiced (fail
  closed). **The channel's own reading is now built (P12 — DONE 2026-09-24):** reading the CHANNEL's own
  `receivingStatus` is `getPurchaseOrdersStatus`, implemented in `src/lib/commerce/channelReceivingSync.ts`
  and reached through the SP-API seam from the admin channel-operations console. It REPORTS the channel's
  status per purchase order and **never writes a simulated reading as a canonical receipt**
  (`CHANNEL_READ_SIMULATED`), so with live credentials the same reading applies through the existing
  receiving step — a credentials change only.
- **Carriers are DHL + Palletline BY API ONLY (P9 + P10 — DONE; provider configuration now BUILT).** Mercenta connects the
  carrier APIs itself; **a carrier never logs into Mercenta**, so the 3PL carrier portal, its role, its environment, its
  shell and its three views, the admin "Carrier Monitor", the "3PL Carrier Terminal" login card and the demo-environment
  entry are **REMOVED** (P9 — matrix `D01-07`/`D04-18`/`D10-13`). `fedex` and `bak` are no longer carrier identities
  anywhere in the type, the labels, the lane-capability table or the demo data (decision 1); their refusal is preserved
  by name (`RETIRED_CARRIER_IDS`). **The carrier-EVENT capability was REHOMED, not deleted:** the milestone advance and
  its request log now live on the Mercenta admin Logistics Hub, written through the ONE canonical store writer
  (`setShipmentMilestone`), attributed to the Mercenta operator. **Provider configuration is BUILT (P10, 2026-09-24):**
  `src/lib/shipping/providerConfiguration.ts` projects the canonical owners (accounts/lane rule/labels/capability from
  `src/config/shipping.ts`, the authoritative modes from the Integrations registry, the non-secret connection state) into
  both logistics workspaces — fail-closed, so only `simulation`/`live` are operational and every other state is named;
  it is read-only for a brand (no credential, no cost base) and carries an **RBAC-gated** hand-off to the Integrations
  view for an operator. **Live activation:** DHL + Palletline API credentials behind the existing provider seam
  (`src/lib/dhl`, `src/lib/palletline`); the simulated lanes stay truthful and make zero network calls. **Remaining
  non-credential work:** the carrier-polling operations (`getShipmentDetails`), which are P12's declared scope.
- **The PO document pack (P6 — DONE 2026-09-23) is GENERATED, not downloaded from the channel.** SSCC carton labels,
  the carrier label/waybill, the packing list/delivery note and the ASN sheet are produced by Mercenta
  (`src/lib/documents/poDocumentPack.ts`, automatically on acceptance); customs documents apply to international lanes
  only. **Amazon-generated labels are NA-only** (`GetShipmentLabels` documents NA only), so no downloadable Amazon
  label may ever be claimed for UK/EU. **ACTIVE PLACEHOLDER — the GS1 company prefix:** Mercenta holds no GS1 licence
  in this environment, so every SSCC-18 is generated under the declared, UNASSIGNED all-zero prefix
  (`SSCC_GS1_PREFIX` in `src/lib/documents/sscc.ts`, status `placeholder_unassigned`) and **every printed carton label
  states `XX-PENDING-GS1-LICENCE`**. **Credential that replaces it:** Mercenta's licensed GS1 company prefix, entered
  by replacing `SSCC_GS1_PREFIX.value` — no other code change (the check digit, the serial derivation and every caller
  are untouched). **Live activation of the rest:** carrier label APIs + the SP-API shipment-confirmation call
  — **the SP-API half is DELIVERED: P12 (DONE 2026-09-24) implements `submitShipmentRequest`,
  `getShipmentDetails` and `submitShipmentConfirmations` in both clients, and the chain
  (`src/lib/commerce/proxyProcessor.ts`) submits the shipment request, reads the routing instructions and
  files the ASN through the seam with the channel's own references recorded**; the carrier label APIs
  (DHL/Palletline) remain a credentials activation. **The CHANNEL's own label service is REFUSED by rule
  for UK/EU** (`src/config/shipping.ts → channelShipmentLabelsAvailability`, NA-only) — Mercenta never claims
  a channel-generated label here, and no such label is ever fabricated. Until a carrier books the consignment
  the waybill/label documents are reported **not ready** rather than printed as a fake. **Remaining non-credential work:** none — the pack, the surface, the notification and the badge are built.
- **Consolidation is DEFERRED, not implemented — and RECORDED IN CODE (P10 — DONE 2026-09-24).** The channel documents
  multi-PO grouping (`purchaseOrders[]` on the shipment request, the PO referenced per carton in the ASN, the
  "100 shipment confirmations for every truckload shipment" limit), but POs arrive separately today: the implementation
  is **one PO = one consignment** while the **model supports 1..n**. `src/lib/shipping/consolidation.ts` is the ONE
  owner: it holds the posture (`status: 'deferred'`, decision 11), the documented evidence, the declared activation
  (the channel's shipment request — **P12, DELIVERED 2026-09-24**: `shipmentRequestImplemented: true` and
  `src/lib/shipping/channelShipmentOperations.ts` submits the declared 1..n set through the seam) and the
  invariants a future grouping must honour (never across
  brands, no duplicates, at least one PO, inside the truckload limit) — and it is FUNCTIONAL: the 1..n declaration
  normalises/validates and the pre-conditions are enforced. **Remaining non-credential work:** the grouping INPUT
  (nothing writes more than one PO per consignment — a PRODUCT decision, because purchase orders still arrive
  separately; the seam operation the deferral named now exists).
- **"Create PO" is removed (P11 — DONE 2026-09-24).** The PO record is the PO **from Amazon**; the Mercenta→brand commercial position is
  **derived** from the brand's Model A/B. No second PO document exists.
- **The Mercenta Hub is REMOVED as a destination (P5 — DONE 2026-09-23).** The destination is **the FC declared on the
  PO** (`PurchaseOrder.shipToParty` — the channel's `shipToPartyId`, resolved once in
  `src/config/destinationFc.ts`). No universal Mercenta intermediate hub may be asserted, no hub coordinate is
  declared, and a PO that declares no destination renders an explicit *not declared* schematic leg rather than a
  Mercenta-chosen site. The retired `mercenta_hub` shipment stage/status is gone; the pre-live state is
  `destination_fc` ("Delivered to Destination FC").
- **The proxy model itself is the truthfulness rule for this programme:** Mercenta holds the Amazon Vendor account; a
  brand never communicates with Amazon (its decision is an **instruction to Mercenta**, which then acts through the
  channel integration). **P4 landed (2026-09-23):** the brand surface carries **no filing control** — no "Create
  Shipment", no "File ASN", no routing filing form — and shows Mercenta's channel status (acknowledgement reference,
  routing reference, ASN + consignment); the brand's only packing action is the packing-correction instruction.
- **Nothing in P0–P12 requires a credential:** every external integration is mock-first behind a swappable seam. The only
  genuine external dependencies are **SP-API approval** (P12) and the **demo-host credential** (the final deploy step).

## M12 — new prerequisites and what is STILL simulated

- **Sales estimator data = SIMULATED PLANNING DATASET, not Amazon data.**
  `src/lib/intelligence/salesEstimator.ts` produces an ESTIMATED range from a
  declared category-baseline model. `SALES_ESTIMATE_BASIS = 'simulated_estimate'`,
  `dataSource: 'simulated_dataset'`, `liveDataUsed: false` always, and every result
  carries `ESTIMATE_DISCLAIMER` + the TOS verification note. **Live activation:**
  the registered `keepa` / `amazon_sp_api` integrations supply real signals behind
  the SAME function once credentials exist; until then `salesDataProviderModes()`
  reports each provider's truthful mode and **never claims live**.
- **New-to-channel ("Born to Run"-style) modelling is SIMULATION ONLY.**
  `modelBornToRunOpportunity` sets `programmeStatus: 'not_confirmed_with_amazon'`,
  `tosVerificationRequired: true`, `simulated: true`, and submits **nothing** to
  Amazon. `PRODUCTION_READINESS` does not claim any Amazon programme, approval or
  account capability. **Remaining non-credential work:** verify the current Amazon
  Vendor terms/account agreement before any wording is relied on
  (`AMAZON_TOS_VERIFICATION_REQUIRED`).
- **Partner/recruitment outreach send = MOCK until email credentials exist.**
  `src/lib/founder/partnerOutreach.ts` sends through the EXISTING mail seam
  (`src/lib/mail/mail.ts`). With no verified connection the mock client returns
  `mock:msg-…` and the validator proves **zero network calls**. **Live
  activation:** `POSTMARK_API_KEY` (or SendGrid) + the deployed `send-email`
  function. A send always requires an EXPLICIT confirmation and refuses copy that
  fails the wording gate.
- **Founder documents + deck = HTML, printed by the browser.** No `.docx`/`.pptx`
  writer and no new dependency: the brief is a self-contained HTML document and the
  deck is a keyboard-navigable HTML presentation, both printable to PDF. A `.pptx`
  export is explicitly NOT provided.
- **Trade-programme / partner registry is PROSPECTIVE.** Every entry carries
  `relationshipExists: false` and `status: 'prospective_partnership'`; the UI
  prints the no-partnership disclaimer. Nothing claims a government, embassy,
  chamber or Amazon relationship.
- **Fundraising plan claims no commitments.** `committedGbp: 0`,
  `commitmentsClaimed: false`; the instrument is flagged as unverified.
- **The investor demo is now 25 stages** (24 + `commercial_models`), still
  deterministic, still zero-network.
- **Live-credential-required for M12: Keepa (or Amazon data access) for real
  estimator signals, and a transactional email provider for real outreach.**
- **NEW §M2 (no credentials required, no paid dependency added):** the
  document-verification seam `src/lib/verification/documentVerification.ts` ships
  FOUR providers. The AUTOMATED one is **Mercenta's own deterministic structural
  rule engine** (`internal_structural_rules`) — it records `external: false`
  because **no external document-verification API is used**. If a genuinely usable
  external/free verification provider is later identified, it plugs in behind the
  same interface with **zero** change to the compliance workflow. The
  deterministic simulation seam (`simulated_document_verification`) is reachable
  **only** when the provider mode is positively `simulation`; every other mode is
  fail-closed to manual Mercenta Admin review. **Manual verification is a
  first-class path and cannot bypass the document requirement.**
- **NEW §M6 (credential/configuration required):**
  - **VAT treatment is NOT configured.** `src/config/commercial.ts` →
    `VAT_TREATMENT = 'configuration_required'`, `VAT_TREATMENT_CONFIGURED = false`.
    Until the business/accounting decision is taken and entered there, every
    reconciliation records `vatConfigured: false` and **no tax amount is computed
    or presented**. This is deliberate — the platform does not invent a tax result.
  - **Accounting representation:** `src/lib/finance/accountingSeam.ts` resolves to
    `${EDGE_BASE}/...`-free **simulated representation** in simulation mode, and to
    the **existing** `src/services/xero` client in live mode. Without Xero
    credentials the existing factory returns its Mock client, which reports
    "not connected": the posting is recorded as **NOT represented** with that real
    error. Live activation needs `XERO_CLIENT_ID` / `XERO_ACCESS_TOKEN` /
    `XERO_TENANT_ID` (see `docs/INTEGRATIONS.md`).
  - **Payout destination verification:** a payout is refused unless the brand's
    destination is `verified`. Verification is an **operator action with a recorded
    reference** (`setDestinationStatus`) — there is **no bank-verification
    provider** wired, so today it is a Mercenta Admin review, honestly labelled.
  - **Payout transfer:** unchanged — `MockStripePayoutClient` until verified Stripe
    Connect credentials exist. Payouts are additionally gated on a reconciled
    payment, resolved deductions and a verified destination.
- **NEW §M7 (no new prerequisite):** the investor demo now runs **24 stages**
  (the 22 canonical stages + `shipping_commercial` + `cases`). Both new stages use
  existing seams and remain zero-network, deterministic and reset/replayable.

- **NEW in the registry:** `palletline` (UK-domestic Mercenta carrier account,
  §11). Its `defaultMode` is honestly **`available`** — there is **no live or
  mock Palletline adapter yet**, so the fail-closed gate refuses a simulated
  Palletline provider operation. Activation needs Palletline credentials + an
  adapter following the DHL pattern.
- **NEW mock/placeholder (clearly marked):** shipping commercial terms in
  `src/config/shipping.ts` — negotiated discount per carrier, mark-up,
  surcharge, handling fee and **VAT treatment** are all `placeholder: true`
  pending commercial/accounting sign-off. Nothing hardcodes a mark-up such as
  90%; the carrier cost and the brand charge are recorded separately.
- **NEW non-credential go-live item:** the case-escalation seam
  (`src/lib/helpdesk/amazonCaseClient.ts` → `RealAmazonCaseClient`) posts to
  `${EDGE_BASE}/retail-channel/cases`. **That Edge Function does not exist yet** —
  it must be written at deploy time (it holds the secret ref and forwards the
  idempotency key), exactly like the SP-API functions in `GO_LIVE.md` §3.
  Until then the seam resolves to the fail-closed `Unavailable` client and
  **claims nothing**.
- **Unchanged:** every existing mock, placeholder and credential requirement.

**Last updated:** Phase E2E (13 Sep) — **the deterministic investor-demo lifecycle
is DONE and introduces NO new mock, placeholder or credential requirement.**
`src/lib/simulation/investorDemo.ts` runs the whole 24-stage lifecycle on the
EXISTING canonical seams (application → approval → onboarding → compliance →
catalogue → PO → acknowledgement → fulfilment → shipment → **shipping lane &
commercial model** → delivery/invoice/payment → returns → deductions → dispute →
commission → payout → CRM → marketing → integrations → **cases (Mercenta review
before channel escalation)** → social → RBAC → audit → error/recovery) with ZERO
network calls, and is reset/replay-deterministic (identical digest).
**One real domain gap was closed, not faked:** the compliance gate has always
required a signed distribution agreement, but contracts were seed-only, so a
tenant created through the real application → approval → onboarding path could
never clear its gate. A canonical operator action
(`demoStore.ensureDistributionAgreement` / `api.issueDistributionAgreement`)
now issues that agreement against the ONE `demoContracts` store. **Nothing here
requires a credential; nothing here is a placeholder** — the only remaining
go-live items are unchanged (real provider credentials + the deploy-time Edge
Functions listed in `GO_LIVE.md`).
`node scripts/validate-investor-demo.mjs` → 41/41 PASS · `e2e/investor-demo.spec.ts`
→ 10/10 PASS.

**Last updated:** Phase D2 + F (13 Sep) — **the UI/UX status sweep and the first
production-preparation work are DONE.** Phase D2 migrated the remaining
domain-status surfaces onto the canonical presentation layer
(`poStatusPresentation`, `ackStatusPresentation`, `ackWindowPresentation`,
`deductionStatusPresentation`, `submissionStatusPresentation`,
`shipmentStatusPresentation`, `onboardingStatusPresentation`,
`returnTrackingStatusPresentation`, `poOutageStatusPresentation`,
`complianceGatePresentation`, `billingDecisionPresentation`) and deleted two
duplicated status sources outright: the brand PO list's local STATUS_BADGE/
STATUS_LABEL maps and `STATUS_COLORS` in types.ts. **No new mock, placeholder or
credential requirement was introduced.**
**Phase F (production preparation):** the go-live runbook now EXISTS —
**`GO_LIVE.md`** (preconditions, environment, migrations + Edge Functions, the
credential-only provider swap, deploy, the 8-step post-deploy smoke test,
rollback, and the explicit non-scope: Social parked, Rakazo last). A real tooling
defect was also fixed: **`scripts/validate-edge-functions.mjs` used to CRASH
(ENOENT) whenever an expected Edge Function was absent** — it now reports each
absent artefact as an explicit deploy-time item, asserts only what is present,
and exits 0 with `Assertions run: 37 · failures: 0 · skipped (absent artefact): 36`
plus the list of the 8 artefacts to create at go-live.
**Still open (buildable next):** `scripts/integrity-audit.mjs` carries 12 stale
assertions (it expects the pre-Phase-6 shell routing, the pre-rename "Get
Started" CTA, and the removed `validate:wording` script) — it reports 46/12; the
assertions must be repointed at the current architecture.

**Last updated:** Phase D1 (13 Sep) — **BUILD-FORWARD session A+B+C+D1; NO new mock, placeholder or
credential requirement was introduced.** ComplianceUploadCard/ComplianceApprovals were re-verified and
fixed (stale row status after an Upload; the canonical `reviewGateDocument` gate sync was activated).
The **Integration Hub** now consumes its canonical sources (`INTEGRATION_META.category`,
`INTEGRATION_CATEGORY_LABELS`, `hasLiveCredentialHint`): mode-derived state tiles that filter the list,
an actionable attention alert, category grouping, search, honest empty state, and a truthful
**"developer demo key present — not a verified connection"** note, so an env demo key can never be read
as a live integration. `src/lib/statusPresentation.ts` is now the single source of truth for presenting
a domain status (semantic tone + machine-readable `data-status`); a simulated/pending/error state can no
longer be styled as a stronger one on the surfaces that adopt it. The whole go-live picture below is
unchanged: **only credentials + deploy-time functions remain** for the live paths.

**Last updated:** Phase G1 (13 Sep) — **the retired Rocket.Chat server infrastructure is fully
removed from `mercenta-services` (46.101.75.185)**: containers, dedicated Mongo volume, anonymous
volumes, images and the compose service/volume entries are gone; the stack re-validates and all 10
active services were verified unaffected (engine `/api/` 200, `/auth` 403 edge block intact, Caddy
config valid, disk 27 → 24 GB). Also in G1: the **brand-facing deductions ledger** was built
(Tour 5 surface) using only canonical domain read/mutate paths. **Mercenta Social/Postiz remains
DEFERRED** — the droplet was not resized and the Postiz roadmap was not continued.
**Last updated:** Phase E7 (12 Sep) — **Mercenta Social (the full Postiz application exposed to approved brands) is integrated and simulated end-to-end at the Mercenta boundary; the ENGINE side is blocked by deployment, not by code.** Engine version verified as **v1.47.0** (`root-postiz-1` on `mercenta-services`, 46.101.75.185). Verified blockers: the NestJS backend exits on `ECONNREFUSED ::1:7233` because **Temporal is missing**, so nginx answers **502** for `/api/*`; **`DISABLE_REGISTRATION=false` (engine self-signup OPEN)**; `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000`; media storage container-local; droplet RAM 73.7 %. Consequently the Mercenta→engine link is **not established** (`engineLinked:false`, reported truthfully) and channel connect / publishing / the server-side session bridge remain **deferred**. Mercenta Social itself performs **zero network calls** and claims no connection. (Earlier: Phase E3 catalog is complete and simulated end-to-end…)  The catalog submission path runs through the EXISTING mock-first seam (`createSPApiClientForConnection` → `MockAmazonSPAPIClient`) and now records a canonical submission record with explicit `simulated:true` provenance, persisted through the D4 domain port (memory adapter by default → **nothing durable** while browser Supabase credentials are absent). Go-live for this path = enter real Amazon SP-API credentials in the wizard (**zero code changes**) + deploy the `spapi` Edge Functions + run migration `022_create_catalog_persistence.sql` (RLS, brand-isolation policy, **not executed**). No Amazon outcome is fabricated anywhere: a mock result is labelled SIMULATED in the record, the UI and the audit log, and no ASIN is invented. (Earlier: Stage 26 completion — server-side tenant enforcement is now REAL: `compliance-gate-check` and `catalog-import` derive brand_id exclusively from the verified JWT (never the request body; mismatch → 403), and the live CSV-import client sends the session token. Runtime cross-tenant tests execute in `validate:stage26`; all 24 views smoke-render; layout audit green. **Remaining go-live work is deploy/credential-only** — no unbuilt scope.)

**Policy:** every external integration is built behind a swappable seam (`createSPApiClientForConnection` pattern): a `Mock*Client` runs whenever real credentials are absent; the `Real*Client` activates purely by entering real credentials in the Integrations wizard. **Going live should never require code changes** — only credentials + flipping the connection out of mock mode.

## Integration credentials

| Integration | Currently active | What's needed to go live | Where it's entered | Code changes needed |
|---|---|---|---|---|
| Amazon SP-API | `MockAmazonSPAPIClient` (simulated submissions, PO pool) | Admin registers an app in Amazon Developer Console for the Vendor Central account → LWA Client ID + Secret; one-time OAuth consent | Integrations wizard → **Amazon Selling Partner API** card (real popup path already exists; enter public Client ID, complete consent, Edge Function exchanges + Vault-stores refresh token, `credentials` passed to `createSPApiClientForConnection`) | None (wire stored credential ref into `api.ts` factory call — marked TODO at that call site) |
| Stripe | `MockStripeClient` (`mock:sub-…` ids, dunning path simulated); Billing panel renders fully in "(Mock) mode" | Free Stripe account → test keys today, live keys at launch | Integrations wizard → **Stripe** card (OAuth/test-key path); factory `createStripeClientForConnection` flips to real on a verified connection | None expected |
| DocuSign / PandaDoc | `MockEsignClient` (envelope lifecycle + every-4th decline simulated); Send-for-Signature works end-to-end via factory | Account signup on whichever provider the business holds; free developer sandbox exists for both | Integrations wizard → **E-Signature** card | Deploy `esign-envelope` Edge Function + wire its Vault lookup (`resolveToken`); factory's `getConnection` returns the Vault-backed connection |
| Postmark/SendGrid | `MockMailClient` (simulated hard-bounce on malformed recipients) | Free Postmark/SendGrid trial account + server API token | Integrations wizard → **Transactional Email** card (live test-call already implemented); factory `createMailClient` flips to real | Deploy `send-email` Edge Function + wire its Vault lookup (`resolveToken`) |
| Hunter.io | Not connected | Free Hunter plan (25 verified emails/mo) suffices for dev | Integrations wizard → **Hunter.io** card (live ping implemented) | None |
| OpenRouter | Not connected | OpenRouter account + API key (pay-per-use, no approval process) | Integrations wizard → **OpenRouter** card (live ping implemented) | None |
| Instantly.ai | Reply webhook **SPECIFIED, NOT PRESENT IN THIS REPO** (§M10 correction): `instantly-reply-webhook` (classify → persist → hot-lead flag) is pinned contractually by `scripts/validate-edge-functions.mjs` but the Edge Function does not exist on disk — the client-side classifier (`src/lib/marketing.ts`) and the mocked outbound enrolment are built | Instantly Outreach plan + dedicated cold domain (**not** a subdomain of mercanta.co.uk — deliverability isolation per Stage 10 spec) | Integrations wizard → **Instantly.ai** card; webhook URL configured per-campaign in Instantly | Create + deploy the webhook function + set `INSTANTLY_WEBHOOK_SECRET` |
| **Postiz → Mercenta Social** (full social application, engine v1.47.0) | Engine deployed but **unusable**: API 502 (Temporal missing); `MockPostizClient` in-memory and nothing published; Mercenta side = workspace identity/provisioning/entitlement/isolation only, `engineLinked:false` | **Deployment fixes first:** re-add Temporal; `DISABLE_REGISTRATION=true`; `MAIN_URL`/`FRONTEND_URL` → public URL; move media off container-local storage; add RAM. **Then:** enter the engine URL + API key in the wizard, and deploy the server-side provisioning/session-bridge function | Integrations wizard → **Postiz** card (`api_url`, `api_key`); admin **Mercenta Social** control centre shows state + findings | **None for the Mercenta client seam** (mock → real is credential-only). The **server-side provisioning/session bridge is the one remaining build item** (E7 deferred it deliberately — see the E7 report §9.4) |

**Summary:** only Amazon genuinely requires the admin's own account/approval process. Every other provider can become real today via a free sandbox/test-mode signup, entered through its existing wizard card.

## M13 — Google, company compliance and AI cost controls (15 Sep)

| Item | Currently active | What's needed to go live | Where it's entered | Code changes needed |
|---|---|---|---|---|
| **Google (Drive/Docs/Sheets/Slides/Calendar)** | `MockGoogleClient` behind the same contract (`MOCK-GD-…`, `mock.google.local`, idempotent, every-5th-write failure/retry) + a 22-item workspace plan that runs fully in simulation | Create an OAuth client in Google Cloud Console for `mercentapartners@gmail.com`; enter its PUBLIC id; complete Google's consent flow; then deploy the Google Edge Function that performs the code→token exchange and Vault-stores the refresh token | Super Admin → **Google** wizard (`Connect Google` → the existing `/oauth/callback.html` contract) | **None client-side** — the factory (`createGoogleClientForConnection`) flips to the real client purely on a verified `vault:` connection. Only the server-side exchange function must exist |
| **Companies House (Mercenta's own company records)** | `MockCompaniesHouseClient` read methods return NO invented Mercenta facts (empty officers/PSC/filings, `SIMULATED REGISTRAR` address, `dataSource: 'simulated_registrar'`) | The free-tier Companies House public API key (developer.company-information.service.gov.uk) → real READS of profile/officers/PSC/filing history/charges + real due dates | Integrations → **Companies House** card; Super Admin → **Company** to read the register | **None** — `companiesHouseConnectionCredentials()` resolves the connection; only the existing Edge proxy needs deploying |
| **Companies House authentication code + GOV.UK One Login personal code** | Not stored (the vault shows "not stored") | The founder enters both in Super Admin → **Company**; they are kept as `vault:gov-…` references with a display mask ONLY | Super Admin → **Company** → Government credentials | None. **The value never enters a record, audit entry, metadata, report or the ZIP** |
| **Confirmation statement filing** | `OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED = false`; `fileViaOfficialApi` REFUSES with a truthful reason | The founder files on the official Companies House service, then records the reference in Super Admin → **Company**; a registrar read AFTER the recording sets it to `verified` | Super Admin → **Company** (`src/config/company.ts` for the flag) | Only if an official, documented filing channel is ever connected — then flip the single config flag and add its adapter |
| **HMRC** | READY / **NOT CONNECTED** (`HMRC_READINESS`) | Company VAT registration + Making Tax Digital credentials | Super Admin → **Company** shows the state + blocker | None until credentials exist |
| **Runtime AI / OpenRouter** | Policy + usage log + ceilings active; **no LIVE billing API is connected**, so every cost figure is labelled MANUAL / ESTIMATED / SIMULATED / NOT CONNECTED | OpenRouter key (runtime secret only) — plus the founder's confirmation of the real subscription/hosting prices in `src/config/operatingCosts.ts` | Integrations → **OpenRouter**; Super Admin → **Operating Costs** | None. **DeepSeek V4 Flash is the maximum paid runtime model**; a costlier model cannot be selected |

### Non-credential work that must NOT be forgotten

1. **Rotate the Twilio 2FA recovery code** — it exists in past Git commits, so it must be treated as COMPROMISED (history rewrite is forbidden by the standing rules; rotation is the fix).
2. **Capture Tottenham merchandise ASIN evidence** through the existing Brand Intelligence discovery, so the seeded sports opportunity stops reporting "ASIN-level evidence NOT captured yet".
3. **Founder approval for pricing** — the subscription price, target contribution margin and CAC tolerance are planning inputs flagged `requiresFounderApproval`; they must not be treated as decisions.

## Placeholder business data

| Value | Current placeholder | Real value needed | Lives in |
|---|---|---|---|
| EORI | `GB-EORI-PENDING-REGISTRATION` | Mercenta Partners Ltd's real UK EORI once issued | `src/config/customs.ts` (`MERCENTA_EORI`) |
| UK VAT number | `GB-VAT-PENDING-REGISTRATION` | Real VAT registration number | `src/config/customs.ts` (`MERCENTA_VAT`) |
| Registered address | "Distribution Hub, Northampton" wording | Real registered office address | `src/config/customs.ts` |
| Commission rate / monthly fee | Placeholders flagged in `src/config/commercial.ts` | Commercial sign-off | same file |
| **GS1 company prefix (P6 — ACTIVE)** | `0000000` — declared UNASSIGNED, status `placeholder_unassigned`; every SSCC-18 is generated under it and every printed carton label states `XX-PENDING-GS1-LICENCE` | Mercenta's licensed GS1 company prefix | `src/lib/documents/sscc.ts` (`SSCC_GS1_PREFIX.value`) |
| Carrier markup rates | Demo ledger uses illustrative 5.5% cost / 7% billed | Real corporate DHL / Palletline rate cards | shipping-margin ledger rows |
| Contract rate fields | Flagged placeholders in `lib/agreement.ts` output | Signed commercial terms | same file |

## Structural debt blocking production

0. **Edge Functions (Stage 17 + 21 + 22) — SPECIFIED AND CONTRACT-VALIDATED, BUT NOT PRESENT IN THIS REPOSITORY.**
   **§M11 correction (2026-09-14) — SUPERSEDES the §M10 note below.** The six
   deploy-time functions NOW EXIST IN THIS REPOSITORY:
   `supabase/functions/payouts-transfer`, `catalog-import`,
   `discovery-directory`, `esign-envelope`, `send-email` and
   `instantly-reply-webhook` (alongside the pre-existing `xero-webhook`,
   `xero-token` and `social-session`). `scripts/validate-edge-functions.mjs`
   now runs **46 assertions / 0 failures / 0 skipped** — every function is
   actually checked rather than skipped.
   Each implements authentication from the VERIFIED JWT (never the request
   body), role authorisation, input validation, idempotency where a retry could
   duplicate money or mail, a provider seam that fails closed, unmistakable
   simulation labelling (`mock:…` / `mock_tr_<rail>_…`) with ZERO network calls
   when unconfigured, and an audit row. What remains for each is
   **credentials + deployment only** — no further code.
   The two migrations those functions need were created at the CORRECT
   sequential numbers, **`024_rpc_catalog_import.sql`** and
   **`025_cron_daily_digest.sql`** (the historical `0010_…`/`0011_…` filenames
   referenced below never existed — those numbers are
   `010_create_compliance_docs.sql` and `011_create_messages.sql`). A third
   migration, **`026_harden_deductions_ack_and_messages.sql`**, closes the §23
   database-hardening gaps.
   **§6 payout-rail correction:** `payouts-transfer` pays through **Payoneer
   (DEFAULT)** or **Wise (secondary)** — Founder decision T-1, reconciled in
   code 2026-09-21. Stripe bills the flat monthly
   subscription only and is REFUSED as a payout rail, as is Xero. The previous
   Stripe-transfer contract recorded below is superseded.

**§M10 note (historical — superseded by §M11 above).** This item previously
   stated that
   `/payouts-transfer`, `/catalog-import` (+ the `import_catalog_batch` RPC in
   migration `0010`), `/discovery-directory`, `esign-envelope`, `send-email` and
   `instantly-reply-webhook` "are BUILT". That was **not true of this
   repository**: only three functions exist on disk
   (`supabase/functions/xero-webhook`, `xero-token`, `social-session`), and
   `scripts/validate-edge-functions.mjs` reports all six as absent artefacts
   (36 assertions run / 0 failures / 35 skipped), as do migrations
   `0010_rpc_catalog_import.sql` and `0011_cron_daily_digest.sql`.
   The **client-side seams and mock clients ARE built and simulated**
   (`src/lib/mail/mail.ts`, `src/lib/esign/esign.ts`, `src/lib/billing/payouts.ts`,
   `src/lib/catalog/csvImport.ts`, `src/lib/discovery/*`), and the server-side
   contracts are pinned by the validator, so each function is a
   **deploy-time deliverable with its behaviour already specified**.
   To go live: create + `supabase functions deploy <name>` for each of
   `payouts-transfer`, `catalog-import`, `discovery-directory`,
   `esign-envelope`, `send-email`, `instantly-reply-webhook`; ship the
   `import_catalog_batch` RPC and the `pg_cron` daily-digest schedule
   (`daily-digest`, `'0 7 * * *'`, replacing `<PROJECT_REF>` /
   `<SERVICE_ROLE_KEY>` at deploy); set provider secrets; wire the
   `resolveToken` Vault lookups (service-role → `vault.decrypted_secrets`).
   Instantly: point the campaign's reply webhook at the deployed
   `instantly-reply-webhook` URL (+ `INSTANTLY_WEBHOOK_SECRET`).
   **NOTE:** the two migrations are additionally blocked on a decision — several
   validators and this document pin the migration count at 23 (newest `023_`);
   adding them changes that pinned fact and must be done deliberately.

1. **Demo store collapse (Stage 2):** RESOLVED — COMPLETE as of Stage 20, polish finished Stage 23 (zero direct demoStore imports in views/components; `DemoBrandRow` canonically defined in `src/data/demoData.ts`). Dossiers live in `src/data/regionalDossiers.ts`, context bootstrap state in `src/data/bootstrap.ts`, all entity fixtures in demoStore generated from the canonical `demoData.ts`. Validators consume the same api/demoStore fixture universe the app does; 0007 seed SQL is generated from that dataset.

2. **Secret storage:** integration state persists status-only to localStorage; real secrets must go to Supabase Vault behind Edge Functions before any real credential is entered.
3. **CSV bulk catalog import (Stage 9):** BUILT — `src/lib/catalog/csvImport.ts` (stream-parse → validate → all-or-nothing atomic commit). Mock commit client active; the real `/catalog-import` Edge Function (single Postgres transaction) must be deployed before live use.
4. **Discovery engine (Stage 10):** BUILT on the mock-first seam — `src/lib/discovery/engine.ts` runs directory → OpenRouter research → Companies House enrichment → Hunter email → wording-linted Instantly enrolment end-to-end on mocks, with per-service budget caps (`budget.ts`) enforced before any provider call. Real clients carry correct endpoints (OpenRouter chat completions, Companies House search, Hunter domain-search, Instantly lead-add) and activate by entering keys in their wizard cards; `RealDirectoryClient` additionally requires the `/discovery/directory` Edge Function. Hot-lead reply routing (`handleInboundReply`) wires the previously-dead classifier — real-time notification for hot leads only. No social-media scraping anywhere. Budget caps are placeholders pending sign-off.


3. **RLS runtime test (Stage 7)** never executed against a live project.
4. **Stages 8–16** per STATUS_CHECK.md remain open.

> **STATUS UPDATE (Phase E9, 13 Sep):** the engine now needs the **8 GB resize**
> documented in HANDOFF item 8. On the current 2-vCPU/4 GB droplet Postiz's Temporal
> orchestrator **webpack-bundles a workflow per provider task queue (34)** at startup
> and is OOM-`Killed` in a loop (load 56–65, 33–85 MB free), so queued/scheduled posts
> do not execute. Already mitigated reversibly (swap 2 GB → 4 GB, legacy Rocket.Chat +
> Mongo stopped, `NODE_OPTIONS` heap cap, usertour stopped). Resizing is a **paid,
> irreversible** action → **user action required**:
> `DigitalOcean → Droplets → mercenta-services → Resize → CPU/RAM only → 8 GB`.
> Real channel connect, real publication acceptance and Temporal execution were all
> verified live before this ceiling; a genuine engine defect (Nostr `finalizeEvent`
> Uint8Array) was found and fixed — see `docs/PRODUCT_CONSOLIDATION_PHASEE9_2026-09-13.md`
> and re-apply `scripts/social-sso/engine-patches.mjs` after any engine upgrade.

## Mercenta Social — engine deployment prerequisites (Phase E7, 12 Sep)

> **STATUS UPDATE (Phase E8, 12 Sep):** items **1, 2, 3, 4, 5 and 6 below were FIXED**
> and verified on the deployment (Temporal + its Elasticsearch visibility store
> restored; engine URLs set to the real TLS origin; media on a named volume; 2 GB swap
> added; frame policy replaced with a CSP `frame-ancestors` allow-list; the engine's own
> signup/login is now **403** from the internet). **Item 7's note and the deferred
> server-side bridge are handled elsewhere** — the bridge now EXISTS
> (`supabase/functions/social-session` + `scripts/social-sso/server.mjs`). Still open and
> requiring **user action**: a DNS `A` record for `postiz.mercenta.co.uk → 46.101.75.185`
> (branded hostname + seamless inline embedding) and, optionally, a droplet resize to
> 8 GB. Full record: `docs/PRODUCT_CONSOLIDATION_PHASEE8_2026-09-12.md`.

These are **server-side / deployment operations** on `mercenta-services` (46.101.75.185), verified on 2026-09-12. Mercenta code does not work around any of them; the admin Mercenta Social control centre reports them live.

| # | Item | Evidence | Required action |
|---|---|---|---|
| 1 | **Engine API down (BLOCKING)** | `pm2 logs backend` → `connect ECONNREFUSED ::1:7233` (TemporalRegister); `/api/v1/check-version` → 502 while `/settings` → 200 | Re-add the **Temporal** service to the stack, then restart the engine; verify `/api/*` no longer 502 |
| 2 | **Engine self-registration OPEN (BLOCKING)** | `DISABLE_REGISTRATION=false`; `/auth` renders a registration page | Set `DISABLE_REGISTRATION=true` so no brand (or stranger) can create an engine account outside Mercenta |
| 3 | **Engine external URLs wrong** | `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000` | Point them at the public engine URL (OAuth callbacks, links, embed origin) |
| 4 | **Media storage container-local** | `STORAGE_PROVIDER=local`, `UPLOAD_DIRECTORY=/uploads` | Move to object storage before brands upload media |
| 5 | **Droplet headroom** | 73.7 % RAM of the 4 GB `s-2vcpu-4gb` droplet with Temporal absent | Resize (8 GB was the documented plan) when Temporal returns |
| 6 | **Embedding frame policy** | `scripts/Caddyfile` serves the engine vhost with `X-Frame-Options: DENY` | Allow the Mercenta origin as a frame ancestor before the embedded application can render |
| 7 | **Retired chat containers still running** | `rocketchat` + its mongo container are up on the droplet although Phase D1 removed the product from the platform | **DONE — Phase G1 (2026-09-13).** Server-side cleanup COMPLETE: both containers, the dedicated Mongo volume, both anonymous volumes and both images removed; the two compose services + volume entry deleted from `/root/docker-compose.yml` (stack re-validated with `docker compose config -q`). No rocket/chat/mongo container, volume or image remains, and all 10 active services were verified unaffected. Backup: `/root/rocketchat-removal-backup-20260913/`. This note is kept here, NOT in product runtime strings, because no executable product path may name the retired product. |

**Deferred build item (E7):** a server-side, tenant-scoped **provisioning + session bridge**
(the engine's `/public/v1` developer API called from a server function with a Vault-held key),
so a brand never authenticates separately to the engine. This is the only remaining *code*
piece for a live channel-connect/publish path; it was deliberately not invented in E7 while
the engine API is down.
