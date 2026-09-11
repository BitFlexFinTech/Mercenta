# PRODUCT CONSOLIDATION — PHASE D1: ROCKET.CHAT REMOVAL

> Date: 2026-09-11 · Branch: `redesign/foundation` · Baseline (pre-D1 HEAD): `b7cd0d4`
> Protected baseline (never touched): tag `mercenta-baseline-before-redesign-20260907` / `959b4d2`
> Session type: **IMPLEMENTATION** (not an audit). Source of the removal decision:
> `docs/PRODUCT_CONSOLIDATION_PHASE0_RECONCILIATION_2026-09-10.md` §72 +
> `docs/PRODUCT_CONSOLIDATION_PHASEA_2026-09-10.md` §58 +
> `MERCENTA_MASTER_CONTEXT.md` §S — "`getRocketChatClient()` **always returns
> MockRocketChatClient** (accepts creds, never reads them); no
> `RealRocketChatClient` class; no message UI; no workflow depends on it."

---

## 1. Why this phase exists

Rocket.Chat was present in Mercenta as an **inert mock integration** and had
already been recorded as a permanent do-not-change decision ("Rocket.Chat is
removed; no expansion"). It was never instantiated for real, had no message UI,
and no product workflow depended on it. Phase D1 executes that decision so the
platform has ONE coherent communication model (CRM = relationship context,
Messages = the inbox surface, Helpdesk = support/ticket lifecycle, all resolving
to the ONE canonical `logMessage` → `demoMessages` store).

## 2. What was removed (exact)

### 2.1 Deleted files (3)

| File | Why |
|---|---|
| `src/components/admin/RocketChatAdminPanel.tsx` (108 lines) | The admin panel/surface. Only consumer was the AdminShell nav route. |
| `src/lib/rocketchat/rocketChatClient.ts` (118 lines) | `IRocketChatClient` + `MockRocketChatClient` + `getRocketChatClient()` factory — the factory **always returned the mock**. No `RealRocketChatClient` existed. |
| `src/lib/rocketchat/rocketChatSSO.ts` (89 lines) | `provisionRocketChatUser` / `ensureBrandGroup` SSO bridge. Only consumer was the deleted panel. |

The containing directory `src/lib/rocketchat/` is gone (no residue).

### 2.2 Source edits (6 files)

| File | Change |
|---|---|
| `src/components/layout/AdminShell.tsx` | Removed the panel import, the `{ id: 'rocketchat', label: 'Rocket.Chat' }` nav item, the `rocketchat: 'Rocket.Chat'` breadcrumb entry and the `adminView === 'rocketchat'` render condition. `MessageSquare` remains imported (still used by "Onboarding Tours"). |
| `src/integrations/types.ts` | Removed `\| 'rocketchat'` from the `IntegrationId` union and the `rocketchat` entry from `INITIAL_INTEGRATIONS`. |
| `src/integrations/registry.ts` | Removed the `rocketchat` registry card, its `INTEGRATION_ORDER` entry and its `INTEGRATION_META` entry (category `communications`, defaultMode `simulation`). Registry 19 → 18 providers. |
| `src/lib/simulation/scenarioEngine.ts` | `scenarioCase()` safety gate changed from `assertSimulationOnly(ctx, 'CASE', ['rocketchat'])` to `assertSimulationOnly(ctx, 'CASE', [])`. The CASE scenario drives the **internal helpdesk ticket store** end-to-end and requires no external provider, so an empty list is the truthful requirement. A comment records why. |
| `src/components/admin/integrations/SimulationControl.tsx` | `SCENARIO_META.CASE.requiredProviders` `['rocketchat']` → `[]` (display metadata only; must not reference a removed provider). |
| `eslint.config.js` | Removed `'src/lib/rocketchat/rocketChatClient.ts'` from the react-refresh override list (file no longer exists). |

### 2.3 Configuration / infrastructure edits (4 files)

| File | Change |
|---|---|
| `docker-compose.services.yml` | Deleted the `rocketchat` + `rocketchat-db` (Mongo) services and the `rocketchat_mongodb` volume; left Postiz/Usertour/Temporal intact. Removal note added in the header. |
| `scripts/Caddyfile` | Deleted the `chat.mercenta.co.uk { reverse_proxy localhost:3000 }` vhost and its DNS prerequisite line. |
| `scripts/deploy-docker.sh` | Removed "Rocket.Chat" from the header comment and the service-URL summary table. |
| `scripts/vps-bootstrap.sh` | Removed "Rocket.Chat" from the header comment. |

### 2.4 Test / validator edits and additions

| File | Change |
|---|---|
| `e2e/app-shell.spec.ts` | Removed `'Rocket.Chat'` from the Super-Admin nav-item assertion list (it would otherwise fail). |
| `scripts/forensic-screenshots.mjs` | Removed `'rocketchat'` from the captured admin nav list. |
| `e2e/rocketchat-removal.spec.ts` **(NEW, 120 lines, 5 tests)** | Browser regression gate: absence in Super-Admin + non-Super-Admin nav, absence from the Integration Settings registry, core communications (CRM → Messages → Helpdesk one canonical thread) still working, zero page errors, and the CASE simulation still runs. |
| `scripts/validate-rocketchat-removal.mjs` **(NEW, 122 lines, 15 assertions)** | Fast static + domain gate: files/dir gone, zero Rocket.Chat references in executable paths, registry 19→18, no `rocketchat` id/order/meta, `IntegrationId`/`INITIAL_INTEGRATIONS` clean, remaining communications providers intact, `AdminShell` clean, CASE runs with **zero** providers registered, and NORMAL_PO is **still** safety-refused (gate not weakened). |

### 2.5 Registry/audit artefact edits (1 file)

| File | Change |
|---|---|
| `requirements-registry.json` | `batchC-rocketchat-integration` → status `regressed`, description/evidence rewritten to record the Phase D1 removal (evidence now points at the phase report + the new validator/spec). `batchF-honest-status-messages` → dropped the deleted `RocketChatAdminPanel.tsx` from its evidence and noted the deletion. JSON re-parsed to confirm validity. |

## 3. Documentation edits (6 files)

| File | Change |
|---|---|
| `MERCENTA_MASTER_CONTEXT.md` | §F domain-lib list + provider count 19→18; §S rewritten to "Rocket.Chat Decision — EXECUTED (Phase D1)"; §AC decision 3 → "REMOVED — never reintroduce"; §AB roadmap table updated (C updated; D IN PROGRESS with D1 DONE); §AD decision 2 → 18 providers, new decision 10 recording the removal + the gate-not-weakened proof. |
| `MERCENTA_ARCHITECTURE.md` | §3 `src/lib/` list; §3 integrations "19 providers"→18; §5 registry list + default modes; §13 extension points — Rocket.Chat marked ✅ REMOVED. |
| `docs/INTEGRATIONS.md` | §1 count 15→18 with an explicit change log; Rocket.Chat row deleted; §2 "Rocket.Chat client/SSO" removed from the implemented-services list. |
| `PROJECT_STATUS.md` | New Phase D1 section + header "Last updated" line. |
| `STATUS_CHECK.md` | Build & verification health refreshed; new Phase D1 section. |
| `HANDOFF.md` | "What's built" / "What's left" / next-phase pointer updated. |

*(`docs/ARCHITECTURE.md` and the pre-D1 phase reports were deliberately left as
historical records — they describe the state at the time they were written and
are already marked superseded.)*

## 4. Verification evidence (this session, real output)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (exit 0, 0 errors) — same as pre-D1 baseline |
| Lint | `npm run lint` | **PASS** (exit 0, 0 problems) — baseline was also clean |
| Build | `npm run build` | **PASS** — `✓ built in 3.24s`. AdminShell chunk **472.45 kB → 467.10 kB** (removed panel gone from the bundle) |
| D1 validator | `node scripts/validate-rocketchat-removal.mjs` | **PASS** — `ROCKETCHAT_REMOVAL_VALIDATION_PASS` (15/15). An intermediate run legitimately FAILED on its own allowlist gap before the fix — proof the gate can fail |
| D1 E2E | `npx playwright test e2e/rocketchat-removal.spec.ts` | **5 passed (7.3s)** |
| Relevant E2E | `npx playwright test e2e/app-shell.spec.ts e2e/simulation-control.spec.ts e2e/crm.spec.ts e2e/domain-acceptance.spec.ts e2e/multi-tenant.spec.ts e2e/notifications.spec.ts` | **63 passed (55.8s)** |
| Full E2E | `npx playwright test` | **165 passed / 4 skipped / 0 failed, EXIT=0 (2.4m)** — pre-D1 baseline 160/4/0 → **+5 tests, 0 new failures, 0 new skips** |
| Existing validators | `validate-mock-providers` · `validate-mock-seam` · `validate-provider-workflows` · `validate-demo-completeness` (27/27) · `validate-design-tokens` · `validate-bi-lifecycle` · `validate-prospect-pipeline` · `validate-acquisition-pipeline` | **ALL PASS** |
| Registry verifier | `node scripts/verify-registry.mjs` | 104 pre-existing issues (105 before this session's registry correction); `grep -i rocket` → 1 hit, the intentional "REMOVED in Phase D1" description. **No Rocket.Chat-caused issue remains.** |
| Absence sweep | `grep -rni rocket` over `src/ e2e/ scripts/ supabase/` + `eslint.config.js docker-compose.services.yml package.json` | Only the intentional Phase D1 annotation comments (validator-allowlisted) |

### 4.1 Why the CASE safety change is not a weakened gate

`assertSimulationOnly` refuses a scenario when any *required* provider does not
resolve positively to `simulation`. The CASE scenario's only required provider was
`rocketchat` (defaultMode `simulation`, i.e. the gate was a no-op that always
passed). Removing it means CASE requires **no** provider. To prove the gate itself
is intact, `validate-rocketchat-removal.mjs` asserts the inverse:
`runScenario('NORMAL_PO', { getMode: () => 'not_registered' })` must **still**
return `status: 'safety_refused'`. That assertion is real and fails if the gate is
bypassed.

## 5. Known limitations / honest caveats

- **No browser was driven manually** — all UI verification is Playwright against
  the local dev server (`npm run dev` on :5173), not a human click-through, and
  not against `demo.mercenta.co.uk` (no deploy in this phase).
- **The self-hosted services VPS was NOT touched.** `docker-compose.services.yml`,
  `scripts/Caddyfile`, `scripts/deploy-docker.sh` and `scripts/vps-bootstrap.sh`
  are edited **in the repository only**. Any Rocket.Chat container already running
  on the droplet, plus the `chat.mercenta.co.uk` DNS/Caddy record on that server,
  still need removing **on the server** — a deploy-time action outside this
  repository, recorded here as outstanding.
- `docs/ARCHITECTURE.md` (historical, superseded) still describes Rocket.Chat as
  it was; intentionally not rewritten. The requirements-registry entries were
  corrected.
- The 4 skipped E2E tests are the pre-existing/intentional skips (access-gate
  t6/t8/t9 + tours t5) — unchanged by this phase.
- `verify-registry.mjs` reports 104 **pre-existing** issues (stale e2e references
  and reachability flags unrelated to Rocket.Chat) — unchanged scope, not
  introduced here.

## 6. Explicitly NOT done in this phase

- No BI / ICP / acquisition / CRM / helpdesk / messaging logic changed.
- No UI redesign, no styling, no layout, no navigation change other than deleting
  the Rocket.Chat nav entry.
- No Rakazo work. No Postiz work. No new dependency, no new service, no new store.
- No Supabase/persistence work (that is D4).
- No deploy. No push. No generated artefacts committed.

## 7. Next phase

**D2 — BI intelligence preservation through acquisition**: make the canonical BI
prospect's intelligence (ASINs, per-ASIN metrics, evidence/provenance, score
factors, contacts/titles, distributor/wholesale context, restrictions, growth
signals, market/category, lifecycle history) retrievable by the acquisition and
outreach layer **by reference to the canonical prospect** — never copied into a
second, lossy universe. Proceed to D2 only now that the D1 gate above has passed.

---

## Commit record

- **D1 implementation commit: `bf31151`** — `phaseD1: remove Rocket.Chat
  end-to-end` (24 files changed, 644 insertions, 429 deletions) on
  `redesign/foundation`. Reviewed and verified in the same session (typecheck 0 ·
  lint 0 · build PASS · validator 15/15 · D1 spec 5/5 · full E2E 165/0/4).
- **Pre-D1 HEAD (baseline for this phase):** `b7cd0d4` (`phaseC: BI → ICP → outreach → approval → send → response → Opportunity → CRM`).
- **Protected baseline (untouched):** `959b4d2` / tag `mercenta-baseline-before-redesign-20260907`.


