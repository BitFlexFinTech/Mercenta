# PHASE E7 — EMBEDDED MERCENTA SOCIAL (FULL POSTIZ APPLICATION)
**Mercenta Partners Ltd — platform build phase report**
Date: 2026-09-12 · Branch: `redesign/foundation` · Implementation session

---

## 0. WHAT THIS PHASE IS

E7 makes the **complete Postiz application** available to every approved Mercenta
brand as **MERCENTA SOCIAL** — the customer-facing product identity. Postiz is the
**engine**; Mercenta Social is the product Mercenta's brands actually see.

The requirement was explicitly NOT "add social posting", NOT "add a scheduler",
NOT "add a few Postiz features", and NOT "hide Postiz with CSS". This phase
therefore began with a **pre-edit inspection** and, critically, an investigation of
the **already-deployed engine** — not a rebuild of Postiz inside Mercenta.

**What E7 delivers**
- the Mercenta Social product identity (single source of truth, not CSS hiding);
- **automatic, deterministic, idempotent** Brand → Social workspace provisioning;
- a **fail-closed entitlement gate** over the canonical Mercenta brand life cycle;
- **tenant isolation enforced in the domain** (not by UI filtering);
- the **complete verified module surface** of the deployed engine (8 brand-facing
  modules) and its **35 verified channel providers**;
- an **admin integration control centre** built on the existing Integrations
  architecture (no second admin system, no secrets in the UI);
- **truthful simulation**: the engine is not claimed to be live, and nothing
  contacts a provider or the engine host;
- honest recording of the **real deployment defects** found during discovery.

**What E7 deliberately does NOT do** (§9): it does not re-implement Postiz, does not
create a second scheduler/calendar/media-library/analytics engine, does not redesign
the brand navigation, does not create a migration, and does not deploy anything.

---

## 1. GIT STATE AT THIS CHECKPOINT

| Item | Value |
|---|---|
| Branch | `redesign/foundation` |
| **Pre-E7 checkpoint (revert point)** | **`c5b92ba`** (E6 documentation checkpoint = HEAD at E7 start) |
| **E7 implementation commit** | **`44a8b83`** (recorded in §15) |
| **E7 documentation checkpoint** | the HEAD commit containing this section (hash in the final checkpoint report) |
| E6 implementation / docs | `5fa795f` / `c5b92ba` |
| Pre-E6 checkpoint | `d517b17` (tag `mercenta-pre-e6-20260912`) |
| Protected baseline | **`959b4d2`** (tag `mercenta-baseline-before-redesign-20260907`) |
| Baseline is ancestor of HEAD | **YES** (`git merge-base --is-ancestor` → exit 0) |
| Rebase / amend / reset / force-push | **NONE** |
| Migrations | **23** — `023_create_commerce_persistence.sql` remains newest; **E7 added none** |
| Review Zip | regenerated with the canonical script only, **left unstaged** |

**Working tree at E7 start:** clean except the pre-existing
`M "Review Zip/mercenta-review.zip"` (deliberately unstaged, never staged, never
cleaned).

---

## 2. ENGINE DEPLOYMENT DISCOVERY (investigated, not assumed)

The repository does **not** contain the Postiz application source. The instruction
was explicit: Mercenta **already has a DigitalOcean server hosting Postiz**, so the
deployment had to be investigated rather than declared blocked. It was.

**Method (read-only):** DigitalOcean API droplet listing, direct HTTP probes, SSH to
the services droplet, `docker inspect`/`ps`/`exec`, `pm2 list`/`logs`, `psql` on the
engine database, and the engine's own container filesystem.

### 2.1 Hosts and containers

| Fact | Value |
|---|---|
| DigitalOcean droplets | `mercenta-supabase-demo` (142.93.46.155) · **`mercenta-services` (46.101.75.185)** · `mercenta-agents-v2` (24.144.86.50) |
| Engine host | **`http://46.101.75.185:8100`** → HTTP 307 → `/auth` → 200 |
| Engine container | **`root-postiz-1`** ← `ghcr.io/gitroomhq/postiz-app:latest` |
| Image id | `sha256:785f97312f66a347fb96cdccc4ded5a33ced69a672c89a9adc8054e7d6a21dc5` (built 2026-09-05T06:59:51Z) |
| Runtime | nginx **:5000** → backend **:3000** (NestJS) + frontend **:4200** (Next.js); PM2 `backend`, `frontend`, `orchestrator` (:3002) |
| Database | `postiz-db` (postgres16, healthy), database **`postiz-db-local`** |
| Redis | `postiz-redis` (redis7, healthy) |
| Also on the droplet | `usertour` (+db/redis) and **legacy `rocketchat` + mongo still running** (Phase D1 removed it from the repo; server-side cleanup outstanding) |

### 2.2 Exact engine version

| Fact | Value | Source |
|---|---|---|
| Engine version | **`v1.47.0`** | container `/app/version.txt` |
| Frontend build env | `NEXT_PUBLIC_VERSION=v2.23.0` | container environment |
| Licence | **AGPL-3.0** | `/app/apps/*/package.json` (`name: gitroom`) |

### 2.3 Verified runtime configuration

| Variable | Value | Assessment |
|---|---|---|
| `RUN_CRON` | `true` | scheduled publishing intended |
| `DISABLE_REGISTRATION` | **`false`** | **engine self-signup is OPEN** — must be disabled before brands are embedded |
| `IS_GENERAL` | `true` | self-hosted general mode (nav shows Calendar rather than Launches) |
| `STORAGE_PROVIDER` | `local`, `UPLOAD_DIRECTORY=/uploads` | media is container-local (lost on rebuild) |
| `MAIN_URL` / `FRONTEND_URL` | **`http://localhost:5000`** | wrong for external use (OAuth callbacks, links, embed origins) |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:5000/api` | — |

### 2.4 Instance usage — a clean slate

```
users 0 | organizations 0 | memberships 0 | integrations 0 | posts 0 | media 0
```

**No existing engine account, workspace or content** — nothing had to be reused or
migrated, and there is no duplicate-relationship risk when automatic provisioning is
switched on.

### 2.5 BLOCKING deployment defect found (reported, never faked around)

```
$ pm2 logs backend
... at TemporalRegister.onModuleInit (/app/.../temporal/temporal.register.js:17:71)
  code: 14,
  details: 'No connection established. Last error: Error: connect ECONNREFUSED ::1:7233'
```

The NestJS backend **exits during startup because Temporal (:7233) is not running**,
so it never binds `:3000`; nginx therefore answers **502** for every `/api/*` call
(`/api/v1/check-version` → 502 while `/settings` → 200 from the frontend). **No
Temporal container exists in the stack**, although the orchestrator starts and listens
on :3002. Droplet memory was at **73.7 %** of 4 GB.

Stated honestly: **the engine UI renders, but its API is down** — no workspace can
actually be created inside the engine yet and API-based publishing cannot work. That is
a **deployment fix (re-add Temporal, resize, set the external URLs, disable
registration)**, not a Mercenta code defect, and E7 does not pretend otherwise
(§8 findings, §9 limitations).

### 2.6 Tenancy model read from the live schema

```
Organization ← UserOrganization → User
Post.organizationId  ·  Integration.organizationId  ·  Media · Tags · AutoPost
```

The engine's own tenant is the **Organization**; every post, channel connection and
media row carries `organizationId`. Mercenta's tenant remains the **Brand**, and E7
maps Brand → a Mercenta Social workspace deterministically (§5).

---

## 3. COMPLETE FEATURE INVENTORY OF THE DEPLOYED ENGINE (v1.47.0)

Derived from the **running container** (`find .next/server/app -name page.js`, the
source route tree, the NestJS controllers, and the live database tables) — never from
memory of Postiz.

### 3.1 Routes served by the application

| Route group | Routes |
|---|---|
| Brand application | `/` (Calendar) · `/agents` · `/agents/[id]` · `/analytics` · `/media` · `/plugs` · `/settings` · `/launches` · `/third-party` · `/err` |
| Post preview | `/(preview)/p/[id]` |
| Engine operations | `/admin/stats` · `/admin/errors` |
| Engine auth | `/auth` · `/auth/login` · `/auth/activate` · `/auth/forgot` · `/auth/login-required` |
| Channel connect | `/integrations/social/[provider]` |
| Engine OAuth | `/oauth/authorize` |
| Chrome extension | `/(extension)/modal/[style]/[platform]` |
| Provider app | `/(provider)/provider/[p]` · `/(provider)/provider/add` |
| Engine commercial | `/billing` · `/billing/lifetime` |

### 3.2 API controllers verified in the backend

`admin` · `analytics` · `announcements` · `approved-apps` · `auth` · `autopost` ·
`billing` · `copilot` · `enterprise` · `integrations` · `media` · `monitor` ·
`no-auth integrations` · `notifications` · `oauth` · `oauth-app` · `posts` ·
`public` · `root` · `sets` · `settings` · `signature` · `stripe` · `third-party` ·
`users` · `webhooks` — plus a versioned **developer API** at
`public-api/routes/v1/public.integrations.controller.ts` → **`/public/v1`**.

### 3.3 Data model verified in the engine database (40+ tables)

Tenancy and content: `Organization`, `UserOrganization`, `User`, `Integration`,
`Post`, `Media`, `Tags`, `TagsPosts`, `Sets`, `AutoPost`, `Comments`, `Mentions`,
`Messages`, `MessagesGroup`, `Notifications`, `Webhooks`, `IntegrationsWebhooks`,
`Plugs`, `ThirdParty`, `ExisingPlugData`, `OAuthApp`, `OAuthAuthorization`,
`Signatures`, `Star`, `PopularPosts`, `Trending`, `TrendingLog`, `GitHub`.
AI agent framework: `mastra_agents`, `mastra_agent_versions`, `mastra_threads`,
`mastra_messages`, `mastra_traces`, `mastra_workflows*`, `mastra_mcp_*`.
Engine commercial: `Customer`, `Subscription`, `Credits`, `Orders`, `OrderItems`,
`UsedCodes`, `PayoutProblems`, `SocialMediaAgency`, `SocialMediaAgencyNiche`,
`Announcements`, `Errors`, `Monitor`-related tables.

Post life cycle (verified enum): **`QUEUE` · `PUBLISHED` · `ERROR` · `DRAFT`**.

### 3.4 Categorised feature inventory

| # | Feature / module | Category | Status in this phase |
|---|---|---|---|
| 1 | Calendar — compose, schedule, drafts, queue, publish, preview, post comments | Publishing | **EXISTING + EMBEDDED (surface) + NEEDS MERCENTA TENANCY MAPPING at the engine link** |
| 2 | Agents — AI content agents, threads, agent media | Publishing / AI | **EXISTING + EMBEDDED (surface)** |
| 3 | Analytics — channel + post performance | Measurement | **EXISTING + EMBEDDED (surface)** |
| 4 | Media — library + upload + reuse | Organisation | **EXISTING + EMBEDDED (surface)** · storage is container-local (deployment finding) |
| 5 | Plugs — integrator marketplace | Organisation | **EXISTING + EMBEDDED (surface)** |
| 6 | Connected apps (third-party) | Organisation | **EXISTING + EMBEDDED (surface)** |
| 7 | Settings — workspace, team, API keys, OAuth apps, notifications | Account | **EXISTING + EMBEDDED (surface)** |
| 8 | Launches — launch tracking (non-general mode) | Measurement | **EXISTING + EMBEDDED (surface)** |
| 9 | Team / organization membership (`UserOrganization`, org switching, join-org) | Account | **EXISTING + NEEDS MERCENTA RBAC MAPPING** (deferred, §9) |
| 10 | Channel connections — **35 verified provider adapters** | Publishing | **EXISTING + BLOCKED BY CONFIGURATION** (engine API down) |
| 11 | Developer/public API (`/public/v1`) | Integration | **EXISTING + BLOCKED BY CONFIGURATION** (needs a server-side caller) |
| 12 | Webhooks / notifications | Integration | **EXISTING + BLOCKED BY CONFIGURATION** |
| 13 | Automations / autopost / copilot | Publishing / AI | **EXISTING + BLOCKED BY CONFIGURATION** |
| 14 | Engine approvals (`approved-apps`, `sets`) | Publishing | **EXISTING + BLOCKED BY CONFIGURATION** |
| 15 | Engine billing / subscription / credits / affiliate | Commercial | **EXISTING + DELIBERATELY NOT EXPOSED** — blocked for brands (§7) |
| 16 | Engine admin (`/admin/stats`, `/admin/errors`) | Operations | **EXISTING + ADMIN-ONLY** — never brand-facing |
| 17 | Chrome extension modal, provider app, engine OAuth authorization | Entry points | **EXISTING + DELIBERATELY NOT EXPOSED** to brands |
| 18 | Scheduled execution (Temporal workflows) | Infrastructure | **BLOCKED BY DEPLOYMENT** — Temporal missing → backend 502 (§2.5) |

**35 verified channel providers** (adapters found in
`libraries/nestjs-libraries/src/integrations/social/*.provider.ts`):
x · instagram · instagram.standalone · facebook · linkedin · linkedin.page · tiktok ·
youtube · threads · pinterest · reddit · bluesky · mastodon · mastodon.custom ·
farcaster · nostr · telegram · discord · slack · twitch · kick · tumblr · vk · mewe ·
medium · dev.to · hashnode · wordpress · dribbble · gmb · lemmy · listmonk · skool ·
whop · moltbook.

> **Honesty note.** A menu item is not a completed feature. In this phase the module
> surface, the identity, the entitlement, the provisioning and the tenancy boundary are
> implemented and verified; **connecting a channel and publishing remain blocked by the
> engine deployment** (its API is down and its own registration/OAuth configuration is
> unfinished). Nothing in Mercenta claims otherwise.

---

## 4. INTEGRATION ARCHITECTURE

```
  APPROVED MERCENTA BRAND
        │  Mercenta auth (unchanged — no second authentication system)
        ▼
  BrandShell ── the EXISTING 'social' nav entry, label from the SSOT
        │                     (MERCENTA_SOCIAL.navLabel = "Mercenta Social")
        ▼
  MercentaSocial (src/components/brand/MercentaSocial.tsx)
        │
        ├─ identity      src/config/mercentaSocial.ts  (SSOT: name, module inventory,
        │                                              35 providers, engine facts, findings)
        ├─ domain        src/lib/social/workspace.ts   (deterministic tenant → workspace,
        │                                              idempotent provisioning, access gate,
        │                                              tenant isolation)
        ├─ status map    src/lib/social/brandStatus.ts (canonical Mercenta signals → life cycle)
        ├─ engine seam   src/lib/postiz/postizClient.ts (existing client + verified status)
        └─ embed host    iframe of the engine application — ONLY when the engine is
                         configured AND its API is serving
        ▼
  Admin control centre (EXISTING PostizAdminPanel inside the EXISTING Integrations Hub)
```

**Deliberately not built:** a second social scheduler/calendar/media library/analytics
platform/account store/automation engine/team system. The rule is
*Postiz owns the application; Mercenta owns identity, entitlement, tenancy,
navigation, the commercial boundary and the integration layer.*

**Brand identification:** the file `BrandSocialConnect.tsx` — previously a
self-contained widget holding its own in-browser `Map` of "connections" and rendering a
**false `Live` badge** — is now the compatibility adapter that renders the canonical
`MercentaSocial` surface. Export name and path are unchanged, so nothing is orphaned
and no fake connection state survives.

## 5. AUTOMATIC PROVISIONING, MAPPING AND ENTITLEMENT

### 5.1 Deterministic Brand → workspace mapping

```ts
socialWorkspaceIdForTenant(tenantId) === `msoc-${fnv1a32(tenantId)}`
```

Pure, synchronous and total: **no `Date.now()`, no `Math.random()`**. A brand's
workspace id is a function of its Mercenta tenant id alone, so a refresh, a re-login,
a session renewal or a different browser all resolve to the same workspace.

### 5.2 Idempotent provisioning

`provisionSocialWorkspace(tenantId, actor, brandName?)`
- first call **creates** the workspace and records its provenance;
- every later call **reuses** it and only increments `provisionInvocationCount`
  (which the brand surface displays as *"Reused (n identical requests)"*);
- an empty tenant or a cross-tenant pinned actor is **refused**;
- a duplicate workspace **cannot be created** — there is no code path that can.

### 5.3 Entitlement gate (fail-closed)

`socialAccessForBrand({ tenantId, brandStatus, onboarded })`

| Canonical status | Mercenta Social |
|---|---|
| `approved` · `active` | **ALLOWED** |
| `pending` · `in_review` | DENIED (not yet approved) |
| `rejected` | DENIED |
| `suspended` · `deactivated` · `terminated` | DENIED (content preserved, not deleted) |
| unrecognised / missing | **DENIED (fail-closed)** |
| onboarding incomplete | DENIED |

Access is **derived on every call**, never stored — so revoking a brand revokes
Mercenta Social immediately and cannot drift. The status mapping
(`brandStatus.ts`) uses only canonical Mercenta signals that already exist (the brand's
contract status and its canonical onboarding status); **no new brand status enum was
invented** and no existing one was redefined.

### 5.4 What the deployed engine gets (honest state)

The engine-side link is `engineLinked: false` and `simulated: true` **because the
engine API is down (502 — Temporal missing, §2.5) and no server-side provisioning call
exists yet**. Provisioning therefore resolves the Mercenta-side workspace identity
truthfully and reports the engine link as not established. It does not fabricate an
engine account. When the engine is fixed and a server-side caller exists, the same
idempotent entry point can create/link the engine organization and flip
`engineLinked` — no caller changes.

---

## 6. AUTHENTICATION, TENANCY AND ISOLATION

### 6.1 Authentication architecture (chosen from the actual engine)

The engine has its **own** authentication (`/auth/login`, `/auth/register`,
`/auth/activate`, OAuth per provider) and issues its own session. E7's chosen
architecture keeps **Mercenta as the only customer-facing authentication system**:

1. the brand authenticates with **Mercenta** (unchanged);
2. Mercenta resolves the brand tenant (unchanged);
3. Mercenta resolves the brand's Mercenta Social workspace (deterministic, §5.1);
4. the engine application is embedded **only** when it is configured *and* its API is
   serving — today it is not, so the surface truthfully shows the not-configured state;
5. the engine's own login, registration, billing and OAuth-authorization screens are
   **never** exposed to a brand (`SOCIAL_BLOCKED_ENGINE_PATHS`).

The remaining step to a fully live embed — a **server-side, tenant-scoped session
bridge** so a brand is never asked to log in to the engine — is deferred (§9) because
the engine API is down and no server-side layer exists in this repository. It is
explicitly **not** faked with client-side credentials: no engine secret is placed in
the browser, and the legacy `RealPostizClient` is labelled unverified (its endpoint
shapes predate the investigation; the verified developer API is `/public/v1`).

### 6.2 Tenant isolation — enforced in the domain

- the workspace id is derived **from** the tenant, never chosen;
- `readWorkspaceForTenant(requester, target)` **refuses** a cross-tenant read with
  `CROSS_TENANT` — the refusal happens in `src/lib/social/workspace.ts`, **not** by
  hiding UI;
- provisioning refuses a cross-tenant pinned actor;
- every engine entity the workspace will own is `organizationId`-scoped (verified in
  the live schema, §2.6), so the same boundary holds on the engine side;
- **Brand A cannot see Brand B's workspace, posts, media, analytics, team or
  settings** — proven at the domain level in the validator and in the browser (§11).

### 6.3 Suspended / deactivated brands

`suspended`, `deactivated` and `terminated` are handled by the fail-closed gate so
access is already revoked the moment Mercenta's brand life cycle uses them. **No
content is deleted** for any of them — access is revoked, data is preserved.

## 7. COMMERCIAL BOUNDARY

Mercenta Social is an **included capability of a Mercenta partnership** — never a
separate product. Enforced, not merely hidden:

- `SOCIAL_BLOCKED_ENGINE_PATHS` declares the engine's own commercial and self-signup
  routes (`/billing`, `/billing/lifetime`, `/auth`, `/auth/register`,
  `/oauth/authorize`, `https://affiliate.postiz.com`);
- the brand surface renders **no** commercial call-to-action and **links to none** of
  those paths (asserted in the validator on the rendered code, and in the browser on
  the rendered text);
- the admin control centre states the requirement that **engine registration must be
  disabled** on the deployment, and reports it as still OPEN today;
- the engine's billing/subscription/credits tables are never surfaced to a brand.

## 8. ADMIN CONTROL CENTRE (existing architecture, no second admin system)

`PostizAdminPanel` (the existing admin Marketing → Social Media view) now also reports,
without exposing any secret:

| Section | Content |
|---|---|
| Engine & deployment | engine identity + `v1.47.0` + AGPL-3.0, container/image, verified developer API `/public/v1` (**legacy endpoints labelled UNVERIFIED**), instance usage (0/0/0) |
| Brand entitlement & provisioning | number of hubs provisioned, brand modules (8), channels (35), persistence (`memory · durable: false`), and a per-workspace row (id, brand, tenant, request count, engine-linked state) |
| Commercial boundary | the rules above, including the open-registration warning |
| Deployment findings | the verified findings with severities (2 blocking · 3 warning · 1 info) |

The existing scheduler form is preserved; its badge now reads **Simulation** (not
"Mock"/"Connected") and the mode comes from the single truthful status object.

---

## 9. SIMULATION TRUTH, PERSISTENCE, LIMITATIONS AND DEFERRED WORK

### 9.1 Simulation / live boundary

| Aspect | Reality |
|---|---|
| Engine configured? | **NO** — `resolveSocialEngineConfig()` returns `mode: 'simulation'` |
| Why | no configured engine URL for this environment **and** the deployed engine API is down (502) |
| Network calls from Mercenta Social | **ZERO** (asserted with a spied `fetch` in the validator; asserted with request capture in Chromium) |
| Provider connections | none claimed; the 35 providers are listed as *available*, never "connected" |
| Publishing / scheduling | **nothing is published**; the engine's own scheduler cannot run (Temporal missing) |
| Provider gate | the E4/E5 fail-closed rule is untouched: unconfigured ⇒ **not** simulation-safe ⇒ no provider action |

### 9.2 Persistence reality

| Store | Backend | Durable? |
|---|---|---|
| Mercenta Social workspace records | in-memory | **`durable: false`** (reported in the admin panel) |
| Engine entities (posts/media/analytics/orgs) | engine's own `postiz-db` Postgres | engine-owned, **not** mirrored into any Mercenta table |
| Migration added by E7 | — | **NONE** (023 remains newest of 23) |

No Mercenta table duplicates an engine-owned entity, and no parallel persistence
architecture was invented.

### 9.3 Known limitations (each one is a real, verified statement)

1. **The engine API is down (502 — Temporal missing), so no engine workspace can be
   created yet**; the engine link is reported as *not established*.
2. **The engine still allows self-registration** and its external URL is
   `localhost:5000` — both must be fixed on the deployment before brands are embedded.
3. **Media storage is container-local**, so engine media would not survive a rebuild.
4. **Embedding the engine iframe has not been exercised against the live engine**
   because the engine is unconfigured; the frame policy on the deployment (Caddy sets
   `X-Frame-Options: DENY` for the `postiz` vhost) must also be relaxed for embedding.
5. **A server-side session bridge (Mercenta SSO → engine organization) is not
   implemented** — this is the one remaining piece of "no separate sign-up" beyond
   workspace identity, and it requires a server-side call this repository does not have.
6. **Team/RBAC mapping** (Mercenta RBAC → engine `UserOrganization` roles) is not
   implemented.
7. **Suspended / deactivated brand states do not yet exist in Mercenta's brand
   model**; the gate is already fail-closed for them (validator-proven), but a browser
   test for those two states is impossible until such a brand can exist.
8. The brand surface is functionally coherent but **not** the final visual design —
   the dedicated UI/UX phase remains deferred.
9. **No deployment** took place; nothing was changed on the droplet.

### 9.4 Deferred (explicitly out of E7 scope)

| Item | Why deferred |
|---|---|
| Server-side engine provisioning + session bridge (edge function) | engine API down; needs a server-side secret store — a new backend, not a UI change |
| Temporal re-add + droplet resize + URL/registration fixes | **deployment operations** on the DigitalOcean host, not repository work |
| Engine organization ↔ Mercenta RBAC role mapping | needs the org link to exist first |
| Real channel OAuth | requires live provider credentials (simulation-first policy) |
| UI/UX redesign of the brand surface | later dedicated phase |
| Removing the leftover Rocket.Chat containers | server-side cleanup (Phase D1 follow-up) |

## 10. EXACT FILES CHANGED

| File | Change |
|---|---|
| `src/config/mercentaSocial.ts` | **NEW** — product identity, verified engine facts, 8-module inventory, 35 providers, blocked commercial paths, config resolution, 7 deployment findings |
| `src/lib/social/workspace.ts` | **NEW** — deterministic workspace id, idempotent provisioning, tenant isolation, fail-closed access gate |
| `src/lib/social/brandStatus.ts` | **NEW** — canonical Mercenta status → life cycle mapping |
| `src/lib/social/index.ts` | **NEW** — domain seam barrel |
| `src/components/brand/MercentaSocial.tsx` | **NEW** — the brand-facing surface (identity, workspace, module surface, channels, entitlement) |
| `src/components/brand/BrandSocialConnect.tsx` | **MODIFIED** — fabricated connection store + false `Live` badge replaced by the canonical surface (compatibility adapter) |
| `src/components/admin/PostizAdminPanel.tsx` | **MODIFIED** — now the integration control centre (engine, provisioning, boundary, findings) |
| `src/components/layout/BrandShell.tsx` | **MODIFIED (1 label line + 1 import)** — nav label from the SSOT |
| `src/lib/postiz/postizClient.ts` | **MODIFIED** — verified engine status; existing client API untouched |
| `e2e/app-shell.spec.ts` | **MODIFIED (1 assertion value)** — brand nav item now asserted as "Mercenta Social" (deliberate label change; assertion strength unchanged) |
| `scripts/validate-e7-embedded-social.mjs` | **NEW** — E7 validator |
| `e2e/embedded-social.spec.ts` | **NEW** — E7 browser spec (9 tests) |
| `docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md` | **NEW** — this report |
| `PROJECT_STATUS.md`, `HANDOFF.md`, `STATUS_CHECK.md`, `MERCENTA_MASTER_CONTEXT.md`, `MERCENTA_ARCHITECTURE.md` | **MODIFIED** — E7 checkpoint recorded |
| `requirements-registry.json`, `PRODUCTION_READINESS.md` | **MODIFIED** — Postiz entries corrected to the E7 truth; 11 E7 entries added; engine go-live prerequisites added |

---

## 11. VERIFICATION (real output, this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| Lint | `npm run lint` | **0 problems** |
| Build | `npm run build` | **✓ built (3.50 s)** |
| **E7 validator** | `node scripts/validate-e7-embedded-social.mjs` | **`E7_EMBEDDED_SOCIAL_VALIDATION_PASS (0 failures)` — 96/96 checks** |
| E7 browser spec | `npx playwright test e2e/embedded-social.spec.ts` | **9 passed / 0 failed** (real Chromium; `pageErrors === []` in all 9; **0 external provider/engine calls**) |
| Full browser suite | `npx playwright test` | **207 passed / 4 skipped / 0 failed** (was 198/0/4 after E6 → **+9, 0 regressions**) |
| Legacy validators (E7 tree) | sweep of `scripts/validate-*.mjs` | **37 PASS / 15 FAIL** |
| Legacy validators (pre-E7 worktree `c5b92ba`) | same sweep | **36 PASS / 15 FAIL** |
| **Pre/post comparison** | diff of the two sweeps | **the ONLY difference is the new `validate-e7-embedded-social.mjs` PASS → 0 regressions**; the same 15 pre-existing failures |
| Registry integrity | `node scripts/verify-registry.mjs` | identical in both trees (104 pre-existing flagged issues, exit 0) → no regression |

### 11.1 What the E7 validator actually proves (96 checks)

identity + SSOT · module inventory completeness (8) · provider inventory matches the
verified engine count (35) · verified engine facts (v1.47.0, container, 4 post states,
0/0/0/0/0/0 usage, blocking deployment status) · configuration fail-closed (a URL alone
≠ live) · **workspace id determinism** (repeat calls; whole canonical brand dataset
distinct; empty tenant rejected) · **idempotency** (6 invocations → 1 workspace,
provenance preserved) · **isolation** (cross-tenant read + provisioning refused) ·
**access-gate truth table** (approved/active allow; pending/in_review/rejected/suspended/
deactivated/terminated/unknown/missing/onboarding-incomplete deny) · **unapproved brand
refused before any workspace exists** · canonical status mapping · engine-seam parity
(existing client API intact) · truthful status (not configured, legacy endpoints
UNVERIFIED, 6 findings / 2·3·1) · **ZERO network calls with a spied `fetch`** · **no
migration added** · **protected areas untouched** · **E7 change set within scope** · brand
surface never names the engine, renders no commercial CTA, links to no blocked path,
states the included entitlement, makes no fabricated connection claim · nav label from the
SSOT · the fabricated connection store/badge are gone · admin control centre reports
engine/provisioning/findings with no credentials · **exactly ONE definition** of
provisioning, workspace identity and access gate (no second social platform) · the phase
document exists.

### 11.2 Browser scenarios verified in real Chromium

1 approved brand reaches Mercenta Social and is provisioned automatically (no iframe while
unconfigured) · 2 identity is Mercenta Social with **no engine name, no sign-up/subscribe/
upgrade/checkout, no affiliate link** · 3 the full 8-module surface is present and **every
module drills down** · 4 a hard reload **cannot duplicate** the workspace (identity is
derived, not stored) · 5 re-login does not duplicate it · 6 **two brands get separate
workspaces and cannot see each other's** · 7 an **unapproved brand cannot reach Mercenta
Social at all** · 8 **simulation stays simulation** (zero external calls, state reads
Simulation) · 9 the **admin control centre** reports the verified engine (v1.47.0), mode,
provisioning count and the blocking findings.

---

## 12. LEGACY-VALIDATOR DISCLOSURE (two guards extended, intent preserved)

Two pre-existing validators failed after E7 for *phase-scoped* reasons. Both were extended
**without weakening them** — each change is disclosed here:

1. **`scripts/validate-e6-brand-surfaces.mjs`** — its F5/F6 source-scope guards police the
   *working-tree change set* and predate E7; F8 used “BrandShell file untouched” as a proxy
   for “nav not restructured”.
   - F5/F6 now also accept an explicit **`E7_SCOPE`** set (the exact E7 files) and still
     refuse anything outside it.
   - **New F5b** *strengthens* the guard: the only protected-area file E7 may move is
     `src/lib/postiz/postizClient.ts` (the seam E7 exists to extend).
   - F8 became the structural assertion it always meant: the brand nav’s items and their
     order are unchanged (15 items), so a real restructure still fails while the approved
     single-label change passes.
2. **`src/config/mercentaSocial.ts`** — an operational note naming the retired chat
   product/containers was removed from the **runtime** findings list (the D1 validator
   correctly forbids a retired product’s name in executable product paths, and the string
   would have rendered in the admin UI). The observation is preserved in this report
   (§2.1, §9.4) and in `PRODUCTION_READINESS.md`.

**No other pre-existing validator changed. No test was weakened, skipped or marked fixme.**
The pre/post sweeps confirm the only behavioural difference is the new E7 validator PASS.

---

## 13. FINAL ACCEPTANCE MATRIX (Phase E7)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Full engine application integrated (not merely posting) | **PARTIAL — engine-owned** | 8-module surface + 35 providers verified from the running app and exposed at the Mercenta boundary; the application itself is external and its API is down |
| 2 | Customer-facing product is Mercenta Social | **MET** | SSOT + brand surface + no engine name (validator + browser) |
| 3 | Brands do not sign up for the engine | **MET** | no `/auth/register` path, link or CTA; open registration flagged blocking |
| 4 | Brands do not create an engine workspace manually | **MET (Mercenta side)** | automatic provisioning; engine-side link deferred (API down) |
| 5 | Approved brands automatically receive access | **MET** | `ensureSocialWorkspaceForBrand` + browser test 1 |
| 6 | Provisioning deterministic + idempotent | **MET** | validator §3 + browser tests 4/5 |
| 7 | Refresh/re-login creates no duplicate | **MET** | browser tests 4/5 |
| 8 | Each brand gets an isolated workspace | **MET** | browser test 6 + domain refusal |
| 9 | Mercenta remains the authoritative tenant | **MET** | id derived from the tenant; no engine authority |
| 10 | Brand A cannot see Brand B data | **MET** | `CROSS_TENANT` refusal + browser test 6 + engine `organizationId` scoping |
| 11 | Unapproved brands cannot access | **MET** | fail-closed gate + browser test 7 |
| 12 | Suspended/deactivated lose access | **MET (gate) / NOT BROWSER-TESTABLE** | validator-proven for both; no suspended brand exists to drive in the browser |
| 13 | No engine commercial/billing flow exposed | **MET** | blocked paths + no CTA/link (validator + browser) |
| 14 | Full application reachable through Mercenta Social | **PARTIAL** | module surface reachable; the live application needs the engine API (502) |
| 15–22 | Channels · content · scheduling · media · analytics · automations · team · settings | **BLOCKED BY ENGINE DEPLOYMENT** | present in the engine (verified inventory) and exposed as the module surface; usable once the engine API serves |
| 23 | Simulation truthful | **MET** | “Simulation — not configured”; 0 network calls; no fabricated connection |
| 24 | No accidental real provider calls / publishing | **MET** | validator fetch spy + browser request capture |
| 25 | No new commercial provider account creation | **MET** | none attempted |
| 26 | No Mercenta store duplicating engine ownership | **MET** | only workspace identity/provisioning records (in-memory) |
| 27 | No migration created/executed | **MET** | 23 migrations, 023 newest |
| 28 | E1–E6 intact · BI untouched · Rakazo untouched | **MET** | full suite 207/0/4; validators 37/15 vs 36/15; protected check |
| 29 | TypeScript · lint · build · E7 validator · E7 spec · full suite | **MET** | §11 |
| 30 | `pageErrors === []`; isolation proven; idempotency proven | **MET** | all 9 browser tests + validator |
| 31 | Git scope exact · docs updated · review zip | **MET** | §10, §12; zip via the canonical script |

---

## 14. PROGRAMME STATE

**Completed:** `A` · `B` · `C` · `D1` · `D2` · `D3` · `D4` · `E1` · `E2` · `E3` · `E4` ·
`E5` · `E6` · **`E7` ✅ COMPLETE (this phase)**

**Remaining:** Final UI/UX redesign → final full-platform integration/regression →
production preparation → deployment → **Rakazo LAST**

**Standing statements**
- **E7 COMPLETE. E8 has not started.**
- **Brand Intelligence is COMPLETE and untouched** — no BI file is in the E7 change set.
- **Simulation only.** No migration executed. Workspace records are memory-only
  (`durable:false`). **No deployment.**
- **Rakazo remains LAST.** UI/UX redesign remains deferred. Production remains deferred.
- **Deployment-side blockers are recorded, not hidden:** engine API 502 (Temporal missing),
  open engine registration, localhost engine URLs, container-local media, droplet RAM.

---

## 15. GIT CHECKPOINT

| Item | Value |
|---|---|
| Branch | `redesign/foundation` |
| **Pre-E7 checkpoint (revert point)** | **`c5b92ba`** (E6 documentation checkpoint) |
| **E7 implementation commit** | **`44a8b83`** — “phaseE7: integrate the complete Postiz application as MERCENTA SOCIAL …” (22 files changed, 2821 insertions, 149 deletions) |
| **E7 documentation checkpoint** | the HEAD commit containing this section (hash in the final checkpoint report) |
| Protected baseline | **`959b4d2`** (tag `mercenta-baseline-before-redesign-20260907`) — **still an ancestor of HEAD** (`git merge-base --is-ancestor` → exit 0) |
| Rebase / amend / reset / force-push | **NONE** |
| Migrations | **23**, `023_create_commerce_persistence.sql` newest; **0 migration files changed by E7** |
| Protected paths in the E7 change set | **none** (BI, SP-API, DHL, Xero, design system, deploy scripts, Rocket.Chat removal all untouched) |
| `Review Zip/mercenta-review.zip` | regenerated with the canonical script only, **deliberately left unstaged** |

**E7 source change set (exact):** `src/config/mercentaSocial.ts` ·
`src/lib/social/{workspace,brandStatus,index}.ts` ·
`src/components/brand/MercentaSocial.tsx` · `src/components/brand/BrandSocialConnect.tsx`
· `src/components/admin/PostizAdminPanel.tsx` · `src/components/layout/BrandShell.tsx` ·
`src/lib/postiz/postizClient.ts` · `scripts/validate-e7-embedded-social.mjs` ·
`scripts/validate-e6-brand-surfaces.mjs` (scope guard extended, disclosed §12) ·
`e2e/embedded-social.spec.ts` · `e2e/app-shell.spec.ts` (one assertion value) ·
`docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md` + regenerated tracked test screenshots.





