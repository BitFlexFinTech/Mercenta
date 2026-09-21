> ## ⚠ HISTORICAL DOCUMENT — NO AUTHORITY (marked 2026-09-21)
>
> This file is a **historical record** from an earlier point in the project (the
> pre-Mercenta "BoxBee" era). It is **NOT an active operating rule** and MUST NOT
> be used to gate, block, delay or reverse current work.
>
> - Canonical operating model: **`.clinerules/operating-model.md`**
> - Current project position: **`PROJECT_STATUS.md`** (+ `HANDOFF.md`)
> - Business invariants: **`.clinerules/mercenta-business-model.md`**
> - Granular capability matrix: **`requirements-registry.json`**
>
> Every finding, count and status below describes the repository **as it was on
> 24 August 2026** and has almost certainly been superseded. Any instruction in
> this file that conflicts with the canonical operating model — a design freeze, a
> "dirty tree means STOP" gate, a >3/>5-file approval gate, a "do not commit"
> rule, or a stale payout-rail / VAT / provider statement — is **EXPIRED** and
> has no effect.

---
# BoxBee — Architecture & Production-Readiness Audit

**Date:** 24 August 2026 · **Scope:** full codebase read (`src/`, `supabase/`, `scripts/`, configs) · **Mode:** report-only, no code changed.
**Verification performed:** `npm run typecheck` (FAILS — 3 errors), `npm run audit` integrity script (34 pass / 1 fail: typecheck).

---

## 1. Executive summary

BoxBee is a well-structured demo-grade prototype with genuinely good foundations: a single category constant mirrored into a DB constraint, a pure and tested fulfillment-scoring engine, a real clause-block contract generator, a hard server-side compliance gate trigger, an honest sandbox-vs-live integration discipline, and a coherent dark design language. However, it is **not production-ready**. The app currently runs almost entirely on in-memory module-level arrays that bypass the Supabase data layer they sit next to; the schema is missing tables the client writes to (`purchase_orders`, `products`, `shipments`, `leads`); the entire discovery/marketing engine specified for launch (OpenRouter grounded discovery, trade-body directories, Hunter verification, Instantly sending, reply webhook, budget caps) does not exist beyond a ping function; onboarding is missing two required steps (working-capital question, fulfillment-track selection); and `tsc` fails today.

### Top 5 most serious issues (ranked)

1. **Two competing "sources of truth" and a broken persistence story.** Most Stage-6+ admin views import `demoStore` arrays directly instead of going through `src/data/api.ts`. Mutations live only in module memory (lost on refresh); several writes target Supabase tables that don't exist in any migration (`purchase_orders`). In live mode the app will half-work: reads from Postgres, mutations silently diverging.
2. **Database schema gaps — STATUS.** This issue **is resolved**: `supabase/migrations/0005_core_tables.sql` defines `products`, `purchase_orders` (with `status`/`commission_amount`/`rejection_reason`/`line_items` columns + CHECK constraints), `shipments` (carrier/stage CHECKs), and `leads` (priority/region/outreach_status CHECKs) — all with row-level security. `api.updatePurchaseOrderStatus` (`src/data/api.ts:262-266`) now writes to the real `purchase_orders` table, and `0011_cron_daily_digest.sql` schedules the digest that queries `leads`. Typecheck is green (the `INTEGRATION_REGISTRY`/`fetchWithTimeout` arity errors were fixed in the 25 Aug Stage-0 session). **Remaining gap:** "Two competing sources of truth + in-memory-only mutations" (`demoStore` vs `api.ts`) is a *separate*, still-open concern tracked under item #1 — most admin views still import `demoStore` directly rather than routing through `api.ts`, so live-mode mutations diverge until that refactor (see §2.6 roadmap, "Pick one source of truth").
3. **Onboarding is missing the working-capital qualifying question and the fulfillment-track selection step.** The wizard has 4 steps (Profile, Legal, Banking, Carriers). `workingCapitalAnswer` is never set by any UI, so the scoring engine's heaviest-weighted input (0–20) can never be populated from onboarding, and the brand never sees/confirms the auto-score recommendation as specified.
4. **The marketing/discovery engine is essentially unbuilt.** No OpenRouter discovery or outreach-copy generation, no wording-safety lint, no ZimTrade/KEPROBA/NEPC/US-CS directories, no Companies House enrichment, no Hunter email finding, no Instantly sending, no reply webhook, no per-service budget caps/spend dashboard. What exists: CSV paste-in, keyword fit-scoring, hot-lead keyword classification (`classifyInboundReply` — defined but never called anywhere).
5. **Explee was never removed.** It still appears as an "Explee AI Client Finder" card on the admin dashboard, a caveat banner in Marketing Hub, a provider option in the integrations registry, and a throwing adapter class — directly contradicting the "fully removed" requirement.

---

## 2. Checklist results

Legend: ✅ Present & correct · 🟡 Present but misplaced/wrong/partial · 🔴 Present but broken/non-functional · ❌ Missing entirely

### Core rules

| Item | Status | Notes |
|---|---|---|
| Brand name from one config value | 🟡 | `src/config/brand.ts` exists and is used by Home/Login/Onboarding/main.tsx. Known documented exception: static `<title>` in `index.html`. But `Header.tsx`, `Sidebar.tsx` and the OnboardingWizard header use no brand identity at all (wizard renders a plain letter "B" block). |
| No user-facing "Amazon Vendor Central" phrasing | 🟡 | "Vendor Central" absent everywhere ✓. But user-facing violations remain: **OnboardingWizard step 2 static agreement says "Amazon 1P channels"** (~line 299) and the wizard tagline says "**Global 1P Wholesale Trade Platform**"; `types.ts` stage label "Live on Amazon 1P" surfaces in carrier/admin views; `lib/agreement.ts` direct-fulfillment clause names "Amazon's UK fulfilment centre" inside a brand-facing contract. The homepage itself is clean. |
| UK-only distribution, EU as disabled flag | ✅ | `EU_MARKET_ENABLED = false` in `config/customs.ts`; disabled EU module rendered under Super Admin panel; homepage is UK-destination only. Lead `region: 'eu'` is brand *origin*, which is allowed. |
| 10 approved categories, single shared constant | ✅ (one gap) | `APPROVED_CATEGORIES` in `types.ts` is consumed by demo data, ICP builder, SP-API transform guard, CRM copy, and mirrored as a DB CHECK constraint. **Gap:** the onboarding wizard never asks for a category at all — `completeOnboarding()` hardcodes `category: 'Home'` ("placeholder until §13 UI lands"). |
| Single source of truth (one schema, one types.ts, no hardcoded duplicates) | 🔴 | See Exec Summary #1/#2. Hardcoded duplicates found: `AdminDashboard.COMPLIANCE_DOCS` (invented brands: Sweet Pea Botanicals etc., plus hardcoded `activeBrands = 12`), `CarrierMonitor.HEALTH` (fabricated uptime/latency), `RetailPipeline.UnlockedPipeline` PO board rows (`PO-8841/8842` inline literals). Two parallel seed systems exist (`data/demoData.ts`+`demoStore.ts` vs `data/seed.ts`+`mockData.ts`) with different brand IDs (`brand-zambezi` vs `seed-brand-zambezi`). |

### Onboarding & Legal

| Item | Status | Notes |
|---|---|---|
| Working-capital qualifying question | ❌ | Not present anywhere in `OnboardingWizard.tsx`. The field exists on `BrandProfile` and drives scoring, but nothing sets it. |
| Fulfillment track selection pre-filled with recommendation, editable | ❌ | No such wizard step. Track is only ever assigned by the (unwired) score engine or admin override. |
| Business info / banking / carrier connections captured | 🟡 | Steps 1–3 cover business + banking; carrier step collects fields but "Test Connection" is a fake `setTimeout(…2000)` success — no API call. |
| Clause-block contract template with track-driven Payment Terms variants | ✅ | `lib/agreement.ts` is exactly the specified design; both variants merge on confirmed track; amendment flow (`createTrackAmendment`) protects signed contracts. Rates are flagged placeholders. |
| Contract Cycle: list, generate-from-template, e-signature, renewals, viewer | 🟡 | List ✅, template generation with live preview ✅ (admin + brand), renewal urgency badges at 60/30/7 ✅ + `contract-renewal-cron` scaffold ✅, document viewer ✅ (brand side renders full clause text; admin has view modal). **E-signature is not functional**: "Create & Send for E-Signature" only flips status based on whether the esignature card shows connected — there is no envelope creation, no signing URL, no webhook. Contracts are more than a status row, but signature is simulated. |

### Compliance

| Item | Status | Notes |
|---|---|---|
| No brand EORI/VAT asks; BoxBee's own from shared config, pre-filled | ✅ | `config/customs.ts` holds EORI/VAT/address/Incoterms; `ComplianceHub` explicitly presents them as Boxbee-handled; all generated docs pull from config. Values are placeholders pending finance. |
| ComplianceDocument gate blocks catalog sync until docs approved | 🟡 | Gate logic (`lib/compliance.ts`) is clean, mirrored client-side and enforced server-side by the `0003_catalog_gate.sql` trigger — good architecture. **But the required list omits `brand_registry_confirmation`**: only 4 of the 5 specified documents gate the brand (distribution agreement, LOA, UKCA, insurance). The 5th type exists in `types.ts` and the DB enum but is required nowhere. Demo compliance-doc patterns likewise never include it. |
| Compliance Approvals opens the actual uploaded document | 🟡 | Admin can open a document preview and approve/reject inline ✓ — but the preview is a **freshly generated UKCA declaration**, not the brand's uploaded file. There is no file upload/storage anywhere; `ComplianceDocument.fileUrl` is never populated. For insurance certs and LOAs there is literally nothing to view. |
| Customs Documentation auto-generated from PO + product + BoxBee EORI/VAT | ✅ | `lib/customsDocs.ts` generates commercial invoice, packing list, UKCA declaration as real HTML documents pre-filled from PO line items + config. Brand reviews/confirms rather than uploads. Genuinely implemented. |

### Fulfillment Track

| Item | Status | Notes |
|---|---|---|
| FulfillmentScore model, six weighted components, ≥65 threshold, 55–74 band | ✅ | `types.ts` + `lib/scoring.ts` match spec exactly; DB generated column mirrors the sum; weights/bands correct; engine is pure and covered by `scripts/validate-stage6.mjs`. |
| Dedicated admin tab: list + brand detail + manual override with logged reason | 🟡 | Tab exists with list filters, detail view (component bars, borderline banner), override control requiring a reason. **But the reason is discarded**: `setBrandTrack(id, track, _reason)` ignores `_reason`, and `FulfillmentTrackPanel` keeps overrides in local `useState` only — nothing persists to `fulfillment_scores.override_reason`. The "logged to audit trail" claim is false in the current build. |

### Purchase Orders

| Item | Status | Notes |
|---|---|---|
| Brand-facing PO tab: list, accept/reject with reason, track branching | ✅ | `BrandPurchaseOrders.tsx` implements all of it: per-brand list, expandable line-item detail, reject-reason modal (enforced), financed-vs-direct branching messaging, shipment creation for direct track. Checked carefully — it is present. |
| PO status changes sync in real time to admin Retail Pipeline | 🟡 | "Sync" works only because every view mutates/reads the same in-memory `demoPurchaseOrders` array. There is no Supabase Realtime, no polling of a server, and state dies on refresh. Also note: the admin "Retail Pipeline" page is a different feature (catalog submissions/commission board) — the PO board there is hardcoded literals when unlocked. The admin views that do reflect brand actions are ShipmentsTerminal/LogisticsControl. |

### Amazon SP-API wiring

| Item | Status | Notes |
|---|---|---|
| Catalog submission pipeline (submit → gate → transform → SP-API → status sync) | 🟡 | `api.submitCatalogItem` enforces required fields + gate before insert ✓; `spapi/transform.ts` builds the vendor payload with a category guard ✓; `spapi/client.ts` submits through an Edge-Function proxy ✓. But the proxy Edge Functions don't exist (no function serves `/catalog-items`), and there is **no submission-status sync implementation** (client method exists; nothing calls it; no scheduled function). |
| PO ingestion via Retail Procurement API creating Commissions automatically | 🟡 | `supabase/functions/poll-purchase-orders` scaffold does exactly this incl. £10k auto-approve split — but it's undeployed scaffold, commission rate duplicated as a literal (`12`) instead of imported config, and depends on missing plumbing. |
| Shipment/invoicing confirmation via relevant endpoints | 🟡 | `confirmShipment` client method exists; no invoicing-confirmation endpoint; nothing invokes these in the UI flow. |

### Billing

| Item | Status | Notes |
|---|---|---|
| Stripe flat monthly subscription (starter/growth) | 🟡 | Tiers (£199/£499 placeholders), Stripe adapter refusing unverified connections, locked/unlocked UI. No checkout session creation anywhere — `startSubscription` POSTs to an Edge Function route that doesn't exist. |
| Commission ledger from real PO events + itemized invoice generator | ✅ (logic) | `draftCommissionFromPO`, `generateInvoice` (itemized, threshold-aware), demo ledger derived from the same PO store. Event-driven wiring only exists in the undeployed cron scaffold. |

### Integrations wizard

| Item | Status | Notes |
|---|---|---|
| Amazon/Stripe/DocuSign-PandaDoc real OAuth flows | 🟡 | The wizard launches a genuine provider popup, captures the authorization code via postMessage, and honestly stops at "Code received — exchange pending". Good honesty, but token exchange, encrypted storage and live test call do not exist (no OAuth callback Edge Function; `public/oauth/` callback page exists). Note: OAuth cards require pasting a public Client ID manually — acceptable (public, not secret). **Not** asking for pasted secrets — that part of the rule is respected. |
| Apollo/Hunter/Instantly/OpenRouter secure key + Test Connection & Save | 🔴 delivery, ✅ pattern | `testCalls.ts` pings OpenRouter/Hunter/Instantly/Apollo against real endpoints and failures surface verbatim — the correct pattern per spec. **But these four integrations have no cards**: `INTEGRATION_REGISTRY` omits them (one of the current typecheck errors), so there is no UI to connect them at all. Keys held in-memory only (Vault storage not wired) — acceptable interim, clearly documented. |
| No raw credentials from `.env` for OAuth providers | ✅ | `.env.example` carries only Supabase anon vars and explicitly forbids provider keys. SP-API/Stripe/email clients take a `secretRef` from the connection record. Rule respected throughout. |

### Demo/Mock mode

| Item | Status | Notes |
|---|---|---|
| DEMO_MODE flag populates modules with realistic seed data | 🟡 | `DEMO_MODE=true` exists but is decorative: `api.ts` switches on `isSupabaseConfigured`, and many components bypass `api.ts` entirely by importing `demoStore`. Seed shapes mostly mirror intended live shapes, but `DemoShipment`/`DemoProduct`/`SeedSubmission` are parallel shapes to the canonical `Shipment`/`Product` types — switching to live will NOT be zero-UI-change as claimed. |
| 8–10 demo brands across all 10 categories with catalogs, POs, contracts, compliance docs, threads, shipments across DHL/FedEx/BAK/Amazon | ✅ | 11 brands covering all 10 categories exactly, 22 products, POs in all 7 states, contracts in varied states, compliance docs rotating patterns, message threads with hot-lead replies, shipments cycling all 4 carriers. Caveats: product "images" are emoji placeholders; compliance doc set omits brand_registry_confirmation. |
| Flag bare "Connect X to enable" modules | 🔴 | Two exist: **Retail Pipeline** (`LockedPipeline`) and **Billing** (`LockedBilling`) show a bare lock screen whenever their integration card isn't verifiably connected — i.e., always, today — instead of demo data, contradicting DEMO_MODE's promise that every module is populated. |

### Admin dashboard module correctness

| Item | Status | Notes |
|---|---|---|
| Logistics Control vs Carrier Integration Monitor distinct | ✅ | Ops view (in-transit/delayed/exceptions grouped by brand+PO, live demo data) vs technical health view (per-carrier API status, uptime, latency, error log). Genuinely different content. Caveat: CarrierMonitor's health data is entirely fabricated/hardcoded constants. |
| Brand CRM real CRUD, all 10 categories | 🟡 | View/edit name, compliance status display, PO/contract history, track override with reason UI, messaging pointer — present; categories come from the shared constant. Defects: override reason discarded (see above), rename doesn't write to Supabase even when configured, "message brand" is only a pointer to Messages. |
| Global Catalog Manager shows owning brand (real join) | ✅ | Joins `demoProducts.brandId` → shared brand rows. (Join is against the same in-memory store, not SQL — fine for demo, must become a real FK join in live mode.) |
| Messages supports open thread + reply on a real send pipeline | ✅ (with caveats) | Thread list + detail + compose wired to `createEmailClient` → `logMessage`; sandbox sends labelled honestly; viewing/logging works disconnected. Caveat: in seed mode replies vanish on refresh (session-only state); compose hidden when email disconnected (a banner explains). |
| 3PL Carrier Terminal visibility + create-on-behalf | ✅ | All shipments/all carriers/all brands, create-on-behalf from PO, amend carrier/status. Same in-memory persistence caveat. |

### Marketing/discovery engine

| Item | Status | Notes |
|---|---|---|
| Explee fully removed | ✅ | Verified via `STAGE11_VALIDATION_PASS` (Aug 2026): `ExpleeAdapter` no longer exported (`typeof ExpleeAdapter === 'undefined'`) and the `explee caveat banner` is absent from `MarketingHub` render. Fresh grep: 0 hits in `src/`; residual prose hits only in audit/report docs + the removal-asserting validator itself. (Issue text §1.5 describes the original defect.) |
| Apollo.io NOT the discovery engine | ✅ | Discovery is CSV import; Apollo appears only as an optional backup provider option and a ping. No Apollo-sourced pipeline built. |
| OpenRouter grounded discovery + trade-body directories + Companies House enrichment | ❌ | Nothing. No fetch-of-URLs grounding, no ZimTrade/KEPROBA/NEPC/US Commercial Service adapters, no Companies House step — none of these names appear anywhere in the codebase. |
| Hunter.io verified email finding/verification | ❌ | Only an account-balance ping for the (missing) integration card. No email finding/verification usage. |
| OpenRouter outreach copy generation + automated wording-safety lint | ❌ | No generation, no lint. (The only "wording safety" in the repo is manual regex checks inside `scripts/validate-*`.) Sequence templates are four hardcoded subject lines. |
| Instantly Outreach-only sending, dedicated cold domain | ❌ | No send path, no domain concept anywhere. |
| Reply webhook → hot-lead human-in-the-loop notification | ❌ | `classifyInboundReply()` implements intent detection but is **never called** (dead code). No webhook endpoint, no real-time notification channel of any kind. Hot-lead badges in MessagesHub render only from pre-seeded flags. |
| Per-service budget caps + running spend dashboard | ❌ | The only budget model is `AdSpendBudget` (Amazon Ads §12) — its hook (`useAdSpendBudgets`) is consumed by **nothing**. No caps, no dashboard for OpenRouter/Hunter/Instantly spend. |
| Discovered leads write into shared Lead/CRM pipeline | ✅ (client-side) | CSV imports enter the same context `leads` array the pipeline views read. Not persisted to any DB (no leads table). |

### Automation / human-in-the-loop

| Item | Status | Notes |
|---|---|---|
| Daily digest (leads, non-urgent replies, borderline scores, renewals, overnight commissions, rejections) | 🔴 | `supabase/functions/daily-digest` scaffold covers all six categories and routes via the email connection. Bugs/gaps: the borderline-score filter is a no-op (`filter(() => true)` after fetching ALL non-overridden scores — the comment admits "filter below" and never does); it queries a `leads` table that doesn't exist; no pg_cron schedule configured anywhere; `DIGEST_TO` env undocumented. |
| Real-time notification reserved for hot-lead replies only | ❌ | Correct principle documented everywhere, but the mechanism doesn't exist (see webhook item above). |
| Auto-approve thresholds (small commission invoices, non-borderline auto-assign, fit-gated enrollment) | ✅ | All three exist as pure, tested logic: £10k `COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP`, `isBorderline` gating in `scoreBrand`, `shouldAutoEnroll` at fit ≥70 from Scraped/Enriched. Enforcement is client/cron-side only. |

### Design system

| Item | Status | Notes |
|---|---|---|
| ink/brass/stamp-red identity + Fraunces/IBM Plex applied platform-wide | 🟡 | Tokens and fonts are correctly defined in `tailwind.config.js` (Fraunces display, IBM Plex Sans/Mono, ink scale, brass, stamp red, parchment). Dark ink surfaces and Plex Mono numerals are consistent across both portals. **But the accent actually used almost everywhere is `neon` purple (#A855F7)**, not brass/stamp-red — brass appears mainly in contract/customs views and the homepage. Default `sans` stack is Inter, not IBM Plex Sans. Net effect: portals read as a generic purple-dark admin, not the ink/brass identity. |
| Hexagon waypoint mark consistent in header/footer/favicon | 🟡 | Logo assets exist (`boxbee-mark-light/dark-bg.svg`, lockup) and are used on the **homepage only**. App header/sidebar have no logo at all; OnboardingWizard substitutes a letter-"B" square; favicons exist (`favicon.svg`, 32px, apple-touch). |

### General production-readiness

**Security**
- ✅ No secrets committed; `.env.example` empty of provider creds; anon-key-only browser client; edge functions use service-role env vars.
- ✅ Server-side enforcement where it counts most: category enum is a DB CHECK; compliance gate is a Security Definer trigger on `catalog_submissions`.
- 🟡 RLS is enabled on all tables with owner-read policies, but **there are no staff/admin policies** — admin access is a client-side role picked at login. In live mode users can't read each other's rows (good), but there is no admin data path except service-role functions, and the Super Admin gate (`isSuperAdmin ? … : AccessDenied`) is purely cosmetic.
- 🟡 Integration connection *status/metadata* persists to localStorage (keys don't — in-memory only), but metadata includes items like `codePreview`.

**Error handling / loading / empty states**
- Mixed. Good: BrandPurchaseOrders, ContractsAdminPanel, MessagesHub, ComplianceApprovals have explicit empty states; query consumers default `?? []`. Weak: most `useBrands()` consumers render nothing during load; `queryOrSeed` throws raw `[api] table: message` errors with no error boundary; direct `demoStore` readers cannot fail at all (which also means they can't reflect server reality).

**Type safety**
- 🔴 `tsc` fails today (3 errors, listed in Exec Summary #2). Beyond that: `DemoBrandRow.profile` collapses the full `BrandProfile` to `{businessName}`; `DemoShipment` vs `Shipment` are incompatible shapes for the same concept; demo commissions store `poNumber` in `purchaseOrderId`; `api.ts` casts Supabase rows blindly (`as T[]`). Drift between `types.ts` and the DB is structural (missing tables), not just cosmetic.

**Testing**
- 🟡 Genuinely good coverage of the money/compliance-critical *pure* logic via 16 custom `scripts/validate-*.mjs` suites (scoring incl. borderline band, compliance gate, clause variants, customs docs, marketing fit/enroll, invoice generation, SSR render checks) plus `scripts/integrity-audit.mjs`. But: no standard test runner or CI, the suite is currently red (typecheck), and nothing tests Edge Functions or DB triggers.

## 3. Structural / file-organization findings

1. **Dual seed universes.** `src/data/demoStore.ts` (+`demoData.ts`) powers Stage-6+ views; `src/data/seed.ts` (+`mockData.ts`, 691 lines) powers the older context-based layer and validate scripts. Different brand IDs for the "same" brands (`brand-zambezi` vs `seed-brand-zambezi`); `SeedSubmission` defined twice. Each layer's header comment claims to be the single source of truth.
2. **The api-layer rule is widely violated.** `api.ts`'s own header says consumers must never touch mock/supabase directly; `LogisticsControl`, `ShipmentsTerminal`, `CatalogManagerAdmin`, `BrandCRM`, `ComplianceHub`, and partially `FulfillmentTrack` all import `demoStore` directly.
3. **Orphans/dead code.** `components/brand/BrandContractProbe.tsx` (imported nowhere); `classifyInboundReply` never called; `useAdSpendBudgets` unused; `fetchShipmentsAll`/`fetchCatalogWithBrands` defined but unused by the views that need them (they read demoStore instead); `void Ship;` suppression hack at the bottom of `LogisticsControl.tsx`.
4. **Duplicated constants across boundaries.** £10k threshold and 12% rate re-declared as literals in `poll-purchase-orders/index.ts` despite `config/commercial.ts` existing (the file even says "keep in sync"); REQUIRED_DOCUMENT_TYPES duplicated in three places (client lib, gate-check function, SQL trigger).
5. **`GlobalStateContext` mixes eras.** It still owns shipments/products/leads/staff from `mockData` while newer features live in React Query + demoStore; `activateDemo` swaps whole dossiers into the same state the portals read.
6. **`App.tsx` nav mismatch.** ADMIN_NAV's `purchase_orders_admin` renders `ShipmentsTerminal` (a shipment terminal, not a PO view); there is no admin PO list distinct from Retail Pipeline's hardcoded board.
7. **`scripts/` grows unboundedly.** 16 near-identical ad-hoc validators with copy-pasted Vite SSR boilerplate; the `validate-review-s*.mjs` set duplicates checks now covered by `integrity-audit.mjs`.

## 4. Prioritized punch list (hand to an engineer in this order)

1. **Fix the red build:** add `openrouter`/`hunter`/`instantly` entries to `INTEGRATION_REGISTRY` (+ `INTEGRATION_ORDER`); fix the two `pingHunter`/`pingInstantly` `fetchWithTimeout` calls (missing init arg). Re-run `npm run typecheck` until green.
2. **Add the missing DB migrations:** `purchase_orders`, `products`, `shipments`, `leads` — FKs to `brands`, RLS owner policies, enums matching `src/types.ts`. Then make `updatePurchaseOrderStatus`/`createShipmentForPO` fail loudly instead of best-effort when Supabase writes fail.
3. **Pick one source of truth.** Route every admin view through `src/data/api.ts` (remove direct `demoStore` imports from components), migrate `GlobalStateContext` off `mockData.ts`, unify brand IDs, delete the legacy seed layer.
4. **Add the two missing onboarding steps:** working-capital question (yes/partially/no → `workingCapitalAnswer`), then a fulfillment-track confirmation step pre-filled from `scoreBrand()` output (editable). Remove the `category: 'Home'` placeholder — ask category on step 1 against `APPROVED_CATEGORIES`.
5. **Add `brand_registry_confirmation` to `REQUIRED_DOCUMENT_TYPES`** in all three places (client lib, compliance-gate-check function, SQL trigger) and to the demo compliance patterns.
6. **Persist overrides and reasons:** make `setBrandTrack` accept/store the reason; wire `FulfillmentTrackPanel` overrides to the API/DB (`manual_override`, `override_reason`); same for CRM rename and compliance-status changes.
7. **Scrub remaining unsafe wording:** OnboardingWizard step-2 static agreement ("Amazon 1P channels") — replace with the clause-block renderer already in `lib/agreement.ts`; fix the "Global 1P Wholesale Trade Platform" tagline; rename STAGE label "Live on Amazon 1P".
8. **Remove Explee everywhere** (AdminDashboard card → point at Marketing Hub; MarketingHub banner; `ExpleeAdapter`; registry option).
9. **Give Retail Pipeline and Billing demo-mode content** instead of the bare "Connect X to enable" screens while sandbox/disconnected.
10. **Replace the fake carrier "Test Connection"** in OnboardingWizard step 4 with an honest saved state or the real test-call pattern from `testCalls.ts`.
11. **Make Compliance Approvals view real files:** add upload (Supabase Storage) populating `fileUrl`; preview the stored file; keep the generated UKCA doc as a separate artifact.
12. **Build the discovery engine to spec:** trade-body directory fetchers (ZimTrade, KEPROBA, NEPC, US CS) → OpenRouter grounded extraction against fetched URLs → Companies House enrichment (UK-only) → Hunter verification → shared `leads` table. Add the automated wording-safety lint on generated outreach before campaign attach.
13. **Wire Instantly sending + reply webhook:** dispatch via Instantly outreach API on a dedicated cold domain; inbound webhook route → `classifyInboundReply` → `requiresHuman` + real-time hot-lead notify; everything else batched into the digest.
14. **Fix daily-digest bugs:** real 55–74 filter using `total_score`; gate/remove the `leads` query until that table exists; document `DIGEST_TO`; add pg_cron schedule; import thresholds from config rather than duplicating literals.
15. **Real e-signature + Stripe checkout:** implement the Edge Functions behind the `esignature` send and `subscriptions` routes — until then change button labels so they don't imply a signature was sent or a subscription started.
16. **Budget caps & spend dashboard** per marketing service; render the existing-but-unused AdSpend data or delete it.
17. **Design-token pass:** swap `neon` purple accents to brass/stamp tokens in portal chrome, switch `font-sans` to IBM Plex Sans, put the hexagon mark in Header/Sidebar and the wizard.
18. **Add an admin security story:** staff roles table + RLS policies, or route all admin reads through service-role functions; stop relying on client-side role selection.
19. **Adopt vitest** around `lib/scoring`, `lib/compliance`, `lib/billing/invoice`, `lib/marketing`, wired into CI; fold the 16 validate scripts into it or archive them.
20. **Cleanup:** delete `BrandContractProbe.tsx`, the `void Ship` hack, unused hooks/adapters; reconcile `DemoShipment`/`DemoProduct` shapes with canonical types.

---

*End of report. No code was modified in this session.*







