# MERCENTA ARCHITECTURE

> Systems map for the Mercenta platform. Derived from repository inspection
> (2026-09-07). This is a living doc — update as the redesign proceeds.

## 1. Stack (verified)

| Layer | Choice |
|---|---|
| Framework | React 18.3 |
| Language | TypeScript 5.5 (strict) |
| Build | Vite 5.4, manual chunks (7 vendor chunks + code-split shells via `React.lazy()`) |
| Styling | Tailwind CSS 3.4 (tokens in `tailwind.config.js`) |
| State | React Context (`GlobalStateContext`) + TanStack Query 5 |
| Charts | Recharts 3.10 (vendor chunk — lazy) |
| Icons | Lucide 0.446 |
| Fonts | IBM Plex Sans, Fraunces (display), IBM Plex Mono |
| Validation | Zod 4.5 |
| Monitoring | Sentry (deferred / non-blocking) |
| Backend | Supabase 2.57 (partial; demoStore fallback) |
| Tests | Playwright 1.62 |

## 2. Routing model

**No client-side router.** Navigation is state-driven via `environment` +
`view` in `GlobalStateContext`.

```
App.tsx
├── home     → HomeShell  (marketing / auth)
├── login    → HomeShell
├── brand    → BrandShell
└── admin    → AdminShell (incl. Super Admin sub-tabs)
```

> **§REPOINTED (2026-10-11, rule 07) — THERE IS NO CARRIER BRANCH, AND IT WAS NEVER JUST HIDDEN.** This tree
> used to carry a fifth line, `carrier → CarrierShell (3 views)`. The whole 3PL carrier surface was **REMOVED
> on 2026-09-23** (§P9, programme decision 4 — the standing Founder decision **T-2**: *no external carrier
> users/logins*). **A carrier never logs into Mercenta**: Mercenta operates DHL (international) and Palletline
> (UK domestic) **by API** from the Logistics Hub, which is Brand/Admin-facing. Evidence, all re-verified
> 2026-10-11: `src/components/layout/CarrierShell.tsx` and `src/components/carrier/` **do not exist**; the
> `carrier` environment and the `'3pl'` session tier are gone from `src/lib/auth/rbac.ts` and `src/types.ts`
> (both carry inline `§P9 — REPOINTED` notes saying exactly this); `src/App.tsx` names the removed branch and
> states the two remaining product branches are exhaustive; and
> `scripts/validate-conversion-gate.mjs` asserts the absence, so the surface cannot come back unnoticed.
> **The live tree is the four lines above.** The carrier line is history and is deliberately not restored.

Each shell is `React.lazy()`. `EnvironmentRouter` is the switch.

## 3. Screen inventory (from MERCENTA_FORENSIC_AUDIT.md + inspection)

- **Marketing (7):** Home, How It Works, UK Market Access, For Brands, FAQ,
  Privacy, Terms.
- **Auth (3):** Login, Partner Application Form, Application Received.
- **Brand (15):** Dashboard, Onboarding Wizard, Onboarding Summary, Product
  Catalog, Contracts, Purchase Orders, Logistics Hub, Compliance Hub, Sales
  Analytics, Market Intelligence, Returns, Reports, Documents & Account,
  Support & Team, Social Accounts, Settings (9 tabs).
- **Admin (24):** Dashboard (dept-filtered), Brand CRM, Fulfillment Track,
  Retail Pipeline, Purchase Orders, Logistics Control, Carrier Monitor,
  Global Catalog, Compliance Approvals, Billing, Contract Cycle,
  Communications, Helpdesk, Returns Tracking, Monitoring, Marketing Hub,
  Brand Intelligence, Super Admin (11 sub-tabs), Audit Log, Integration
  Settings, Onboarding Tours, Rocket.Chat, Social Media, WhatsApp Escalation.
- **Carrier (3):** Manifest Management, BAK Logistics Hub, API Auditor.

## 4. State domains

`GlobalStateContext` (452 lines) is broad. Domains identified:

- environment, role, session (RBAC tier + tenant pinning)
- shipments (+ status updates)
- products (+ add)
- activityLogs (+ add)
- leads (+ status), campaigns
- apiLogs (+ add)
- brandProfile, gateDocs, generatedAgreement
- carrierContext, staff (+ CRUD + tier), actingStaff/`canCurrentUserMutate`
- demoRegion, financials, complianceDocs, carrierTokens

Separate context: `IntegrationsContext` (integration state + connect flow,
localStorage-persisted).

## 5. Data layer

- `src/data/api.ts` (1448 lines) — API contract layer; `src/data/queries.ts`
  — TanStack Query hooks.
- `src/data/demoStore.ts` (767 lines) — in-memory demo domain store;
  `src/data/bootstrap.ts` — lazy-loaded seed data.
- `src/lib/` — domain libs: spapi, billing, crm, compliance, discovery,
  intelligence, research, rocketchat, whatsapp, postiz, usertour, events,
  helpdesk, verification, shipping, monitoring, mail, messaging.
- `src/services/xero/` — Xero provider (client, sync engine, token manager,
  reseed, demo data).
- `src/lib/supabase.ts` — Supabase client bootstrap.

## 6. Integration architecture (current + target)

**Current (verified):**
- `src/integrations/registry.ts` — 15 definitions (Amazon SP-API, Amazon Ads,
  Stripe, esignature, email, lead_sourcing, openrouter, hunter, instantly,
  keepa, firecrawl, usertour, rocketchat, twilio_whatsapp, postiz).
- `IntegrationsContext` — `startConnect / failConnect /
  completeSandboxConnect / completeApiKeyConnect / oauthCodeReceived /
  disconnect`; `sandbox` flag; `isConnected()` = non-sandbox only.
- `IntegrationsPanel` — grid of cards + generic ConnectWizard.
- SP-API provider trio: `client.ts` (real, Edge-Function transport),
  `mockClient.ts` (same signatures, deterministic), `index.ts` (factory).

**Target (this redesign):**
- Provider/per-integration classes implementing stable contracts.
- Registration: provider + status + health + config in one registry.
- Setup wizards: reusable multi-step (intro → auth → config → scopes →
  test → health → activate).
- Health checks: connected, auth valid, last sync, last error, count.
- Mode model: SIMULATION / AVAILABLE / CONFIGURING / LIVE / DEGRADED /
  ERROR / DISABLED.
- Integrations Hub in Super Admin.

## 7. RBAC (verified enforcement chain)

`tierForRole` → `canAccessEnvironment` → `canAccessView` (VIEW_ALLOWLIST) →
`filterNavForTier`; tenant pinning via `assertBrandScope` /
`isCrossTenantAccess`; staff mutation via `staffCanMutate`.

## 8. Known baseline defects (documented — RESOLVED)

Both former baseline typecheck failures are **RESOLVED** at HEAD (`npm run typecheck` — `tsc --noEmit -p
tsconfig.app.json` — exits 0):

| File | Status |
|---|---|
| `src/lib/intelligence/outreachGenerator.ts` | Fixed 2026-09-08 — typecheck green; dead file left in tree (not in the Vite build graph). |
| `src/components/admin/XeroConnection.tsx` | **REMOVED in Phase 1 (2026-09-16)** — dead duplicate component (0 importers); Xero lives in `AccountingPanel.tsx`. |

Consequence: `npm run build` passes and `npm run typecheck` exits 0 at HEAD. **Corrected 2026-09-29 (Batch 2d):**
this section previously cited bare `npx tsc --noEmit`, which at the repository root checks almost nothing (the root
`tsconfig.json` has `files: []` and only references). The claim was vacuous, not evidence — the authoritative command
is `npm run typecheck`.

## 9. Performance invariants (must not regress)

- 14 KB main chunk; vendor chunks: react 138 KB, recharts 305 KB,
  supabase 126 KB, sentry 493 KB (deferred), lucide 52 KB.
- Seed data lazy-loaded off critical path; fonts non-blocking; gzip/brotli +
  far-future caching in `.htaccess`.
- Do not eagerly import large libraries; keep Recharts lazy.