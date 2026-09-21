> ## ⚠ HISTORICAL DOCUMENT — NO AUTHORITY (marked 2026-09-21)
>
> This file is a **historical record** (audit date 2026-09-07) of an earlier
> version of the product. It is **NOT an active operating rule** and MUST NOT be
> used to gate, block, delay or reverse current work.
>
> - Canonical operating model: **`.clinerules/operating-model.md`**
> - Current project position: **`PROJECT_STATUS.md`** (+ `HANDOFF.md`)
> - Business invariants: **`.clinerules/mercenta-business-model.md`**
> - Granular capability matrix: **`requirements-registry.json`**
>
> Component counts, portal structure, screenshot and UX findings below describe the
> product **as it was in September 2026** (and refer to the pre-rename source path
> `~/Desktop/Mercenta/`). They have been superseded by the redesign, Brain,
> Logistics Hub and workspace work. Any instruction in this file that conflicts
> with the canonical operating model is **EXPIRED** and has no effect.

---
# MERCENTA — FRONTEND UX/UI FORENSIC AUDIT

**Audit Date:** 2026-09-07
**Environment:** https://demo.mercenta.co.uk/
**Source:** /Users/tadii/Desktop/Mercenta/
**Status:** COMPLETE — evidence collected, no modifications made

---

## 1. EXECUTIVE SUMMARY

B2B wholesale distribution platform connecting independent brands with UK retail channels. Built with React 18, TypeScript, Vite, Tailwind CSS, Recharts. ~100+ components, ~20K lines TSX across 4 portals: Marketing, Brand, Admin, 3PL Carrier.

**Overall Assessment Score: 5.5 / 10**

The application has a strong dark-themed identity with brass/gold accents but exhibits significant visual inconsistency, generic SaaS patterns, and a design system that has drifted across dozens of development iterations. Recent performance work (code splitting, deferred Sentry, font optimization) is commendable.

| Dimension | Score | Key Issue |
|-----------|:-----:|-----------|
| Visual Design | 5 | Excessive cards, weak hierarchy, template-like |
| UX | 6 | Functional but clunky; high cognitive load |
| IA | 6 | 24-item admin nav is overwhelming |
| Interaction | 5 | No loading/confirmation/toast system |
| Accessibility | 3 | No ARIA, poor focus, color-only status |
| Responsiveness | 4 | Desktop-only layout |
| Design System | 3 | Scattered tokens, no primitives |
| DX | 5 | Good types, God-object context, no docs |
| AX | 6 | Predictable; needs data attributes |
| Performance | 7 | Recent improvements (36x bundle reduction) |

---

## 2. CURRENT PRODUCT ASSESSMENT

### What Mercenta Is

Self-service wholesale distribution SaaS. Brands onboard themselves, manage catalogues, acknowledge purchase orders, track shipments, manage compliance documents, view analytics. Admins manage brand lifecycle, fulfillment, compliance approvals, billing, contracts.

### Target Users
1. Brand Partners — product managers, ops staff at independent brands
2. Mercenta Admins — internal operations, logistics, compliance, BD teams
3. Super Admin — founder/CEO managing staff, integrations, system
4. 3PL Carriers — DHL, FedEx, BAK Logistics staff

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 |
| Language | TypeScript 5.5 (strict mode) |
| Build | Vite 5.4 with manual chunks |
| Styling | Tailwind CSS 3.4 |
| State | React Context (GlobalStateContext) + TanStack Query 5 |
| Charts | Recharts 3.10 |
| Icons | Lucide React 0.446 |
| Fonts | IBM Plex Sans, Fraunces (Display), IBM Plex Mono |
| Validation | Zod 4.5 |
| Monitoring | Sentry 10.73 (deferred) |
| Backend | Supabase 2.57 (partial, fallback to demoStore) |
| Testing | Playwright 1.62 |
| Package Name | `vite-react-typescript-starter` (not renamed) |

---

## 3. APPLICATION MAP

No client-side router. Navigation is entirely state-driven via `environment` + `view` variables in React Context.

```
App.tsx
├── environment='home'  → HomeShell   → Home (landing page)
├── environment='login' → HomeShell   → Login (brand + ops cards + application)
├── environment='brand' → BrandShell  → 15 views (Dashboard → Settings)
├── environment='admin' → AdminShell  → 24 views (Overview → WhatsApp)
└── environment='carrier' → CarrierShell → 3 views (Manifest, BAK, Auditor)
```

Each shell lazy-loads via `React.lazy()`. Keeps the initial bundle small (~14KB main chunk after code splitting).

---

## 4. SCREEN INVENTORY

**53 screens** across 4 portals with status flags:

### Marketing (7)
S01 Home Landing | S02 How It Works | S03 UK Market Access | S04 For Brands | S05 FAQ | S06 Privacy Policy | S07 Terms of Service

### Auth (3)
S08 Login | S09 Partner Application Form | S10 Application Received

### Brand Portal (15)
S11 Dashboard (KPI cards, chart, activity feed) | S12 Onboarding Wizard (6 steps) | S13 Onboarding Summary | S14 Product Catalog | S15 Contracts | S16 Purchase Orders (with line-level ack + ASN) | S17 Logistics Hub | S18 Compliance Hub | S19 Sales Analytics | S20 Returns | S21 Reports | S22 Documents & Account | S23 Support & Team | S24 Social Accounts | S25 Market Intelligence | S26 Brand Settings (9 tabs)

### Admin Portal (24)
S27 Admin Dashboard (department-filtered) | S28 Brand CRM | S29 Fulfillment Track | S30 Retail Pipeline | S31 Purchase Orders Admin | S32 Logistics Control | S33 Carrier Monitor | S34 Global Catalog | S35 Compliance Approvals | S36 Billing | S37 Contract Cycle | S38 Communications | S39 Helpdesk | S40 Returns Tracking | S41 Monitoring | S42 Marketing Hub | S43 Brand Intelligence | S44 Super Admin Panel (11 sub-tabs) | S45 Audit Log | S46 Integration Settings | S47 Onboarding Tours | S48 Rocket.Chat | S49 Social Media (Postiz) | S50 WhatsApp Escalation

### Carrier Portal (3)
## 8. COMPONENT CONSISTENCY AUDIT

### Visual Drift Table

| Pattern | Screen A | Screen B | Difference | Severity |
|---------|----------|----------|------------|:--------:|
| **Button styles** | Button component (4 variants) | Raw `<button>` inline classes | Two button systems | **CRITICAL** |
| **Badge colors** | Same pattern in 15+ files | Copied manually everywhere | No shared constant | **HIGH** |
| **Tables** | DataTable (search/sort/filter) | Raw `<table>` in SuperAdmin | Two table systems | **HIGH** |
| **Modals** | ProductCatalog: fixed inset-0 | SalesAnalytics: drill-down | Ad-hoc patterns | **HIGH** |
| **Empty states** | DataTable emptyMessage | Inline "No X found" | Inconsistent | MEDIUM |
| **Loading states** | Missing everywhere | Missing everywhere | **Critical gap** | **CRIT** |
| **Success feedback** | Emerald inline text | Ad-hoc messages | Inconsistent | MEDIUM |
| **Page layout** | p-6 max-w-1400px | Same everywhere | ✅ Consistent | NONE |
| **Status badges** | bg-{c}-500/15 text-{c}-300 | Same pattern | Good but duped | MEDIUM |
| **Icon sizes** | w-4 h-4 sidebar | w-5 h-5 headings | Inconsistent | LOW |

### Duplicated Patterns
1. **Status badge colors** — 15+ files have the same `bg-{c}-500/15 text-{c}-300` pattern
2. **Empty states** — 6+ variations of "no data" messaging
3. **Page headers** — `flex items-center justify-between` repeated in 10+ files
4. **Container width** — `max-w-[1400px] mx-auto` hardcoded in 15+ files

---

## 9. UX FLOW AUDIT

### Flow 1: Brand Login → Dashboard (Score: 7/10)
One-click brand card -> Dashboard loads.
- **Good:** Simple, no password needed
- **Bad:** 11 cards with no search/filter
- **Demo concern:** No authentication ceremony

### Flow 2: Brand Onboarding (Score: 6/10)
6-step wizard: Profile -> Legal -> Banking -> Track -> Agreements -> Guidance
- **Good:** Clear steps, legal checkbox requirements
- **Bad:** Dense legal text, no progress persistence, no time estimate

### Flow 3: PO Acknowledgment (Score: 5/10)
PO list -> expand -> line-level ack -> ASN filing -> carrier select -> shipment create
- **Complex:** Deep workflow, many micro-decisions per SKU
- **Risk:** Easy to make errors, no inline validation
- **Missing:** Batch actions, confirmation before submit

### Flow 4: Admin > Brand CRM (Score: 4/10 — WORST)
Brand list -> click -> crammed accordion panel with 7 sections
- **Bad:** Accordion is cramped; inline editing awkward
- **Bad:** No proper detail view; everything in a narrow right card

### Flow 5: Add Product (Score: 6/10)
Gate check -> form (name, SKU, barcode, dimensions, pricing, images)
- **Good:** Clear gate-blocked state
- **Bad:** Cramped dimension grid, no inline help

### Flow 6: Compliance Approvals (Score: 6/10)
List -> filter -> approve/reject
- **Missing:** Batch ops, audit trail, brand notification

### Flow 7: Super Admin Staff (Score: 6/10)
Inline-editable table
- **Bad:** Raw `<table>` (no DataTable), no search/sort/filter
- **Bad:** No confirmation for delete/deactivate
S51 Carrier Dashboard | S52 BAK Logistics Hub | S53 API Request Auditor
## 10. INFORMATION ARCHITECTURE AUDIT

**Brand Portal (15 items):** Dashboard > Onboarding > Contracts > POs > Catalog > Shipments > Compliance > Returns > Analytics > Market Intel > Reports > Documents > Team > Social > Settings

**Admin Portal (24 items):** Overview > Brand CRM > Fulfillment > Retail > POs > Logistics > Carriers > Catalog > Compliance > Billing > Contracts > Comms > Helpdesk > Returns > Monitoring > Marketing > Brand Intel > Super Admin > Audit Log > Integrations > Tours > Rocket.Chat > Social > WhatsApp

### IA Issues
1. **24-item flat nav** — No grouping. User must scroll. Items compete.
2. **Overlap** — Comms vs Helpdesk; Monitoring vs Audit Log
3. **Buried Super Admin** — Item #18 despite being primary admin tool
4. **Catch-all buckets** — "Documents & Account", "Support & Team" ambiguous
5. **Terminology mismatch** — "Inbound Shipments" vs "Logistics Hub" (brand); "Fulfillment Track" vs "Logistics Control" (admin)
6. **No spatial grouping** — No section headers in 24-item nav

---

## 11. INTERACTION AUDIT

| Interaction | Implementation | Assessment |
|-------------|---------------|:----------:|
| Hover | hover:bg-white/[0.04] | ✅ Good |
| Focus | Inputs only | ❌ Poor |
| Active/selected | sidebar bg-white/[0.06] | ✅ Good |
| Disabled | opacity-50 cursor-not-allowed | ✅ Good |
| Loading states | None anywhere | ❌ Missing |
| Success feedback | Ad-hoc emerald text | MEDIUM |
| Error feedback | ErrorBoundary + inline | MEDIUM |
| Confirmation | No reusable dialog | ❌ Missing |
| Undo | None anywhere | ❌ Missing |
| Search input | Renders but does nothing | ❌ Broken |
| Form validation | Minimal, no inline errors | ❌ Weak |

### Key Problems
1. **Search box is a visual placeholder** — renders with icon, no onChange handler
2. **No loading states** — pages show blank while fetching
3. **No confirmation** — destructive actions execute immediately
## 12. PREMIUM DESIGN ASSESSMENT

### Visual Hierarchy (5 Questions)

1. **"Where am I?"** — ✅ Breadcrumb in header. ✅ Sidebar active state.
2. **"What matters?"** — ❌ KPI cards compete. No clear primary vs secondary. 24-item nav flattens importance.
3. **"What can I do?"** — ✅ Quick actions on brand dashboard. ❌ Actions hidden in accordion panels (Brand CRM).
4. **"What happened?"** — ❌ Inconsistent feedback. No toast system. Activity feed helps but is buried.
5. **"What should I do next?"** — ❌ No guided prompts. Notification center helps but is in header.

### Visual Sophistication

| Aspect | Current | Premium Standard |
|--------|---------|-----------------|
| Restraint | Overuses cards | Airy, negative space |
| Spacing | Inconsistent (p-6, p-5, p-3) | Consistent 4px/8px grid |
| Typography | Ad-hoc sizes (text-lg to text-[8px]) | Defined type scale |
| Density | High in tables and dashboards | Balanced breathing room |
| Proportion | Cards repetitive | Varied visual interest |
| Contrast | Good on dark theme | Could be more semantic |
| Motion | Minimal (fade-in only) | Purposeful micro-interactions |

### Overall Assessment: **Level D — Generic SaaS / Bootstrapped (Score: 5.5/10)**

Visual reasons: dark theme competent but not distinctive; cards overused as default container; brass/gold accent strong but not carried through consistently; no typography hierarchy; tables feel utilitarian; homepage text-heavy with weak hierarchy.

---

## 13. AI-GENERATED UI DETECTION

### Identified Template-Like Patterns

1. **Excessive Cards** — Every section wrapped in `<Card>`. Real products vary surfaces by hierarchy (flush, elevated, different radii).
2. **Generic Dashboard Layouts** — MetricCard grid + chart + activity feed. Exact same pattern as thousands of SaaS apps.
3. **Weak Typography Scale** — `text-lg`, `text-sm`, `text-xs`, `text-[10px]`, `text-[11px]`, `text-[8px]`. No rhythm.
4. **Too Many Badges** — Every PO, document, contract gets a badge. Visual noise.
5. **Weak Spacing Rhythm** — Values jump between 2/4/6/8/12/16/24px without base unit.
6. **"Dashboard Syndrome"** — Every page shows summary metrics. When unsure, show numbers in cards.
7. **Missing Visual Storytelling** — Charts show data but don't highlight insights. No supply chain visualization.

---

## 14. ACCESSIBILITY AUDIT

### Color Contrast
- Dark bg (#000000) + white text (#E5E5E5) = ✅ Good contrast
- Brass text (#C9A15A) on dark = ~4.5:1 — ⚠️ Borderline
- Zinc-500 (#71717A) on dark = ~7:1 — ✅ Good
- Zinc-600 (#52525B) on ink-850 (#121214) = ~4:1 — ⚠️ Marginal

### Keyboard Navigation
- ❌ No skip-to-content link
- ❌ Tab order not explicitly managed
- ❌ No focus trapping in modals
- ❌ No keyboard shortcuts

### Focus States
- ✅ Inputs have focus styles
- ❌ Buttons have `outline-none` but no visible focus ring
- ❌ Sidebar items have no visible focus indicator
- ❌ Cards used as buttons not keyboard focusable

### Semantic HTML
- ✅ `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>` used in shells
- ❌ No `<caption>` or `scope` on DataTable
- ❌ Clickable `<div>`/`<span>` without proper button semantics

### Form Labels
- ✅ Input/Select/Textarea/Checkbox use `<label>` elements
- ❌ Some `<input>` without labels (catalog dimensions)

### ARIA
- ❌ No ARIA attributes anywhere — no `aria-current`, `aria-expanded`, `aria-selected`, `aria-live`
- ❌ No `aria-invalid` or `aria-describedby` for form errors
- ❌ Status indicators are color-only, no accessible text alternatives

### Touch Targets
- ❌ Many clickable items under 44x44px minimum
- ⚠️ Sidebar items ~40px — close but undersized
## 15. RESPONSIVE AUDIT

### Breakpoints
Uses Tailwind defaults: sm:640px, md:768px, lg:1024px, xl:1280px. No custom breakpoints.

### Desktop (>1280px)
✅ Primary target. Layout works well. max-w-[1400px], sidebar 240px fixed.

### Laptop (1024-1280px)
✅ Should work. Some 4-column grids may feel slightly cramped.

### Tablet (768-1024px)
❌ Not designed. Sidebar at 240px leaves minimal content space. Environment router at bottom may interfere.

### Mobile (<768px)
❌ Not supported. Sidebar 240px on 375px phone is impossible. Tables overflow. Header too crowded. No responsive navigation.

### Specific Issues
1. Sidebar is NEVER collapsible — always 240px
2. No horizontal scroll on tables (DataTable has no overflow wrapper)
3. No responsive font scaling
4. Environment Router is fixed bottom — covers content on small screens
5. 4-column dimension grids on mobile would be unusable

---

## 16. FRONTEND ARCHITECTURE

### Directory Structure (src/)

```
src/
├── App.tsx / main.tsx / index.css         # Root, entry, global styles
├── types.ts                               # ALL interfaces (2026 lines)
├── components/
│   ├── ui.tsx                             # 7 UI primitives
│   ├── admin/   (30+ files)               # Admin portal components
│   ├── auth/    (2 files)                 # Login, PartnerApplicationForm
│   ├── brand/   (16 files)                # Brand portal components
│   ├── carrier/ (2 files)                 # Carrier components
│   ├── layout/  (7 files)                 # AppShell, Sidebar, Header, Shells
│   ├── marketing/ (9 files)               # Home, PublicNav, FAQ, etc.
│   └── shared/  (13 files)                # DataTable, ErrorBoundary, Chat, Tours
├── config/      (6 files)                 # Brand, commercial, customs, demo, tours
├── context/     (1 file)                  # GlobalStateContext (God-object)
├── data/        (10 files)                # api.ts, demoStore, demoData, queries
├── integrations/ (3 files)                # Integration registry
├── lib/         (30+ files)               # Business logic (RBAC, compliance, etc.)
├── services/    (1 dir)                   # Xero integration
├── utils/       (1 file)                  # cn.ts
└── assets/      (3 SVGs)                 # Logo assets
```

### Key Architecture Decisions

1. **State:** React Context (GlobalStateContext) with 40+ properties + TanStack Query for server state
2. **Data flow:** Component -> useApp()/useQuery() -> api.ts -> demoStore/Supabase
3. **Code splitting:** 4 lazy shells + 7 vendor chunks + deferred Sentry
4. **CSS:** Tailwind utilities only (no CSS modules, no styled-components)
5. **No router library** — state-driven view switching

### Architecture Concerns
1. **GlobalStateContext is a God-object** — 40+ properties, re-renders all consumers on any change
2. **types.ts is 2026 lines** — hard to navigate, should be split into domain modules
3. **No barrel exports** — no index files, components imported directly from file paths
4. **No separation between page and view** — page IS view (no routing abstraction)
5. **Demo data stays in memory** — all seed arrays exist in memory even after use

---

## 17. DESIGN SYSTEM DEBT

| Aspect | Systematized? | Notes |
|--------|-------------|-------|
| Color palette | ✅ Partial | 7 ink + 5 brass shades defined |
| Typography | ⚠️ Partial | 3 fonts defined, no size scale |
| Spacing | ❌ No | Default Tailwind scale, used ad-hoc |
| Border radius | ⚠️ Partial | rounded-lg/xl/full, no semantic names |
| Shadow/elevation | ❌ No | Hardcoded everywhere |
| UI primitives | ⚠️ Partial | 7 primitives, many missing |
| Status indicators | ❌ No | Inline patterns duplicated 15+ times |
| Page layouts | ⚠️ Partial | max-w-[1400px] pattern but no layout component |
| Form patterns | ⚠️ Partial | Label+Input exists, validation UI missing |
| Data patterns | ✅ Yes | DataTable handles search/sort/filter/pagination |
| Animations | ❌ No | Inline in index.css, no system |
| Responsive | ❌ No | No responsive design system |

### Duplication Estimate
- **Properly systematized:** ~15% (UI primitives, DataTable, AppShell)
- **Partially systematized:** ~30% (color tokens, fonts, badge patterns)
- **Page-specific ad-hoc:** ~40% (most page-level styling)
- **Duplicated:** ~15% (status badges, modals, empty states)

---

## 18. DEVELOPER EXPERIENCE (DX) AUDIT

**Score: 5.5 / 10**

### Strengths
- ✅ TypeScript strict mode
- ✅ Centralized types (single source of truth)
- ✅ Single demo data source (demoStore.ts)
- ✅ Code-splitting for performance
- ✅ Config module for brand identity
- ✅ Path alias (@/ imports)

### Weaknesses
- ❌ No component documentation (Storybook, JSDoc)
- ❌ Prop API inconsistency across components
- ❌ No component/unit tests (only E2E)
- ❌ 2026-line types.ts is unwieldy
- ❌ No barrel exports (no index files)
- ❌ GlobalStateContext is a God-object
- ❌ ESLint exhaustive-deps not enforced
- ❌ Hardcoded strings everywhere
- ❌ No form system abstraction

---

## 19. AI AGENT EXPERIENCE (AX) AUDIT

**Score: 6 / 10**

### Good for AI Agents
- ✅ Predictable state-driven navigation (environment + view)
- ✅ Deterministic data flow (useApp + useQuery)
- ✅ Clear entity naming (Brand, PO, Shipment, Product)
- ✅ Direct state mutations via onClick handlers
- ✅ data-tour attributes on interactive elements

### Needs Improvement
- ❌ No `name` attributes on form inputs
- ❌ No `data-testid` attributes
- ❌ No `aria-live` regions for dynamic content
- ❌ State changes not machine-detectable
- ❌ No structured data export (queryable format)

### AX Wins That Don't Hurt Humans
1. Add `data-testid` to all interactive elements
2. Add `name` attributes to form inputs (also helps humans with autofill)
3. Add `aria-live="polite"` for status updates
4. Standardize `data-state` attributes on status indicators

---
## 20. PERFORMANCE AUDIT

### Already Fixed
- 512KB bundle -> 7 vendor chunks + lazy shells (14KB main chunk - 36x smaller)
- Seed data deferred after paint via dynamic import
- Sentry deferred via queueMicrotask
- Google Fonts non-blocking via media="print"
- Gzip/Brotli compression via .htaccess
- Far-future caching for JS/CSS

### Remaining Risks
1. No image optimization - product images without lazy loading
2. No list virtualization - DataTable renders all rows
3. Recharts bundle (~150KB) direct in 5+ components
4. Demo data in memory after render
5. Context re-renders (40+ values)
6. No PWA/offline support

---

## 21. REGRESSION / SAFETY MAP

### SAFE TO REDESIGN (visual only, no logic)
- Marketing site (Home, PublicNav, PublicFooter)
- Color palette + typography tokens
- Card/container styling
- Dashboard layouts (re-arranging metrics)
- Button/Input/Select visual styling
- Badge/icon styling

### REDESIGN WITH CARE (interacts with logic)
- Sidebar (navigation state)
- Header (breadcrumb, search, notif, profile)
- DataTable (must keep sort/filter/paginate API)
- BrandDashboard (metric calculations)
- AdminDashboard (department views + drill-down)
- OnboardingWizard (6-step validation)
- ProductCatalog (compliance gate)
- BrandPurchaseOrders (complex PO logic)

### HIGH RISK (tightly coupled)
- AppShell (core layout wrapper)
- GlobalStateContext (40+ props consumed everywhere)
- Login/auth flow (sign-in, brand activation)
- RBAC system (permissions, tier, mutation rules)
- BrandCRM (complex mutations)

### DO NOT TOUCH (backend review needed)
- api.ts (Supabase/demoStore abstraction)
- demoStore.ts (all mutations flow here)
- types.ts (2026 lines of shared interfaces)
- Data mutation functions
- External integrations (SP-API, Xero, Postiz, etc.)

---

## 22. SCREEN SCORECARD

| Screen | UX | Vis | IA | Int | A11y | DX | AX | Overall |
|--------|:--:|:---:|:--:|:---:|:----:|:--:|:--:|:-------:|
| Home Landing | 7 | 6 | 7 | 6 | 4 | 5 | 6 | 5.9 |
| Login | 7 | 6 | 7 | 6 | 4 | 6 | 6 | 6.0 |
| Brand Dashboard | 6 | 5 | 6 | 5 | 3 | 5 | 6 | 5.1 |
| Onboarding Wizard | 6 | 5 | 7 | 5 | 3 | 5 | 5 | 5.1 |
| Product Catalog | 6 | 5 | 6 | 5 | 3 | 5 | 6 | 5.1 |
| Purchase Orders | 5 | 4 | 5 | 4 | 3 | 5 | 6 | 4.6 |
| Logistics Hub | 6 | 5 | 6 | 5 | 3 | 5 | 5 | 5.0 |
| Compliance Hub | 6 | 5 | 6 | 5 | 3 | 5 | 6 | 5.1 |
| Sales Analytics | 7 | 6 | 7 | 6 | 3 | 6 | 6 | 5.9 |
| Brand Settings | 6 | 5 | 7 | 5 | 3 | 5 | 5 | 5.1 |
| Admin Dashboard | 6 | 5 | 6 | 5 | 3 | 5 | 6 | 5.1 |
| **Brand CRM** | **4** | **4** | **4** | **4** | **2** | **4** | **5** | **3.9** |
| Super Admin | 6 | 5 | 5 | 5 | 3 | 5 | 6 | 5.0 |
| Marketing pages | 7 | 6 | 7 | 6 | 4 | 6 | 6 | 6.0 |
| Carrier Dashboard | 5 | 4 | 5 | 4 | 2 | 4 | 5 | 4.1 |

**Average: 5.2 / 10**

---

## 23. TOP 20 PROBLEMS

| # | Problem | Screens | Category | Sev |
|:-:|---------|---------|----------|:---:|
| 1 | No accessible design (keyboard, focus, ARIA) | ALL | A11y | CRIT |
| 2 | No responsive layout (desktop-only) | ALL | Resp | CRIT |
| 3 | Header search is non-functional placeholder | ALL | UX | HIGH |
| 4 | No design system tokens | ALL | DS | HIGH |
| 5 | Component drift | ALL | Consist | HIGH |
| 6 | No loading/skeleton states | ALL | UX | HIGH |
| 7 | No confirmation dialogs | ALL | UX | HIGH |
| 8 | No toast notification system | ALL | UX | HIGH |
| 9 | Brand CRM cramped accordion | CRM | UX | HIGH |
| 10 | 24-item admin sidebar (no grouping) | Admin | IA | HIGH |
| 11 | No typography components | ALL | DS | HIGH |
| 12 | Overuse of Cards | ALL | Vis | MED |
| 13 | Weak form validation | Forms | UX | MED |
| 14 | Environment Router visible (dev tool) | ALL | UX | MED |
| 15 | No skip-to-content link | ALL | A11y | MED |
| 16 | Color-only status indicators | ALL | A11y | MED |
| 17 | GlobalStateContext God-object | Core | Arch | MED |
| 18 | Cross-tenant data fragility | ALL | Sec | MED |
| 19 | No component tests | ALL | DX | MED |
| 20 | Hardcoded strings (no i18n) | ALL | DX | LOW |

---

## 24. WHAT SHOULD BE PRESERVED

### Strong Screens
Login (one-click demo), Onboarding Wizard (6-step flow), Sales Analytics (drill-down charts), Marketing pages (content-driven)

### Strong Components
DataTable (search/sort/filter/paginate), Card, Button (4 variants), AppShell, ErrorBoundary, NotificationCenter, LiveChatWidget, InfoTooltip

### Strong Workflows
One-click brand login, Compliance gate, Partner application flow, Guided tours

### Good Visual Decisions
Dark theme + brass accents, IBM Plex fonts, Subtle white borders, Gold CTA accent

### Good Technical Architecture
Mock-first pattern, Centralized types, Config module, Code splitting, TanStack Query
## 25. REDESIGN CONSTRAINTS

### MUST PRESERVE
- Dark theme with brass accents (core brand identity)
- One-click demo login (critical for investors)
- Compliance gate logic (business-critical)
- PO acknowledgment workflow (core operation)
- RBAC system (4 portal types)
- Data model shapes (types.ts interfaces)
- Mock-first data pattern (demo mode)
- All 10 approved product categories
- Existing API function signatures

### SHOULD PRESERVE
- Current component naming conventions
- AppShell layout pattern (sidebar + header + main)
- DataTable sort/filter/pagination API
- Lucide React icons (consistent, free)
- Tailwind CSS (utility-first approach)
- TypeScript strict mode, Code-splitting strategy

### SHOULD REDESIGN (HIGH)
- Visual design system (tokens, components, spacing, typography)
- Accessibility (keyboard nav, focus, ARIA, contrast)
- Responsive layout (mobile/tablet support)
- Dashboard layouts (reduce cognitive load)
- Brand CRM UI (replace accordion pattern)
- Admin sidebar (group 24 items hierarchically)
- Form UX (validation, inline errors, guidance)
- Confirmation dialogs, Toast notifications
- Modal system (standardized overlay)
- Loading/skeleton states

### SHOULD REARCHITECT
- Design token system (CSS variables or Tailwind config)
- Component library (shared, typed, documented)
- State management (split God-object context)
- Form system (standardized validation + error handling)
- Testing infrastructure (component + unit tests)

### UNKNOWN (needs investigation)
- Backend API quality (demo only)
- User testing results (no evidence of user research)
- Real-world data volumes (demo data is tiny)
- Third-party integration UX (Stripe, Xero, SP-API stubs)
- Internationalization needs (UK-only currently)
## 26. RELEVANT SOURCE FILES

### Global Styling & Tokens (Safe to Modify)
| File | Purpose |
|------|---------|
| src/index.css | Global styles, animations, scrollbar |
| tailwind.config.js | Color palette, fonts, design tokens |
| src/utils/cn.ts | Classname utility |

### Main Layout (Modify with Care)
| File | Purpose |
|------|---------|
| src/App.tsx | Root component, lazy shells |
| src/main.tsx | Entry point, QueryClient |
| src/components/layout/AppShell.tsx | Core layout wrapper |
| src/components/layout/Sidebar.tsx | Navigation sidebar |
| src/components/layout/Header.tsx | Top header bar |

### Shared Components (Safe to Modify)
| File | Purpose |
|------|---------|
| src/components/ui.tsx | 7 UI primitives (Card, Badge, Button, Input, Select, Textarea, Checkbox) |
| src/components/shared/DataTable.tsx | Generic data list (Modify with care) |
| src/components/shared/ErrorBoundary.tsx | Error boundary |
| src/components/shared/NotificationCenter.tsx | Bell + notification dropdown |
| src/components/shared/LiveChatWidget.tsx | Floating chat widget |
| src/components/shared/InfoTooltip.tsx | Hover tooltip |

### Marketing Pages (Safe to Redesign)
src/components/marketing/Home.tsx, PublicNav.tsx, PublicFooter.tsx, HowItWorks.tsx, UKMarketAccess.tsx, ForBrands.tsx, FAQ.tsx, PrivacyPolicy.tsx, TermsOfService.tsx

### Brand Pages (Redesign with Care)
src/components/auth/Login.tsx, brand/BrandDashboard.tsx, brand/OnboardingWizard.tsx, brand/ProductCatalog.tsx, brand/ComplianceHub.tsx, brand/BrandPurchaseOrders.tsx, brand/SalesAnalytics.tsx, brand/BrandSettings.tsx

### Admin Pages (Redesign with Care)
src/components/admin/AdminDashboard.tsx, admin/BrandCRM.tsx, admin/SuperAdminPanel.tsx

### HIGH RISK (DO NOT TOUCH without review)
| File | Risk |
|------|:----:|
| src/types.ts (2026 lines) | ❌ All shared interfaces |
| src/context/GlobalStateContext.tsx | ❌ God-object (40+ props) |
| src/data/api.ts | ❌ Data fetching abstraction |
| src/data/demoStore.ts | ❌ Mutable demo store |
| src/data/demoData.ts | ❌ All seed data |
| src/data/queries.ts | ❌ TanStack Query hooks |
| src/lib/auth/rbac.ts | ❌ RBAC system |

### Config Files (Safe to Modify)
src/config/brand.ts, commercial.ts, customs.ts, demo.ts, homepageContent.ts

---

## 27. RECOMMENDED NEXT-PHASE INVESTIGATION

Before redesign begins, the external expert should:

1. **Live visual walkthrough** — Open https://demo.mercenta.co.uk/ and capture screenshots of every screen in Section 4
2. **Accessibility audit** — Run Lighthouse, axe DevTools, keyboard-only navigation test
3. **User testing** — Observe target users (3-5 participants) using the current product
4. **Responsive testing** — Test on tablet (iPad) and mobile (iPhone/Android)
5. **Performance profiling** — Chrome DevTools Performance tab on dashboard + PO flow
6. **API integration audit** — Determine real Supabase vs demo stubs

### Design System Development Order
1. CSS custom properties for ALL design tokens
2. Missing UI primitives (Modal, Toast, Skeleton, Toggle, Radio, DatePicker)
3. Layout components (PageHeader, PageSection, Grid, Container)
4. Form system (Field, FieldGroup, ValidationMessage, FormLayout)
5. Typography components (H1, H2, H3, Body, Small, Caption, Label)
6. Status indicator system (StatusDot, StatusBadge with variants)

### Quick Wins (High Impact, Low Effort)
1. 🎯 Remove Environment Router from production views
2. 🎯 Add focus styles to all interactive elements
3. 🎯 Wire up search input to DataTable filtering
4. 🎯 Add aria-label to icon-only buttons
5. 🎯 Add loading states to query-dependent pages
6. 🎯 Add confirmation to destructive actions

---

*This audit was conducted through source code analysis of the Mercenta Partners application at `/Users/tadii/Desktop/Mercenta/` and the live demo at https://demo.mercenta.co.uk/. No modifications were made to the application. Visual assessments are based on code analysis and page fetches, not graphical browser rendering. The external product/UX expert should perform a live visual walkthrough to supplement this evidence.*
4. **No keyboard shortcuts**
5. **No toast/notification system** for action feedback