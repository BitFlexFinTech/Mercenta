# PHASE E8 — OPERATIONAL MERCENTA SOCIAL (LIVE ENGINE + SSO BRIDGE)
**Mercenta Partners Ltd — platform build phase report**
Date: 2026-09-12 · Branch: `redesign/foundation` · Session: E8

---

## 0. WHAT THIS PHASE IS

E7 integrated Mercenta Social at the Mercenta boundary and reported the engine as
BLOCKED (API 502, Temporal missing, open registration, localhost URLs, container-local
media, localhost-only frame policy). **E8 made the real Postiz application operational
on DigitalOcean and bridged Mercenta → engine**, so an approved brand reaches the FULL
application as Mercenta Social with **no engine signup, no plan, no password**.

**Status tags used below:** [VERIFIED] · [CONFIGURED] · [SIMULATED] · [BLOCKED] · [DEFERRED]

---

## 1. ENGINE DEPLOYMENT — FIXED [VERIFIED]

Everything below was executed against the live droplet (`mercenta-services`,
46.101.75.185) and verified afterwards.

| # | Problem found in E7 | Fix applied | Verified evidence |
|---|---|---|---|
| 1 | **Backend exited on `connect ECONNREFUSED ::1:7233`** — Temporal absent, nginx answered **502** for all `/api/*` | Restored **Temporal** (`temporalio/auto-setup:1.28.1`) + its Postgres store in `/root/docker-compose.yml` (canonical source: `docker-compose.services.yml`) and set `TEMPORAL_ADDRESS=temporal:7233` | `root-temporal-1 Up (healthy)`; `:3000` now LISTENs; `/api/auth/can-register` → **200 JSON**, `/api/*` no longer 502 |
| 2 | Second backend failure: `Unable to create search attributes: cannot have more than 3 search attribute of type Text` | Restored **Elasticsearch 7.17** for Temporal's advanced visibility with a 192 MB heap (SQL visibility cannot hold Postiz's custom search attributes) | backend starts clean; `/api/*` served |
| 3 | `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000` | Set to the real public TLS origin | engine HTML + API served from `https://46-101-75-185.sslip.io` |
| 4 | **No TLS / no DNS** for `postiz.mercenta.co.uk` (NXDOMAIN) and **ufw blocked 80/443** | Opened **80/443** in ufw; Caddy serves the engine over **real Let's Encrypt TLS** on `46-101-75-185.sslip.io` (resolves with no DNS work); the branded `postiz.mercenta.co.uk` vhost is configured and activates the moment a DNS A record exists | `subject=CN=46-101-75-185.sslip.io issuer=Let's Encrypt`; `https://…/auth/login` → **200** |
| 5 | Engine **self-registration open** to the internet | Our edge now **answers 403** for `/auth*` and `/api/auth/*` (signup page + login/signup APIs). Provisioning/login happen server-side inside the engine network only | `POST /api/auth/register` → **403**, `POST /api/auth/login` → **403**, `/auth` → **403** |
| 6 | Media container-local (lost on rebuild) | Named volume `postiz_uploads:/uploads` | volume mounted on the engine container |
| 7 | Frame policy `X-Frame-Options: DENY` prevented embedding | Replaced with a CSP `frame-ancestors` allow-list (Mercenta demo/live origins + localhost dev) on the engine vhost | header verified; see §4 for the browser cookie caveat |
| 8 | Droplet at 73.7 % RAM, no swap; ES/Temporal could not start | Added a **2 GB swap file** (persisted in `/etc/fstab`) | `swapon --show` → `/swapfile 2G`; stack stays resident |
| 9 | Docker stack on the server had drifted from the repo | Repo `docker-compose.services.yml` is the canonical source; `/root/docker-compose.yml` now matches it (the unrelated Usertour/Rocket.Chat services were left running untouched) | `docker compose config -q` → valid |

---

## 2. AUTOMATIC PROVISIONING + SIGN-IN BRIDGE [VERIFIED]

The engine exposes no admin "create user" API, and its own registration closes once any
organization exists — so Mercenta provisions through the engine's **only supported
path**, server-side, from inside the engine network:

```
Approved Mercenta brand
  → Mercenta mints a one-time HMAC handoff token      (supabase/functions/social-session)
  → browser opens {engine}/sso?t=<token>              (Caddy routes /sso to our service)
  → scripts/social-sso/server.mjs
        ├── derives the brand's DETERMINISTIC engine identity (tenant → email + password)
        ├── LOGIN first (idempotent), REGISTER only on first use
        ├── signs in server-side with the engine's real API
        └── sets the engine session cookie first-party and redirects into the app
```

**Live verification (real engine, 2026-09-12):**

| Requirement | Evidence |
|---|---|
| Automatic provisioning, no brand signup | brand A first call → `{"ok":true,"email":"brand-zambezi-9c8c82e3@social.mercenta.co.uk","reused":false,"organizationId":"a8ae0104-…"}` |
| **Idempotent** | brand A second call → `"reused":true` and the **same** organization id |
| Deterministic identity | identical derived email on every call (no random component) |
| **Per-brand isolation** | brand B → a **different** organization (`903b067c-…`), its own identity |
| Session really works | cookie → `GET /api/user/organizations` → **200** and returns **only** that brand's own organization |
| No secret in the browser | the browser receives only a short-lived HMAC URL; the engine password never leaves the server |
| No public signup/login | `/auth`, `/api/auth/register`, `/api/auth/login` → **403** from the internet |

Mercenta remains authoritative for tenancy, approval and entitlement (E7's fail-closed
gate is unchanged); the engine remains authoritative for its own application entities.
Brand organizations are stored **only** in the engine — no Mercenta table duplicates them
(no migration was added).

---

## 3. MERCENTA CLIENT [VERIFIED]

| Component | Change |
|---|---|
| `src/config/mercentaSocial.ts` | Verified engine facts updated to the operational truth (TLS host, API **up**, registration not exposed, storage persisted, instance now holds provisioned orgs) + the real caveats as findings (branded-hostname DNS, third-party frame cookies, droplet memory, production mint auth) |
| `src/lib/social/workspace.ts` | `linkSocialWorkspaceToEngine()` records the **real** engine organization + brand identity returned by the bridge; refuses to link an unprovisioned tenant; idempotent on repeat |
| `src/components/brand/MercentaSocial.tsx` | Real **“Open Mercenta Social”** launch (asks the server for the handoff URL, opens the workspace, records the link) + inline application frame once a URL exists + truthful error state when the session service is unavailable in an environment |
| `src/lib/postiz/postizClient.ts` | Public API unchanged (parity preserved); engine status now resolves as **configured** against the verified host |
| `supabase/functions/social-session/index.ts` | **NEW** — the only place a handoff token is minted (server-side secret; demo/simulation allowance explicit and recorded as a go-live item) |
| `scripts/social-sso/server.mjs` | **NEW** — the engine-side SSO/provisioning service |
| `scripts/Caddyfile`, `docker-compose.services.yml` | **NEW/CHANGED** — TLS + SSO route + engine-auth block + Temporal/ES/uploads/social-sso in the canonical stack |

## 4. HONEST BOUNDARIES (what is NOT done)

| Item | Status | Why |
|---|---|---|
| Inline **embedded** application with a live session inside the Mercenta page | **[BLOCKED]** | Chrome/Safari block cookies inside cross-site frames, so the session does not persist in an iframe. The workspace opens in its own tab (first-party cookie) — verified working. Serving the engine from a **same-site** Mercenta subdomain (`postiz.mercenta.co.uk`) is the supported route to seamless inline embedding |
| Branded engine hostname | **[BLOCKED — one user action]** | `postiz.mercenta.co.uk` has no DNS record. Add `A → 46.101.75.185`; Caddy is already configured for it |
| Real channel OAuth + publishing | **[DEFERRED]** | Requires provider developer apps/credentials (external). The engine is operational and each brand organization has its own engine API key, so publishing via `/api/public/v1/*` is available once a provider is connected |
| Token minting authenticated by the Mercenta session | **[DEFERRED → go-live item]** | Currently allowed for simulation tenants (`SOCIAL_SSO_ALLOW_DEMO=true`) to match the platform's existing deliberate demo-login posture. Production must resolve the tenant from the verified session |
| Droplet resize to 8 GB | **[DEFERRED — user action]** | Swap added for stability; resize recommended before onboarding brands at volume |

## 5. VERIFICATION (this session)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run lint` | **0 problems** |
| `npm run build` | **✓ built** |
| `node scripts/validate-e7-embedded-social.mjs` | **`E7_EMBEDDED_SOCIAL_VALIDATION_PASS` — 117/117** (96 E7 + 21 E8 assertions: engine link, SSO/bridge artefacts, canonical stack, edge blocks) |
| `npx playwright test e2e/embedded-social.spec.ts` | **10 passed / 0 failed** (incl. the new launch path: real handoff → frame + linked state, or a truthful error) |
| Live engine probes | provisioning, idempotency, isolation, session and the 403 blocks — all verified against the deployed engine (§1, §2) |

## 6. REMAINING USER ACTIONS (nothing else blocks the build)

1. **Add a DNS A record** `postiz.mercenta.co.uk → 46.101.75.185` (Namecheap) — enables the branded hostname and the same-site route to seamless inline embedding.
2. Optionally **resize** `mercenta-services` to 8 GB before onboarding brands at volume.
3. Optionally provide social-provider developer credentials to enable real channel connections.

**Exact commits:** recorded in the E8 checkpoint commits on `redesign/foundation`.
