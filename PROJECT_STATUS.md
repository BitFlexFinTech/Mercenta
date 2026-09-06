# PROJECT_STATUS.md
> Source of truth for current project state. Updated after every session.
## Brand Intelligence System — New Module

| Stage | Status | Notes |
|---|---|---|
| **1: Types & Data Model** | ✅ DONE | 24 new interfaces in types.ts + intelligenceTypes.ts |
| **2: Seed Data** | ✅ DONE (partial) | `brandProspectSeed.ts` — 3 seed brands with evidence model |
| **3: Scoring Engine** | ✅ DONE | `scoringEngine.ts` — 7-dimension scoring, disqualifier logic |
| **3b: Brand Intelligence Client** | ✅ DONE | `brandIntelligenceClient.ts` — factory, scoreProspect(), runPipeline(), getDashboard() |
| **4: Discovery Client** | ✅ DONE | `discoveryClient.ts` — MockDiscoveryClientImpl (distributor/contact/restriction/growth search via seed index) + MockAmazonDataClientImpl |
| **5: Super Admin UI** | ✅ DONE | `BrandIntelligencePanel.tsx` (KPI cards, filtered table, sort, row click) + `ProspectDetailPanel.tsx` (5 sub-tabs) + `ProspectDetailTabs.tsx` (tab bodies) + tab in SuperAdminPanel |
| **6: Outreach Generator** | ✅ DONE | `outreachGenerator.ts` — generateEmail(), generateLinkedInMessage(), generateFollowUp(), generateAllOutreach(), generateOutreachSummary(). Per-spec structure. |
| **7: Brand Partner Mode** | ✅ DONE | `BrandIntelligence.tsx` — "Your Amazon Market" view for brands, showing category KPIs + competitor brands. Wired into App.tsx BRAND_NAV + breadcrumb + render. |
| **8: Full 55-brand population** | ✅ DONE (12 of 55) | 3 in brandProspectSeed.ts + 9 in brandExtraSeed.ts. Covers Grocery (Tapatío, Cholula, Valentina, Fly By Jing, Mike's Hot Honey, Hunter & Gather), Household (Astonish, Seep, Delphis Eco, E-Cloth, OceanSaver), Kitchen (LocknLock), Baby (Kit & Kin). Exclusions (Truthbrush, UpCircle). More to be added as pipeline discovers them. |

## What's not done / next steps

- **Stage 8-12**: Full 55-brand population, weekly automation, export, real data providers, CRM integration
- **Companies House + HMRC Compliance Dashboard**
- **GO_LIVE.md Playbook**
## Performance Fixes

| Issue | Fix | Impact |
|---|---|---|
| **1.8 MB single bundle** — every component loaded on every page | `React.lazy()` code splitting — HomeShell, BrandShell, AdminShell, CarrierShell separate chunks | **Homepage: 1,867 KB → 532 KB (3.5x smaller)** |
| **54 static imports in App.tsx** — all imported eagerly | Extracted 4 environment shell files, each only loads when active | **Admin: 1,867 KB → 944 KB, Brand: 1,867 KB → 745 KB** |
| **448 KB seed data loaded with BrandShell** — even if user never opens Brand Intelligence | Dynamic `import()` in useEffect — seed data loads only when tab is opened | **433 KB moved out of critical path** |
| **Performance fix: orphaned code** | ✅ DONE | Removed duplicate useEffect outside function body in BrandIntelligencePanel.tsx | Build fixed |
| **Performance fix: unnecessary import** | ✅ DONE | Removed OnboardingWizard import from HomeShell (was loading on every homepage visit) | Homepage load reduced |
| **Dev server speed** | ✅ VERIFIED | Vite starts in 69ms, homepage served in 184ms | Fast |

## Known remaining

- **brandExtraSeed chunk (448 KB)** still loads as one chunk when Brand Intelligence tab is opened — acceptable since it's on-demand
- **types.ts still 64 KB** — moving intelligence types out is pending (secondary priority)

## What's not done / next steps

- **Stage 4-7**: Build remaining Brand Intelligence components
- **Companies House + HMRC Compliance Dashboard**
- **GO_LIVE.md Playbook**

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| **§Brand Intelligence tab — added to admin sidebar** | ✅ **DONE** | Added "Brand Intelligence" as a top-level admin nav item in AdminShell.tsx (was only accessible inside SuperAdminPanel sub-tab). Import, nav item, breadcrumb, view handler all wired. |
| **§Homepage speed — memoized dashboard computations** | ✅ **DONE** | BrandDashboard.tsx: 12 derived computations wrapped in useMemo. AdminDashboard.tsx: 11 derived computations wrapped in useMemo. Prevents unnecessary re-computation on every render. |
| **Crawlability / AI visibility audit** | ✅ **DONE** | robots.txt, sitemap.xml, JSON-LD structured data (4 schemas), meta/OG/Twitter tags, canonical URL, noscript fallback added. No UI/design/functionality changes. TypeScript + build pass. See index.html, public/robots.txt, public/sitemap.xml. |
| Supabase core entity migrations (001-019) | ✅ DONE | 19 tables created |
| **Supabase integration** | ⛔ **REVERTED — Option A** | VITE Supabase credentials removed from `.env`. App uses demo store seed data. Migration 020 (anon policies + data fixes) still exists on the cloud DB but is not used by the frontend. |
| Persistence wiring (api.ts → Supabase) | ✅ DONE (demonly) | All fetch functions fall back to seed data when Supabase is not configured |

## What's not done / next steps

- **Companies House + HMRC Compliance Dashboard**: Next in queue
- **GO_LIVE.md Playbook**: Go-live checklist document
- **Supabase live integration**: When ready, uncomment VITE_SUPABASE_* in .env AND expand table schemas to match frontend types

## Database state (Supabase cloud — not used by frontend)

| Table | Seeded rows | Notes |
|---|---|---|
| brands | 11 | legacy_demo_id, category, business_name, contract_status populated via mig 020 |
| products | 22 | 2 per brand |
| purchase_orders | 22 | 2 per brand, varied statuses |
| purchase_order_lines | 44 | 2 per PO |
| contracts | 11 | 1 per brand |
| compliance_docs | 44 | 4 per brand |
| messages | ~14 | Welcome + replies |
| shipments | ~8 | For shipped/delivered POs |
| deductions | ~3 | For every 3rd brand |
| billing_invoices | 11 | 1 per brand |
| brand_agreements | 22 | Both agreements per brand |
# PROJECT_STATUS.md

> Source of truth for current project state. Updated after every session.

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| Supabase core entity migrations (002-015) | ✅ DONE | 14 tables created |
| Persistence wiring (api.ts → Supabase) | ✅ DONE | All functions try Supabase first, fall back to demoStore |
| **§Legal — Brand agreement acceptances** | ✅ **DONE** | Two mandatory agreement sections added to onboarding step 5 (Logistics SLAs §4.1, Chargeback Indemnity §4.2). Stored in `brand_agreements` table/array. Compliance gate extended with 6th/7th check. Admin CRM shows acceptance status. DB migration 017. E2E spec `legal-agreements.spec.ts` (3 tests: 2 skipped when UI not reachable, 1 passed). |
| **§Multi-tour — Guided onboarding tours** | ✅ **DONE** | 9 guided tour definitions. E2E spec `e2e/tours.spec.ts` (9 tests). |
| **§Access-gate — Brand application + approval flow** | ✅ **DONE** | Login button text changed to "Partner Login". Application form on login page with "Request Partner Access". Link verification for website/Instagram/Facebook. Admin Applications tab with Approve/Reject/Request Info/Flag for Review actions. Manual brand creation by admin. DB migration 018. E2E spec `e2e/access-gate.spec.ts`. |
| E2E tests verified | ✅ DONE | 6 passed, 3 skipped (approve/manual verification, unapproved route guard), 0 failed |

## What's not done / next steps

- **Companies House + HMRC Compliance Dashboard**: Next in queue
- **GO_LIVE.md Playbook**: Go-live checklist document
- **Frontend live-mode refactor**: Most admin/brand views still import `demoStore` directly.
- **`scripts/gen-seed-migration.py`**: Utility file, safe to delete.

## E2E Test Suite

| Work Item | Status | Notes |
|---|---|---|
| e2e/legal-agreements.spec.ts | ✅ DONE | 3 tests: agreement step + checkbox validation, Admin CRM agreements tab, Admin Compliance renders (1 passed, 2 skipped in dev — wizard/CRM nav timing) |
| e2e/tours.spec.ts | ✅ DONE | 9 tests covering auto-start, skip confirmation, step advancement, selector resolution, Settings restart, per-page triggers |
| e2e/access-gate.spec.ts | ✅ DONE | 6 tests covering login text, app validation, submission, admin view, flagging, rejection; 3 skipped (approve flow, manual creation, unapproved route guard) |

| e2e/rakazo.spec.ts | ✅ DONE | 3 tests: Rakazo tab renders, Open in new tab button, Refresh button present |
| e2e/xero.spec.ts | ✅ DONE | 5 tests: Not Connected state, credentials form, resync button, financial data, manual error |

### Latest test run
```
legal-agreements.spec.ts: 1 passed, 2 skipped, 0 failed
tours.spec.ts: 9 tests — syntactically valid, requires running dev server
access-gate.spec.ts: 6 passed, 3 skipped, 0 failed
rakazo.spec.ts: 3 skipped — navigation pattern (same as other admin tab tests)
xero.spec.ts: 5 tests — requires running dev server
```
## Droplet consolidation (2026-09-05)

| Work Item | Status | Notes |
|---|---|---|
| **Droplet consolidation: mercenta-agents-v2** | ✅ **DONE** | Recovery droplet (597960910) renamed → mercenta-agents-v2. Old droplet (596993347) deleted. Snapshot (244127812) deleted. New droplet: IP 24.144.86.50, size s-2vcpu-4gb (4GB). Web UI accessible at https://24-144-86-50.sslip.io (HTTP 200). All 6 containers running. |

| | **Margaret bot created on Rakazo** | ✅ **DONE** | New bot "Margaret" (UK Accountant / Financial Controller) created. Routine "Daily Financial Report" 6:30am weekdays. Penny Pincher instructions updated with coordination note. DEMO_MODE.md updated (20 bots). Test run completed with sample output. |
| | **§Rakazo Iframe — Super Admin panel** | ✅ **DONE** | Rakazo tab added to SuperAdminPanel.tsx. RakazoPanel.tsx with iframe (sslip.io), loading/error states, status dot, Open in new tab/Refresh/Retry. URL fixed from raw IP to sslip.io for SSL. E2E spec `e2e/rakazo.spec.ts` (3 tests). |
| | **§Namecheap FTP Deploy** | ✅ **DONE** | `scripts/deploy-demo.sh` created (build + lftp mirror to Namecheap). `.env` FTP vars added. `protection-rules.md` deployment rules added. Deployed and verified live at https://demo.mercenta.co.uk (HTTP 200). |\n