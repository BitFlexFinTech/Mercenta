---
# HANDOFF DOCUMENT — Mercenta Partners Platform Build
Last updated: September 14, 2026 (M2 document verification + M6 financial reconciliation + M7 investor demo extended to 24 stages — all BUILT + VERIFIED; M8 documentation sweep and M9 full regression pending)

## WHO I AM:
I'm Tadii. NOT technical. I use Cline to build Mercenta Partners Ltd
(a UK B2B distribution platform). The AI assistant gives me ONE short
prompt at a time. I paste it into Cline (new chat, Act mode). I paste
Cline's output back. AI confirms, gives next prompt.

## CRITICAL WORKFLOW RULES:
1. ONE TASK PER CLINE CHAT. Never combine tasks.
2. ACT MODE only.
3. Prompts must be SHORT and FOCUSED. Never a 200-line mega-prompt.
4. Every prompt ends with: no styling changes, no demo data deletion,
   no commit unless I say so, show git diff --stat, run build, run
   e2e tests, run zip script.
5. If Cline asks a question, I paste it to AI. AI tells me what to answer.
6. If Cline tries to do extra, I say "Stop."
7. Commit before starting new work.
8. If AI makes a mega-prompt, I say: "No. One task. Short prompt."

## WHAT'S BUILT:
### Canonical-model session (13 Sep 2026) — business model reconciled + 2 gaps built
- **`docs/MERCENTA_BUSINESS_MODEL.md` is now CANONICAL** — the single authoritative
  statement of the proxy/distribution model (retail channel → Mercenta → brand and
  back), the hard compliance gate, PO routing, PO-gated shipping, cases, deductions,
  money/VAT/Xero/payout, automation + admin override, providers and testing intent.
  `README.md` rebuilt into a real index; `docs/INTEGRATIONS.md` §10 and
  `PRODUCTION_READINESS.md` updated for the new/changed provider facts.
- **§11 carrier routing, centralised** — NEW `src/config/shipping.ts` +
  `src/lib/shipping/carrierRouting.ts`: international → **DHL**, UK domestic →
  **Palletline**, partnered carrier **only** on Freight Collect. The brand ASN form
  and the admin on-behalf ASN form now BOTH read the rule from this module (their
  local carrier lists are gone). `createShipmentForPO` now enforces the rule AND a
  tenant guard (a brand can only derive a shipment from its OWN eligible PO).
- **§12 shipping commercial model** — NEW `computeShippingCommercials()` in
  `src/lib/shipping/shippingCalculator.ts`: carrier list cost → negotiated discount →
  actual carrier invoice cost → mark-up + surcharge + handling → brand charge →
  VAT (charged / recoverable / payable) → shipping margin → net Mercenta revenue.
  Both sides of the transaction are preserved; all terms are clearly-marked
  placeholders in `src/config/shipping.ts`; nothing hardcodes a 90% mark-up.
- **§15 case review before escalation** — canonical case workflow in
  `src/lib/helpdesk/ticketStore.ts` (`createCase` → `beginCaseReview` → `reviewCase`
  → `escalateCaseToProvider` → `recordProviderCaseResponse` → `resolveCase`/`closeCase`)
  with tenant-scoped read models. A brand case can NEVER reach the retail channel
  without an explicit Mercenta review decision. NEW fail-closed seam
  `src/lib/helpdesk/amazonCaseClient.ts` (Mock = deterministic, no network,
  idempotent; Unknown/other = truthful refusal, never simulated). Exposed in Admin →
  Helpdesk as a "Brand cases — Mercenta review queue" panel.
- **Registry:** `palletline` added to the canonical provider registry
  (`defaultMode: 'available'` — no adapter yet, so it is honestly NOT simulation).
- **NEW validator:** `scripts/validate-canonical-model.mjs` → **34/34 PASS**
  (routing, commercial maths, PO-gated/tenant-scoped shipment, case review gate,
  idempotency, fail-closed provider, failure/recovery, tenant scoping, audit).
- **Gates (this session):** typecheck 0 · eslint 0 · build ✓ · integrity **61/0** ·
  wording **181 files / 0 violations** · canonical-model **34/34** · investor-demo
  validator PASS · targeted Playwright **31 passed / 1 failed** where the single
  failure (`investor-demo` t4) is **PRE-EXISTING** — it fails identically on the
  stashed pre-change tree (verified with `git stash`).

- React/TS/Vite frontend (161 files)
- Supabase (142.93.46.155) — 14 tables + RLS
- 20 Rakazo bots (24.144.86.50) — all demo mode
- Services (46.101.75.185) — Usertour, Postiz. Rocket.Chat was removed from the
  platform in Phase D1 (2026-09-11: panel, mock client/SSO, registry card, nav
  entry, docker-compose service and Caddy vhost deleted). **Phase G1
  (2026-09-13) COMPLETED the server-side cleanup: the retired `rocketchat` +
  `rocketchat-db` (Mongo) containers, their dedicated Mongo volume, their two
  anonymous volumes and both images were removed from `mercenta-services`, the
  two services + volume entry were deleted from `/root/docker-compose.yml`, and
  the stack was re-validated. No rocket/chat/mongo container, volume or image
  remains; all 10 active services were verified unaffected (engine `/api/` 200).
  Backup of the pre-change compose file + inspect JSON:
  `/root/rocketchat-removal-backup-20260913/`. **Never reintroduce Rocket.Chat.**
- Playwright suite (185 passing tests, 30 spec files)
- **Phase E2E — DETERMINISTIC INVESTOR DEMO (2026-09-13)**: ONE runnable,
  zero-network, reset/replayable lifecycle across the whole platform
  (`src/lib/simulation/investorDemo.ts`, 22 stages: application → … → social →
  RBAC → audit → error/recovery), driven from the existing Simulation Control
  Centre by a new "Investor demo" panel (Run / Reset / per-stage OK-BLOCKED-ERROR
  / digest comparison / `network calls: 0`). Verified by
  `node scripts/validate-investor-demo.mjs` (41/41, 0 network calls, identical
  digest on reset→replay) and `e2e/investor-demo.spec.ts` (10/10). A REAL defect
  was fixed: a brand could resolve its OWN dispute outcome ("won") — resolution
  is now an operator-only decision in the domain, the brand sees
  "Awaiting Mercenta operations decision", and the admin console has the real
  won/partial/lost resolution.
- Homepage: "Your brand. The UK market." (NO Amazon mention)
- Partner Login + application gate + link verification
- Legal agreements 4.1 + 4.2 in onboarding
- 9 Usertours
- PO email + auto-shipment + label/ASN stubs
- Penny Pincher (7am, real API data, USD)
- Margaret (6:30am, UK accountant)
- Xero integration (28-day reset, auto-reseed)
- Brand Intelligence REAL-DATA LIFECYCLE (Phase B, 2026-09-10): canonical
  prospect store (12 tracked / 10 active), Admin "Run discovery" + run history,
  candidate de-duplication, disqualify/re-qualify with audit history,
  per-prospect History timeline. Tapatío, Seep, Astonish, Fly By Jing,
  LocknLock, Mike's Hot Honey, Cholula, Valentina, Delphis Eco, Kit & Kin.
- Acquisition pipeline (Phase C, 2026-09-11): the ten REAL Brand Intelligence
  brands are now the active ICP acquisition universe (same prospect identity
  end-to-end, no mock lead list). Admin can: select a real prospect → see the BI
  evidence → prepare an outreach recommendation → MODIFY / APPROVE / REJECT it →
  run a deterministic simulated SEND → get a deterministic simulated RESPONSE →
  create an Opportunity → open the relationship in Brand CRM, where the same
  conversation also appears in Messages (one canonical thread). No live
  credentials needed, no Rakazo, no Postiz, no Rocket.Chat, no external network
  calls in simulation.
- Outreach/provider hardened (Phase D3, 2026-09-11; commit `d3cbbd4`): the transport mode is now
  derived from the canonical integration mode model (`resolveOutreachTransport`)
  instead of UI booleans, and the domain FAILS CLOSED — a transport claiming `live`
  without verified credentials is refused (`PROVIDER_NOT_LIVE`) and audited, so an
  unavailable provider can never be silently treated as live. `UNKNOWN ≠ LIVE`;
  simulation is proven zero-network; missing credentials never break it; human
  approval needs neither Rakazo nor Postiz. Also fixed a real defect: `Date.now()`
  outreach record ids collided within a millisecond and destroyed a revision — ids
  are now workflow-owned. Gates: validator 44/44 + E2E 3/3; full E2E 172/0/4.
  Report: docs/PRODUCT_CONSOLIDATION_PHASED3_2026-09-11.md.
- Brand onboarding workflow (Phase E2, 2026-09-11; commit `08a575c`): the onboarding record is now a
  real stateful workflow with THREE entry points into ONE canonical record —
  acquisition opportunity, approved partner application, and operator-created brand
  (all idempotent, deterministic tenant ids). The brand ACCEPTS its onboarding
  through the existing portal wizard (a distinct, attributed, audited transition),
  and Admin has a new **Onboarding** screen that lists every brand in onboarding with
  its real origin, derives all counts from live state (0 when empty) and operates it
  inline: record acceptance → complete the 5 ordered steps → complete onboarding →
  the brand is operational. Tenant isolation is enforced in the domain (a brand
  session is refused any other tenant's record). FIXED: application-approved brands
  could not enter the portal at all, and manually created brands used a random
  tenant id. Gates: validator 45/45 + E2E 3/3; full E2E 181/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE2_2026-09-11.md.
- Opportunity → brand onboarding hand-off (Phase E1, 2026-09-11; commit `0568e2a`): the missing link
  after an acquisition Opportunity. A qualified/won Opportunity can now BEGIN
  onboarding, which creates the canonical `BrandOnboarding` record keyed by the
  SAME prospect id (`onb-<prospectId>`), derives the brand TENANT id
  (`brand-tapatio` for Tapatío), sets `Opportunity.brandId` (the D4 gap) and
  audits the hand-off. Five strictly-ordered steps
  (profile → legal agreements → banking → carriers → compliance) complete one at a
  time and the brand then becomes OPERATIONAL. Admin sees the status in the
  Acquisition Opportunity panel and in the Brand CRM pre-onboarding relationship
  row. No second brand identity, no second store, no second database, no new
  credentials needed; RBAC is enforced in the domain. Gates: validator 46/46 +
  E2E 3/3; full E2E 178/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE1_2026-09-11.md.
- Persistence / domain hardening (Phase D4, 2026-09-11; commit `eb1e5e8`):
  Phase C/D3 acquisition artefacts (outreach revisions,
  responses, opportunities, events) and the BI lifecycle history (prospect
  updates, runs, change events, snapshots) now mirror through ONE domain
  persistence port (`src/data/domainRepository.ts`) built on the EXISTING Supabase
  repository pattern — no second database. It has a memory adapter (deterministic,
  ZERO network, honest `durable:false`) and a Supabase adapter (idempotent upsert
  on the canonical id, tenant-scoped reads, explicit failures). New migration
  `020_create_acquisition_persistence.sql` (8 tables, RLS + brand-isolation).
  Deterministic, idempotent response ids. Brand CRM now shows an honest
  persistence status. Gates: validator 64/64 + E2E 3/3; full E2E 175/0/4;
  typecheck/lint/build clean. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED4_2026-09-11.md.
  HONEST: Supabase browser credentials are NOT configured in the demo env, so
  nothing is durable there — the UI says `memory-only / not durable` and no
  persistence is claimed.
- BI intelligence preserved through acquisition (Phase D2, 2026-09-11; commit
  `fe0c893`): the acquisition layer now reads a prospect's FULL Brand Intelligence
  by REFERENCE
  (`src/lib/intelligence/prospectIntelligence.ts` — ASINs with per-ASIN metrics,
  contacts, distributors, wholesale, restrictions, growth signals, evidence +
  provenance, the 7 score factors, lifecycle/history) instead of only a narrow
  lead + a prose summary. Outreach revisions store an ids+counts
  `intelligenceRef`; the operator surface shows the canonical intelligence. Also
  fixed a real defect: placeholder outreach addresses now fold diacritics via the
  canonical brand key (`Tapatío` → `hello@tapatio.example`). Gates: validator
  42/42 + E2E 4/4; full E2E 169/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED2_2026-09-11.md.
- Rocket.Chat REMOVED (Phase D1, 2026-09-11; commit `bf31151`): 3 files deleted, registry 19 → 18
  providers, nav/breadcrumb/route gone, docker-compose service + Caddy vhost
  gone, simulation CASE scenario now provider-free. Regression gates:
  `scripts/validate-rocketchat-removal.mjs` (15/15) + `e2e/rocketchat-removal.spec.ts`
  (5/5). Full E2E 165/0/4 · typecheck 0 · lint 0 · build PASS. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED1_2026-09-11.md.
- Catalog / product management (Phase E3, 2026-09-12; commit `f86d8c7`): the
  product lifecycle is now complete and demonstrable end-to-end in SIMULATION —
  product information → COMPLETENESS → compliance gate → READY → SUBMIT (existing
  `api.submitCatalogItem` seam) → SIMULATED PROCESSING → SIMULATED RESULT →
  resulting product state. Built by EXTENDING the existing product/catalog
  architecture: ONE product store, ONE product/submission shape each, ONE
  prerequisite list, ONE submission vocabulary. Brand portal gets a derived
  readiness banner (exactly which fields are missing), per-product
  Submit / Check result, and a Submission column labelled `(sim)`; the admin
  Global Catalog gets a Submission column and an inline readiness/submission
  detail. Tenant isolation + RBAC are enforced IN THE DOMAIN (a foreign tenant is
  refused CROSS_TENANT; a view-only account is refused FORBIDDEN), the compliance
  gate is NOT weakened, and the whole simulated flow makes ZERO external network
  calls (asserted in both the validator and the browser test). Real defects
  fixed: the submission seam "persisted" to a `catalog_submissions` table that no
  migration creates (an unrunnable write, with the tracking id thrown away);
  brand-added products existed only in React state; the add-product form wrote
  `0` for blank dimensions so an empty product looked complete. Gates: new
  validator 65/65 + new E2E spec 4/4; full E2E 185/0/4 (was 181/0/4, 0 new
  failures); typecheck 0 · lint 0 · build PASS; all 47 pre-existing validators
  byte-identical before/after (13 legacy failures are PRE-EXISTING). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE3_2026-09-12.md. HONEST: Supabase browser
  credentials are NOT configured → memory adapter only, migration 022 (and
  020/021) unexecuted, so nothing is durable in the demo env and no persistence is
  claimed.
- Commerce / Amazon-style operational simulation (Phase E4, 2026-09-12): the
  operational commerce lifecycle is now genuinely functional end-to-end in
  SIMULATION — E3-ready product → OPERATIONAL ELIGIBILITY (DERIVED from the E3
  readiness + latest submission, never a second rule set) → SIMULATED PURCHASE
  ORDER → ACKNOWLEDGEMENT → FULFILMENT/SHIPMENT (existing ASN seam, simulated
  carrier) → RECEIVING (existing delivery reconciliation) → SIMULATED INVOICE →
  SIMULATED PAYMENT → EXCEPTIONS/CHARGEBACKS (existing Deduction ledger) →
  DISPUTE/RESOLUTION. ONE new domain module
  (`src/lib/commerce/commerceLifecycle.ts`) with a tenant-pinned `CommerceActor`,
  RBAC + tenant isolation IN THE DOMAIN (foreign tenant → CROSS_TENANT, view-only →
  FORBIDDEN, refusal mutates nothing), deterministic idempotent ids, audit on the
  ONE existing `demoAuditLog`, and the D4 persistence port extended (migration
  `023_create_commerce_persistence.sql`, additive, RLS, brand-isolation, NOT
  executed). A SEPARATE email-free `createSimulatedPurchaseOrder` path was added so
  `createPurchaseOrder`'s real Postmark behaviour is untouched. Every record is
  EXPLICITLY simulated (`mode:'simulation'`, `simulated:true`) and says so
  ("No live provider contacted / No email sent"). Minimal UI: brand console on
  Purchase Orders + admin overview on Retail Pipeline, both `(sim)`-labelled and
  rendered AFTER existing content so no existing browser assertion changed. Gates:
  new validator **108/108** + new E2E spec **4/4**; full E2E **189/0/4** (was
  185/0/4 → 0 new failures); typecheck 0 · lint 0 · build PASS; all 48 legacy
  validators byte-identical (15 legacy failures are PRE-EXISTING, proven in a
  worktree at the pre-E4 commit `657b6b2`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE4_2026-09-12.md.
- Admin operational surfaces (Phase E5, 2026-09-12): the canonical E1–E4 state is
  now coherently ADMIN-facing. NO new surface, store, dashboard, CRM, PO system,
  catalogue, ticketing or billing system was created, and **no migration** was
  added — every gap extended an EXISTING surface. The admin commerce panel
  (`CommerceOperationsPanel`, hosted in Retail Pipeline) is now OPERABLE: it drives
  acknowledge → fulfil → receive → issue simulated invoice → record simulated
  payment and opens an operational case, all through the EXISTING
  `commerceLifecycle` behind the EXISTING `CommerceActor` (RBAC + tenant isolation
  enforced IN THE DOMAIN, refusals surfaced verbatim). Truthful `(sim)` provenance
  added to the admin PO list, Retail Pipeline, Logistics Control and the commerce
  panel (derived from the canonical flags). The admin PO-create action (which
  sends a REAL email) and the catalog availability/price mutations now honour the
  existing staff permission tier — `createPurchaseOrder`'s email implementation is
  UNTOUCHED. TWO REAL DEFECTS FIXED: Logistics Control's PO column always rendered
  `—` (a shipment id was compared against PO ids — now uses the canonical
  `poNumber`); and the "POs in fulfilment" KPI + "Fulfilment in motion" rows
  drilled to Fulfillment Track, which is the brand SCORING surface — they now route
  to Logistics Control. Two ADDITIVE canonical attention groups (rejected catalog
  submissions; issued-unpaid simulated invoices) were added to the dashboard
  without changing existing row ids, KPI ids or section headings. NotificationCenter
  gained ONE canonical `commerce` kind (no second notification store). The
  duplicated latest-submission derivation now uses the canonical
  `demoStore.latestSubmissionForProduct`. Gates: new validator 48/48 + new E2E spec
  4/4; full E2E 193/0/4 (was 189/0/4 → 0 new failures); typecheck 0 · lint 0 ·
  build PASS; all 49 legacy validators byte-identical (15 pre-existing failures
  proven in a worktree at the pre-E5 commit `981332f`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE5_2026-09-12.md.
- Brand operational surfaces (Phase E6, 2026-09-12): parity/canonicality completion
  of the brand side — NOT a redesign and NOT a new brand app. NO new surface, store,
  dashboard, CRM, catalog/PO/ticketing/billing system, lifecycle function or
  navigation, and **no migration**: every change extends an existing file.
  (G1) the brand PO list marks simulated POs `(sim)` from the canonical
  `po.simulated` flag — a Badge only, so no control/DOM order changes and
  `CommerceSimulationPanel` stays last. (G2) the brand dashboard gained two
  APPENDED canonical attention groups — issued-unpaid simulated invoices and
  simulated delivered-awaiting-invoice POs — plus `(sim)` on simulated deduction
  rows; the existing row order, the pinned first `unacked-*` row, all six KPI ids
  and `po-summary-*` are unchanged. (G3) the brand catalog's duplicate last-wins
  submission map was replaced by the canonical
  `demoStore.latestSubmissionForProduct` (canonicality + robustness; the seam is
  idempotent per tenant+sku). (G4) simulated deduction notifications carry `(sim)`
  from the canonical `Deduction.simulated` flag. Gates: new validator 41/41 + new
  E2E spec 5/5; full E2E 198/0/4 (was 193/0/4 → 0 new failures); typecheck 0 ·
  lint 0 · build PASS; the same 15 pre-existing validator failures and all 50
  legacy validators byte-identical (proven in a worktree at the pre-E6 commit
  `d517b17`, tag `mercenta-pre-e6-20260912`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md.
- Review zip script + protection rules + handoff rule
- **Mercenta Social (E7–E9, 2026-09-12/13):** the deployed Postiz engine (v1.47.0) is integrated
  as Mercenta Social with deterministic idempotent per-brand organizations, a fail-closed
  entitlement gate, domain-enforced tenant isolation, a server-side SSO handoff, real TLS, real
  channel connect + a real publication accepted, and a genuine engine defect fixed (Nostr
  `finalizeEvent` Uint8Array). **PARKED/DEFERRED** — the droplet is not resized and the Postiz
  roadmap is not continued. Full record: `PROJECT_STATUS.md` + `docs/PRODUCT_CONSOLIDATION_PHASEE7/E8/E9_*`.
- **Brand deductions ledger (Phase G1, 2026-09-13):** the brand-facing **Deductions Ledger** now
  exists on **Analytics** and **Reports** (`src/components/brand/DeductionsLedger.tsx`), closing
  the documented Tour 5 product gap whose four anchors previously existed in no component at all.
  It reuses the canonical E4 tenant-scoped domain read model + canonical dispute action (brand
  cannot see or mutate another tenant's deductions; refusals shown verbatim), refreshes via the
  canonical store signal, reports real recorded outcomes (no self-declared wins), marks `(sim)`
  honestly, and adds **no new store, workflow, styling or migration**. `tours` t5 is now a genuine
  passing functional + tenant-isolation test. Gates: typecheck 0 · lint 0 · build ✓ · tours 9/9 ·
  **full browser suite 209 passed / 0 failed / 3 skipped** (was 208/0/4).

## WHAT'S LEFT (IN ORDER):
### Canonical-model session (13 Sep) — WHAT REMAINS (honest)
The M-series is NOT complete. Done: **M1** (business-model reconciliation — the
canonical doc + the code/doc contradictions in scope were fixed), **M3** (case
review before channel escalation), **M5** (PO-gated shipping, centralised carrier
routing, shipping commercial model). Verified-as-already-canonical: **M4** (PO
routing/ack/idempotency needed no change).
- **M2 — compliance verification engine (NOT built).** The compliance gate and
  category-aware requirements already exist, but the **document verification
  record** (source / method / timestamp / verifier / result / evidence / failure
  reason), the **`rejected` + `superseded` document states**, versioning, and the
  interchangeable **automated vs manual verification providers** are NOT built.
- **M6 — finance / Xero / payout (NOT built).** Channel payment → PO
  reconciliation, deterministic Xero accounting identity, verified brand payout
  destination, and automated brand payout derived from a **reconciled** payment.
- **M7 — investor demo NOT extended.** Still the 22 canonical stages; the new
  shipping-routing, upfront-shipping-payment and case-escalation steps are not
  yet demo stages.
- **M8 — documentation sweep is PARTIAL.** Canonical doc + README + INTEGRATIONS
  §10 + PRODUCTION_READINESS + PROJECT_STATUS/HANDOFF updated; the remaining
  docs/*.md history and some E2E descriptions were not individually re-read.
- **M9 — full Playwright suite NOT run** this session (targeted specs only: 31
  passed / 1 pre-existing failure).
- **Pre-existing failure to fix separately:** `e2e/investor-demo.spec.ts` t4
  ("brand-pinned actors are refused cross-tenant … IN THE DOMAIN") fails on
  `proof.allStagesOk` — the in-page second run of the demo in the same browser
  session reports fewer than 22 ok stages. It fails identically **before** this
  session's changes, so it is not a regression; it needs its own debugging pass.


NOTE: Development follows the MASTER CONSOLIDATION ROADMAP in
PROJECT_STATUS.md — CORE PRODUCT FIRST, RAKAZO LAST. Rakazo is deliberately
the FINAL phase. The older list below is superseded by that roadmap.
1. [DONE in roadmap] Rakazo iframe in Super Admin — exists; Rakazo bots + real
   workforce integration = FINAL phase (M), NOT current.
2. Namecheap FTP deploy script — DONE (scripts/deploy-demo.sh; demo live).
3. Companies House + HMRC compliance dashboard — DONE (simulation-complete).
4. GO_LIVE.md playbook — pending (production go-live after roadmap).
NEXT in roadmap: PHASE D COMPLETE (D1–D4, 2026-09-11). **PHASE E — CORE PLATFORM
COMPLETION is IN PROGRESS: E1 (opportunity → brand onboarding hand-off) DONE
2026-09-11**, **E2 (brand onboarding workflow) DONE 2026-09-11**,
**E3 (catalog / product management) DONE 2026-09-12** and
**E4 (commerce / Amazon-style operational simulation) DONE 2026-09-12** and
**E5 (admin operational surfaces) DONE 2026-09-12** — a brand can now take a
product from information → completeness → compliance → ready → simulated
submission → simulated result → simulated purchase order → acknowledgement →
fulfilment → receiving → simulated invoice → simulated payment → exception →
dispute, AND an authorised admin can operate that lifecycle from the existing
admin surfaces (Retail Pipeline commerce panel), with tenant isolation, RBAC and
audit enforced in the domain and truthful simulation provenance everywhere, AND
**E6 (brand operational surfaces) DONE 2026-09-12** brings the brand side to parity
(simulated-PO provenance, canonical commerce awareness on the brand dashboard,
canonical latest-submission derivation, deduction notification provenance). Next:
**E7 — embedded Mercenta Social (FULL Postiz application) DONE 2026-09-12** — the
deployed engine (v1.47.0 on the `mercenta-services` droplet) is exposed to every
approved brand as Mercenta Social, with automatic deterministic + idempotent
workspace provisioning, a fail-closed entitlement gate, domain-enforced tenant
isolation, the full 8-module / 35-provider surface, truthful simulation (engine
link NOT established — its API is down), no migration and no second social
platform. Next: **E8 — Mercenta Social is OPERATIONAL (2026-09-12)**: engine Temporal +
its Elasticsearch visibility store + public TLS restored so /api serves instead of 502,
the engine's own signup/login is 403 publicly, and Mercenta's server-side handoff
provisions the brand's deterministic organization and signs it in (idempotent, isolated —
verified live against the engine). Remaining user action: DNS
`postiz.mercenta.co.uk → 46.101.75.185`. Then: **Final UI/UX redesign** — Phase G1 (2026-09-13)
delivered the remaining HONEST product gap inside that phase (the brand deductions ledger behind
Tour 5; full suite 209/0/3).
**PHASE A+B+C+D1 (2026-09-13) — BUILD FORWARD, DONE.** A: ComplianceUploadCard re-verified and
FIXED (both the brand card and the admin Compliance Approvals bumped a dead version counter and
never re-read the docs, so the row badge stayed stale after Upload; the canonical
`reviewGateDocument` gate sync was activated). B: Integration Hub breadth — the canonical
`INTEGRATION_META.category` / `INTEGRATION_CATEGORY_LABELS` / `hasLiveCredentialHint` sources are now
consumed: mode-derived state tiles that filter the list, an actionable attention alert, category
grouping, search + real visible/total count, honest empty state, truthful demo-key note. C: the
hard-skipped access-gate tests closed with real end-to-end coverage (approval → canonical onboarding
record → the brand enters its portal), skips 3 → 2, and two tests that COULD NOT FAIL (`Approve`/
`Reject` matching the status filter chips) repaired. D1: `src/lib/statusPresentation.ts` (single
source of truth for domain status → label + semantic tone + `data-status`), the Applications
decision queue (derived counts, each tile a filter), semantic statuses + honest empty state on
Compliance Approvals, and the brand compliance card on the same statuses.
**PHASE F2 + D3 + D4 (2026-09-13, second session) — DONE.** Commits `76ff520` · `3f14c4a` · `8efc6b4`.
F2: the **integrity audit is GREEN — 61 passed / 0 failed** (was 46/12). Every stale assertion was
repointed at the current architecture (homepage compliant copy + canonical CTA with a no-return guard;
brand-mark check follows the public shell; carrier wiring follows `CarrierShell`; the six account-menu
checks follow `BrandShell`/`AdminShell` plus a new AppShell forwarding assertion) — none were deleted to
make it pass. **`npm run validate:wording` was restored**, and it then failed for real reasons: **53
outward-facing violations** (brand tour copy, BrandIntelligence, the onboarding agreement, outreach
emails) were FIXED to the approved public vocabulary, two further leaks corrected, and four genuinely
internal/admin-only/protected files added to the tool's documented exclusion list with reasons →
`WORDING_LINT_PASS — 176 src files, 0 violations`.
D3/D4: the canonical **`DataTable` was extended properly** (render cells, align, `primary` mobile title,
`hideBelow` progressive disclosure, `rowActions` reachable on desktop AND mobile cards,
`mobile: 'cards' | 'scroll'` intentional mobile strategy, empty/error recovery actions, aria-busy
loading; generic relaxed to `T` so domain types migrate). **Migrated: the brand deductions ledger**
(also removed its fourth hand-rolled status colour map) **and the admin returns-tracking table**.
New `e2e/table-responsive.spec.ts` (3/3) proves table-vs-cards behaviour and zero overflow at
1440/768/375.
Final gates: **full Playwright suite 225 passed / 0 failed / 2 skipped** · typecheck 0 · lint 0 ·
integrity audit 61/0 · wording lint PASS · integrations 37 assertions / 0 failures · migrations
unchanged (23) · baseline `959b4d2` an ancestor.
**NEXT (mechanical now that the primitive exists):** migrate the remaining operational tables
(carrier manifest, product catalogue's 15-column table, BrandReturns, admin audit log, marketing and
prospect tables) onto the extended `DataTable`, then the per-screen density pass (CRM, catalogue,
finance), then Phase G deployment rehearsal on demo.mercenta.co.uk (mercenta.co.uk only via
`GO_LIVE.md`, and only when you say DEPLOY). Social stays PARKED; Rocket.Chat stays retired; Rakazo
stays LAST.

**PHASE D2 + F (2026-09-13) — DONE.** D2: the remaining domain statuses (PO lifecycle, line
acknowledgements, the computed 24-hour ack window, deductions, catalogue submissions, shipments,
onboarding records, returns tracking, PO outages, compliance gate, commission-billing decision) all
render through `src/lib/statusPresentation.ts`; the duplicated sources were DELETED — the brand PO
list's local badge/label maps, RetailPipeline's local `StatusBadge`, OnboardingPipeline's maps,
ReturnsTrackingDashboard's map, BrandSettings' outage map, BrandDashboard's PO maps and
**`STATUS_COLORS` in types.ts**. Two real inconsistencies were eliminated (a deduction `open` rendered
amber on one admin screen and red on another; the same PO status rendered two different label casings),
and three dead status helpers were removed. `status-semantics.spec.ts` is now 6/6 including an
invariant that fails if any `[data-status]` outside the canonical vocabulary appears anywhere on the
brand PO list, the admin Retail Pipeline, the brand dashboard or the carrier manifest.
F: **`GO_LIVE.md` now EXISTS** (the ordered runbook: repo gate → env → migrations/Edge Functions →
credential-only provider swap → deploy → 8-step smoke test → rollback → non-scope), and
`scripts/validate-edge-functions.mjs` **no longer crashes** — it reports absent artefacts as explicit
deploy-time items (8 today) and exits 0 with 37 assertions / 0 failures.
Final gates: typecheck 0 · lint 0 · build OK · **full suite 222 passed / 0 failed / 2 skipped** ·
migrations unchanged (23) · baseline intact.
**NEXT (in order):** repair the 12 stale assertions in `scripts/integrity-audit.mjs` (it still expects
pre-Phase-6 shell routing, the "Get Started" CTA and the removed `validate:wording` script — the exact
list is in PRODUCTION_READINESS.md) → finish the per-screen redesign polish (dashboards/CRM/catalogue/
finance densification, mobile table strategies) → Phase G deployment (demo.mercenta.co.uk rehearsal
first; mercenta.co.uk only through GO_LIVE.md). Social stays PARKED; Rocket.Chat stays removed; Rakazo
stays LAST.

## API KEYS:
HAVE: DO, Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter,
Instantly, Namecheap FTP (all in .env)

WAITING: Amazon SP-API, DHL, Stripe, Xero (sign up now),
Companies House (sign up now), HMRC (few days), Keepa (paid)

## DROPLETS (3, $60/mo):
- mercenta-supabase-demo (142.93.46.155, 2GB, London)
- mercenta-services (46.101.75.185, 4GB, London)
- mercenta-agents-v2 (24.144.86.50, 4GB, SF)
SSH: ~/.ssh/id_ed25519 (Rakazo), ~/.ssh/mercenta_do_id_rsa (Services)

## BOTS (20, demo mode):
Adam, Jess, Marcus, Priya, Kwame (African/Asian, free tools),
Sofia, Elena, Diego (PAUSED), Noor, Leo, Wei, Ava, Ravi, Freya,
Omar, Ingrid, Zara (draft only), Penny Pincher (7am), Margaret (6:30am)

## BUSINESS RULES:
- Public: "UK market" / "UK retail channels" ONLY
- NEVER public: Amazon, Vendor Central, 1P, VaaS
- Internal: "UK Market-as-a-Service"
- 10 categories, African/Asian focus, embassy angle
- Direct + Financed fulfillment

## COMPANY:
- Mercenta Partners Ltd — 1st Formations, waiting on ID verification
- Sole director/shareholder/PSC
- SIC: 46900, 46190, 62012, 52290
- Registered office: London. Residential: Harare, Zimbabwe

## CURRENT STATE:
- demo.mercenta.co.uk = FROZEN (Aug 31)
- Local code = current
- npm run preview = correct version
- Deploy script = NOT YET CREATED

## HOW TO USE THIS DOC:
1. Paste into new AI chat as first message
2. Say: "Continue. I'm on [task]. Give me next prompt."
3. AI gives ONE short prompt. Paste into Cline. Paste output back.
4. NEVER combine prompts. NEVER mega-prompts.
5. Say "Provide Handoff" to Cline to auto-update this file.

---

## EXACT PROMPTS BELOW — Do NOT reword, do NOT combine.

### PROMPT: Rakazo Iframe
This is a Super Admin panel integration task.
Goal: Add a "Bot Workforce" tab that embeds the Rakazo web UI.
1. In SuperAdminPanel.tsx, add tab "Bot Workforce" (after "Accounting").
2. Full-height iframe: src https://24-144-86-50.sslip.io, width 100%,
   height calc(100vh - 120px), border none,
   sandbox "allow-scripts allow-same-origin allow-forms allow-popups"
3. Toolbar: "Open in new tab", "Refresh", green/red status dot.
4. Constant: export const RAKAZO_URL = 'https://24-144-86-50.sslip.io';
5. Do NOT change other tabs.
Rules: No styling changes. No demo data deletion. No commit unless
I say so. Show git diff --stat. Run npm run build. Run relevant e2e.
Run zip script.
### PROMPT: Namecheap FTP Deploy
This is a deploy-to-Namecheap automation task.
Part 1: Add to .env: NAMECHEAP_FTP_HOST: ftp.demo.mercenta.co.uk,
NAMECHEAP_FTP_USER: demo@demo.mercenta.co.uk,
NAMECHEAP_FTP_PASS: ^LV#?4Lh-hzFEi5Q, NAMECHEAP_FTP_PORT: 21
Part 2: Create scripts/deploy-demo.sh:
#!/bin/bash
set -e
echo "Building..."
cd ~/Desktop/Mercenta
npm run build
echo "Deploying..."
source .env
lftp -u "$NAMECHEAP_FTP_USER,$NAMECHEAP_FTP_PASS" -p
"$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST" <<EOF
cd /
mirror -R --delete dist/ .
EOF
echo "Done. Check: https://demo.mercenta.co.uk"
chmod +x scripts/deploy-demo.sh
Part 3: Test it. Confirm live.
Part 4: Add to protection-rules.md: "Do NOT deploy unless I say
'deploy'. Only demo.mercenta.co.uk."
Rules: No source file changes. No commit unless I say so. Show
deploy output. Run zip script.

### PROMPT: CH + HMRC Compliance
This is a compliance dashboard task.
Goal: Add "Compliance" tab to Super Admin (after "Accounting").
Part 1: Create src/lib/compliance/companiesHouseClient.ts
  (Real: api.company-information.service.gov.uk, Basic Auth.
   Mock: "CH not connected")
Part 2: Create src/lib/compliance/hmrcClient.ts
  (Real: api.service.hmrc.gov.uk, OAuth Bearer + fraud headers.
   Mock: "HMRC not connected")
Part 3: Create src/lib/compliance/complianceSync.ts
  (getComplianceDashboard, fileNow)
Part 4: Add to .env: CH_API_KEY, CH_COMPANY_NUMBER, CH_AUTH_CODE,
  HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_MODE: demo
Part 5: Super Admin tab: CH status + CS deadline + filing history.
  HMRC VAT status + next deadline + CT deadline. Deadline tracker
  (90 days, amber <14). "Sync Now" + "File" buttons (disabled demo).
Part 6: Update Margaret + Adam instructions on droplet.
Part 7: e2e/compliance.spec.ts (5 tests: not connected, placeholders,
  sync error, file disabled, history empty)
Rules: No styling. No demo data. Demo mode graceful. No commit
unless I say so. Show diff. Build. E2E. Zip.

### PROMPT: GO_LIVE.md Playbook
This is a go-live playbook creation task.
Create ~/Desktop/Mercenta/GO_LIVE.md with:

# GO LIVE PLAYBOOK
Trigger: Adam receives "Let's go live" → reads this → instructs
Ravi (items 1-8), Ava (item 11), Adam handles 9-12, item 13 verify.

PREREQUISITES (if ANY missing, STOP and report which):
Amazon SP-API (LWA ID + Secret)
DHL Enterprise (API Key + Account)
Stripe (Publishable + Secret)
Xero (Client ID + Secret + Tenant ID)
Keepa (API Key)
Companies House (API Key + Company Number + Auth Code)
HMRC (Client ID + Secret + GG creds)
All brands approved. All tests passing. RLS verified.

ITEMS:
1. SP-API: replace mock, create Edge Functions (auth, poll 15min, ship)
2. DHL: replace label stub, create dhlClient.ts, POST /shipments/v4
3. Stripe: replace mock, wire subscriptions + payouts
4. PandaDoc: replace signing stub, POST /v1/envelopes, webhook
5. Xero: connect, XERO_MODE=production, full reseed
6. Keepa: replace mock research
7. PO cron: */15 * * * *
8. Postiz: re-add Temporal, resize 8GB, Zara DRAFT→SCHEDULED
9. Diego: unpause outreach
10. Remove demo mode from all 20 bots
11. CTA: "See if your brand qualifies" → "Start your onboarding"
12. Deploy to mercenta.co.uk
13. Verify: all tests, build, all flows, Penny/Margaret/Adam live

EXECUTION: 1-8 Ravi, 11 Ava, 9-10 Adam, 12 Adam, 13 All. 4-6 hrs.

Then: Update Adam + Ravi instructions on droplet with GO LIVE
trigger/execution sections. Copy GO_LIVE.md to /srv/rakazo/.
Verify all files exist.
Rules: Do NOT implement go-live items. Only create file. No commit.
Run zip script.
---