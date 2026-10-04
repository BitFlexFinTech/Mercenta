# MERCENTA PRODUCT CONSOLIDATION — PHASE 0: REPOSITORY + AUDIT RECONCILIATION (2026-09-10)

> Phase 0 of the master product-consolidation pass (per the running master prompt).
> **AUDIT/RECONCILIATION ONLY — no product functionality was changed.**
> Every claim below was re-verified directly against the working tree at HEAD.
> Evidence classes: **CODE** (read source) · **UI** (running app / Playwright) ·
> **E2E** (accredited suite) · **DOC** (documented only) · **PARTIAL** ·
> **STALE/CONTRADICTED** · **UNKNOWN**.

---

## 1. Repository state at start of Phase 0 (re-verified 2026-09-10)

| Item | Value | Evidence |
|---|---|---|
| Branch | `redesign/foundation` | `git branch --show-current` |
| HEAD | `991565689216278dfb72d48288cfd35d73fdf1d8` | `git rev-parse HEAD` |
| Protected baseline | `959b4d2` (tag `mercenta-baseline-before-redesign-20260907`) intact | `git tag -l` |
| Working tree | Only pre-existing generated artefacts modified (Review Zip, playwright-report, test-results/.last-run.json) + pre-existing untracked forensic/design artefacts. **No source file changed by Phase 0.** | `git status` / `git diff --stat` |
| Typecheck | `npm run typecheck` → **0 errors** | executed, exit 0 |
| Lint | `npm run lint` → **0 errors** | executed, exit 0 |
| Build | `npm run build` → **✓ built in 3.20s** | executed, exit 0 |
| Accredited E2E | **147 passed / 4 skipped / 0 failed** (2.0 min, full 23-spec suite) | executed, exit 0 |
| Provider validators | `validate-mock-providers` PASS · `validate-mock-seam` PASS · `validate-provider-workflows` PASS · `validate-automation` PASS · `validate-postiz` PASS | executed |
| Edge-function validator | `validate-edge-functions.mjs` **CRASHES (ENOENT)** — expects functions absent from this tree (see §4) | executed |

## 2. How the application is organised (verified structure)

```
src/App.tsx  (environment switch, no URL router — state-driven)
├── home/login → HomeShell   (marketing + Partner Login / brand application)
├── brand     → BrandShell   (15 views; LiveChatWidget + TourLoader always mounted)
├── admin     → AdminShell   (13 sections; super-only render guards)
└── carrier   → CarrierShell (3 views, IntegrationsProvider-wrapped)
src/data/       api.ts (contract layer) · demoStore.ts (in-memory demo domain store,
                  single source in demo mode) · bootstrap.ts (seed incl. INITIAL_LEADS) ·
                  queries.ts (TanStack hooks)
src/context/    GlobalStateContext.tsx (session, role, tenant pin, domain arrays)
src/integrations registry.ts (19 providers) + IntegrationsContext (connect state)
src/lib/        domain libs — spapi/ dhl/ compliance/ billing/ crm/ helpdesk/
                  intelligence/ discovery/ research/ rocketchat/ postiz/ whatsapp/
                  mail/ messaging/ monitoring/ automation/ events/ simulation/
src/services/xero/  real OAuth v2 client + sync engine (demo mode)
supabase/       migrations 001–019 + functions (xero-token, xero-webhook ONLY)
```

## 3. Documentation-vs-code cross-check (every material claim re-verified)

| # | Doc claim | Reality at HEAD | Class |
|---|---|---|---|
| 1 | `PROJECT_STATUS.md §1b`: "20 registry integrations" | Registry has **19** IDs (15 original + `dhl` + `xero` + `companies_house` + `hmrc`); `Rakazo` is **not** in the registry | CODE — miscount |
| 2 | `docs/INTEGRATIONS.md §2`: "Rakazo — iframe into self-hosted bots; VITE_RAKAZO_URL" | Accurate. Rakazo refs = `RakazoPanel.tsx`, `SuperAdminPanel.tsx`, `e2e/rakazo.spec.ts`, `xero/types.ts` env type, `.env` | VERIFIED (CODE/UI/E2E) |
| 3 | `docs/INTEGRATIONS.md §2`: "`XeroConnection.tsx` is DEAD (syntax-broken, unimported)" | **PARTIAL** — still unimported (only name `XeroConnection` in `services/xero/types.ts`), but **no longer syntax-broken** (typecheck green; file modified 2026-09-08) | STALE on "syntax-broken" |
| 4 | `docs/ARCHITECTURE.md §8` / `docs/FUNCTIONAL_RISK_MAP.md`: "typecheck red — 27 errors (outreachGenerator 24, XeroConnection 3)" | **Stale** — `npm run typecheck` exits 0 at HEAD; both files typecheck clean. Files exist (128/213 lines) but are dead code (unimported) | STALE |
| 5 | `STATUS_CHECK.md`: event-feed Edge Function exists | **Contradicted** — `supabase/functions/` contains only `xero-token` and `xero-webhook` | STALE/CONTRADICTED |
| 6 | `PRODUCTION_READINESS.md`: "handleInboundReply wired (hot-lead → notification)" | **Contradicted** — `handleInboundReply` defined in `lib/discovery/engine.ts`, referenced only in a `digest.ts` comment; **zero callers** in `src/` or `supabase/` | STALE/CONTRADICTED |
| 7 | `PRODUCTION_READINESS.md`: Edge Functions `/payouts-transfer`, `/catalog-import` (+ migration 0010 RPC), `/discovery-directory`, `/esign-envelope`, `/send-email`, `/instantly-reply-webhook` are "BUILT" | **Contradicted** — no such functions or 0010 RPC migration exist in this tree; validator `validate-edge-functions.mjs` crashes with ENOENT on `supabase/functions/payouts-transfer/index.ts` | STALE/CONTRADICTED |
| 8 | `docs/INTEGRATIONS.md §9.5` live-activation table: "Edge Functions `/functions/v1/spapi/*` (etc.) needed to go live" | Consistent with code: `lib/spapi/client.ts`, `lib/mail/mail.ts`, `lib/esign/esign.ts` call `edgeFunctionBase/send-email`, `/esign-envelope`, `/functions/v1/*` **for LIVE transport only**; absent server functions → live activation would 404 until deployed. Simulation unaffected | VERIFIED (seam intact, server functions out-of-repo) |
| 9 | `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT` §2: suite 147/0/4, typecheck/lint/build green | **All re-verified true** this session | VERIFIED (E2E) |
| 10 | `docs/PRODUCT_CONTRACT.md` §5: mock-first, mock signatures identical to live, no static fake arrays | Verified — SP-API/DHL/CH/HMRC all ship explicit `mockClient.ts` trios; factories flip on connection state only; `mock:` refs never reach live transport | VERIFIED (CODE/E2E) |
| 11 | `HANDOFF.md`: 20 Rakazo bots on droplet `24.144.86.50` | Not verifiable from this repo — no bot definitions/prompts/config in tree | DOC ONLY / UNKNOWN |
| 12 | Audit §2.1 "Rakazo has no bot code in repo" | **Confirmed** — repo-wide case-insensitive grep returns only panel/spec/.env/doc prose | VERIFIED (CODE) |
## 4. Reconciliation findings classified (Phase 0 gate evidence)

### VERIFIED IN CODE (+ UI/E2E where stated)
- **Core commerce engine is genuinely wired**: onboarding → compliance gate → catalog submission (SP-API sim) → PO lifecycle (line-level ack, 24 h rule, rejection codes, freight windows) → auto-shipment → ASN/labels → returns → deductions → disputes → contracts/esign → billing → helpdesk → notifications (canonical `messages` store).
- **Communications consolidated on ONE canonical store**: `logMessage`/`fetchMessages` used by BrandComm, LiveChatWidget, BrandTeamMessages, HelpdeskDashboard; tickets group `messageIds`; NotificationCenter is a derived work-item feed (not a second chat).
- **Tenant isolation + RBAC chain**: `tierForRole → canAccessEnvironment → canAccessView (VIEW_ALLOWLIST) → filterNavForTier`; `assertBrandScope`/`isCrossTenantAccess`; verified by `multi-tenant.spec.ts` (6 tests) — all PASS in this run.
- **Simulation-First provider system**: registry (19), per-card sim control, deterministic mock adapters (DHL milestone machine, CH registrar, HMRC VAT/filing, SP-API poll states), scenario engine (9 scenarios), `UNKNOWN ≠ SIMULATION` safety gates; verified by 5 validator scripts + `simulation-control.spec.ts` — all PASS in this run.
- **Brand Intelligence**: 12 seeded prospects (`brandProspectSeed` 3 + `brandExtraSeed` 9) re-scored at load; 7-dimension `scoringEngine`; 5-tab detail; **always MockClient, no live client class, no mutations, no persistence**.
- **ICP/Marketing**: separate `Lead` universe (`INITIAL_LEADS`: 8 mock companies in `bootstrap.ts`), ICP config (categories+regions), deterministic `scoreLeadFit`, threshold-70 auto-enroll, 4-step sequence, CSV import parser; **lead↔BI disconnected** (no cross-imports, no shared identity, no hand-off).
- **Rocket.Chat**: `getRocketChatClient()` **always returns MockRocketChatClient** (accepts creds, never reads them); no `RealRocketChatClient` class; no message UI; no workflow depends on it.
- **Postiz**: `PostizAdminPanel` passes `apiKey: ''` always → real client unreachable; schedule flow is simulated; External-link out to live Postiz is present.
- **Rakazo**: iframe + load/error/retry states in Super Admin only; zero imports from `src/lib`, `src/data`, `src/context`; **no dependency by construction** (proven by absence).
- **Dashboards (Admin/Brand)**: real-data-derived from domain queries (KPI band + AttentionPanel); Marketing campaign stats + Monitoring health remain seeded/fabricated (documented).

### PARTIAL
- `Lead.fitScore` computed live by ICP scoring is **not persisted** back to the lead record (display only).
- `Prospect.outreachStatus` (14-state ladder) is UI-inert — no screen mutates it; no prospect→CRM hand-off.
- Demo store is in-memory + optional supabase dual-write: reload loses in-memory mutations unless Supabase is online/configured (persistence is configuration-dependent).
- Human-in-the-loop for AI waits is incomplete: `Message.requiresHuman` badge + `held_for_approval`/fulfilment-borderline flags exist; no unified human work queue, no SLA/assignment outside helpdesk + `CrmTask`.
- Brand portal vs admin Brand Intelligence are the same engine/seed surfaced twice (brand "Market Intel" is a tenant-scoped view).

### STALE / CONTRADICTED (exact list)
1. `STATUS_CHECK.md` event-feed Edge Function claim → absent.
2. `PRODUCTION_READINESS.md` handleInboundReply claim → no caller.
3. `PRODUCTION_READINESS.md` + `STATUS_CHECK.md` Stage-17/21/22 Edge Functions + migration 0010/0011 → absent (validator crashes).
4. `docs/ARCHITECTURE.md` §8 + `docs/FUNCTIONAL_RISK_MAP.md` typecheck-27-errors → stale (0 at HEAD).
5. `docs/INTEGRATIONS.md` §2 XeroConnection "syntax-broken" → stale (typecheck green; still dead code).
6. `PROJECT_STATUS.md` §1b "20 registry integrations" → 19.

### DOCUMENTED ONLY / UNKNOWN
- 20-bot Rakazo fleet contents/behaviour (external droplet operator-owned).
- Live Supabase/Xero/Postmark real-call behaviour (no environment with all secrets exercised; demo/sandbox paths used).
- Business intent behind brand "Market Intel" screen (audit §33 unknown).
- Root-level business xlsx/rtf + the stray `,m[Destination])…` filename (ownership question, flagged).

## 5. Phase-1 gate pre-assessment (from Phase 0 evidence — fixes deferred to Phase 1)

| Area | Phase-0 finding | Phase-1 disposition |
|---|---|---|
| Backend/domain core | Green at HEAD (E2E 147/0/4, validators PASS) | Verify failure/recovery + persistence contracts; add domain-level tests where missing (BI, ICP, Rakazo independence, provider failure) |
| Provider boundary | Mock/live seams structurally sound (SP-API/DHL/CH/HMRC trios) | **Gap:** live Edge Functions absent from repo (SP-API `/functions/v1/spapi/*`, DHL/CH/HMRC EFs, send-email/esign-envelope) — documented as deploy-time. Simulation safety verified; live switch would 404 until deployed. Recorded, not a Phase-1 blocker for simulation |
| Dead-code TS files | `outreachGenerator.ts` + `XeroConnection.tsx` typecheck clean but unimported | Do NOT fix in Phase 0 (no functionality change). Candidates for Phase 9/13 rationalisation |
| Edge-function validator | `validate-edge-functions.mjs` crashes (ENOENT) | Restore-or-retire decision is owner scope; recorded as STALE tooling |
| Acquisition domains | BI seed-only island; ICP mock-lead universe; no Opportunity entity; no reply-router caller | Phases 3–5 |
| Rakazo | iframe surface only; no dependency; no bot code in repo | Phase 2 (document actual fleet externally, enforce independence) |

## 6. Phase 0 GATE RESULT

**GATE: "Exact implementation locations and contradictions are understood." → PASS (with the recorded contradiction/staleness inventory above).**

No product functionality was changed in Phase 0. The contradictions list in §4 is the checkpoint deliverable; every item names the exact files/lines verified. Phase 1 (Backend/Data/Domain Acceptance Gate) is authorised to start from this baseline.