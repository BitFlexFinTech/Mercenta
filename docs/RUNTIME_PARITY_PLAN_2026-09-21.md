# RUNTIME PARITY PLAN — make the new product the runtime reached by `npm run dev`


> **§BATCH 5 (2026-10-10) — HISTORICAL: MERCENTA SOCIAL WAS REMOVED.** This dated record names the Mercenta
> Social feature (the Postiz engine and its admin control centre, the brand surface, the `social-session` Edge
> Function, `scripts/social-sso/`, and the `e2e/embedded-social.spec.ts` /
> `scripts/validate-e7-embedded-social.mjs` guards). All of it was DELETED on the owner's instruction, and
> `scripts/validate-retired-platforms.mjs` §2c now asserts its ABSENCE. The record is preserved as history;
> any Social-specific statement in it no longer describes the current product.

> ## ⚠ NOTE (§BATCH 4, 2026-10-10) — SOME REFERENCES BELOW ARE HISTORICAL
> This is a dated plan record (2026-09-21) and is preserved as history. Every reference it makes to the **Mercenta
> Brain** (the `brain-canvas` proof, the `admin nav → Mercenta Brain` row, `/admin/brain` as a cold-load proof, the
> `BrandRelationshipMap` table row) describes a surface **REMOVED on 2026-10-10** by owner instruction
> (`docs/NEXT_BUILD_PLAN_2026-10-10.md` Part 2.5). The parity mechanisms the plan introduced (the address layer, the
> runtime-entry spec, fail-closed routing) are **unchanged and still live**; only the Brain references are historical.


> **Status: EXECUTED — R1 → R5 COMPLETE (2026-09-21, session 5).**
> Written 2026-09-21 on branch `redesign/foundation` (HEAD `22b6b62`) as a PLAN-ONLY deliverable, then executed in the
> following session on the SAME branch with the dirty Founder worktree **preserved**. The Founder brief for the
> execution session answered the plan's blocking decisions: **do not change what `/` renders** (D-4/D-7), **preserve
> the dirty tree and do not commit unless explicitly told** (D-0), **pure module, not a router library** (D-6), **keep
> the login entry, no zero-click dev auto-sign-in** (D-1), and **persist the tour progress rather than suppress the
> tour** (D-5). D-2 (session persistence) was required by the brief's own §12 ("normal application route persistence
> is expected") and was implemented with `sessionStorage` + RBAC re-validation.
>
> **Execution result (verified, not claimed):**
> `npm run validate:product-routes` → 68 PASS / 0 FAIL · `e2e/runtime-entry.spec.ts` → 7 passed ·
> FULL SUITE → 442 declarations, 440 passed / 0 failed / 2 skipped, exit 0 · `tsc` 0 errors · `eslint .` 0 problems ·
> `npm run build` PASS. Beyond the plan, the session also (a) seeded deterministic SIMULATED consignments so the
> Logistics Hub is inspectable, (b) reconciled Founder decision T-1 (Payoneer default / Wise secondary) across all
> five sources, (c) fixed a nav item that rendered the wrong surface, and (d) ran the control-determinism audit.
> See `PROJECT_STATUS.md` (current position block) and `HANDOFF.md` (session 5) for the full record.


---

## 0. The question this plan answers

The brief: *"Make the new Mercenta product (Brain, Logistics Hub, redesigned
workspaces) the actual runtime reached by `npm run dev`, replacing the old
presentation layer."*

The investigation found that **the new product is already reachable and already
renders** — but only after clicking through the public marketing site, at a URL
that never changes, with no persistence. So the defect is **not** "the new
product is not wired up". The defect is the **entry point and the addressing
layer**. This plan is scoped accordingly.

---

## 1. What the browser actually does today (verified, not inferred)

### 1.1 The chain, end to end

```
npm run dev  →  vite (:5173)
             →  index.html
             →  src/main.tsx
             →  src/App.tsx  →  AppContent()
             →  switch (environment)   ← from GlobalStateContext
```

`src/context/GlobalStateContext.tsx:148`

```ts
const [environment, setEnvironment] = useState<Environment>('home');
```

`src/App.tsx:23-31`

| `environment` | renders |
|---|---|
| `'home'` \| `'login'` | `<HomeShell />` → marketing `Home` **or** `Login` (`HomeShell.tsx:18-22`) |
| `'brand'` | `<BrandShell />` |
| `'admin'` | `<AdminShell />` |
| anything else | `<CarrierShell />` |

### 1.2 Live observations (Playwright against the real dev server)

| Step | Observed `h1` | Observed URL |
|---|---|---|
| open `http://localhost:5173/` | "Your brand, listed, ordered **and paid** — without the infrastructure." | `/` |
| click **Partner Login** | login screen | `/` |
| click card **Super Admin — Tadii** | "Operations Overview" | `/` |
| admin nav → **Mercenta Brain** | Brain canvas renders (`brain-canvas`, >50 `brain-node-*`) | `/` |
| admin nav → **Logistics Control** | "Logistics Control" | `/` |
| **press F5** | *back to the marketing hero* | `/` |
| **press Back** | `about:blank` | — |

Screenshots captured this session: `/tmp/mxa/01-home.png`,
`admin-01-overview.png`, `admin-05-mercenta-brain.png`,
`admin-41-logistics-control.png`, `brand-01-dashboard.png`,
`brand-21-contracts.png`, `zoom-brain-full.png`.

**Read that table again.** The product works. What fails is that the product
**has no address and no memory** — so a refresh throws the user out of it, and
the address bar always reads `/` whether you are in the Admin Hub, the Brand
Portal or the public site.


---

## 2. Root cause — four distinct defects, not one

### D1 — The dev entry is the marketing site, not the product

`environment` initialises to the literal `'home'`
(`GlobalStateContext.tsx:148`). There is no dev-only default and no way to
address a product environment directly. Therefore **every** `npm run dev` starts
on the public marketing homepage, and the only route into the product is
clicking **Partner Login** (`src/components/marketing/Home.tsx:158`,
`openPortal → setEnvironment('login')`) and then a one-click demo card
(`src/components/auth/Login.tsx:259`, `signIn(login.environment, login.role)`).

### D2 — The product has no URL

```
$ grep -rn 'pushState|replaceState' src --include='*.tsx' --include='*.ts'
src/components/marketing/Home.tsx:147:  window.history.pushState({ page: target }, '', meta.path);
```

**Exactly one hit in the whole application, and it is for the PUBLIC marketing
pages only.** No product environment ever writes to the address bar. Consequences:

- the URL is `/` in the Admin Hub *and* in the Brand Portal *and* on the public
  site — the address bar cannot be used to tell where you are;
- you cannot link, bookmark, share or reload into a product surface;
- `src/components/shared/RouteMetadata.tsx` already contains the right logic —
  it marks `brand`/`admin`/`carrier` as `private → noindex, nofollow` and
  re-applies on `popstate` and on an `environment` change — but it keys off
  `window.location.pathname` (`RouteMetadata.tsx:26`), and that path never
  changes, so it always evaluates `/`.

### D3 — Reload = silent sign-out

`environment`, `role` and `session` are all plain `useState`
(`GlobalStateContext.tsx:148-151`). A grep for `localStorage|sessionStorage`
inside that file returns **0 hits**. Nothing about the session is persisted, so:

- **F5 silently signs the user out and drops them on the marketing homepage**,
  with no message and no explanation;
- Back/Forward cannot return to a product surface (observed: `about:blank`).

This is the single most likely reason the Founder's own testing concludes *"npm
run dev still shows the old Mercenta"*: the new product **is** reached, and then
the first refresh makes it vanish.

### D4 — The brand tour re-opens on every reload (compounding)

- `TourEngine`'s progress store is a **module-level `Map`**, not persisted:
  `src/components/shared/TourEngine.tsx:23`
  `const tourProgressMap = new Map<string, TourProgress>();`
- `TourEngine.tsx:393-401` auto-starts the `orientation` tour whenever
  `isBrandPortal && brandId && !isTourDoneOrSkipped(brandId, 'orientation')` and
  no tour progress exists at all.
- `BrandShell.tsx:178` mounts `<TourLoader currentView={brandView} isBrandPortal />`
  on **every** brand view.

Because the Map dies with the page, the tour auto-opens again **after every F5**
over the brand portal. Observed in `brand-01-dashboard.png`. Admin is unaffected —
`AdminShell.tsx` never mounts `TourLoader`.

---

## 3. Corrections to earlier assumptions (stated for honesty)

Two hypotheses carried into this session were **wrong** and are corrected here,
with the evidence, because the plan depends on the corrected picture.

### 3.1 "Brain and Logistics Hub are unreachable" — FALSE

Both are top-level navigation destinations and both render live surfaces:

- `src/components/layout/AdminShell.tsx:70` — nav item `{ id: 'brain', label: 'Mercenta Brain' }`
- `src/components/layout/AdminShell.tsx:257` — `{adminView === 'brain' && (isSuper ? <MercentaBrain onNavigate={setAdminView} /> : <AccessDenied />)}`
- `src/components/layout/AdminShell.tsx:113` — nav item `{ id: 'logistics', label: 'Logistics Control' }`
- `src/components/layout/AdminShell.tsx:273` — `{adminView === 'logistics' && <LogisticsControl />}`
- `src/components/layout/BrandShell.tsx:66,155` — brand `logistics` → `<LogisticsHub />`

### 3.2 "Several admin components are orphans" — FALSE

A repo-wide orphan sweep (every `src/components/{admin,brand,carrier,marketing,shared,layout,auth}/*.tsx`
basename grepped across `src/` and `e2e/`) returned **exactly two** orphans:

```
ORPHAN: FcSelector      (src/components/shared/FcSelector.tsx)
ORPHAN: InfoTooltip     (src/components/shared/InfoTooltip.tsx)
```

Every previously-suspected "orphan" is referenced. They are reachable as **tabs
inside one page**, not as top-level destinations:

| Component | Referenced by |
|---|---|
| `CommandCentre` | `src/components/admin/AdminDashboard.tsx:774` |
| `AccountingPanel` | `SuperAdminPanel.tsx:79,701` (+ a comment in `integrations/registry.ts:223`) |
| `LaunchCentre` | `SuperAdminPanel.tsx:85,749` |
| `HomepageEditor` | `SuperAdminPanel.tsx:71,709` |
| `RakazoPanel` | `SuperAdminPanel.tsx:80,705` |
| `CommercialModelsPanel` | `SuperAdminPanel.tsx:84,730` |
| `CompanyControlCentre` | `SuperAdminPanel.tsx:86,752` |
| `CompliancePanel` | `SuperAdminPanel.tsx:82,746` |
| `OperatingCostsPanel` | `SuperAdminPanel.tsx:88,758` |
| `ApplicationsPanel` | `SuperAdminPanel.tsx:78,697` |
| `GoogleSetupWizard` | `SuperAdminPanel.tsx:87,755` |
| `GrantsInvestorsSection` / `InvestorPitchSection` / `ManufacturerSourcingSection` / `ProductResearchSection` / `BankFinancingSection` | `SuperAdminPanel.tsx:74-76,713-734` |
| `BrandCrmDepth`, `AcquisitionRelationships` | `src/components/admin/BrandCRM.tsx` |
| `DeductionsLedger` | `BrandReports.tsx`, `SalesAnalytics.tsx` |
| `BrandRelationshipMap` | `BrandIntelligence.tsx` |
| `MercentaSocial` | `BrandSocialConnect.tsx` |

### 3.3 "`AppShell` / `Sidebar` are dead competing implementations" — FALSE

They are the **live chrome** for all three product environments:

- `AppShell.tsx:5` imports `Sidebar`; `AppShell.tsx:184` renders it.
- `AppShell.tsx:7,197` renders `EnvironmentRouter` in the footer.
- Consumers: `AdminShell.tsx:237`, `BrandShell.tsx:139`, `CarrierShell.tsx`.

### 3.4 The corrected finding

**There is no "orphaned new product" to wire up.** The product is reachable and
renders. What is missing is an **entry point, an address and a memory**. The real
IA finding is narrower and sharper than the earlier hypothesis, and it changes
the fix completely: nothing needs to be moved or re-mounted — a route/addressing
layer needs to be added, and the session needs to survive a refresh.


---

## 4. Destination audit — every major destination, current runtime page, reachable?

Legend for **Today's URL**: every single row reads `/`. That is D2, and it is why
the table's last column is identical everywhere.

### 4.1 Admin Hub — 31 destinations (`AdminShell.tsx`)

| # | Nav label | Rendered component | Render line | Reachable today | Today's URL | Proposed URL |
|---|---|---|---|---|---|---|
| 1 | Overview | `AdminDashboard` (→ `CommandCentre` at `:774`) | 249 | ✅ | `/` | `/admin/overview` |
| 2 | Control Centre | `FounderControlCentre` (Super only) | 253 | ✅ Super | `/` | `/admin/control-centre` |
| 3 | **Mercenta Brain** | `MercentaBrain` (Super only) | 257 | ✅ Super | `/` | `/admin/brain` |
| 4 | Work Management | `AdminWorkManagement` | 259 | ✅ | `/` | `/admin/work` |
| 5 | Calendar | `AdminWorkCalendar` | 260 | ✅ | `/` | `/admin/calendar` |
| 6 | Brand CRM | `BrandCRM` | 261 | ✅ | `/` | `/admin/crm` |
| 7 | Onboarding | `OnboardingPipeline` | 262 | ✅ | `/` | `/admin/onboarding` |
| 8 | Marketing | `MarketingHub` | 276 | ✅ | `/` | `/admin/marketing` |
| 9 | Ad Spend | `AmazonAdsDashboard` | 277 | ✅ | `/` | `/admin/amazon-ads` |
| 10 | Brand Intelligence | `BrandIntelligenceStrategyPanel` + `ProductDiscoveryPanel` + `RegionalPriorityPanel` + `OpportunityDiscoveryPanel` + `BrandIntelligencePanel` | 278-291 | ✅ Super | `/` | `/admin/brand-intelligence` |
| 11 | Global Catalog | `CatalogManagerAdmin` | 272 | ✅ | `/` | `/admin/catalog` |
| 12 | Fulfillment Track | `FulfillmentTrackPanel` | 263 | ✅ | `/` | `/admin/fulfillment` |
| 13 | Retail Pipeline | `RetailPipelinePanel` | 264 | ✅ | `/` | `/admin/retail-pipeline` |
| 14 | Purchase Orders | `AdminPurchaseOrderList` | 265 | ✅ | `/` | `/admin/purchase-orders` |
| 15 | Returns Tracking | `ReturnsTrackingDashboard` | 270 | ✅ | `/` | `/admin/returns` |
| 16 | Billing | `BillingPanel` | 266 | ✅ | `/` | `/admin/billing` |
| 17 | Contract Cycle | `ContractsAdminPanel` | 267 | ✅ | `/` | `/admin/contracts` |
| 18 | **Logistics Control** | `LogisticsControl` | 273 | ✅ | `/` | `/admin/logistics` |
| 19 | Carrier Monitor | `CarrierIntegrationMonitor` | 274 | ✅ | `/` | `/admin/carriers` |
| 20 | Compliance Approvals | `ComplianceApprovals` | 275 | ✅ | `/` | `/admin/compliance` |
| 21 | Messages | `MessagesHub` | 268 | ✅ | `/` | `/admin/messages` |
| 22 | Helpdesk | `HelpdeskDashboard` | 269 | ✅ | `/` | `/admin/helpdesk` |
| 23 | Monitoring | `MonitoringDashboard` | 271 | ✅ | `/` | `/admin/monitoring` |
| 24 | Super Admin | `SuperAdminPanel` (15 tab components) | 292 | ✅ Super | `/` | `/admin/super-admin` |
| 25 | Audit Log | `AdminAuditLog` | 296 | ✅ Super | `/` | `/admin/audit-log` |
| 26 | Onboarding Tours | `UsertourAdminPanel` | 298 | ✅ | `/` | `/admin/usertour` |
| 27 | Integration Settings | `IntegrationsPanel` | 297 | ✅ Super | `/` | `/admin/integrations` |
| 28 | Social Media | `PostizAdminPanel` | 299 | ✅ | `/` | `/admin/postiz` |
| 29 | WhatsApp | `WhatsAppAdminPanel` | 300 | ✅ | `/` | `/admin/whatsapp` |
| 30 | Founder Investor Centre | `FounderInvestorCentre` | 294 | ✅ Super | `/` | `/admin/founder` |
| 31 | Partnerships & Fundraising | `PartnershipsCentre` | 295 | ✅ Super | `/` | `/admin/partnerships` |

Nav items 24-31 are hidden from non-Super-Admin sessions by
`HIDDEN_FOR_NON_SUPER` (`AdminShell.tsx:174-193`) **and** guarded again at render
(`:292-297`) — that defense-in-depth must be preserved by the route layer: a
non-Super Admin session that types `/admin/super-admin` must still get
`<AccessDenied />`, not the panel.


### 4.2 Brand Portal — 19 destinations (`BrandShell.tsx`)

| # | Nav label | Rendered component | Render line | Reachable today | Today's URL | Proposed URL |
|---|---|---|---|---|---|---|
| 1 | Dashboard | `BrandDashboard` | 149 | ✅ | `/` | `/brand/overview` |
| 2 | Onboarding & Legal | `OnboardingSummary` \| `OnboardingWizard` | 150 | ✅ | `/` | `/brand/onboarding` |
| 3 | Product Catalog | `ProductCatalog` | 151 | ✅ | `/` | `/brand/catalog` |
| 4 | Commercial Readiness | `CommercialReadiness` | 152 | ✅ | `/` | `/brand/commercial-readiness` |
| 5 | Purchase Orders | `BrandPurchaseOrders` | 154 | ✅ | `/` | `/brand/purchase-orders` |
| 6 | Returns | `BrandReturns` | 159 | ✅ | `/` | `/brand/returns` |
| 7 | **Inbound Shipments (Logistics Hub)** | `LogisticsHub` | 155 | ✅ | `/` | `/brand/logistics` |
| 8 | UK Compliance | `ComplianceHub` | 156 | ✅ | `/` | `/brand/compliance` |
| 9 | Contracts | `BrandContractView` | 153 | ✅ | `/` | `/brand/contracts` |
| 10 | Tasks & Deadlines | `BrandWorkManagement` | 163 | ✅ | `/` | `/brand/work` |
| 11 | Calendar | `BrandWorkCalendar` | 164 | ✅ | `/` | `/brand/calendar` |
| 12 | Analytics | `SalesAnalytics` | 157 | ✅ | `/` | `/brand/analytics` |
| 13 | Market Intel | `BrandIntelligence` + `BrandAdvertising` + `ListingAnalyzer` + `SalesEstimatorCard` | 169-176 | ✅ | `/` | `/brand/market` |
| 14 | Reports | `BrandReports` | 160 | ✅ | `/` | `/brand/reports` |
| 15 | Documents & Account | `BrandSelfService` | 158 | ✅ | `/` | `/brand/documents` |
| 16 | Support & Cases | `BrandSupport` | 167 | ✅ | `/` | `/brand/cases` |
| 17 | Support & Team | `BrandTeamMessages` | 165 | ✅ | `/` | `/brand/team` |
| 18 | Social (`MERCENTA_SOCIAL.navLabel`) | `BrandSocialConnect` | 168 | ✅ | `/` | `/brand/social` |
| 19 | Settings | `BrandSettings` | 161 | ✅ | `/` | `/brand/settings` |

### 4.3 Carrier terminal — 1 destination (`CarrierShell.tsx`)

| Nav label | Component | Reachable today | Today's URL | Proposed URL |
|---|---|---|---|---|
| Carrier terminal | `CarrierDashboard` / `BakLogistics` | ✅ | `/` | `/carrier/<view>` |

### 4.4 Defects found while auditing the destination table

These are **observed from source during the audit** and are in scope for the
route work because a route layer would otherwise bake them in:

1. **`BrandShell` breadcrumb gap.** The `bc` chain
   (`BrandShell.tsx:119-136`) has no branch for `brandView === 'documents'`, so
   the *Documents & Account* page reports its breadcrumb as **"Analytics"**. The
   nav id and the breadcrumb disagree. One-line fix.
2. **Two nav ids share one breadcrumb label.** `team` → "Support & Team" and
   `cases` → "Support & Cases"; `analytics`, `market` and `reports` all resolve
   to a `BarChart3` icon. Cosmetic, but a route layer makes it permanent.
3. **`RouteMetadata` cannot currently classify a product path.** If a product
   URL (`/admin/brain`) is loaded cold, `environment` is `'home'` on the first
   paint, so `buildRouteMetadata` (`routeMetadata.ts:53-93`) falls through to the
   `kind: 'unknown'` branch → `noindex, nofollow`, **no canonical**, and
   `publicPage: null`. That is *safe* (fail-closed, and it does not point at the
   homepage) but it is not *correct*: a product path should be recognised as
   private from the path alone, without waiting for the session. The route layer
   must therefore teach `resolveRoute` / `buildRouteMetadata` the product
   prefixes — see Stage R1.


---

## 5. The plan — five stages, smallest-change-first

### ⚠️ THE HARD CONSTRAINT that shapes every stage

**`/` must keep rendering the public marketing homepage in `npm run dev`.**

`e2e/helpers/auth.ts → openLogin()` is the shared entry for the entire suite:

```ts
await page.goto('/');
const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
```

**70 spec files** import `e2e/helpers/auth` (verified:
`grep -rl 'helpers/auth' e2e | wc -l` → **70**), and a further 8 specs call
`page.goto('/')` directly. `playwright.config.ts:14-18`
starts the dev server for the suite. The last full-suite run on this branch
recorded **433 passed / 0 failed / 2 skipped**.

> **Therefore: any design in which `npm run dev` at `/` no longer renders the
> marketing homepage will break the entire E2E suite in one stroke.** This is the
> single most important design constraint in the plan, and it is why the dev
> entry (R3) is deliberately *not* "change what `/` renders". The product must
> get its own address; `/` must stay the marketing homepage.

---

### Stage R1 — Give the product an address (URL-driven environment + view)

**Goal:** `/admin/brain`, `/brand/logistics`, `/carrier/...` are real, loadable,
reloadable, linkable addresses. `setEnvironment` writes the URL; the URL drives
`environment`.

**New file — `src/lib/runtime/productRoutes.ts`** (pure, no DOM, no React):

```ts
export const PRODUCT_ENVIRONMENT_PREFIXES = {
  admin: '/admin',
  brand: '/brand',
  carrier: '/carrier',
} as const;

/** Parse a pathname into a product environment + view. Fail-closed. */
export function parseProductPath(pathname: string):
  { environment: 'admin' | 'brand' | 'carrier'; view: string | null } | null;

/** Build the canonical path for an environment + view. */
export function buildProductPath(environment: 'admin' | 'brand' | 'carrier', view?: string | null): string;
```

Rules it must obey:

- **Fail closed:** an unknown segment returns `null`, never a guessed
  environment (mirrors `isProviderSimulationSafe` and
  `checkCommercialModelSelection` — an unknown state is never defaulted).
- Pure, so a validator can assert its decisions directly — the same pattern
  `buildRouteMetadata` already uses (`routeMetadata.ts:3-8`).

**Edits (4 files, all additive):**

1. `src/context/GlobalStateContext.tsx`
   - line 148: `useState<Environment>('home')` → initialise from
     `parseProductPath(window.location.pathname)` (see R2 for the full resolver).
   - `setEnvironment` (line 202) → also `window.history.pushState` to
     `buildProductPath(env, currentView)`; and add a `popstate` listener so
     Back/Forward moves between product views instead of leaving the app.
   - The RBAC gate at line 196 (`canAccessEnvironment`) is **unchanged and stays
     the only way a session is created.**
2. `src/components/layout/AdminShell.tsx`
   - `useState('overview')` (line 161) → derive `adminView` from the URL, and
     `setAdminView` writes the URL. Keep the existing render guards untouched.
3. `src/components/layout/BrandShell.tsx`
   - `useState('overview')` (line 104) → same treatment.
4. `src/lib/seo/routeMetadata.ts` (and/or `src/lib/seo/publicRoutes.ts`)
   - Teach the resolver the product prefixes so a **cold** load of
     `/admin/brain` is `kind: 'private'` (noindex, no canonical) **from the path
     alone**, instead of `kind: 'unknown'` (see §4.4 item 3). Keep
     `e2e/seo-foundation.spec.ts` green.

**Why this stage is first:** it removes the need for a second, parallel
persistence mechanism for the *view* — the URL already is the persistence. It
also makes Back/Forward work for the first time.

**Cost estimate:** 1 new pure module (~60 lines) + ~4 targeted edits.

**Risk:** `e2e/app-shell.spec.ts`, `redesign-surfaces.spec.ts` and any spec that
asserts `page.url()` — must be checked before and after. Mitigation: run the full
suite, not a targeted subset (the last checkpoint already proved the full suite
runs in this project).


---

### Stage R2 — Make the session survive a refresh

**Goal:** F5 in the Admin Hub stays in the Admin Hub. F5 in the Brand Portal
stays in the Brand Portal. No silent sign-out.

**Design decision — `sessionStorage`, not `localStorage`, and re-validated:**

| Choice | Why |
|---|---|
| `sessionStorage` | A demo session should die with the tab. `localStorage` would leave one Founder's demo session alive for the next person on the same machine — a tenant-isolation hazard in a multi-tenant product. |
| Re-validate on restore | The restored value is passed through the **same** `canAccessEnvironment(tier, env)` allowlist (`GlobalStateContext.tsx:196`) that `signIn` uses. A tampered, stale or hand-edited value falls back to `'home'`. **Fail-closed, never trusted.** |
| Never restore a tenant id without a session | `session.tenantId` is restored only alongside the tier+role that the allowlist accepted. A brand id with no accepted tier is discarded. |

**New file — `src/lib/runtime/sessionPersistence.ts`:**

```ts
const KEY = 'mercenta.session.v1';
export function readPersistedSession(): PersistedSession | null;   // fail-closed: null on any malformed value
export function writePersistedSession(s: PersistedSession | null): void;
export function clearPersistedSession(): void;
```

**Edits (1 file): `src/context/GlobalStateContext.tsx`**

- Initialise `environment`, `role`, `session` from `readPersistedSession()`,
  re-validated through `canAccessEnvironment`.
- `signIn` (line 200-202) and the four activation paths
  (`activateDemoBrand` :254, `activateOnboardingBrand` :308, `activateDemo` :322)
  → call `writePersistedSession(...)`.
- `signOut` (line 258-261) → `clearPersistedSession()`.

**Cost estimate:** 1 new pure-ish module (~50 lines) + ~6 targeted edits in one
file.

**Risk — must be stated plainly:** persisting a session is a security-shaped
change. It is only acceptable because (a) it is `sessionStorage`, (b) it is
re-validated through the existing RBAC allowlist on every restore, and (c) this
is a demo/simulation-first platform whose sessions are demo cards, not real
credentials. **If the Founder is not comfortable with this, the alternative is to
do only R1 + R3 and accept that F5 returns to the login screen rather than the
marketing homepage** — a much smaller change with most of the benefit. This is
Founder decision **D-2** in §7.

---

### Stage R3 — `npm run dev` reaches the product (without breaking the suite)

**Goal:** opening the dev server lands you in the new product, and `/` still
renders the marketing homepage for the E2E suite.

**Design — one click, at a real address, no fabricated session:**

1. `package.json` script change (single line):
   `"dev": "vite --open /admin/overview"` — **or** a second, additive script
   `"dev:product": "vite --open /admin/overview"` and leave `dev` untouched.
   **Founder decision D-4.**
2. Cold-load behaviour of `/admin/<view>` with **no** session: `environment`
   resolves to `'login'` and the requested destination is remembered, so after
   the one-click demo card you land on the **requested** view, not `overview`.
   This uses the canonical `signIn` path and creates **no** session of its own.
3. `npm run dev` therefore becomes: **dev server opens → Login screen → one
   click "Super Admin — Tadii" → the Admin Hub at `/admin/overview`.** From then
   on, F5 keeps you there and Back/Forward navigate product views.

**Explicitly rejected (and why):** a dev-only auto-sign-in that fabricates a
Super Admin session on cold load. It would put session-creation code in the
shipped application, it would be one `import.meta.env.DEV` mistake away from a
production auth bypass, and it is unnecessary — the login screen is one click.
**If the Founder wants zero clicks, that is Founder decision D-1**, and the
honest way to do it is a Vite dev-only plugin / `index.html` dev script that
calls the *existing* login helper — never new auth logic in `src/`.

**Why this does not break the suite:** `openLogin()` does `page.goto('/')` and
`/` is untouched. Verified by construction; **must still be verified by a full
suite run** before this stage is reported done.


---

### Stage R4 — Stop the brand tour re-opening over the portal on every load

**Goal:** a tour the user has completed or skipped stays completed/skipped across
a refresh; the overlay stops appearing over the brand dashboard on every load.

**Edits (1 file): `src/components/shared/TourEngine.tsx`**

- `tourProgressMap` (line 23) stays the in-memory reactive store, but is
  **seeded from and written through** a persisted per-brand record
  (`sessionStorage`, key `mercenta.tour.<brandId>`, same shape as
  `TourProgress` in `src/types.ts` — **no new shape, no duplicate type**).
- `setTourProgress` (line 36) writes through; module load seeds the Map.
- The auto-start effect (lines 393-401) is **not** weakened — it still fires for
  a genuinely new brand. Only the *progress loss* is fixed. Weakening the effect
  to hide the symptom would be exactly the "remove functionality to make it pass"
  anti-pattern the project forbids.

**Also in scope:** the tour overlay is not permanently dismissible by design and
covers the brand dashboard on first visit. Confirm with the Founder whether the
brand portal should show it at all on a demo login (Founder decision **D-5**).

**Cost estimate:** ~25 lines in one file.

---

### Stage R5 — Gates: prove it, don't claim it

**New validator — `scripts/validate-product-routes.mjs`** + npm script
`"validate:product-routes"`, asserting from **source**, in the same style as
`validate:workspace-shell` (92 PASS / 0 FAIL):

1. `parseProductPath` / `buildProductPath` round-trip for all three environments
   and an unknown segment (unknown → `null`, never a guess).
2. Every nav id declared in `ADMIN_SECTIONS` (`AdminShell.tsx`) and
   `BRAND_SECTIONS` (`BrandShell.tsx`) has a corresponding render branch — i.e.
   **no nav item can lead to a blank view**. (This is a real class of bug: a nav
   id with no `{view === 'x' && ...}` branch renders an empty page silently.)
3. `grep` assertion that the only writer of `environment` is
   `GlobalStateContext`, and that `setEnvironment` is never called with a literal
   from a component.
4. `grep` assertion that `canAccessEnvironment` still gates every session
   creation path.

**New spec — `e2e/runtime-entry.spec.ts`:**

- cold-load `/admin/brain` → Brain canvas visible (not the marketing homepage);
- cold-load `/brand/logistics` → Logistics Hub visible;
- **F5 in place** → still on the same view (this is the regression test for D3);
- **Back/Forward** → moves between product views;
- `goto('/')` → **still the marketing homepage** (the guard for the hard
  constraint in §5);
- non-Super-Admin session typing `/admin/super-admin` → `AccessDenied`, not the
  panel (proves the route layer did not bypass the render guard).

**And the mandatory five UI checks (project rule 06) before any UI stage is
reported done:**

1. `eslint` with `react-hooks/rules-of-hooks` + `exhaustive-deps` = error → run
   over every touched file.
2. **Smoke-render every route** — all 31 admin + 19 brand + 1 carrier views,
   rendered with realistic seed data, asserting no throw. Compiling is not
   rendering.
3. **Dataset completeness** — any listing screen's rendered count matches its
   canonical dataset (e.g. Brand CRM must show all seeded brands, not a subset;
   if a curated subset is intentional it must be stated, never silent).
4. **Name-implies-capability** — `BrandCRM`, `MessagesHub`, `ComplianceHub`,
   `LogisticsHub`, `MarketingHub` must implement their named capability inline,
   not redirect to another screen. `BrandCRM` looks compliant (it composes
   `BrandCrmDepth` + `AcquisitionRelationships`); each hub must be checked
   individually.
5. **Interactivity** — every summary/metric card opens to more detail on click.


---

## 6. The routing weakness, called out explicitly (as the brief asked)

**Today's routing model is: React state, in memory, with no URL and no
persistence.**

```
environment : useState('home')     ← in-memory, not persisted, not addressable
view        : useState('overview') ← in-memory, not persisted, not addressable
URL         : always "/"           ← written ONLY by public marketing pages
```

This is not a small omission — it is the structural reason the Founder's own
manual testing cannot see the new product:

| Consequence | Evidence |
|---|---|
| Refresh loses the product | F5 → marketing hero (live observation) |
| Back/Forward cannot return | Back → `about:blank` (live observation) |
| No link can be shared or bookmarked | URL identical in all three environments |
| SEO layer cannot tell where it is | `RouteMetadata.tsx:26` reads a path that never changes |
| A screenshot cannot be tied to a page | no address in the URL bar |
| A bug report cannot name a page | same reason |

**Proposed fix scope (bounded, deliberately small):**

| In scope | Out of scope (explicitly) |
|---|---|
| A pure route module (`productRoutes.ts`) as the single source of truth for product paths | Introducing `react-router` / any routing library — the project has none, and adding one is an architectural decision the Founder must make |
| `environment` + view derived from the URL | Server-side routing / SSR |
| `pushState` + `popstate` in `GlobalStateContext` | Changing any visual styling, layout, font or colour |
| Teaching `routeMetadata.ts` the product prefixes | Touching the public marketing routes or `publicRoutes.ts` public entries |
| `sessionStorage` session persistence, re-validated by RBAC | Any change to `canAccessEnvironment` or the tier allowlists |
| Tour progress persistence | Any change to tour content or the auto-start policy |

**Why no routing library:** the product already has a canonical route SSOT
(`src/lib/seo/publicRoutes.ts`) and a canonical metadata writer
(`routeMetadata.ts`). Adding `react-router` would create a **second** routing
authority — a single-source-of-truth violation. A ~60-line pure module extends
the existing SSOT instead. If the Founder prefers a library, that is a separate,
explicit architectural decision (**D-6**), and it is a much larger change.


---

## 7. Decisions required from the Founder before any edit

**This plan is blocked on six answers.** No edit will be made until they are
given. Each is a real fork in the design, not a formality.

### ⛔ D-0 (BLOCKING, must be answered first) — the dirty worktree

> **[HISTORICAL — RETIRED GATE, 2026-09-21 rule migration.]** The "uncommitted changes → STOP and ask whether to
> commit" rule quoted below has been **retired** and must not gate work again: a dirty worktree is not a stop.
> See `.clinerules/operating-model.md` §2 and §6. The section is retained as a historical record of the session that
> wrote this plan.

```
$ git status --porcelain | wc -l
270
$ git log --oneline -3
22b6b62 (HEAD -> redesign/foundation) feat(redesign): retire the legacy page shell entirely — all 14 backlog surfaces on the canonical workspace
```

There are **270 uncommitted files** on `redesign/foundation`, which are
**Founder work, not mine**. The repository's own protection rule says: *"If there
are uncommitted changes, STOP and tell the user. Ask: 'Should I commit the
current state before I start?' Do NOT proceed until the user says yes."*

**Answer required:** commit the current state first, or authorise me to edit
on top of it. I will not commit 270 files I did not write without an explicit
instruction — and I will not edit on top of them without one either, because a
regression introduced by my stage would be indistinguishable from the existing
uncommitted work.

### D-1 — Zero-click dev entry?

Default in this plan: **one click** (dev opens the Login screen; one click on
"Super Admin — Tadii" enters the Admin Hub). The alternative is a dev-only
auto-entry. **Recommendation: keep the one click.** It needs no session-creation
code in `src/`.

### D-2 — Persist the session across a refresh?

Default in this plan: **yes**, `sessionStorage`, re-validated through
`canAccessEnvironment` on every restore. The smaller alternative is **no** — F5
returns to the Login screen instead of the marketing homepage. **Recommendation:
yes**, because "F5 loses the product" is the defect being fixed.

### D-3 — The two genuine orphans: `FcSelector.tsx`, `InfoTooltip.tsx`

Referenced by nothing in `src/` or `e2e/`. Options: (a) leave them (default —
safest), (b) wire them into the surfaces they were evidently built for,
(c) delete them. **Recommendation: (a) leave them, and record them in
PROJECT_STATUS.md as known-unreferenced.** Deleting is a Founder call.

> **RESOLVED — 2026-09-21, clean-slate reconciliation (option c).** The Founder
> directive that commissioned this reconciliation authorised ordinary removal of
> obsolete material, so both orphans were **REMOVED** (`git rm`), together with the
> `.jsx` orphan `PublicFooterTmp1.jsx`. Evidence for removal, not assumption:
> a repo-wide grep (`src/`, `e2e/`, `scripts/`) returned **zero** importers for each;
> `InfoTooltip`'s single `<button>` had **no handler** (hover-only and
> keyboard-unusable, as the accessibility pass recorded); and the capability
> `InfoTooltip` implied is delivered by the reachable, keyboard-operable
> `src/components/shared/BrandGuidance.tsx`. `FcSelector`'s implied capability
> (a searchable FC list) is delivered by the canonical FC DATA
> (`src/types.ts → DEFAULT_UK_FC_LIST`) plus the PO's `shipToParty.partyId`
> destination, which the logistics map renders. Three registry rows
> (`batch14-fc-selector`, `batch12-info-tooltip`, `batch-4-zod-validation`) were
> **REPOINTED** to the current canonical sources with `§CLEAN-SLATE RECONCILIATION`
> notes, and `scripts/verify-registry.mjs`'s known-file list was updated — no
> validator was weakened. See the completion report in `PROJECT_STATUS.md`.

### D-4 — What `npm run dev` should open

Default in this plan: keep `"dev": "vite"` **unchanged** (so the E2E suite's
`webServer` command at `playwright.config.ts:15` is untouched) and add
`"dev:product": "vite --open /admin/overview"`. Alternative: change `dev` itself
to `vite --open /admin/overview` — which still does **not** change what `/`
renders, so it is safe for the suite. **Recommendation: change `dev` to open
`/admin/overview`, because the brief says "the runtime reached by `npm run dev`"
specifically.** Confirm.

### D-5 — Should the brand tour auto-open at all on a demo login?

Today it does, on every load, over the dashboard. Default in this plan: keep the
auto-start, persist the progress so it only appears once. Alternative: suppress
auto-start for demo logins entirely. **Recommendation: keep it, persist the
progress.**

### D-6 — Route layer: pure module or a routing library?

Default in this plan: **pure module** extending the existing route SSOT
(`publicRoutes.ts` + `routeMetadata.ts`). Alternative: adopt `react-router`.
**Recommendation: pure module** — a library would create a second routing
authority, which violates the single-source-of-truth rule.

### D-7 — Definition of "the old presentation layer"

This plan assumes "the old presentation layer" means **the marketing homepage
being the thing `npm run dev` shows, instead of the product**. If the Founder
instead means **the marketing `Home` component itself should be retired or
replaced**, that is a fundamentally different and much larger task, and this plan
is the wrong plan for it. **Confirm which is meant.**

---

## 8. Risks, stated plainly

| Risk | Severity | Mitigation |
|---|---|---|
| **`/` stops rendering the marketing homepage** → 70 specs import the shared login helper and break at once | **Critical** | R3 is explicitly designed so `/` is untouched. A spec asserts it (`runtime-entry.spec.ts`). |
| URL-derived `environment` lets a URL pick a private environment | High | The URL selects an environment only; `canAccessEnvironment` still gates every session. Render guards (`AdminShell.tsx:292-297`) stay in place. A spec asserts a non-Super-Admin at `/admin/super-admin` gets `AccessDenied`. |
| `sessionStorage` session = a persistence-shaped security change | Medium-High | `sessionStorage` (tab-scoped), RBAC re-validated on every restore, fail-closed to `home` on any malformed value. Founder decision D-2. |
| Playwright specs that assert `page.url()` | Medium | Full-suite run after each stage (the last checkpoint proved 433/0/2 is achievable on this branch). |
| `RouteMetadata`/SEO regression (`e2e/seo-foundation.spec.ts`) | Medium | Extend the resolver, don't replace it; run the SEO spec. |
| `brandView`/`adminView` becoming URL-derived changes hook timing | Medium | Derived in `useState` initialiser + `popstate` effect only; no hook inside a conditional. `rules-of-hooks` = error must stay green. |
| Editing on top of 270 uncommitted Founder files | High | D-0 must be answered first. |


---

## 9. This session — what was done, and what was NOT done

### 9.1 BUILT

- `docs/RUNTIME_PARITY_PLAN_2026-09-21.md` (this document) — created.
- **`PROJECT_STATUS.md` — one ADDITIVE block only**: a new
  "`### 0. PLAN CHECKPOINT — RUNTIME PARITY`" subsection inside the current
  session-4 position block, pointing at this plan and recording the plan
  checkpoint. Nothing existing in that file was changed, removed or reworded.
  It is required by the project's standing *always-maintain-status-file* rule
  (a future session with no memory of this conversation must be able to find
  this plan). **If the Founder wants the plan-only session to leave zero trace
  in `PROJECT_STATUS.md`, say so and this block is reverted — it is additive and
  isolated.**
- Scratch Playwright drivers written under `/tmp/mxa/*.cjs` (outside the repo,
  never part of the project): `admin.cjs`, `brand.cjs`, `orphans2.cjs`,
  `reload.cjs`, `shot.cjs`, `zoom.cjs`.

### 9.2 NOT DONE (deliberately, and it must be said plainly)

- **No file under `src/` was modified.**
- No file was deleted. No file was renamed.
- `package.json` was **not** changed (no `dev:product` script yet).
- No validator or spec was added.
- `HANDOFF.md` was **not** modified. `PROJECT_STATUS.md` received **one additive
  block only** (see §9.1) — nothing existing in it was touched. **The next
  session must fold this plan into PROJECT_STATUS.md heading 3 and into
  HANDOFF.md**, and must not treat this plan as already fully reflected there.
- Nothing was committed. Nothing was pushed. Nothing was deployed. `.env` was
  never read; no credential was activated; no live provider was called.
- **No browser-level visual verification of a fixed state is possible**, because
  nothing was fixed. Every "today" claim in §1-§4 is an observation of the
  *current* state.

### 9.3 TESTED (evidence produced this session)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p tsconfig.app.json` | **exit 0 — 0 errors** |
| Build | `npm run build` | **exit 0 — `✓ built in 3.42s`** |
| Runtime — dev entry | Playwright against `npm run dev` :5173 | `h1` = marketing hero; URL `/` |
| Runtime — product reachable | Playwright: Super Admin nav | Brain canvas renders (`brain-canvas`, >50 nodes); "Logistics Control" renders |
| Runtime — reload | Playwright `page.reload()` | `h1` = marketing hero again (**D3 reproduced**) |
| Runtime — back | Playwright `page.goBack()` | `about:blank` |
| Routing writer count | `grep -rn 'pushState\|replaceState' src` | **1 hit — `Home.tsx:147`, public pages only** |
| Suite exposure to `/` | `grep -rl 'helpers/auth' e2e \| wc -l` | **70 spec files** (+8 specs calling `page.goto('/')` directly) |
| Session persistence | `grep -n 'localStorage\|sessionStorage' src/context/GlobalStateContext.tsx` | **0 hits** |
| Tour progress store | `read TourEngine.tsx:23` | module-level `Map` — **not persisted** |
| Orphan sweep (all component dirs) | basename grep across `src/` + `e2e/` | **2 orphans: `FcSelector`, `InfoTooltip`** |
| Chrome verification | `read AppShell.tsx:5,184,7,197` + 3 consumers | `AppShell`/`Sidebar`/`EnvironmentRouter` are **live**, not dead |

### 9.4 RESULT

**PLAN COMPLETE. IMPLEMENTATION NOT STARTED. BLOCKED ON D-0.**

The brief's premise ("the new product is not the runtime") is **partly
incorrect**, and correcting it is the main value of this session: the product
*is* the runtime for Brain, Logistics Hub and the redesigned workspaces — it is
simply unreachable on a cold start and unaddressable once you are in it. The fix
is an entry/addressing/persistence layer, not a re-wiring of the product.

### 9.5 NEXT (recommended execution order, once D-0..D-7 are answered)

1. **D-0 first.** Commit or authorise. Nothing else happens before this.
2. **R1** — product routes (`productRoutes.ts` + 4 targeted edits). Then:
   `tsc`, `build`, `validate:workspace-shell`, **full Playwright suite**.
3. **R2** — session persistence (1 new module, 1 edited file). Same gates.
4. **R3** — dev entry (`package.json` one-liner). Same gates.
5. **R4** — tour persistence (1 file). Same gates.
6. **R5** — `validate:product-routes.mjs` + `e2e/runtime-entry.spec.ts` + the
   five rule-06 UI checks. Same gates.
7. Fold this plan into `PROJECT_STATUS.md` (heading 3) and `HANDOFF.md`, run
   `scripts/export-review-zip.sh`, then report.

Each stage gets its own BUILT / TESTED / RESULT / NEXT block. No stage is
reported done on typecheck + build alone.

