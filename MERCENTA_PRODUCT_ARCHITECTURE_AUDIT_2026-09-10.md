# MERCENTA PRODUCT ARCHITECTURE AUDIT — 2026-09-10

> AUDIT ONLY. No product changes were made. No source, config, schema, test, prompt, or provider files were modified.
> Every fact below is tagged with its evidence class:
> **CODE** = verified directly in source · **UI** = verified in the running app (Playwright/browser) · **E2E** = verified by the accredited suite · **DOC** = documented somewhere in the repo but not verified · **PARTIAL** = partially true · **UNKNOWN** = cannot be determined from this repository.
> Inferences are labelled *(inference)* and kept separate from facts.

---

## 1. EXECUTIVE SUMMARY

MERCENTA at HEAD `9915656` (branch `redesign/foundation`) is a **simulation-complete demo product**: a Vite/React frontend with an in-browser domain/data layer, deterministic mock providers behind real-provider seams, a 147/4/0 Playwright suite, a production green build, and four portals (Marketing/Home, Brand, Admin, Carrier). The core commercial workflow — onboarding → compliance gate → catalog → PO lifecycle → fulfilment/shipment → returns → deductions/disputes → billing/contracts → notifications/helpdesk — is genuinely wired and demonstrable end-to-end in simulation.

The three headline unknowns in the commissioning brief resolve as follows:

- **Rakazo is not an AI-workforce layer inside MERCENTA.** It is a single read-only iframe in Super Admin pointing at an external self-hosted droplet (`24.144.86.50`), plus 20 bots that live *outside this repository* (documented only in `HANDOFF.md`). The repo contains zero Rakazo bots, zero prompts, zero tools, zero task/approval queues, zero agent activity, and no Rakazo integration-registry entry. Nothing in the MERCENTA domain workflow invokes, is invoked by, or depends on Rakazo.
- **Brand Intelligence and ICP are two separate, disconnected mock/seed pipelines.** Both exist; neither consumes the other; neither has persistence; neither has an end-to-end hand-off into outreach or CRM.
- **The acquisition/outreach chain is implemented only in fragments.** Several stages (discovery, ICP scoring, sequencing) are wired inside Admin → Marketing against leads; Brand Intelligence is an island with no downstream actions; there is no Opportunity entity; reply routing and WhatsApp escalation exist as library code with **zero callers**.

### 1.1 Highest-value findings (facts, not recommendations)

| # | Finding | Evidence | Class |
|---|---|---|---|
| 1 | Rakazo has no first-party client/adapter; the platform is fully independent of it | Only `RakazoPanel.tsx`, `SuperAdminPanel.tsx` tab, `e2e/rakazo.spec.ts`, `VITE_RAKAZO_URL`, one line in `docs/INTEGRATIONS.md` | CODE/UI/E2E |
| 2 | No Rakazo bot/agent/department/task/approval code exists anywhere in this repo | Repo-wide grep; no `lib/rakazo*`, no bot entities in `src/types.ts` | CODE |
| 3 | Brand Intelligence is seed-only, recomputed on every load, no persistence, no actions | `brandIntelligenceClient.ts` always returns `MockClient`; panel imports only seed files | CODE/UI |
| 4 | Brand Intelligence → ICP → outreach → CRM is NOT connected | No cross-imports, no shared entity, no route/action between them | CODE |
| 5 | "Human Needed"/"Human needed" status strings do not exist in the codebase | 0 grep hits (case-insensitive variants) | CODE |
| 6 | Rocket.Chat real client is never instantiated; `getRocketChatClient()` ignores credentials and returns the mock | `rocketChatClient.ts` factory body; no `RealRocketChatClient` class exists | CODE |
| 7 | Postiz real client is unreachable from its own panel (always passes `apiKey: ''`) | `PostizAdminPanel.tsx:39` + factory requiring both url and key | CODE |
| 8 | Inbound-reply routing, WhatsApp escalation, and digest builders have no production caller | grep across `src/` + `supabase/` | CODE |
| 9 | Dashboards (Admin/Brand) are real-data-derived; Marketing campaign stats and Monitoring health are fabricated/seed | `AdminDashboard.tsx`, `BrandDashboard.tsx`, `MarketingHub.tsx`, `MonitoringDashboard.tsx` | CODE/UI |
| 10 | Full suite at HEAD: 147 passed / 4 skipped / 0 failed; `npm run typecheck` and `npm run build` green; `npm run lint` green | executed this session | E2E |

## 2. EXACT CURRENT BUILD STATE

| Item | Value | Evidence |
|---|---|---|
| Branch | `redesign/foundation` | `git branch --show-current` |
| HEAD | `991565689216278dfb72d48288cfd35d73fdf1d8` | `git rev-parse HEAD` |
| HEAD subject | `docs: record final simulation readiness — provider matrix, workflow matrix, mock/live credential architecture, scenario + skip classifications` | git log |
| Working tree | 3 pre-existing modified non-source files (`Review Zip/mercenta-review.zip`, `playwright-report/index.html`, `test-results/.last-run.json`) + pre-existing untracked forensic artifacts (`design/`, `forensic-captures/`, `nohup.out`, `scripts/forensic-*.cjs/mjs`, `scripts/test_write.txt`, `test-screenshots/`). No source file modified this session | git status/diff |
| Baseline/tag | `mercenta-baseline-before-redesign-20260907` → `959b4d2` present | `git tag -l` |
| Latest simulation/provider work at HEAD | DHL + Companies House + HMRC adapter trios, 9 scenarios, Integrations provider control plane, Super Admin Compliance tab — all present and E2E-verified this session | `src/lib/dhl`, `src/lib/compliance`, `src/integrations`, e2e run |
| Typecheck | `npm run typecheck` → **0 errors** | executed, exit 0 |
| Lint | `npm run lint` → **0 errors** | executed, exit 0 |
| Build | `npm run build` → **✓ built in 2.35s** | executed, exit 0 |
| Accredited E2E suite | **147 passed / 4 skipped / 0 failed** (4.1 min, workers=4) | executed |
| Rakazo spec | **3/3 passed** | executed |
| UI probes (temp, since removed) | Brand Intelligence table renders 10 rows; Marketing ICP builder renders; Brand "Market Intel" renders tenant-scoped; Postiz/Rocket.Chat/WhatsApp admin panels render | executed |

**Simulation-state source of truth** (`src/integrations/registry.ts`): 19 registered providers. `amazon_sp_api`, `stripe`, `usertour`, `rocketchat`, `dhl`, `xero`, `companies_house`, `hmrc` default `simulation`; `amazon_ads`, `esignature`, `email`, `lead_sourcing`, `openrouter`, `hunter`, `instantly`, `keepa`, `firecrawl`, `twilio_whatsapp`, `postiz` default `available`. `Rakazo` is not in the registry.

### 2.1 Documentation vs code cross-check

| Doc claim | Reality | Class |
|---|---|---|
| `PROJECT_STATUS.md §1b`: "20 registry integrations" | **Registry has 19 IDs** (15 original + dhl + xero + companies_house + hmrc). Possible miscount. | CODE |
| `docs/INTEGRATIONS.md §2`: "Rakazo — RakazoPanel iframe into self-hosted bots; VITE_RAKAZO_URL" | Verified accurate. | CODE |
| `docs/INTEGRATIONS.md §1`: 15 integrations | Accurate as the pre-Phase-4 set. | CODE |
| `STATUS_CHECK.md`: "supabase/functions/event-feed/index.ts (authenticated API)" | **Contradicted** — `supabase/functions/` contains only `xero-token` and `xero-webhook`. The event-feed Edge Function does not exist in this repo. | CODE |
| `PRODUCTION_READINESS.md`: hot-lead reply routing "wires the previously-dead classifier" | **Contradicted** — `handleInboundReply` has no caller in src or supabase. | CODE |
| `PROJECT_STATUS.md` (Phase 7A): tsc red, 27 errors in Xero/outreach files | **Stale** — `npm run typecheck` exits 0 at HEAD; lint exits 0. | executed |
| `HANDOFF.md`: 20 Rakazo bots on droplet | **Not verifiable from repo** — no bot definitions, prompts, or config are in the repository. | DOC only |
| `AUDIT_REPORT.md` (older audit): Explee still present | **Stale** — no `explee` references found in current src. | CODE |

---

## 3. CURRENT PORTAL / NAVIGATION MAP

Navigation is defined per portal in `src/components/layout/{Brand,Admin,Carrier}Shell.tsx` (section/group → item → view id). Views are routed inside each shell; there are no URL routes (single-page state-switch via `App.tsx`).

### 3.1 Brand portal (`BrandShell.tsx`)
| Section | Item → view | Component |
|---|---|---|
| Overview | Dashboard | BrandDashboard |
| Catalogue | Product Catalog | ProductCatalog |
| Commerce | Purchase Orders · Returns | BrandPurchaseOrders · BrandReturns |
| Logistics | Inbound Shipments | LogisticsHub |
| Compliance | Onboarding & Legal · UK Compliance · Contracts | OnboardingSummary/OnboardingWizard · ComplianceHub · BrandContractView |
| Insights | Analytics · Market Intel · Reports | SalesAnalytics · BrandIntelligence · BrandReports |
| Account | Documents & Account · Support & Team · Social Accounts · Settings | BrandSelfService · BrandTeamMessages · BrandSocialConnect · BrandSettings |
| Floating | LiveChatWidget · TourLoader · UsertourBrandBridge | (always mounted in brand env) |

### 3.2 Admin portal (`AdminShell.tsx`)
| Section | Item → view | Component | Super-only (render guard) |
|---|---|---|---|
| Overview | Overview | AdminDashboard | – |
| Brands | Brand CRM · Marketing · Brand Intelligence | BrandCRM · MarketingHub · BrandIntelligencePanel | – |
| Catalogue | Global Catalog | CatalogManagerAdmin | – |
| Commerce | Fulfillment Track · Retail Pipeline · Purchase Orders · Returns Tracking | FulfillmentTrackPanel · RetailPipelinePanel · AdminPurchaseOrderList · ReturnsTrackingDashboard | – |
| Finance | Billing · Contract Cycle | BillingPanel · ContractsAdminPanel | – |
| Logistics | Logistics Control · Carrier Monitor | LogisticsControl · CarrierIntegrationMonitor | – |
| Compliance | Compliance Approvals | ComplianceApprovals | – |
| Communications | Messages | MessagesHub | – |
| Support | Helpdesk | HelpdeskDashboard | – |
| Monitoring | Monitoring | MonitoringDashboard | – |
| Administration | Super Admin · Audit Log · Onboarding Tours | SuperAdminPanel · AdminAuditLog · UsertourAdminPanel | super ✓, super ✓, all-admin |
| Integrations | Integration Settings · Rocket.Chat · Social Media · WhatsApp | IntegrationsPanel · RocketChatAdminPanel · PostizAdminPanel · WhatsAppAdminPanel | super ✓ |

> RBAC note: `VIEW_ALLOWLIST.admin_staff` (`src/lib/auth/rbac.ts`) does NOT include `brand_intelligence`, `super_admin`, `audit_log`, `integrations`, `rocketchat`, `postiz`, `whatsapp`. Non-super staff therefore never see Brand Intelligence or the provider panels; links that reach them render an AccessDenied view.

### 3.3 Super Admin panel tabs (`SuperAdminPanel.tsx`)
Staff & RBAC · Applications · Accounting · **Rakazo** · Homepage Editor · Product Research · Manufacturer Sourcing · Grants & Investors · Investor Pitch · Bank Financing · Brand Intelligence · Simulation · Compliance · Design System.

### 3.4 Carrier portal (`CarrierShell.tsx`)
Manifest Management (CarrierDashboard) · BAK Logistics Hub (BakLogistics) · API Request Auditor (CarrierDashboard auditor view). Wrapped in IntegrationsProvider (carrier DHL simulation control).

### 3.5 Marketing/public (`HomeShell.tsx` → `Home.tsx`)
Home · For Brands · How It Works · UK Market Access · FAQ · Privacy · Terms · Partner Login / brand application. Homepage is content-model-driven (`homepageContent.ts`), editable + publishable via Super Admin → Homepage Editor.

## 4. CAPABILITY INVENTORY (by capability, not by screen)

Format: **name** — portal/nav — status — one-line evidence. Full matrix in §25A.

| Capability | Portal / nav | Actual status | Key evidence |
|---|---|---|---|
| Marketing/public site | Public | **WORKING** (content-model-driven, editable) | Home.tsx + homepageContent.ts + HomepageEditor |
| Authentication / one-click demo | Public → all portals | **WORKING** (demo), login gate active | Login.tsx, GlobalStateContext signIn/activateDemoBrand; E2E proves all 43 previously-blocked logins |
| Brand application / access gate | Public → Admin → Applications | **WORKING** (approve/reject/request-info/flag; manual create) | ApplicationsPanel + e2e/access-gate (6 pass/3 skip) |
| Brand onboarding | Brand | **WORKING** (6-step wizard, working-capital, agreements 4.1/4.2, compliance gate) | OnboardingWizard, GlobalStateContext.completeOnboarding, e2e/onboarding, legal-agreements |
| Brand portal | Brand | **WORKING** (real tenant-scoped data) | BrandShell, BrandDashboard; E2E multi-tenant |
| Admin portal | Admin | **WORKING** | AdminShell, AdminDashboard |
| Super Admin | Admin | **WORKING** | SuperAdminPanel + 14 tabs |
| Carrier portal | Carrier | **WORKING** (simulation) | CarrierShell, CarrierDashboard + DHL terminal sim |
| Dashboards (Admin/Brand) | — | **WORKING** (real derived data) | AdminDashboard/BrandDashboard; E2E dashboard.spec |
| Analytics (brand Sales Analytics) | Brand → Insights | **WORKING** (real PO-derived) | SalesAnalytics |
| Catalog (brand + admin global) | Brand/Admin | **WORKING** (gate-locked, CSV import, SP-API sim) | ProductCatalog, CatalogManagerAdmin, CsvCatalogImport |
| Compliance (UK) | Brand/Admin | **WORKING** (gate + approvals + Super Admin CH/HMRC sim) | ComplianceHub, ComplianceApprovals, CompliancePanel; e2e compliance-sim |
| Purchase Orders | Brand/Admin | **WORKING** (lifecycle + ack + auto-shipment + labels/ASN) | api.ts PO functions; e2e po-lifecycle, shipment-asn |
| Fulfilment / scoring | Admin | **WORKING** (55-74 borderline review, override) | FulfillmentTrack types + applyFulfillmentOverride |
| Logistics / shipments (incl. DHL sim) | Brand/Admin/Carrier | **WORKING** (simulation) | dhl domain + mock; e2e simulation-control |
| Returns tracking | Brand/Admin | **WORKING** (seeded + reconcile) | BrandReturns, ReturnsTrackingDashboard, warehouse/returnsTracking |
| Deductions / disputes | Admin | **PARTIAL** (backend + billing surface; Tour-5 UI surface absent) | Deduction/Dispute types, api disputeDeduction/recordDisputeOutcome; e2e deductions/disputes mostly skipped |
| Contracts / esign | Brand/Admin | **WORKING** (generate, send, sign-sim, renewals) | lib/agreement, lib/esign, ContractsAdminPanel |
| Billing (Stripe sim) | Admin | **WORKING** (mock Stripe + invoices + remittance) | BillingPanel, lib/billing/*; e2e billing 4/0/0 |
| Reconciliation | Admin | **PARTIAL** (commission/margin/deduction math + CSV; no payment gateway ops) | BillingPanel + generateInvoice/Remittance |
| Support / helpdesk | Admin | **WORKING** (tickets, SLA, assign, AI-suggestion mock) | HelpdeskDashboard, ticketStore |
| Messaging (native) | Admin/Brand | **WORKING** (canonical log + threads + live chat + mail sandbox) | logMessage, MessagesHub, LiveChatWidget, BrandComm |
| Notifications | Admin/Brand | **WORKING** (derived "needs attention" + nav targets) | NotificationCenter; e2e notifications (5 skipped) |
| CRM (Brand CRM) | Admin | **WORKING** (po/documents/agreements/history/comm + tasks/notes/timeline depth) | BrandCRM, BrandCrmDepth, crmStore; e2e crm 3/0/3 |
| Brand Intelligence | Admin + Super Admin + Brand "Market Intel" | **PARTIAL/UI-inert** (seed-only, no actions, no persistence) | §5 deep audit |
| Market Intelligence (brand) | Brand → Market Intel | **WORKING as display**; same engine, category-filtered seed | BrandIntelligence.tsx; UI probe PASS |
| ICP + lead qualification | Admin → Marketing | **WORKING in-session** (no persistence) | MarketingHub; §5 ICP audit |
| Lead sourcing / discovery | Admin → Marketing | **PARTIAL** (CSV + mock pipeline; real clients not reachable from UI) | MarketingHub, discovery/engine |
| Outreach generation | — | **ORPHANED LIB** (outreachGenerator not imported by any component) | grep |
| Social / Postiz | Admin + Brand | **MOCK-ONLY presenter**; real client unreachable | §5 Postiz audit |
| Rocket.Chat | Admin | **MOCK-ONLY**; real client never instantiated | §5 RC audit |
| WhatsApp escalation | Admin | **MOCK-ONLY, zero callers** | whatsAppEscalation |
| Email (Postmark/SendGrid) | Admin/Brand | **WORKING partially**: sandbox everywhere; real Postmark only used by PO creation when key present | api.ts:634, BrandComm |
| Monitoring | Admin | **PARTIAL** (fabricated mock health checks + real OpenRouter triage fallback) | MonitoringDashboard, alertTriage |
| Audit Log | Admin (super) | **WORKING** (audit_log rows + pagination + filters) | AdminAuditLog, fetchAuditLogPaginated |
| AI/automation | Multiple | **LIBRARY-GRADE** (auto-approve, digest, triage, discovery scoring all have zero or test-only callers in UI) | §5 AI governance |
| Tours / onboarding guides | Brand + Admin | **WORKING** (9 tours; Super Admin editor + brand engine) | tourDefinitions, TourEngine, UsertourAdminPanel |
| Reports | Brand | **WORKING** (real PO-derived, CSV export, periods) | BrandReports |
| Documents & Account | Brand | **WORKING** (statements, change requests, agreements) | BrandSelfService |
| Settings | Brand | **WORKING** (profile/billing/carrier/brand roles) | BrandSettings |
| Integrations Hub | Admin (super) | **WORKING** (control plane: per-card modes, mock cred labels, live test pings) | IntegrationsPanel, IntegrationsContext |
| Simulation Control | Super Admin | **WORKING** (9 deterministic scenarios, safety gate) | SimulationControl, scenarioEngine; e2e simulation-control 15 passed |

## 5. CRITICAL DEEP AUDIT — RAKAZO

### 5A. Integration / connection

| Question | Answer | Evidence | Class |
|---|---|---|---|
| Registry representation | **NONE.** Rakazo is absent from `INTEGRATION_REGISTRY`, `INTEGRATION_META`, and `IntegrationId` (19 IDs listed). | src/integrations/{registry,types}.ts | CODE |
| Provider/integration ID | None exists. | same | CODE |
| Configuration | Exactly one env var: `VITE_RAKAZO_URL` (`.env` → `https://24-144-86-50.sslip.io`), read only by `RakazoPanel.tsx` with a hardcoded fallback host. | .env:25 + RakazoPanel.tsx:8-11 | CODE |
| Credential fields | None. No secret, no API key, no auth. | registry | CODE |
| Simulation-capable | N/A — there is no adapter to simulate. The panel itself needs the external host reachable. | — | CODE |
| Live-capable | Only in the trivial sense of loading a third-party web UI in an iframe. No API client exists. | — | CODE |
| Mock adapter | **None.** (Contrast: DHL/CH/HMRC/SP-API all have explicit `mockClient.ts` adapters.) | find src/lib -name '*mock*' | CODE |
| Real adapter | **None.** No `rakazoClient.ts`, no `lib/rakazo/`. | grep rakazo in src | CODE |
| Health checking | Browser-level only: 10 s `TIMEOUT_MS` before `onLoad`, with loading/error states and a status dot. No API health probe. | RakazoPanel.tsx:20,36-52 | CODE/UI |
| When Rakazo unavailable | Panel shows "Unable to reach Rakazo droplet" card with Open-in-new-tab / Retry. Rest of MERCENTA unaffected. | RakazoPanel.tsx:124-158 | CODE/UI |
| Does MERCENTA operate normally without Rakazo | **Yes.** Nothing in any domain workflow imports Rakazo. Independence proven by absence of imports; no dedicated test asserts it. | grep; e2e/rakazo.spec.ts | CODE/E2E |

### 5B. Bot/agent architecture

**Finding: no Rakazo bot or agent is defined anywhere in this repository.** Repo-wide case-insensitive grep for `rakazo` returns only: `RakazoPanel.tsx`, the `SuperAdminPanel.tsx` tab, `e2e/rakazo.spec.ts`, `.env` (`VITE_RAKAZO_URL`), `docs/INTEGRATIONS.md` (one line), `HANDOFF.md`/`PROJECT_STATUS.md`/`STATUS_CHECK.md` prose.

For every requested bot attribute the answer is **NOT IMPLEMENTED IN THIS REPO**: name, department/purpose, system prompt/role, tools, data available, memory, trigger mechanism, schedule/routine, event-driven behaviour, delegation, other bots it can call, approval points, human escalation, output format, output storage, results-return-to-MERCENTA, action-execution vs advise-only, domain-state mutation, workflow-bypass, audit trail, notification, failure/retry behaviour, permission model, tenant restrictions, UI exposure, status.

The 20-bot fleet (Adam, Jess, Marcus, Priya, Kwame, Sofia, Elena, Diego, Noor, Leo, Wei, Ava, Ravi, Freya, Omar, Ingrid, Zara, Penny Pincher, Margaret, +1) is documented **only** in `HANDOFF.md` and lives on the external droplet `24.144.86.50`. A fresh clone of this repo cannot reconstruct, configure, or run any Rakazo bot. *(Inference: the fleet is operated out-of-band via the Rakazo droplet UI.)*

### 5C. Department model
No department-level AI worker exists in the repository — none of: executive/chief-of-staff, acquisition, research/intelligence, outreach, CRM/relationship, compliance, operations, logistics, finance, customer/brand success, support, marketing/social. The only related artefacts: `src/lib/automation/digest.ts` shapes a `chiefOfStaffBriefing` **email-digest section** (not a bot), and the Super Admin product-research/manufacturer/grants tabs are deterministic engines (not agents).

### 5D. Human-in-the-loop
Literal strings "Human Needed" / "human needed" / "humanNeeded" / "needsHuman": **0 occurrences** repo-wide. What exists:

- `Message.requiresHuman` boolean — surfaced as "needs human" badges (MessagesHub, AdminDashboard); set by LiveChatWidget inbound sends; no state machine between flagged and handled (the human simply replies).
- `classifyInboundReply` / `handleInboundReply` (hot-lead → requiresHuman notification): **no caller anywhere** (grep `src/` + `supabase/`). `PRODUCTION_READINESS.md` claims it is wired — **contradicted by code**.
- Commission auto-approval vs `held_for_approval` (`lib/automation/autoApprove.ts`): real rule, but only surfaced inside `buildDailyDigest`, which no UI consumes.
- Fulfilment-track borderline 55–74 → "held for review": surfaced via `applyFulfillmentOverride` + NotificationCenter.

**Classification: the human-in-the-loop layer for AI-generated waits is INCOMPLETE as a workflow** — flags and rules exist; human destination, action, resume, and audit for AI waits do not.

### 5E. MERCENTA/Rakazo boundary
**Rakazo is currently only a standalone integration surface** (iframe). It is NOT `MERCENTA workflow → Rakazo assistance → MERCENTA workflow` (no domain code calls it) and NOT `Rakazo → direct external action` (no such path exists).

### 5F. Independence
Configured: works (iframe). Unconfigured: still attempts hardcoded droplet URL (no "disabled" swap). Unavailable: error card; nothing else changes. **Not proven by a dedicated test** — only the 3 render tests exist; no test asserts domain operation with/without Rakazo. Zero imports from `src/lib`, `src/data`, `src/context` → no dependency by construction.

### 5G. Current Rakazo UI (code + browser verified)
| Item | Exists? | Detail |
|---|---|---|
| Rakazo appears where | Super Admin → Rakazo tab only | SuperAdminPanel.tsx:35,471 |
| Bot management UI | No MERCENTA-native one (external droplet iframe only) | — |
| AI workforce UI | No (footer hardcodes "20 bots active · Demo mode") | RakazoPanel.tsx:176 |
| Task queue / approval queue / agent activity / bot logs | No | — |
| Users see what agents do | Only whatever the droplet iframe shows | — |
| Founder assigns work / intervenes / sees failures | No / only Open·Refresh·Retry / iframe load-error only | RakazoPanel.tsx:91-158 |

**Rakazo E2E:** `e2e/rakazo.spec.ts` 3/3 PASS this session (tab renders, Open-in-new-tab present, Refresh present).

## 6. CRITICAL DEEP AUDIT — BRAND INTELLIGENCE

| Area | Finding | Evidence |
|---|---|---|
| Screens | Admin: **BrandIntelligencePanel** (Admin → Brands → Brand Intelligence; also Super Admin → Brand Intelligence tab). Brand: **BrandIntelligence.tsx** ("Your Amazon Market", nav "Market Intel"). Detail: ProspectDetailPanel + ProspectDetailTabs. | shell/imports (read) |
| Access | Super Admin + full-permission admin. `VIEW_ALLOWLIST.admin_staff` excludes `brand_intelligence`, so ordinary staff links render AccessDenied. Brand portal "Market Intel" is tenant display. | rbac.ts |
| Purpose as implemented | Score/rank Amazon-UK brand prospects (admin), and show a brand its own category landscape (brand mode). NOT contact discovery or deal management as actions. | read |
| Data sources | Seed only: `brandProspectSeed.ts` (3) + `brandExtraSeed.ts` (9) = **12 prospects**; panel re-scores at load via `createBrandIntelligenceClient()` which **always returns MockClient** (no live client class exists; `_forceMock` ignored). | code read; UI rows=10 |
| Live sources / Firecrawl / Keepa / Amazon | Firecrawl + OpenRouter real clients exist in `lib/discovery` and are consumed by the discovery engine only; Keepa real client exists and is consumed by Product Research (Super Admin). **None are used by Brand Intelligence.** No Amazon live data path. | grep + read |
| Scoring / ranking / filters / search | 7-dimension engine (`scoringEngine.ts`, weights 25/20/15/15/10/10/5), tiers T1–T4 + unscored; search + category + tier filters + sort score/brand in panel. | read; UI probe |
| Brand profiles / ASIN evidence / market signals | 5-tab detail: Overview (scores, ASIN count, est. sales/revenue, maturity…), Amazon (ASIN evidence), Commercial (wholesale, distributors, approach), People (contacts with LinkedIn/email), Mercenta Fit (recommendation, disqualification reason). | ProspectDetailTabs read |
| Contact discovery / enrichment | Mock `discoveryClient.ts` returns contacts/distributors/restrictions/growth signals from the seed index; unknown brands return empty. No live enrichment. | read |
| Qualification fields / opportunity fields | `outreachStatus` (14 states incl. won/lost/pilot/nurture) + `notes` + `owner` exist on `BrandProspect`; no UI edits them. | types.ts |
| Actions available in UI | **None that mutate state.** Row click → read-only detail. No save / add-to-CRM / mark-qualified / send-to-ICP / request-enrichment / start-outreach / create-opportunity / export / status transitions. | panel + tabs read |
| Persistence | **None.** Prospects recomputed on every load; scoring timestamps regenerate; no store writes. | code read |
| Tenant/admin scope | Admin panel is global. Brand mode filters to the brand's own category (shows competitors); both read the same seed. | read |
| E2E coverage | **None.** No spec targets Brand Intelligence (only `app-shell.spec.ts` navigates past it). | ls e2e |
| What a user can do with a discovered brand TODAY | Research it (read detail tabs) · see a score and tier. **Cannot** save, export, qualify, contact, add to CRM, send to ICP, start outreach, create an opportunity, or onboard. | verified read + browser |

Verification: UI probe logged `BRAND_INTEL_ROWS=10` — consistent with 12 seed prospects minus 2 seeded-disqualified (Truthbrush, UpCircle) with the render-time re-score dropping nothing further.

---

## 7. CRITICAL DEEP AUDIT — ICP (Ideal Customer Profile)

| Area | Finding | Evidence |
|---|---|---|
| UI + navigation | **MarketingHub** — Admin → Brands → Marketing ("ICP Builder" card + Lead Pipeline board + Auto-enroll + Discovery + CSV import + Sequence + Campaign Performance). This is the ONLY ICP implementation. | MarketingHub read; UI probe (ICP badge renders) |
| Data model | `ICP` interface (`description/categories/regions`) in `src/lib/marketing.ts`. **No stored ICP entity exists** (not in types.ts, no table); state is component-local. | types.ts grep |
| Scoring model | `scoreLeadFit` deterministic: +40 region · +30 approved-category hit · +30 description keyword overlap (≥2 hits) ; threshold `FIT_THRESHOLD_PLACEHOLDER = 70`. | marketing.ts |
| Pipeline stages | Scraped · Enriched · Sequenced · Replied · Meeting Booked; `shouldAutoEnroll` (≥70 && Scraped/Enriched → Sequenced); `sequencePaused` on Replied/Booked. | marketing.ts |
| Source data | `leads` (bootstrap seed leads; CSV import; discovery-enrolled leads). | bootstrap + MarketingHub |
| Output data | Status changes on `Lead.outreachStatus` via `updateLeadStatus` / `addLead`. No lead persistence to DB in demo. | GlobalStateContext |
| Discovery wire | "Run pipeline" calls `runDiscoveryPipeline` with **hardcoded `createMockDiscoveryClients()`** then `addLead` (fitScore hardcoded 85). Real Firecrawl-based discovery (`firecrawlResearch.ts`) is **unreachable from the UI**. | MarketingHub:103; grep |
| Human approval flow | None for ICP/leads. (Human attention exists only via the unrelated message `requiresHuman` flag and the un-wired reply classifier.) | search |
| AI usage | None at runtime — discovery scored via mocks; scoring is rule-based. | read |
| Enrichment/outreach/CRM usage | None wired. `outreachGenerator` (email/LinkedIn/follow-up drafts) exists but no component imports it. | grep |
| Tests | No dedicated spec. Marketing references appear only in `app-shell.spec.ts` navigation coverage. | ls e2e |
| Simulation behaviour | Fully deterministic in-session; resets on reload. | read |

## 8. BRAND INTELLIGENCE → ICP — RELATIONSHIP (traced, not assumed)

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Does ICP consume Brand Intelligence records? | **NO.** ICP scores `Lead` objects; Brand Intelligence produces `BrandProspect` objects. No code path moves data from one to the other. | code read |
| 2 | If yes, how? | N/A | — |
| 3 | Shared ID/entity? | **NO.** `BrandProspect.id` (e.g. `prospect-tapatio`, `p-seep`) vs `Lead.id` (e.g. `lead-…`, `lead-…-bootstrap`). Different namespaces. | types.ts + seeds |
| 4 | Database/store relationship? | **NO relation.** Brand prospects live in two constant seed arrays; leads live in GlobalState + bootstrap. No FK, no join, no store. | read |
| 5 | Button/action/route connecting them? | **NO.** BrandIntelligencePanel has no navigation/action out; MarketingHub has no import of intelligence data. | read |
| 6 | Data copied between systems? | **NO.** Some brand names coincide (Sahara Threads, Harvest Lane, Voltaic… appear in mock discovery pools and lead seeds) but that is shared *demo naming*, not data transfer. | compare seeds |
| 7 | API/domain function connecting them? | **NO.** `lib/intelligence/*` never imports `lib/marketing.ts`, and vice versa. | grep |
| 8 | Is ICP independently generating prospects? | **Yes** — CSV import + mock discovery add `Lead`s directly. | MarketingHub read |
| 9 | Is Brand Intelligence independently generating prospects? | **Yes** — but only from static seed arrays re-scored locally; nothing upstream generates or persists new BrandProspect records. | read |
| 10 | Two layers of the same acquisition workflow? | Conceptually yes, **architecturally no** — they are parallel, non-overlapping pipelines over different entities. | read |
| 11 | Currently disconnected? | **YES — fully disconnected.** | grep |
| 12 | Duplicate systems? | **NOT duplicates in data terms** (different models/stores). They *feel* overlapping because both are "potential brand/prospect" UIs with a pipeline board. | read |
| 13 | Admin acquisition vs brand-facing market intelligence? | Not even that split exists today. Admin Brand Intelligence and Brand Market Intel share the same seed + engine; the brand view is a display subset. Admin ICP (Marketing) is a **third** surface about `Lead`s. | read |
| 14 | Brand Portal "Market Intelligence" vs Admin "Brand Intelligence": same thing or different? | **Same underlying engine/seed, different presentation.** Both call `createBrandIntelligenceClient` + `scoreProspect` over the same seed; admin shows a scored table, brand shows category cards + competitors. They are NOT the same *feature* because the brand view has no admin functionality — but they are the same data/engine. | read |

## 9. ACQUISITION / OUTREACH PIPELINE MAP (as actually implemented)

Lifecycle arrow map (CONNECTED / PARTIALLY CONNECTED / DISCONNECTED / NOT IMPLEMENTED / UNKNOWN):

| Stage → Stage | Class | What moves | Where (code) |
|---|---|---|---|
| Discovery → Leads | PARTIALLY CONNECTED | CSV import (real UI) + mock directory/research/enrich/email/enrol; write via `addLead` | MarketingHub + discovery/engine |
| Brand Intelligence → anything | **DISCONNECTED** | Nothing moves out | BrandIntelligencePanel |
| Enrichment | PARTIALLY CONNECTED (mock-only in run) | Mock Companies House + Hunter; real clients exist, called from nowhere | discovery/engine |
| Qualification / ICP | CONNECTED (leads only) | `scoreLeadFit` over `leads` | MarketingHub |
| Scoring → Auto-enroll | CONNECTED | fit ≥70 + Scraped/Enriched → `Sequenced` | marketing.ts |
| Human review of leads | NOT IMPLEMENTED | — | — |
| Contact discovery → Outreach | NOT IMPLEMENTED | `outreachGenerator` library drafts exist, zero callers | grep |
| Outreach sending | NOT IMPLEMENTED (business-send) | Email sandbox path exists via BrandComm; sequence **sender** (email/Instantly) has no UI trigger | BrandComm + engine |
| Response | NOT IMPLEMENTED | `handleInboundReply` no caller; no webhook function | grep |
| Qualification → Opportunity | NOT IMPLEMENTED | No `Opportunity` entity anywhere in types.ts | types.ts |
| Opportunity → Brand CRM | NOT IMPLEMENTED | CRM operates on onboarded brands only | BrandCRM |
| Partner application (access gate) | CONNECTED (closed loop on its own) | Login form → Applications → Approve → login card; **not linked** to leads/prospects | access-gate |
| Onboarding → Compliance → Activation | CONNECTED | Wizard → gate → agreements → catalog sync (gate-blocked) → POs | e2e onboarding/compliance-gate |

**The chain breaks at multiple points.** Discovery partially feeds Leads; nothing feeds Brand Intelligence; Brand Intelligence cannot flow anywhere; leads have an ICP/sequence loop but no real sender, no reply loop, no opportunity, and no CRM hand-off. Marketing → Brand CRM → PO lifecycle is only reconnected manually (admin creates POs).

## 10. COMMUNICATIONS STACK AUDIT

| System | Purpose (as built) | Who uses | Sends | Receives | Stores history | Canonical record | Provider | Simulation | Status |
|---|---|---|---|---|---|---|---|---|---|
| Native MERCENTA Messages (`logMessage` / `messages` table) | Canonical conversation log for email/call/in_app/team_note | Admin MessagesHub + BrandComm + LiveChat + Helpdesk + BrandTeamMessages | Pushes logged messages | Live chat compose (inbound labelled) | **YES — canonical thread store** | **YES — the shared table** | n/a (storage) | YES | WORKING |
| NotificationCenter | Derived "needs attention" (PO/doc/renewal/deduction/score/submission/shipment) | Admin + brand header | n/a (computed) | n/a | NO (derived at render) | reads queries | n/a | YES | WORKING |
| LiveChatWidget (brand) | Brand-side chat; auto-creates helpdesk ticket | Brand portal | Writes message + ticket | n/a (brand types) | reuses messages | messages + ticket | n/a | YES | WORKING |
| Helpdesk / tickets | Escalation layer grouping message ids; SLA, assign, priority | Admin | Optional templated AI-suggested reply (mock map) | n/a | YES (ticket + message refs) | tickets | n/a | YES | WORKING |
| Email — `BrandComm.useBrandComms` (`lib/messaging/email.ts`) | Admin→brand emails, always-logged | Admin (MessagesHub, BrandComm) | **YES** when email connected (sandbox or Edge Function) | NO | via logMessage | messages | Postmark/SendGrid | sandbox | PARTIAL |
| Email — `lib/mail/mail.ts` factory | Alternate mail seam | **No in-app callers** (only validators) | could | — | — | — | Postmark/SendGrid | mock | DUPLICATE/DORMANT |
| Postmark notifier (`postmarkNotifier.ts`) | PO-creation notification email | `api.ts:634 createPurchaseOrder` | **YES** — the only true live-capable sender path (mock id without key) | NO | — | message? (PO email not logged to messages) | Postmark | mock/live-by-key | WORKING |
| Rocket.Chat | Embedded messaging engine (per docs) | Admin panel only (mock) | NO (mock simulator) | NO | in-memory mock arrays | none (external) | Rocket.Chat self-hosted | MOCK ONLY | DORMANT |
| WhatsApp | Hot-lead escalation | RequiresHuman events | would | — | — | — | Twilio | MOCK ONLY | DORMANT (no callers) |
| Postiz | Social scheduling | Admin panel + brand accts | mock posts | — | in-memory | none | Postiz self-hosted | MOCK ONLY | PARTIAL |
| Instantly / Hunter / OpenRouter / Firecrawl | Discovery chain providers | MarketingHub run (mocks) | mock | — | — | — | real clients present | mocks in UI | PARTIAL |
| LinkedIn / Facebook / Instagram / X | Social network targets | Postiz platform tags + brand social connect + access-gate link verification | no | no | no | none | none | n/a | PRESENTER ONLY |

**Communications system map (canonical record):** `messages` (table/store) is the single canonical conversation record; tickets reference it; NotificationCenter derives from domain queries; email sends are always logged into `messages`. Rocket.Chat/WhatsApp/Postiz/Instantly are external-channel adapters that currently never hold the canonical record (mock-only; their real clients are unreachable or uncalled today).

**Overlap:** two email seams (`lib/mail` dormant vs `lib/messaging/email` active) are duplicates of the same intent. Email is both transactional (PO notification) and conversational (BrandComm) but both funnel to Postmark/SendGrid.

## 11. POSTIZ AUDIT

What it means today: an **admin-only mock scheduling presenter** + a **brand-side mock account-connect wizard** + a registry card + a docker-compose entry (per docs). NOT a real publishing feature.

| Can Brands today… | Answer | Evidence |
|---|---|---|
| Connect accounts | Brand "Social Accounts" (`BrandSocialConnect`) — mock OAuth per brand stored in a module-level `Map`, 6 platforms, in-memory only, no Postiz call | read; `brandConnections` Map |
| Create content | Admin Postiz panel compose box only | read |
| Schedule content | Admin panel: `schedulePost` against **mock** client (`apiKey: ''` always → factory never returns RealPostizClient) | PostizAdminPanel.tsx:39 + factory |
| Publish | No — schedules only; published state is simulated | read |
| View calendar | No calendar in MERCENTA — a link out to the external Postiz URL | PostizAdminPanel.tsx:126-131 |
| See analytics | No | — |
| Manage social channels | Admin: platform tag toggles (Instagram/LinkedIn/X/Facebook/YouTube/TikTok) that only affect the post payload | read |

**Brand "Social Accounts" vs Admin "Social Media (Postiz)":** separate UIs, separate state, zero shared code. Brand wizard = mock OAuth map; Admin scheduler = Postiz client. They do not overlap technically; they are two unconnected mock surfaces for the same domain ("social").

## 12. ROCKET.CHAT AUDIT

- **UI/surface:** Admin → Integrations → Rocket.Chat panel (connection badge, "Provision All Groups", external admin link). E2E-free (no spec). Browser probe: renders.
- **Client:** `getRocketChatClient()` **always returns `MockRocketChatClient`** — it accepts `creds` but never reads them; no `RealRocketChatClient` class exists anywhere (only a comment mentions it).
- **SSO bridge:** `rocketChatSSO.ts` (provisionRocketChatUser / ensureBrandGroup) exists and is called by the admin panel's provision button — all against the in-memory mock.
- **Auth/channels/messages/notifications:** none real. Group/user ids are mock strings (`rc-mock-…`). No message send UI exists inside MERCENTA for Rocket.Chat at all.
- **Who uses it:** only the admin panel provision button.
- **Answer — "What business workflow in MERCENTA currently requires Rocket.Chat?":** **None.** Nothing in any product workflow calls Rocket.Chat; it is a self-hosted messaging *option* whose only code is a mock simulator + a provision button. (The docker-compose entry and HANDOFF reference the self-hosted service on 46.101.75.185, which is outside this repo.)

## 13. CRM / SUPPORT / MESSAGING / NOTIFICATION OVERLAP

| System | Owns | Stores | Duplicates? | Link to conversations | Canonical conversation |
|---|---|---|---|---|---|
| Brand CRM (BrandCRM + BrandCrmDepth) | Onboarded-brand records: profile, contracts, POs, docs, agreements, fulfillment track, tasks/notes (crmStore) | yes (CRM fields) | No — CRM does not duplicate messages; it embeds BrandCommPanel | Reads messages via BrandCommPanel | reads `messages` |
| Communications (BrandComm) | Send pipeline + call log | writes `messages` | — | — | writes canonical |
| Helpdesk | Tickets grouping `messageIds` | tickets (referencing messages) | No — same source (messages) | YES — tickets link to messages; live chat auto-creates tickets | reads `messages` |
| Messages (MessagesHub) | Admin thread UI | `messages` | No — it is the viewer | — | canonical |
| NotificationCenter | Needs-attention feed | none (derived) | No — one pipeline ("same event stream as the daily digest", footer) | nav-targets to PO/admin/compliance/contracts views | read-only |
| LiveChatWidget | Brand chat | `messages` + ticket | No | YES | canonical |
| Rocket.Chat | (mock) | in-memory separate | **Would duplicate** if ever live (no link to `messages`) | **NO** | external |
| Email | transport | `messages` (via logMessage) | `lib/mail` seam duplicates `lib/messaging/email` | — | canonical |
| WhatsApp | (mock escalation) | none | would duplicate | NO | external |

**Overlap findings:**
1. Helpdesk ↔ Messages: related-but-distinct. Tickets reference messages; message bubbles always flow through the same store. Good.
2. LiveChatWidget ↔ MessagesHub ↔ BrandTeamMessages: three viewers of the same `messages` table — NOT duplicates (same canonical store).
3. Rocket.Chat ↔ Messages: Rocket.Chat would be a **parallel conversation store** if activated — currently disconnected from the canonical `messages` table.
4. Notifications ↔ Messages: separate — notifications are derived work-items; messages are conversations. They intersect on `requiresHuman`.
5. CRM activity ↔ Communications: CRM "history/timeline" views read POs/contracts/notes; communication happens through embedded BrandComm. Not duplicated.

## 14. DASHBOARD + ANALYTICS AUDIT

### 14A. Admin Overview (AdminDashboard — Phase 7C redesign)
Shows (all derived at render from queries): PageHeader + KPI band (brands live, POs awaiting action + £ value, docs under review, compliance cleared/blocked, contracts due, active tickets, open deductions), severity-ordered "attention" list (PO / compliance / contract / deduction / tickets) with drill-down `onNavigate`, fulfilment motion list (shipments + ready-to-fulfil POs), recent communications with "Human reply needed" badges. No static/vendor KPIs; `department` prop is deprecated/unused.

### 14B. Brand Dashboard (BrandDashboard — Phase 7E redesign)
Tenant-scoped equivalents: KPI band (open POs, docs pending, contract status, shipments, deductions), attention list, PO list, fulfilment, compliance & health, recent comms, next actions. Uses `assertBrandScope/tenantId`; old global activity feed removed. E2E dashboard spec: part of the 147.

### 14C. Sales Analytics (brand)
Recharts area/pie built from tenant POs; KPI cards (total value, units, avg order, SKUs) + monthly series + SKU breakdown + status distribution, each with drill-down modal → navigates to Purchase Orders. Empty state when no POs.

### 14D. Relationship Dashboard / Operations / Analytics / Reports
- Brand: Dashboard (overview) · Analytics (charts) · Reports (period KPIs + CSV) — three distinct surfaces over the same PO data, deliberately separated (Phase 7E comment).
- Admin: single Operations Overview (no department tabs; deptMap prop retained for call-site compat only).
- Fulfillment Track and Retail Pipeline are separate operational views (scoring + SP-API pipeline), not dashboards.

### 14E–I. Duplicates / real / seeded / static
| Metric | Source | Real/Derived/Seeded/Static |
|---|---|---|
| All Admin/Brand dashboard KPIs | queries over demoStore/supabase | REAL (derived from domain arrays) |
| Marketing "Campaign Performance" (cost/lead, dispatched, replies, meetings) | `campaigns` seed | SEEDED |
| Monitoring health checks | `MOCK_HEALTH_CHECKS` + `Math.random()` healthy flag | STATIC/FAKE |
| Xero financial summary | `services/xero` demo mode | SEEDED/SIM |
| Retail Pipeline rows | seed submissions/deductions + created POs | SEEDED/DERIVED |
| Brand Intelligence KPIs | seed prospects re-scored | SEEDED |
| Super Admin tabs (Research/Manufacturer/Grants/Pitch/Financing) | deterministic engines over static pools + TAMSAM | SEEDED/GENERATED |

### 14J. Canonical metric definitions lacking
No single metrics module defines: MRR/AMRR, lifetime value, payout totals, "compliance cleared" formula (exists duplicatively in AdminDashboard + api.ts gate), tier-1 pipeline value, churn, or trial→paid. Several formulas are re-implemented in more than one component.

**Executive-dashboard feasibility:** the data model CAN support PO/commission/deduction/shipping/renewal analytics (all present as typed entities + queries), but prospect→CRM→pipeline value, campaign ROI, channel spend, and AI-work metrics are missing or unliveried (AdSpend only seeded). So a full executive layer would be partially derivable — not from nothing.

## 15. WORK QUEUE / TASKS / EXCEPTIONS AUDIT

Does MERCENTA have a coherent task/work-item model? **Partial.** There is **no generic Task entity in the domain** (only `CrmTask` scoped to CRM per-brand). Work is implicit in entity statuses. Inventory of every "needs attention" surface:

| Surface | Creates actionable work item? | Owner | Where user goes | Can complete? | Updates state? | Audited? | Notified? |
|---|---|---|---|---|---|---|---|
| NotificationCenter items (PO awaiting, doc review, renewal, deduction, score, submission, shipment) | NO (derived list) | implicit (admin) | navTarget view | implied by completing the underlying entity | yes | via underlying domain action | header badge; digest batch |
| AdminDashboard attention list | NO (derived) | admin | dashboard drill-down | implied | yes | underlying | — |
| Helpdesk tickets | **YES** — real tickets | status/assignee | Helpdesk | status open/pending/resolved | yes | `demoAuditLog` write | badge via dashboard |
| Compliance approvals | **YES** — doc uploads/approvals | admin | Compliance Approvals / CRM | approve/reject | yes | audit log | NotificationCenter |
| PO acknowledgement (brand) | **YES** — ack actions per line | brand | Brand PO detail | ack/reject/backorder | yes | audit_log entry | Postmark email + notification |
| Shipment exceptions / DHL delayed | PARTIAL — flag + sim milestone; no exception work-item | carrier/admin | Logistics/Carrier | milestoning | yes | audit + event | eventFeed |
| Deductions / disputes | **YES** — deduction lifecycle + dispute | admin finance | Billing/CRM/sim | dispute/record outcome | yes | audit log | deduct event |
| ICP "Human Needed" | **DOES NOT EXIST** (string absent) | — | — | — | — | — | — |
| AI bot escalations | **DOES NOT EXIST** (no agent tasks) | — | — | — | — | — | — |
| Fulfilment borderline | PARTIAL — flag only | admin | Fulfillment Track override | override | yes | audit | digest layer (no UI consumer) |

**Conclusion:** the platform surfaces "needs attention" per-domain with functional completion loops for POs/compliance/deductions/helpdesk — but there is no cross-domain work queue, no SLA field on non-ticket items, no assignment/ownership model outside helpdesk+CrmTask, and no agent/AI task feed.

## 16. ENTITY / DATA MODEL AUDIT (source of truth + linkage)

| Entity | Source of truth | ID | Key relationships | Lifecycle | Audit | Tenant boundary | UI | Cross-links |
|---|---|---|---|---|---|---|---|---|
| Brand | `demoStore.demoBrands` / supabase `brands` | `brand-…` | profile, gateDocs, contracts, POs, shipments, messages, commissions, subscriptions | onboarded → gate → active | audit_log by entity | yes (sessions pinned) | CRM + dashboards | strong |
| Product | `demoProducts` / `products` | `prod-…` | brand, submissions, PO lines | available/out-of-stock | — | brand | Catalog (gate-locked) | medium |
| PO | `demoPurchaseOrders` / `purchase_orders` | uuid + `poNumber` | brand, lines, shipment, deductions, commissions | received→…→delivered (or rejected) | audit | brand | Admin+Brand PO views | strong |
| Shipment | `demoShipments` / `shipments` | `shp-…` | PO, carrier, waybill, milestones | factory_intake→…→live_amazon | event+audit | brand | LogisticsHub, Carrier, Dashboard | strong |
| Document (compliance) | `demoComplianceDocs` / `compliance_docs` | `doc-…` | brand, gate | uploaded→under_review→approved/rejected | audit | brand | ComplianceHub/Approvals | strong |
| Contract | `demoContracts` / `contracts` | — | brand, renewalDate, esign envelope | draft→sent→signed→active | audit | brand | Contracts views | medium |
| Ticket | `demoTickets` (in-memory) | `tkt-…` | **references messageIds** | open→pending→resolved | ticket audit | brand | Helpdesk | medium |
| Deduction | `demoDeductions` / `deductions` | — | PO, brand, dispute | open→disputed→accepted/resolved | audit | brand | Billing/sim | medium |
| Payment | `demoSubscriptions`/`demoCommissions` + Stripe mock | `mock:sub-…` | brand | accrued→invoiced→paid | — | brand | Billing | partial |
| Prospect (BI) | **seed constants only** | `prospect-…`/`p-…` | asins/distributors/contacts/signals/score | outreachStatus(14) but **no UI transitions** | **none** | global | BI panel only | **NONE** |
| Contact (prospect) | nested in prospect seed | — | — | confidence only | — | global | People tab | none |
| Campaign | `campaigns` GlobalState | — | static | status | none | global | MarketingHub | none |
| Conversation | `messages` table/store | `msg-…` | brand, ticket, PO ref | — | — | brand | all comm UIs | strong |
| Lead | GlobalState/bootstrap (+ `leads` live table) | `lead-…` | region/segment/fit | pipeline stages via updateLeadStatus | — | global | MarketingHub | weak |
| Task | `CrmTask` (CRM per-brand) + tickets | — | — | — | — | brand | CRM depth | weak |
| Agent/Bot | **NO ENTITY** (absent from types.ts) | — | — | — | — | — | Super Admin iframe | **NONE** |
| Opportunity | **DOES NOT EXIST** | — | — | — | — | — | — | — |

**UI-only vs backend-only:** Prospect/Contact/Lead/Campaign are effectively UI/session entities (constants or GlobalState; no durable store in demo). Messages/POs/Docs/Contracts/Deductions have dual demoStore+supabase paths. No entity is backend-only with no UI.

## 17. LIFECYCLE / STATE AUDIT (summary; full matrix in §25H)

- **Brand**: application(denied|pending|approved) → wizard → onboarded → gate(blocked|in_review|cleared) → active. Complete with UI actions.
- **Product**: draft → submitted → under_amazon_review → live | rejected (SP-API sim); catalog gate-blocked until compliance cleared. Complete.
- **PO**: received → under_review → accepted → ready_to_fulfil → shipped → delivered; rejected; per-line ack (unacknowledged/accepted/rejected/backordered). Automated transitions in sim (ack→auto-shipment→label/ASN). Complete.
- **Shipment**: factory_intake → bak_depot → sea/air_transit → uk_customs_cleared → mercenta_hub → live_amazon; DHL milestone sim (labelled→picked_up→in_transit→customs→delivered, every-6th exception + retry). Complete in sim.
- **Compliance doc**: uploaded → under_review → approved|rejected; gate = required docs + signed contract + agreements 4.1/4.2. Complete.
- **Deduction**: open → disputed → accepted/resolved; outcome won/lost/partial. Backend complete; UI gap = Tour-5 surface absent.
- **Contract**: draft → sent → signed → active; renewals; esign mock envelope. Complete.
- **Prospect/Contact/Outreach**: statuses defined but **no UI actions produce transitions** — dead-end by construction.
- **AI task / agent run**: no such lifecycle (nothing exists).

**Dead ends / statuses without actions:** prospect `outreachStatus` ladder (UI-inert); `Lead.fitScore` never written back (display-only — the ICP score is computed live but not persisted to the lead); Monitoring "healthy" (random); Rakazo footer "20 bots active · Demo mode" (hardcoded).

## 18. AI / AUTOMATION GOVERNANCE AUDIT

| AI/automation | Input | Output | Engine/provider | Prompt/criteria | Authority | Human approval | Audit | Failure/fallback | Deterministic in sim? | External action possible? |
|---|---|---|---|---|---|---|---|---|---|---|
| Brand-intel scoring | seed ASINs/signals | ProspectScore | rule engine (no LLM) | weights table | none | none | none | n/a | YES | no |
| ICP lead fit scoring | lead + ICP | 0-100 | rules | region/category/keywords | auto-enroll only | none | none | n/a | YES | no |
| Outreach copy generator | prospect | email/LinkedIn drafts | template (no LLM) | structure rules | none | none | none | n/a | YES | no |
| Discovery pipeline | segments/ICP | discovered→enrolled leads | mocks (real OpenRouter/CH/Hunter/Instantly exist) | budget caps + wording lint | enrolment via addLead | none | none | real clients throw on budget/5xx | YES (mocks in UI) | only via un-called real clients |
| Alert triage | alert title/desc | severity/summary/fix | OpenRouter (gpt-4o-mini) + mock fallback | JSON schema prompt | none | none | none | falls back to keyword mock | NO (mock path deterministic) | **YES** if OpenRouter key set — but only triggered from fake health checks |
| Commission auto-approve | PO commission £ | auto_sent / held | rule | £10k placeholder | auto-send decision | **held above threshold** | audit via digest form (no UI consumer) | n/a | YES | would invoice/send (no executor wired) |
| Fulfilment track assignment | score | applied / held_for_review | rule | 55–74 band | auto apply | held in band | override audited | n/a | YES | no |
| Daily digest builder | domain inputs | digest text | rule + optional CoS fields | cadence | none | — | none | n/a | YES | no (no sender wired) |
| WhatsApp escalation | hot-lead event | WA message | rule + Twilio/mock | hot keywords | none | — | none | mock default | YES (mock) | **YES** if creds + caller existed (none) |
| Inbound reply router | reply text | requiresHuman | keyword classifier | hot/objection lists | none | intended human | none | n/a | YES | no (no caller, no webhook) |
| Rakazo fleet | (external) | (external) | ??? | ??? | ??? | ??? | ??? | ??? | ??? | **UNKNOWN — outside repo** |

**AI authority summary:** no AI/automation in this repo can currently mutate external systems, send real channels, or make un-approvable decisions. Every decision-making rule that *could* act (commission auto-send, track auto-assign) is either without a wired executor or held-for-review by design. The only *potentially* external side-effect path (OpenRouter triage from Monitoring; Postmark PO email) is gated by env key and mocked otherwise.

## 19. PROVIDER / INTEGRATION RATIONALISATION AUDIT (current disposition only)

| Provider | Business capability served | Workflow | UI | Consumer | Simulation | Live | Actually used today? | Classification |
|---|---|---|---|---|---|---|---|---|
| Amazon SP-API | PO/catalog/invoicing | sim flow via mock | Integrations + Retail Pipeline (locked) + PO/shipment seams | api.ts, scenario engine | mock | seam only | YES (sim) | **CORE DOMAIN** |
| DHL | labels/milestones | shipment progression | Carrier terminal + simulation control | `lib/dhl/*` | mock | seam only | YES (sim) | **CORE DOMAIN** |
| Stripe | subscriptions | invoice/subscription views + mock billing | BillingPanel | `lib/billing/stripe*` | mock | seam only | YES (mock) | **CORE DOMAIN (sim)** |
| Companies House | company verification | compliance sync | Super Admin → Compliance | `lib/compliance` | mock | seam only | YES (sim) | **CORE DOMAIN (sim)** |
| HMRC | VAT filing status | compliance sync + filing (disabled demo) | Super Admin → Compliance | `lib/compliance` | mock | seam only | YES (sim) | **CORE DOMAIN (sim)** |
| Xero | accounting | Accounting tab (28-day demo reseed) | Super Admin → Accounting | `services/xero/*` | demo mode | real client code present | YES (demo) | **AUXILIARY** |
| Postmark/SendGrid (email) | transactional + comms | PO email (real-by-key) + BrandComm (sandbox) | Billing/PO + Messages | `postmarkNotifier`, `messaging/email`, (dormant `mail/mail`) | mock/sandbox | PO path live-by-key | YES (partial) | **AUXILIARY** |
| OpenRouter | research + alert triage | discovery research (unreached) + triage (from fake checks) | Monitoring; Marketing run (mock) | engine, alertTriage | mock | real client | YES (triage only) | **AUXILIARY/PARTIAL** |
| Hunter | email verify | discovery enrichment (unreached) | — | engine | mock | real client | NO (UI) | **EXPERIMENTAL** |
| Instantly | outreach enrolment | discovery (unreached) | — | engine | mock | real client | NO | **EXPERIMENTAL** |
| Firecrawl | web research | discovery (unreached) | — | engine/firecrawlResearch | mock | real client | NO | **EXPERIMENTAL** |
| Keepa | product research | Product Research Agent | Super Admin → Product Research | `research/keepaClient` + engine | mock | real client | YES (Super Admin sim) | **AUXILIARY/PARTIAL** |
| Postiz | social scheduling | schedule posts (mock) | Admin → Social Media | `postizClient` | mock | unreachable (apiKey '') | YES (mock) | **AUXILIARY/MOCK-ONLY** |
| Rocket.Chat | team messaging | provision groups (mock) | Admin → Rocket.Chat | `rocketchat/*` | mock | **does not exist in code** | NO | **UNUSED/UNCONNECTED** |
| WhatsApp/Twilio | hot-lead escalation | none | Admin → WhatsApp | `whatsapp/*` | mock | real client (no callers) | NO | **UNUSED/UNCONNECTED** |
| Usertour | guided tours | brand tours | brand + Super Admin | `lib/usertour`, tourDefinitions | sim | self-hosted | YES | **AUXILIARY (WORKING)** |
| Supabase | persistence/RLS | data layer + events | whole app | `lib/supabase`, migrations 001-019 | live configured? | yes wiring | YES (config-dependent) | **INFRASTRUCTURE** |
| DigitalOcean | hosting droplets | infra outside repo | docs/HANDOFF | scripts | n/a | live | YES (deployed) | **INFRASTRUCTURE** |
| Namecheap | demo deployment | deploy script | — | `scripts/deploy-demo.sh` | n/a | live | YES (deployed) | **INFRASTRUCTURE** |
| GitHub | source hosting | — | — | — | n/a | live | via repo | **INFRASTRUCTURE** |
| Google Cloud / Wise / Payoneer / Amazon Ads / Facebook / Instagram / X | referenced in docs/registry card or routing targets | none | — | — | n/a | — | NO | **UNUSED/UNCONNECTED** |
| Rakazo | AI workforce (aspired) | none in-repo | Super Admin iframe | none | n/a | external droplet UI | NO (surface only) | **UNUSED/UNCONNECTED** (in-repo) |

## 20. UX / UI CURRENT-STATE AUDIT (post-redesign)

| Surface | Current status | Uses canonical design system? | Major remaining issue |
|---|---|---|---|
| App shell (AppShell/Sidebar/Header) | Phase 6 — canonical, grouped nav, breadcrumbs, mobile drawer, skip-link | YES | — |
| Login/home marketing | Canonical + content-model-driven | YES | — |
| Admin/Brand dashboards | Phase 7C/7E canonical (KPI band, AttentionPanel) | YES | — |
| Tables | DataTable canonical exists; older tables (BrandIntel, CRM, Monitoring) still bespoke | PARTIAL | Brand Intel table is dense 14-col micro-typography |
| Charts | Recharts consistent (SalesAnalytics/BrandReports); dashboard avoids fake trends by design | YES | — |
| Onboarding wizard | Custom 6-step (not DataTable-based) | PARTIAL | works, distinct styling from neigbouring canonical forms |
| Modals | canonical Modal (ESC+focus) + bespoke drill-down modals | PARTIAL | — |
| Notifications | canonical dropdown | YES | — |
| CRM | bespoke dense layout | PARTIAL | — |
| Brand Intelligence / ICP | bespoke dense tables/cards; not DataTable | **NO (legacy styling)** | structurally different from neighbouring pages |
| Communications | MessagesHub + LiveChat canonical-ish; BrandTeamMessages bespoke | PARTIAL | — |
| Monitoring/Helpdesk | mixed | PARTIAL | Monitoring shows fabricated health data |
| Super Admin | 14-tab panel, mixed quality (Rakazo iframe plain, Accounting legacy) | PARTIAL | — |
| Carrier | minimal 3-view shell | PARTIAL | — |
| Mobile/tablet | 7-viewport sweep clean in app-shell/design-system suites | YES | — |
| Accessibility | skip link, focus-visible, aria labels on key controls; some tables lack captions | PARTIAL | density/contrast on micro-tables |
| Loading/empty/error states | Skeletons/EmptyStates/ErrorBoundary broadly | YES | some lists plain "Loading..." |

**Genuine change vs the earlier forensic audit:** the shell, dashboards, notification system, accessibility foundation, and design tokens are rebuilt and consistent; the remaining legacy surfaces (Brand Intelligence, Marketing, Monitoring, some Super Admin tabs) still use bespoke pre-token styling.

## 21. INFORMATION ARCHITECTURE AUDIT

Nav classification:

| Portal item | Class | Notes |
|---|---|---|
| Brand: Dashboard, PO, Returns, Inbound Shipments, Catalog, Compliance, Contracts | CORE | — |
| Brand: Onboarding & Legal | SUPPORTING | onboarding completed → summary |
| Brand: Analytics / Reports | SUPPORTING | real-data chips off same PO source |
| Brand: Market Intel | UNKNOWN/QUESTIONABLE for brand job | brands see competitor names/scores — no evidence of intended brand action; distinct from Admin intel only by presentation |
| Brand: Social Accounts | CONFIGURATION (mock) | no real capability behind it |
| Brand: Support & Team | SUPPORTING | support + internal notes combined |
| Admin: Overview/CRM/Catalog/Fulfillment/Retail/PO/Returns/Logistics/Carrier/Compliance/Billing/Contracts | CORE | — |
| Admin: Brand Intelligence | UNKNOWN | read-only island; no downstream action |
| Admin: Monitoring | SUPPORTING | fabricated health + triage |
| Admin: Messages / Helpdesk | CORE (support/comm) | good split |
| Admin: Super Admin / Audit Log / Tours | ADMIN-ONLY | — |
| Admin: Integration Settings | INTEGRATION | super-only |
| Admin: Rocket.Chat / Social Media / WhatsApp | INTEGRATION | mock surfaces; no business workflow depends on them |
| Carrier: Manifest / BAK / Auditor | CORE (carrier) | — |

**IA findings:** (1) Provider names exposed directly to users ("Rocket.Chat", "Postiz", "WhatsApp") where capability names could exist — acceptable for admin but odd for brand-adjacent nav; (2) Brand Intelligence + Market Intel + Marketing-ICP are three "brand/prospect" surfaces with no relationship; (3) Marketing (ICP/discovery) sits under Brands but consumes leads unrelated to onboarded brands; (4) Super Admin holds both operational tabs (Simulation, Compliance) and business-development tabs (Brand Intelligence, Research, Grants, Pitch, Financing) — mixed purposes in one panel; (5) no screen obviously hides a capability under an inappropriate parent beyond the above.

## 22. DASHBOARD / BRAND / ADMIN ROLE MODEL

| Role | Sees today | Needs-but-lacks |
|---|---|---|
| Brand | own tenant: dashboard, catalog, POs, shipments, compliance, contracts, analytics, reports, documents, team, settings, social, market intel | per-brand role presets exist (`BRAND_ROLE_PRESETS`) but nav is not role-differentiated beyond tenant scope |
| Admin/Operations | full admin shell minus super-only views | department tabs were removed (Phase 7C) — single overview; BD/ops/compliance/finance/logistics all see the same nav |
| Admin/BD | same shell; Marketing + CRM visible; **not** Brand Intelligence (super-only by allowlist) | BD-scoped pipeline view (leads/prospects/outreach) is a single Marketing page |
| Admin/Compliance | Compliance Approvals (all admin) | no compliance-only view; Super Admin Compliance is separate |
| Admin/Finance | Billing + Contracts (all admin) | deductions/disputes only surfaced in Billing and Retail Pipeline |
| Admin/Logistics | Logistics Control, Carrier Monitor, Fulfillment Track | — |
| Super Admin | everything incl. 14-tab panel, Integrations, Simulation, Rakazo | — |
| Carrier | manifest/BAK/auditor only | — |

**Conclusion:** the current IA supports **portal roles** (brand/admin/super/carrier), not **department roles** — all admin staff share one shell; differentiation is only super-vs-not and tenant pinning. `StaffRole`/`channel`/`permissionTier` exist (data) but do not alter navigation.

## 23. SIMULATION / DEMO PRODUCT EXPERIENCE AUDIT

What can be demonstrated today (all with zero live credentials):

- One-click demo login for every portal; onboarding wizard; compliance gate; catalog sync block; full PO lifecycle (create→ack→auto-shipment→label/ASN); carrier DHL milestone progression; returns; deductions/disputes; contracts/esign; billing (mock Stripe, invoices, remittance); Brand + Admin dashboards with real derived KPIs; helpdesk tickets; live-chat → ticket creation; NotificationCenter; 9 guided tours; Integrations Hub per-card sim control; Simulation Control with 9 deterministic scenarios (each producing visible state/audit/event trail); GPS-style carrier terminal; marketplace: Rakazo iframe (external); Communications sandbox (emails marked SANDBOX); **Brand Intelligence table + detail tabs (seed)**, **Marketing ICP + discovery + pipeline (mock)**.

Visible state changes: POs/shipments/docs/deductions mutate shared stores → every view reflects them (networkCalls===0 verified in the suite). Notifications appear via NotificationCenter (PO await/deduction); audit trail via Admin Audit Log; provider responses via DHL carrier terminal + Compliance sim.

What is NOT demonstrable coherently: prospect→CRM hand-off (none), real outreach sending (no sender trigger), reply routing (no webhook), Rakazo agent activity (external only), Rocket.Chat/WhatsApp/Postiz real messaging, Amazon live data, prospect persistence.

**Core principle check:** MERCENTA operates fully without live credentials — proven by the 147-pass suite + this report's provider survey. AI/Rakazo/external tools are complementary surfaces, not dependencies (except the *optional* external iframe and the PO-email-by-key path which degrades to mock ids).

## 24. TEST / EVIDENCE AUDIT

| Capability | E2E | Unit/validator | Browser/screenshot | Skips | Notes |
|---|---|---|---|---|---|
| Rakazo | `rakazo.spec.ts` 3/3 PASS (this session) | none | panel renders (probe) | 0 | tests assert controls, **not** independence/depth |
| Brand Intelligence | **none** | none | probe: 10 rows + detail tabs render | — | zero behavioural coverage |
| ICP / Marketing | none (navigation only in app-shell) | none | probe: ICP builder renders | — | scoring engine untested at UI level |
| Communications (messages/live chat/helpdesk) | app-shell + notification nav coverage | validators for digest/whatsapp/postiz/automation/mail exist in `scripts/validate-*.mjs` | probes | notifications 5 skips (badges context) | validators test libraries, not workflows |
| Postiz | none | `validate-postiz.mjs` (14 asserts, lib-level) | probe: panel renders | — | no publish-flow test |
| Rocket.Chat | none | — | probe: panel renders + provision button | — | no real-client path to test |
| Dashboards | `dashboard.spec.ts` + app-shell | — | — | — | in 147 |
| Simulation | `simulation-control.spec.ts` (11 tests) + compliance-sim | `validate-mock-providers.mjs` (networkCalls===0) | screenshots in test-screenshots/ | 4 pre-existing skips (recorded) | strong |
| PO / shipment / onboarding / access-gate / CRM / billing / tours / design-system | dedicated specs (all pass this session) | — | screenshots | — | strong |
| Xero | `xero.spec.ts` 5 | — | — | 0 | — |

**Caution:** multiple `PROJECT_STATUS`/`STATUS_CHECK` claims (147/0/4; 43→0 login blocks; networkCalls===0 probes; compliance-sim E2E) were **re-verified true this session** by running the full suite. Meanwhile `PRODUCTION_READINESS.md`'s "handleInboundReply wired" claim and `STATUS_CHECK`'s event-feed-function claim were **falsified** by grep (§2.1). Skips are recorded, not hidden.

## 25. GAP INVENTORY (descriptive — no fixes proposed)

- **A. Missing workflows:** prospect→opportunity; lead→outreach sender; reply routing; agent task/approval queue; Rakazo-native workforce ops; brand→admin partnership activation from a prospect.
- **B. Disconnected workflows:** Brand Intelligence ↔ ICP/CRM/outreach; access-gate ↔ leads/prospects; discovery real clients ↔ UI; digest ↔ UI; event feed ↔ UI; sim scenarios ↔ human review.
- **C. UI-only surfaces:** Brand Intelligence actions; monitoring health; Postiz/Rocket.Chat/WhatsApp panels (functional mocks); brand social connect; XeroConnection.tsx (dead file); Super Admin BD tabs are engine-driven not portal features.
- **D. Backend-only capabilities:** auto-approve rules; digest builders; reply classifier; event emitters; outreach generator; escalation lib; firecrawlResearch; mail/mail.ts.
- **E. Redundant capabilities:** two email seams; Brand Intelligence admin vs brand market intel (same engine); multiple notifications paths (derived + digest + events, one feed claimed); Marketing campaign stats (seed) vs real PO-derived analytics.
- **F. Duplicate data ownership:** `demoStore` vs `supabase` dual writes (documented); PO/deduction/contract formulas duplicated across components.
- **G. Broken human-in-the-loop:** "requiresHuman" flag without workflow; "held_for_approval"/borderline without UI consumer; ICP human review absent; Rakazo human-needed absent.
- **H. Unused integrations:** Rocket.Chat, WhatsApp, Instantly, Hunter (UI), Firecrawl (UI), Keepa live, esign live, Google/Wise/Payoneer/Ads.
- **I. Provider-only surfaces lacking business purpose:** Rocket.Chat provision panel; Monitoring fabricated health; Postiz compose (no channel); WhatsApp test-send.
- **J. AI capability gaps:** no agent layer; no LLM in discovery UI; no AI summarisation of prospects; no AI workforce tasking; no AI approval routing.
- **K. Analytics gaps:** prospect pipeline value; campaign ROI (seed only); channel attribution; AI-work metrics; executive suite.
- **L. Work-queue gaps:** no unified queue, no assignment for non-ticket work, no SLA model for compliance/deductions/PO.
- **M. Entity relationship gaps:** prospect↔lead↔brand↔application↔opportunity unlinked; campaign↔lead unlinked; message↔lead (leadId exists, unused).
- **N. State/lifecycle gaps:** prospect ladder no transitions; lead fitScore not persisted; no opportunity lifecycle.
- **O. Notification gaps:** digest not surfaced; WhatsApp/email hot-lead escalation unwired; no PUSH/SMS.
- **P. Reporting gaps:** no admin reports page (only brand); no payout statement export for direct consumers of CSV exist.
- **Q. UX/IA gaps:** three disconnected "prospect" screens; provider names in nav; dense legacy tables; no department IA.

## 26. REDUNDANCY / OVERLAP MATRIX

| Feature A | Feature B | Similarity | Actual difference | Shared data? | Shared workflow? | Current connection | Classification |
|---|---|---|---|---|---|---|---|
| Overview | Operations | High (same admin overview; dept tabs removed) | none today | dashboard-level | same view | identical render | SAME UNDERLYING DOMAIN |
| Dashboard | Analytics (brand) | Medium | dashboard=status, analytics=trend | PO store | read-only | both read POs | RELATED BUT DISTINCT |
| Analytics | Reports (brand) | Medium | charts vs period KPIs+CSV | PO store | read-only | both read POs | RELATED BUT DISTINCT |
| Brand Intelligence (admin) | Market Intel (brand) | High (same engine/seed) | table vs cards | same seed | none | same engine | SAME UNDERLYING DOMAIN |
| Brand Intelligence | ICP/Marketing | Medium (both "prospects") | BrandProspect vs Lead | **NONE** | none | **DISCONNECTED** | DUPLICATE only in intent |
| ICP | CRM | Low | leads vs onboarded brands | none | none | none | RELATED BUT DISTINCT |
| CRM | Outreach | Low | — | none | none | none | UNKNOWN (no outreach) |
| CRM | Helpdesk | Medium | brand record vs tickets | messages (via BrandComm) | reply | BrandCommPanel inside CRM | RELATED BUT DISTINCT |
| Communications | Helpdesk | High | thread view vs ticket grouping | messages | tickets link messageIds | live-chat auto-ticket | RELATED BUT DISTINCT |
| Messages | Rocket.Chat | High intent | canonical vs external | NONE | none | mock-only | SAME INTENT, DISCONNECTED |
| Notifications | Messages | Low | work-items vs conversations | none | intersect on requiresHuman | notification nav → views | RELATED BUT DISTINCT |
| Social Accounts (brand) | Postiz (admin) | Medium (same domain) | mock OAuth vs mock scheduler | NONE | none | none | DUPLICATE in domain, disconnected |
| Marketing Hub | Social Media | Low-Medium (both marketing) | lead pipeline vs post scheduler | campaigns seed | none | none | RELATED BUT DISTINCT |
| Reports | Analytics | Medium (see above) | — | PO | — | — | RELATED BUT DISTINCT |
| Documents | Contracts | Low-Medium | self-service docs vs contracts | agreements | statements | generated | RELATED BUT DISTINCT |
| Compliance (docs) | Contracts | Medium | gate docs vs agreements | brand | gate checks both | gate combines | RELATED BUT DISTINCT |
| Monitoring | Audit Log | Low | health/triage vs audit trail | none | none | none | RELATED BUT DISTINCT |
| Integrations Hub | Provider panels | High | control plane vs per-provider UI | integration state | panel actions use it | panels read Hub state | RELATED BUT DISTINCT |
| Super Admin | Integration Settings | Medium | workspaces overlap | — | — | tabs vs nav | RELATED BUT DISTINCT |
| `lib/mail` | `lib/messaging/email` | **High (same intent)** | mock-first factory vs connection adapter | none | both send email | NO shared caller | **DUPLICATE** |
| Email (transactional PO) | Email (conversational) | Medium | notifier vs BrandComm | Postmark | both | separate | RELATED BUT DISTINCT |

## 27. UNKNOWNS / QUESTIONS REQUIRING EVIDENCE

1. **Rakazo fleet contents/prompts/tools/schedules/department mapping** — all UNKNOWN from this repo (lives on droplet; only names in HANDOFF).
2. Whether any Rakazo bot writes back into MERCENTA via API — **no code evidence in repo either way** (nothing listens).
3. The exact contents/role of `Distribution Prospects/*.xlsx` and `Mercenta Brand Intelligence/*.rtf` (root business docs) — not imported by src; relevance unknown.
4. Intended semantics of Brand "Market Intel" — no brand action exists, so the intended next step is unknown.
5. Whether `brand_intelligence` nav exclusion for admin_staff is intentional or an oversight (allowlist vs visible nav).
6. Deep-UI state of `design/` (Main Dash 1.avif / Main dash 2.jpg) — untracked mockups; no mapping to any implemented view.
7. Live Supabase project wiring: migrations exist but which tables actually load at runtime depends on env; not auditable without credentials.
8. The real Xero client path — code present; live token flow needs external verification.
9. Event-feed Edge Function (documented, absent) — is a deployed version running outside this repo?
10. Whether "20 bots active" is accurate today (footer is hardcoded).

## 28. EVIDENCE APPENDIX (key files / routes / tests)

| Area | Files |
|---|---|
| Shell/nav | src/App.tsx · src/components/layout/{AppShell,BrandShell,AdminShell,CarrierShell,Sidebar,Header}.tsx |
| State/data | src/context/GlobalStateContext.tsx · src/data/{demoStore,bootstrap,demoData,queries,api,brandProspectSeed,brandExtraSeed}.ts · src/types.ts |
| RBAC | src/lib/auth/rbac.ts |
| Rakazo | src/components/admin/{RakazoPanel,SuperAdminPanel}.tsx · e2e/rakazo.spec.ts · .env (VITE_RAKAZO_URL) |
| Brand Intelligence | src/lib/intelligence/*.ts · src/components/admin/{BrandIntelligencePanel,ProspectDetailPanel,ProspectDetailTabs}.tsx · src/components/brand/BrandIntelligence.tsx |
| ICP/outreach | src/lib/marketing.ts · src/components/admin/MarketingHub.tsx · src/lib/discovery/engine.ts |
| Communications | shared/BrandComm·LiveChatWidget·NotificationCenter · admin/{MessagesHub,HelpdeskDashboard,RocketChatAdminPanel,PostizAdminPanel,WhatsAppAdminPanel} · lib/{messaging/email,mail/mail,notifications/postmarkNotifier,rocketchat/*,whatsapp/*,postiz/postizClient,helpdesk/ticketStore} |
| Automation/AI | lib/automation/* · lib/events/* · lib/monitoring/alertTriage.ts |
| Simulation/providers | lib/simulation/scenarioEngine.ts · integrations/* · lib/{dhl,compliance,spapi,billing/stripe} |
| Dashboards | admin/AdminDashboard.tsx · brand/{BrandDashboard,SalesAnalytics,BrandReports}.tsx · shared/dashboard.tsx |
| Tests | e2e/* (rakazo 3/3; pooled 147/0/4) |
| Docs audited | PROJECT_STATUS.md · HANDOFF.md · STATUS_CHECK.md · docs/*.md · PRODUCTION_READINESS.md · AUDIT_REPORT.md |

## 25R. REQUIRED TABLES

### A. Capability matrix (condensed)
| Capability | User | UI | Data source | Workflow | Provider | Simulation | Live | Tested | Status |
|---|---|---|---|---|---|---|---|---|---|
| PO lifecycle | brand+admin | PO views | demoStore/PG | ack→ship→deliver | SP-API/DHL sim | yes | seam-only | E2E strong | WORKING |
| Compliance gate | brand+admin | Compliance views | demoComplianceDocs | upload→approve→gate | CH/HMRC sim | yes | seam-only | E2E strong | WORKING |
| Fulfilment scoring | admin | Fulfillment Track | scores | band→override | none | yes | n/a | E2E strong | WORKING |
| Billing/remittance | admin | BillingPanel | subs/comm/ded | invoice→statement | Stripe mock | yes | seam-only | billing 4/0/0 | WORKING |
| Deductions/disputes | admin | Billing/Retail | demoDeductions | open→dispute→outcome | none | yes | n/a | skips | PARTIAL UI |
| Brand CRM | admin | BrandCRM | brands/PO/docs | view+comm+notes | none | yes | n/a | crm 3/0/3 | WORKING |
| Helpdesk | admin | Helpdesk | tickets+messages | ticket→assign→resolve | none | yes | n/a | nav | WORKING |
| Messaging | admin+brand | 4 UIs | messages | log→thread | Postmark sandbox | yes | partial | nav | WORKING |
| Notifications | admin+brand | header | queries-derived | view→navigate | none | yes | n/a | 5 skips | WORKING |
| Brand Intelligence | super/admin | BI panel | seed constants | view→score→detail | none (intended Firecrawl/Keepa) | yes | none | **NO E2E** | PARTIAL/UI-INERT |
| ICP/Marketing | admin | MarketingHub | leads | ICP→score→enroll→pipeline | mocks (OpenRouter/Hunter/Instantly) | yes | UI never reaches real | **NO E2E** | WORKING in-session |
| Discovery | admin | MarketingHub run | mock pools | directory→research→enrich→enrol | mocks | yes | real clients unused | validators | PARTIAL |
| Social/Postiz | admin+brand | Postiz+SocialConnect | in-memory | compose→schedule | Postiz mock | yes | real unreachable | validator | MOCK-ONLY |
| Rocket.Chat | admin | RC panel | mock arrays | provision | RC mock | yes | none in code | none | DORMANT |
| WhatsApp | admin | WA panel | — | — | Twilio mock | yes | no callers | validator | DORMANT |
| Rakazo | super | iframe | external droplet | — | Rakazo (external) | n/a | external UI | 3/3 render | SURFACE ONLY |
| Monitoring | admin | Monitoring | mock checks | check→triage | OpenRouter by key | partial | possible | nav | PARTIAL/FAKE |
| Audit log | super | Audit Log | audit_log | filter → view | none | yes | n/a | nav | WORKING |
| Simulation control | super | Simulation | scenario engine | run scenarios | mocks | yes | none | 15/0/0 | WORKING |

### B. Rakazo agent matrix
| Bot | Purpose | Trigger | Inputs | Tools | Actions | Human approval | Output | Audit | UI | Status |
|---|---|---|---|---|---|---|---|---|---|
| (none in repo) | — | — | — | — | — | — | — | — | Super Admin iframe (external UI) | **NOT IMPLEMENTED IN REPO** — 20 bots exist only externally (HANDOFF names) |

### C. Brand Intelligence / ICP relationship
| Stage | Current system | Data source | Output | Consumer | Connected? | Evidence |
|---|---|---|---|---|---|---|
| Brand Intelligence | BI panel | seed (12) | scored prospects | none | **NO** | no outbound action |
| ICP/leads | MarketingHub | leads + CSV + discovery | pipeline stages | MarketingHub board | internal only | — |
| Brand intel → ICP | — | — | — | — | **NO** | no shared entity/API |
| ICP → CRM | — | — | — | — | **NO** | — |
| Discovery → leads | MarketingHub run | mock pools | Lead records | pipeline | YES (in-session) | addLead call |

### D. Communications matrix
| System | User | Purpose | Sends | Receives | Stores history | Canonical record | Provider | Simulation | Status |
|---|---|---|---|---|---|---|---|---|---|
| Messages | all | canonical log/threads | yes | yes | YES | **YES** | none | yes | WORKING |
| LiveChat | brand | support chat | yes | view | YES | messages+ticket | none | yes | WORKING |
| Helpdesk | admin | tickets | reply | msg intake | YES | tickets→messages | none | yes | WORKING |
| Email (BrandComm) | admin | email brand | sandbox/real | no | via log | messages | Postmark/SG | sandbox | PARTIAL |
| Email (mail.ts) | — | dormant seam | could | — | — | — | Postmark/SG | mock | DORMANT |
| Postmark notifier | api.ts | PO email | by key/mock | no | no | (not to messages) | Postmark | mock/live-by-key | PARTIAL |
| Rocket.Chat | admin | mock messaging | no | no | mock | none | RC | mock | DORMANT |
| WhatsApp | none | escalation | no (no callers) | no | no | none | Twilio | mock | DORMANT |
| Postiz | admin | social sched | mock | no | mock | none | Postiz | mock | PARTIAL |

### E. Integration matrix — see §19.

### F. Overlap matrix — see §26.

### G. Human-in-the-loop matrix
| Trigger | Current status | Human destination | Human action | Resume mechanism | Audit | Complete? |
|---|---|---|---|---|---|---|
| requiresHuman flag | message badge | MessagesHub | reply | manual | message log | **INCOMPLETE (no state machine)** |
| Hot-lead reply | library only | none | none | none | none | **NOT WIRED** |
| Commission ≥ £10k | digest `held` | none (no consumer) | none | none | digest text | **INCOMPLETE** |
| Fulfilment borderline | flag | Fulfillment Track | override | override applies | audit | COMPLETE (single surface) |
| Compliance doc | docs pending | Compliance Approvals | approve/reject | gate recomputes | audit | COMPLETE |
| PO ack deadline | PO status | PO detail | ack/reject | workflow advances | audit | COMPLETE |
| Deduction dispute | status | Billing/CRM | outcome | state updates | audit | COMPLETE |
| Rakazo/agent "human needed" | **does not exist** | — | — | — | — | **NOT IMPLEMENTED** |

### H. Lifecycle matrix — see §17 (states, transitions, automation, human, dead ends, UI coverage per entity).

## DATA-DRIVEN FINDINGS — BEFORE ANY REDESIGN

Answers from repository + browser evidence only (inferences marked).

1. **What is Rakazo actually doing in MERCENTA today?** Presenting a read-only iframe of an external bot UI (Super Admin → Rakazo), reachable via `VITE_RAKAZO_URL`. Nothing else. No API calls, no data exchange, no workflow participation.
2. **Is Rakazo currently a true AI workforce layer, a partial integration, or something else?** **Something else** — a standalone integration surface (iframe). There is no Rakazo code (client, adapter, prompts, tasks) in this repository at all, so "partial integration" would overstate it.
3. **Does MERCENTA genuinely work without Rakazo?** **Yes.** Zero imports in domain/data/context; the iframe simply shows an error card when unreachable. Not covered by a dedicated test (only render tests exist).
4. **What Rakazo capabilities are already built but hidden/incomplete?** **None are built in-repo.** The entire "20 bots · demo mode" fleet is external. In-repo, there is no task queue, approval queue, agent activity, bot logs, assignment, or intervention surface of any kind.
5. **What is Brand Intelligence actually doing?** Scoring/ranking 12 seed Amazon-UK brand records via a deterministic 7-dimension engine, showing a searchable/filterable table with a read-only 5-tab detail panel; and (brand mode) rendering the same data as category cards. No live data, no persistence, no actions.
6. **What is ICP actually doing?** Scoring `Lead` records against a component-local ICP (description/categories/regions), auto-enrolling good fits into a `Sequenced` pipeline stage, and enabling CSV/mock discovery intake. No persistence of the ICP config; no LLM.
7. **Are Brand Intelligence and ICP currently connected?** **No.**
8. **Does ICP consume Brand Intelligence data?** **No** — separate entities (`BrandProspect` seed vs `Lead` state), no shared ID, store, route, or function.
9. **Is Brand Intelligence → ICP → outreach implemented end-to-end?** **No.** BI has no outbound actions; outreach generator code has no callers; the sequence has no real sender; reply routing has no webhook.
10. **What is the actual current prospect-to-brand acquisition workflow?** Manually driven: admin "Run pipeline" (mock) can add leads to Marketing; separately, brands apply via the public application form → admin approves → manual brand record → onboarding → compliance → POs. The two tracks never meet in code.

11. **What communication systems are actually in use?** Native Messages (canonical), LiveChat, Helpdesk tickets, NotificationCenter, sandbox/sim email (BrandComm) and the PO email notifier (real-by-key). Rocket.Chat, WhatsApp, and Postiz real channels are not in active use.
12. **What is Rocket.Chat actually needed for today, based on code?** **Nothing.** Its only code is a mock client + a provision button; no workflow imports it.
13. **What is Postiz actually doing today?** Admin mock schedule-compose (posts recorded in memory) and a brand-side mock social-account wizard. Real publishing is unreachable from the UI.
14. **Where are communications duplicated?** (a) two email seams (`lib/mail` dormant, `lib/messaging/email` active); (b) Rocket.Chat's intended parallel store vs canonical `messages`; (c) three viewers of `messages` (MessagesHub / LiveChat / BrandTeamMessages) are same-source, not true duplicates.
15. **Where are outreach systems duplicated?** Instantly (discovery enrol) vs email (BrandComm) vs outreachGenerator (draft-only) vs Postiz/social — four outreach-capable surfaces with zero shared scheduling/sequencing model.
16. **Where are CRM / support / messaging capabilities overlapping?** CRM embeds BrandComm and reads messages; Helpdesk references messages; LiveChat auto-creates tickets. The overlap is intentional and consistent (single `messages` store). The real problem is the *missing* linkage: no prospect/lead feeds brand records; Rocket.Chat would fork the conversation store if enabled.
17. **What should NOT be changed because it is already working correctly?** The PO/shipment/compliance/billing domain flows and their E2E coverage; simulation-first provider seam (DHL/CH/HMRC/SP-API/Stripe factories + scenarios, 147/0/4); dashboards' real-data discipline; one-click demo logins + access gate; canonical `messages` store; the Phase 5/6 design system + shell; tenant scoping (rbac + assertBrandScope) proven by multi-tenant tests.
18. **What major product gaps are proven by the evidence?** Prospect/lead → CRM/opportunity/onboarding hand-off missing; Brand Intelligence inert (no actions/persistence); outreach sending + reply routing absent; human-in-the-loop for AI waits incomplete ("Human Needed" does not exist); Rocket.Chat/WhatsApp/Postiz surfaces mock-only; monitoring health fabricated; no department-level IA; no unified work queue; no Opportunity/Agent entities; discovery real clients unreachable from UI; event-feed Edge Function documented but absent.
19. **What important questions remain unanswered?** Rakazo fleet contents/behaviour (external); whether bots write back into MERCENTA; contents of root-level business xlsx/rtf; live Supabase/Xero wiring; intent behind brand Market Intel; whether brand_intelligence nav exclusion for staff is deliberate.
20. **What areas require architectural decisions AFTER this audit?** (Descriptive list only.) The acquisition domain model (unify/disambiguate Brand Intelligence vs Market Intel vs ICP/Leads?); the outreach stack (which channel owns sending/sequencing?); the AI-workforce boundary (in-repo task/approval model vs external Rakazo surface, and what "human needed" means); the work-queue model (task/assignment/SLA); the department-role IA; the metrics definitions for an executive dashboard; the Rocket.Chat/Postiz/WhatsApp disposition; whether the duplicate email seam and fake monitoring should be reconciled.

---

## VERIFICATION / QUALITY-BAR REPORT

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run build` | PASS (✓ 2.35s) |
| `npm run lint` | PASS (0 errors) |
| Accredited E2E suite (all 23 specs, 4 workers, 4.1 min) | **147 passed / 4 skipped / 0 failed** |
| `e2e/rakazo.spec.ts` | 3/3 PASS |
| Temporary UI probes (removed afterwards) | BRAND_INTEL_ROWS=10; ICP builder renders; Brand Market Intel renders (tenant-scoped); Postiz/Rocket.Chat/WhatsApp panels render |
| Browser checks performed | Playwright (Chromium) against `npm run dev` on localhost:5173 |
| Working tree | git diff shows only generated artifacts modified (Review Zip, playwright-report, .last-run.json), all pre-existing at session start; no source/example/docs change of mine remains |
| Tests skipped | 4 (all pre-existing/intentional: access-gate t6/t8/t9, tours t5) |
| Tests failed | 0 |
| Limitations | Visual/pixel QA not possible in this environment (no image rendering); iframe *content* of the Rakazo droplet cannot be inspected from inside, only its availability state; live-provider behaviour (Postmark keyed send, real Xero, Supabase online) was not exercised (no credentials/network requirement per audit scope). Findings that could not be verified are labelled NOT VERIFIED / UNKNOWN in this report. |

---

## GIT / ARTIFACT REPORT

- HEAD: `991565689216278dfb72d48288cfd35d73fdf1d8`
- Branch: `redesign/foundation`
- Baseline tag intact: `mercenta-baseline-before-redesign-20260907` (`959b4d2`)
- Working tree: **no source files modified by this audit**. Pre-existing modifications/untracked artifacts remain untouched (list in §2).
- Audit artifact: `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md` (this file, project root)
- Not committed, not pushed. No source, config, schema, test, prompt, or provider behaviour altered.

**Complete audit summary:** MERCENTA at `9915656` is a simulation-complete, E2E-green demo product whose core brand→compliance→PO→fulfilment→billing operations are genuinely wired; Rakazo is an in-repo iframe surface over an out-of-repo bot fleet and is not an integrated AI workforce; Brand Intelligence is a seed-only scoring island; ICP is a separate in-session leads pipeline in Marketing; the two are disconnected; the acquisition/outreach chain breaks at Brand Intelligence (no outbound actions), at outreach (no sender/reply loop), and at CRM/opportunity (no entity/hand-off); communications are consolidated on a single canonical `messages` store with Rocket.Chat/WhatsApp/Postiz remaining mock-only; dashboards are real-data driven; monitoring is partially fabricated; and the human-in-the-loop architecture for AI-generated waits is incomplete ("Human Needed" does not exist). Full evidence, matrices, and unknowns are contained in §1–§28 above.

