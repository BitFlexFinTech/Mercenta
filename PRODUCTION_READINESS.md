# PRODUCTION_READINESS.md — go-live checklist

**Last updated:** Phase E2E (13 Sep) — **the deterministic investor-demo lifecycle
is DONE and introduces NO new mock, placeholder or credential requirement.**
`src/lib/simulation/investorDemo.ts` runs the whole 22-stage lifecycle on the
EXISTING canonical seams (application → approval → onboarding → compliance →
catalogue → PO → acknowledgement → fulfilment → shipment → delivery/invoice/
payment → returns → deductions → dispute → commission → payout → CRM →
marketing → integrations → social → RBAC → audit → error/recovery) with ZERO
network calls, and is reset/replay-deterministic (identical digest).
**One real domain gap was closed, not faked:** the compliance gate has always
required a signed distribution agreement, but contracts were seed-only, so a
tenant created through the real application → approval → onboarding path could
never clear its gate. A canonical operator action
(`demoStore.ensureDistributionAgreement` / `api.issueDistributionAgreement`)
now issues that agreement against the ONE `demoContracts` store. **Nothing here
requires a credential; nothing here is a placeholder** — the only remaining
go-live items are unchanged (real provider credentials + the deploy-time Edge
Functions listed in `GO_LIVE.md`).
`node scripts/validate-investor-demo.mjs` → 41/41 PASS · `e2e/investor-demo.spec.ts`
→ 10/10 PASS.

**Last updated:** Phase D2 + F (13 Sep) — **the UI/UX status sweep and the first
production-preparation work are DONE.** Phase D2 migrated the remaining
domain-status surfaces onto the canonical presentation layer
(`poStatusPresentation`, `ackStatusPresentation`, `ackWindowPresentation`,
`deductionStatusPresentation`, `submissionStatusPresentation`,
`shipmentStatusPresentation`, `onboardingStatusPresentation`,
`returnTrackingStatusPresentation`, `poOutageStatusPresentation`,
`complianceGatePresentation`, `billingDecisionPresentation`) and deleted two
duplicated status sources outright: the brand PO list's local STATUS_BADGE/
STATUS_LABEL maps and `STATUS_COLORS` in types.ts. **No new mock, placeholder or
credential requirement was introduced.**
**Phase F (production preparation):** the go-live runbook now EXISTS —
**`GO_LIVE.md`** (preconditions, environment, migrations + Edge Functions, the
credential-only provider swap, deploy, the 8-step post-deploy smoke test,
rollback, and the explicit non-scope: Social parked, Rakazo last). A real tooling
defect was also fixed: **`scripts/validate-edge-functions.mjs` used to CRASH
(ENOENT) whenever an expected Edge Function was absent** — it now reports each
absent artefact as an explicit deploy-time item, asserts only what is present,
and exits 0 with `Assertions run: 37 · failures: 0 · skipped (absent artefact): 36`
plus the list of the 8 artefacts to create at go-live.
**Still open (buildable next):** `scripts/integrity-audit.mjs` carries 12 stale
assertions (it expects the pre-Phase-6 shell routing, the pre-rename "Get
Started" CTA, and the removed `validate:wording` script) — it reports 46/12; the
assertions must be repointed at the current architecture.

**Last updated:** Phase D1 (13 Sep) — **BUILD-FORWARD session A+B+C+D1; NO new mock, placeholder or
credential requirement was introduced.** ComplianceUploadCard/ComplianceApprovals were re-verified and
fixed (stale row status after an Upload; the canonical `reviewGateDocument` gate sync was activated).
The **Integration Hub** now consumes its canonical sources (`INTEGRATION_META.category`,
`INTEGRATION_CATEGORY_LABELS`, `hasLiveCredentialHint`): mode-derived state tiles that filter the list,
an actionable attention alert, category grouping, search, honest empty state, and a truthful
**"developer demo key present — not a verified connection"** note, so an env demo key can never be read
as a live integration. `src/lib/statusPresentation.ts` is now the single source of truth for presenting
a domain status (semantic tone + machine-readable `data-status`); a simulated/pending/error state can no
longer be styled as a stronger one on the surfaces that adopt it. The whole go-live picture below is
unchanged: **only credentials + deploy-time functions remain** for the live paths.

**Last updated:** Phase G1 (13 Sep) — **the retired Rocket.Chat server infrastructure is fully
removed from `mercenta-services` (46.101.75.185)**: containers, dedicated Mongo volume, anonymous
volumes, images and the compose service/volume entries are gone; the stack re-validates and all 10
active services were verified unaffected (engine `/api/` 200, `/auth` 403 edge block intact, Caddy
config valid, disk 27 → 24 GB). Also in G1: the **brand-facing deductions ledger** was built
(Tour 5 surface) using only canonical domain read/mutate paths. **Mercenta Social/Postiz remains
DEFERRED** — the droplet was not resized and the Postiz roadmap was not continued.
**Last updated:** Phase E7 (12 Sep) — **Mercenta Social (the full Postiz application exposed to approved brands) is integrated and simulated end-to-end at the Mercenta boundary; the ENGINE side is blocked by deployment, not by code.** Engine version verified as **v1.47.0** (`root-postiz-1` on `mercenta-services`, 46.101.75.185). Verified blockers: the NestJS backend exits on `ECONNREFUSED ::1:7233` because **Temporal is missing**, so nginx answers **502** for `/api/*`; **`DISABLE_REGISTRATION=false` (engine self-signup OPEN)**; `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000`; media storage container-local; droplet RAM 73.7 %. Consequently the Mercenta→engine link is **not established** (`engineLinked:false`, reported truthfully) and channel connect / publishing / the server-side session bridge remain **deferred**. Mercenta Social itself performs **zero network calls** and claims no connection. (Earlier: Phase E3 catalog is complete and simulated end-to-end…)  The catalog submission path runs through the EXISTING mock-first seam (`createSPApiClientForConnection` → `MockAmazonSPAPIClient`) and now records a canonical submission record with explicit `simulated:true` provenance, persisted through the D4 domain port (memory adapter by default → **nothing durable** while browser Supabase credentials are absent). Go-live for this path = enter real Amazon SP-API credentials in the wizard (**zero code changes**) + deploy the `spapi` Edge Functions + run migration `022_create_catalog_persistence.sql` (RLS, brand-isolation policy, **not executed**). No Amazon outcome is fabricated anywhere: a mock result is labelled SIMULATED in the record, the UI and the audit log, and no ASIN is invented. (Earlier: Stage 26 completion — server-side tenant enforcement is now REAL: `compliance-gate-check` and `catalog-import` derive brand_id exclusively from the verified JWT (never the request body; mismatch → 403), and the live CSV-import client sends the session token. Runtime cross-tenant tests execute in `validate:stage26`; all 24 views smoke-render; layout audit green. **Remaining go-live work is deploy/credential-only** — no unbuilt scope.)

**Policy:** every external integration is built behind a swappable seam (`createSPApiClientForConnection` pattern): a `Mock*Client` runs whenever real credentials are absent; the `Real*Client` activates purely by entering real credentials in the Integrations wizard. **Going live should never require code changes** — only credentials + flipping the connection out of mock mode.

## Integration credentials

| Integration | Currently active | What's needed to go live | Where it's entered | Code changes needed |
|---|---|---|---|---|
| Amazon SP-API | `MockAmazonSPAPIClient` (simulated submissions, PO pool) | Admin registers an app in Amazon Developer Console for the Vendor Central account → LWA Client ID + Secret; one-time OAuth consent | Integrations wizard → **Amazon Selling Partner API** card (real popup path already exists; enter public Client ID, complete consent, Edge Function exchanges + Vault-stores refresh token, `credentials` passed to `createSPApiClientForConnection`) | None (wire stored credential ref into `api.ts` factory call — marked TODO at that call site) |
| Stripe | `MockStripeClient` (`mock:sub-…` ids, dunning path simulated); Billing panel renders fully in "(Mock) mode" | Free Stripe account → test keys today, live keys at launch | Integrations wizard → **Stripe** card (OAuth/test-key path); factory `createStripeClientForConnection` flips to real on a verified connection | None expected |
| DocuSign / PandaDoc | `MockEsignClient` (envelope lifecycle + every-4th decline simulated); Send-for-Signature works end-to-end via factory | Account signup on whichever provider the business holds; free developer sandbox exists for both | Integrations wizard → **E-Signature** card | Deploy `esign-envelope` Edge Function + wire its Vault lookup (`resolveToken`); factory's `getConnection` returns the Vault-backed connection |
| Postmark/SendGrid | `MockMailClient` (simulated hard-bounce on malformed recipients) | Free Postmark/SendGrid trial account + server API token | Integrations wizard → **Transactional Email** card (live test-call already implemented); factory `createMailClient` flips to real | Deploy `send-email` Edge Function + wire its Vault lookup (`resolveToken`) |
| Hunter.io | Not connected | Free Hunter plan (25 verified emails/mo) suffices for dev | Integrations wizard → **Hunter.io** card (live ping implemented) | None |
| OpenRouter | Not connected | OpenRouter account + API key (pay-per-use, no approval process) | Integrations wizard → **OpenRouter** card (live ping implemented) | None |
| Instantly.ai | Reply webhook BUILT (`instantly-reply-webhook`: classify → persist → hot-lead flag); outbound enrolment mocked in discovery engine | Instantly Outreach plan + dedicated cold domain (**not** a subdomain of mercanta.co.uk — deliverability isolation per Stage 10 spec) | Integrations wizard → **Instantly.ai** card; webhook URL configured per-campaign in Instantly | Deploy the webhook function + set `INSTANTLY_WEBHOOK_SECRET` |
| **Postiz → Mercenta Social** (full social application, engine v1.47.0) | Engine deployed but **unusable**: API 502 (Temporal missing); `MockPostizClient` in-memory and nothing published; Mercenta side = workspace identity/provisioning/entitlement/isolation only, `engineLinked:false` | **Deployment fixes first:** re-add Temporal; `DISABLE_REGISTRATION=true`; `MAIN_URL`/`FRONTEND_URL` → public URL; move media off container-local storage; add RAM. **Then:** enter the engine URL + API key in the wizard, and deploy the server-side provisioning/session-bridge function | Integrations wizard → **Postiz** card (`api_url`, `api_key`); admin **Mercenta Social** control centre shows state + findings | **None for the Mercenta client seam** (mock → real is credential-only). The **server-side provisioning/session bridge is the one remaining build item** (E7 deferred it deliberately — see the E7 report §9.4) |

**Summary:** only Amazon genuinely requires the admin's own account/approval process. Every other provider can become real today via a free sandbox/test-mode signup, entered through its existing wizard card.

## Placeholder business data

| Value | Current placeholder | Real value needed | Lives in |
|---|---|---|---|
| EORI | `GB-EORI-PENDING-REGISTRATION` | Mercenta Partners Ltd's real UK EORI once issued | `src/config/customs.ts` (`MERCENTA_EORI`) |
| UK VAT number | `GB-VAT-PENDING-REGISTRATION` | Real VAT registration number | `src/config/customs.ts` (`MERCENTA_VAT`) |
| Registered address | "Distribution Hub, Northampton" wording | Real registered office address | `src/config/customs.ts` |
| Commission rate / monthly fee | Placeholders flagged in `src/config/commercial.ts` | Commercial sign-off | same file |
| Carrier markup rates | Demo ledger uses illustrative 5.5% cost / 7% billed | Real corporate FedEx/DHL/BAK rate cards | shipping-margin ledger rows |
| Contract rate fields | Flagged placeholders in `lib/agreement.ts` output | Signed commercial terms | same file |

## Structural debt blocking production

0. **Edge Functions (Stage 17 + 21 + 22):** `/payouts-transfer`, `/catalog-import` (+ `import_catalog_batch` RPC in migration 0010), `/discovery-directory`, `esign-envelope`, `send-email`, `instantly-reply-webhook` are BUILT with mock-mode support. `resolveToken` Vault lookups wired (service-role → `vault.decrypted_secrets`). To go live on each path: `supabase functions deploy <name>` and set provider secrets; daily-digest schedule ships as migration 0011 (`pg_cron` — replace `<PROJECT_REF>`/`<SERVICE_ROLE_KEY>` at deploy). Instantly: point the campaign's reply webhook at the deployed `instantly-reply-webhook` URL (+ shared secret).

1. **Demo store collapse (Stage 2):** RESOLVED — COMPLETE as of Stage 20, polish finished Stage 23 (zero direct demoStore imports in views/components; `DemoBrandRow` canonically defined in `src/data/demoData.ts`). Dossiers live in `src/data/regionalDossiers.ts`, context bootstrap state in `src/data/bootstrap.ts`, all entity fixtures in demoStore generated from the canonical `demoData.ts`. Validators consume the same api/demoStore fixture universe the app does; 0007 seed SQL is generated from that dataset.

2. **Secret storage:** integration state persists status-only to localStorage; real secrets must go to Supabase Vault behind Edge Functions before any real credential is entered.
3. **CSV bulk catalog import (Stage 9):** BUILT — `src/lib/catalog/csvImport.ts` (stream-parse → validate → all-or-nothing atomic commit). Mock commit client active; the real `/catalog-import` Edge Function (single Postgres transaction) must be deployed before live use.
4. **Discovery engine (Stage 10):** BUILT on the mock-first seam — `src/lib/discovery/engine.ts` runs directory → OpenRouter research → Companies House enrichment → Hunter email → wording-linted Instantly enrolment end-to-end on mocks, with per-service budget caps (`budget.ts`) enforced before any provider call. Real clients carry correct endpoints (OpenRouter chat completions, Companies House search, Hunter domain-search, Instantly lead-add) and activate by entering keys in their wizard cards; `RealDirectoryClient` additionally requires the `/discovery/directory` Edge Function. Hot-lead reply routing (`handleInboundReply`) wires the previously-dead classifier — real-time notification for hot leads only. No social-media scraping anywhere. Budget caps are placeholders pending sign-off.


3. **RLS runtime test (Stage 7)** never executed against a live project.
4. **Stages 8–16** per STATUS_CHECK.md remain open.

> **STATUS UPDATE (Phase E9, 13 Sep):** the engine now needs the **8 GB resize**
> documented in HANDOFF item 8. On the current 2-vCPU/4 GB droplet Postiz's Temporal
> orchestrator **webpack-bundles a workflow per provider task queue (34)** at startup
> and is OOM-`Killed` in a loop (load 56–65, 33–85 MB free), so queued/scheduled posts
> do not execute. Already mitigated reversibly (swap 2 GB → 4 GB, legacy Rocket.Chat +
> Mongo stopped, `NODE_OPTIONS` heap cap, usertour stopped). Resizing is a **paid,
> irreversible** action → **user action required**:
> `DigitalOcean → Droplets → mercenta-services → Resize → CPU/RAM only → 8 GB`.
> Real channel connect, real publication acceptance and Temporal execution were all
> verified live before this ceiling; a genuine engine defect (Nostr `finalizeEvent`
> Uint8Array) was found and fixed — see `docs/PRODUCT_CONSOLIDATION_PHASEE9_2026-09-13.md`
> and re-apply `scripts/social-sso/engine-patches.mjs` after any engine upgrade.

## Mercenta Social — engine deployment prerequisites (Phase E7, 12 Sep)

> **STATUS UPDATE (Phase E8, 12 Sep):** items **1, 2, 3, 4, 5 and 6 below were FIXED**
> and verified on the deployment (Temporal + its Elasticsearch visibility store
> restored; engine URLs set to the real TLS origin; media on a named volume; 2 GB swap
> added; frame policy replaced with a CSP `frame-ancestors` allow-list; the engine's own
> signup/login is now **403** from the internet). **Item 7's note and the deferred
> server-side bridge are handled elsewhere** — the bridge now EXISTS
> (`supabase/functions/social-session` + `scripts/social-sso/server.mjs`). Still open and
> requiring **user action**: a DNS `A` record for `postiz.mercenta.co.uk → 46.101.75.185`
> (branded hostname + seamless inline embedding) and, optionally, a droplet resize to
> 8 GB. Full record: `docs/PRODUCT_CONSOLIDATION_PHASEE8_2026-09-12.md`.

These are **server-side / deployment operations** on `mercenta-services` (46.101.75.185), verified on 2026-09-12. Mercenta code does not work around any of them; the admin Mercenta Social control centre reports them live.

| # | Item | Evidence | Required action |
|---|---|---|---|
| 1 | **Engine API down (BLOCKING)** | `pm2 logs backend` → `connect ECONNREFUSED ::1:7233` (TemporalRegister); `/api/v1/check-version` → 502 while `/settings` → 200 | Re-add the **Temporal** service to the stack, then restart the engine; verify `/api/*` no longer 502 |
| 2 | **Engine self-registration OPEN (BLOCKING)** | `DISABLE_REGISTRATION=false`; `/auth` renders a registration page | Set `DISABLE_REGISTRATION=true` so no brand (or stranger) can create an engine account outside Mercenta |
| 3 | **Engine external URLs wrong** | `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000` | Point them at the public engine URL (OAuth callbacks, links, embed origin) |
| 4 | **Media storage container-local** | `STORAGE_PROVIDER=local`, `UPLOAD_DIRECTORY=/uploads` | Move to object storage before brands upload media |
| 5 | **Droplet headroom** | 73.7 % RAM of the 4 GB `s-2vcpu-4gb` droplet with Temporal absent | Resize (8 GB was the documented plan) when Temporal returns |
| 6 | **Embedding frame policy** | `scripts/Caddyfile` serves the engine vhost with `X-Frame-Options: DENY` | Allow the Mercenta origin as a frame ancestor before the embedded application can render |
| 7 | **Retired chat containers still running** | `rocketchat` + its mongo container are up on the droplet although Phase D1 removed the product from the platform | **DONE — Phase G1 (2026-09-13).** Server-side cleanup COMPLETE: both containers, the dedicated Mongo volume, both anonymous volumes and both images removed; the two compose services + volume entry deleted from `/root/docker-compose.yml` (stack re-validated with `docker compose config -q`). No rocket/chat/mongo container, volume or image remains, and all 10 active services were verified unaffected. Backup: `/root/rocketchat-removal-backup-20260913/`. This note is kept here, NOT in product runtime strings, because no executable product path may name the retired product. |

**Deferred build item (E7):** a server-side, tenant-scoped **provisioning + session bridge**
(the engine's `/public/v1` developer API called from a server function with a Vault-held key),
so a brand never authenticates separately to the engine. This is the only remaining *code*
piece for a live channel-connect/publish path; it was deliberately not invented in E7 while
the engine API is down.
