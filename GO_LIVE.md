# GO_LIVE.md — production go-live playbook

> Canonical, ordered runbook for taking Mercenta live on **mercenta.co.uk**.
> Companion documents: `PRODUCTION_READINESS.md` (what is mocked and what each
> credential replaces), `PROJECT_STATUS.md` (what is built), `HANDOFF.md`.
>
> **Scope of this playbook:** the Mercenta core platform (brand portal, admin
> control centre, carrier terminal, commerce/compliance/deduction workflows,
> integrations control plane). **Out of scope:** Mercenta Social (PARKED — see
> §7) and Rakazo (deliberately LAST — untouched).
>
> Every step below is either already done in the repository or is an explicit
> external action. Nothing here requires a code change to go live; the whole
> policy is credential-only swap (see `PRODUCTION_READINESS.md`).

## 0. What "go-live" means here

The platform is live when, on the production domain:

1. the marketing site + Partner Login render with zero page errors;
2. the operator can sign in and reach every admin surface;
3. a brand can sign in and reach every brand surface, with tenant isolation intact;
4. a partner application can be submitted and approved, creating a canonical
   onboarding record that the brand can then enter;
5. every integration card reports its **truthful** state (simulation / available /
   live) and no simulated provider is presented as live;
6. the compliance gate blocks and clears correctly;
7. the deploy is reproducible from this repository + credentials alone.

## 1. Preconditions (must all be true before step 5)

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | `npm run build` produces `dist/` with no errors | repo | ✅ verified every session |
| 2 | `npx tsc --noEmit -p tsconfig.app.json` = 0 errors | repo | ✅ |
| 3 | `npm run lint` = 0 errors | repo | ✅ |
| 4 | Full Playwright suite green (0 failed) | repo | ✅ |
| 5 | Supabase project created (production) + `VITE_SUPABASE_URL`/`ANON_KEY` | **user** | ⏳ |
| 6 | Production Edge Functions deployed (step 3) | **user** | ⏳ |
| 7 | Provider credentials entered (only what is actually needed — see §4) | **user** | ⏳ partly |
| 8 | Mercenta Partners Ltd EORI + UK VAT numbers issued | **external** | ⏳ (placeholders in `src/config/customs.ts`) |
| 9 | Namecheap FTP credentials in `.env` (`NAMECHEAP_FTP_*`) | **user** | ✅ present |
| 10 | Commercial figures signed off (commission rate, monthly fee, margins) | **user** | ⏳ (`src/config/commercial.ts`) |

Steps 1–4 are the repository gate: **do not deploy if any is red.**

## 2. Environment

1. Create production `.env` from `.env.example` (never commit it).
2. Set the build-time public keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   Optional demo-key hints (they only enable a live TEST CALL, never a live
   status): `VITE_OPENROUTER_API_KEY`, `VITE_HUNTER_API_KEY`,
   `VITE_INSTANTLY_API_KEY`.
3. Set the deploy credentials: `NAMECHEAP_FTP_HOST|USER|PASS|PORT`.
4. Optional monitoring: `VITE_SENTRY_DSN` (Sentry is a no-op without it).
5. Secrets must NEVER be committed; provider secrets live in Supabase Vault
   behind Edge Functions (see `PRODUCTION_READINESS.md` → Secret storage).

## 3. Database + server functions

1. Apply the migrations in order from `supabase/migrations/` (23 files today) to
   the production project. Migration **history is canonical** — do not edit or
   re-order existing files; add new ones if the data model genuinely changes.
2. Deploy the Edge Functions that exist in the repository:
   `supabase functions deploy xero-token`, `xero-webhook`, `social-session`
   (the last only if Mercenta Social is resumed — see §7).
3. Deploy the functions that are **listed in PRODUCTION_READINESS.md but not yet
   in the tree** if their live path is being enabled at launch. Each is a
   self-contained go-live item, and `scripts/validate-edge-functions.mjs` lists
   the current set explicitly (payouts-transfer, catalog-import + migration 0010
   RPC, discovery-directory, esign-envelope, send-email, instantly-reply-webhook,
   migration 0011 pg_cron, retail-channel-cases). Until a function is deployed the
   matching feature stays in its honest simulation state — it never silently
   fakes success.
4. Set the function secrets at deploy time (`supabase secrets set ...`) — the
   Vault-backed `resolveToken` lookups read them per request.
5. DNS: the production domain must point at the hosting target. Current DNS
   action still outstanding for Social only (`postiz.mercenta.co.uk` →
   `46.101.75.185`); it is NOT required for the core platform.

## 4. Provider credentials (only what you actually want live)

Policy: **going live requires credentials, never code changes.** Each card in
Super Admin → Integration Settings flips from simulation to live purely by
entering a real credential. Enter only what is needed today:

| Provider | Needed for | Where it is entered | Notes |
|---|---|---|---|
| Amazon SP-API | catalogue submission + PO ingestion | Integrations → Amazon Selling Partner API | the ONLY provider needing the business's own Amazon approval process |
| Stripe | brand subscriptions | Integrations → Stripe | test keys work today |
| Transactional Email | notifications + outreach | Integrations → Transactional Email | needs `send-email` deployed |
| E-Signature (DocuSign/PandaDoc) | contract flow | Integrations → E-Signature | needs `esign-envelope` deployed |
| Hunter.io / OpenRouter / Instantly.ai | discovery + outreach | Integrations → respective cards | live test call already implemented |
| DHL / Xero / Companies House / HMRC | logistics / accounting / compliance verification | their dedicated surfaces + cards | currently authoritative SIMULATION; enter credentials when accounts exist |
| Palletline | UK-domestic palletised freight (Mercenta's Palletline account) | Integrations → Palletline | registry entry exists (`defaultMode: available`); an adapter following the DHL pattern is required before this becomes a live carrier booking |
| Retail-channel case escalation | brand case → channel case | Integrations → Amazon Selling Partner API | needs the `retail-channel/cases` Edge Function deployed (§3); until then the seam refuses truthfully and never claims a case was created |

**Do not** present an unconfigured provider as live: the Hub derives its mode
from the connection state, and a sandbox connection is never treated as verified.

## 5. Deploy

1. Confirm §1's repository gate is green on the exact commit being shipped.
2. Demo (safe rehearsal, already the standing target):
   `bash scripts/deploy-demo.sh` → `https://demo.mercenta.co.uk`.
3. Live: point `scripts/deploy-demo.sh`'s FTP target at the production docroot
   (or run the same `lftp mirror -R --delete dist/ .` against the live host) —
   **do not create a second deploy script**; this is the only deploy path.
4. Self-hosted services (Xero bridge, Social engine) use
   `scripts/deploy-docker.sh` against the Docker host; that is a separate,
   optional track from the static app deploy.
5. After the upload, hard-verify the served bundle is the one you built
   (compare the hashed asset name in `dist/index.html` with the deployed one).

## 6. Post-deploy smoke test (must pass, in this order)

1. Marketing homepage, Partner Login, and the public pages render; console and
   page errors are zero.
2. Super Admin signs in and opens every Primary-nav destination **without a
   page error** (`scripts/runtime-sweep.mjs BASE_URL=https://<host>` is the
   canonical sweep for this).
3. Brand signs in; Purchase Orders, Product Catalog, UK Compliance, Inbound
   Shipments, Analytics and Reports render with the brand's OWN data only.
4. Second brand signs in and confirms it cannot see the first brand's POs,
   products, deductions or documents (tenant isolation).
5. Submit a partner application from the public site → approve it as Super Admin
   → the brand appears in the Onboarding pipeline → that brand can enter its portal.
6. Compliance gate: a brand with unapproved documents is blocked; approving them
   clears it.
7. Integration Settings reports truthful states (no simulated provider shown as
   live; sandbox connections labelled).
8. A purchase order acknowledgement round-trip completes and appears in the audit log.

If any step fails: stop, roll back (§8), fix in the repository, redeploy.

## 7. Explicitly NOT part of this go-live

- **Mercenta Social (Postiz)** — PARKED by decision. Engine capacity, provider
  OAuth and the branded hostname stay deferred; do not resize the droplet or
  start the Social roadmap as part of a core go-live.
- **Rakazo** — deliberately LAST; untouched.
- **Rocket.Chat** — retired and removed; not a dependency and not part of any
  deployment.

## 8. Rollback

1. The static app: keep the previous `dist/` artefact; re-upload it (the FTP
   mirror is destructive, so retain the prior build before each deploy).
2. Database: migrations are forward-only — restore from the project backup or
   apply a corrective migration; never edit an applied migration.
3. Edge Functions: redeploy the previous function revision from git.
4. Record every rollback in `PRODUCTION_READINESS.md` with the reason.

## 9. Standing rules for the live domain

- Deploy ONLY when the user explicitly says "deploy".
- demo.mercenta.co.uk is the rehearsal target; mercenta.co.uk is live and only
  reached through this playbook.
- Never commit `.env`; never print secrets in logs or reports.
- Keep the protected baseline ancestry intact (no rebase/force-push/amend).
