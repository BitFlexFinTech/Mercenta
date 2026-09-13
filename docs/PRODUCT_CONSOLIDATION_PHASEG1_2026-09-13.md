# PHASE G1 — BRAND DEDUCTIONS LEDGER (Tour 5 surface) + RETIRED ROCKET.CHAT SERVER CLEANUP

**Mercenta Partners Ltd — build-forward phase report**
Date: 2026-09-13 · Branch: `redesign/foundation` · Previous checkpoint: E9 `7a40503`
Session type: **IMPLEMENTATION** (not an audit). Two independent deliverables, executed in the
order the build directive set: (1) safe, complete removal of the retired Rocket.Chat server
infrastructure; (2) the next genuinely incomplete Mercenta build phase.

---

## PART 1 — ROCKET.CHAT SERVER INFRASTRUCTURE CLEANUP (COMPLETE)

**Status: Rocket.Chat cleanup COMPLETE — retired infrastructure removed — active services
verified unaffected.**

Phase D1 (2026-09-11) removed Rocket.Chat from the *product* (panel, mock client/SSO, registry
card, nav entry, compose service, Caddy vhost, unit tests). What remained was **obsolete
server-side infrastructure still present on `mercenta-services` (46.101.75.185)**. This session
removed it.

### 1.1 Ownership established BEFORE deleting anything

| Artefact | Owner (verified, not assumed) |
|---|---|
| `root-rocketchat-1` (`registry.rocket.chat/rocketchat/rocket.chat:latest`, Exited 137) | Rocket.Chat only; anonymous volume `87225aea…` → `/app/uploads` |
| `root-rocketchat-db-1` (`mongo:7`, Exited 0) | Rocket.Chat only; anonymous volume `d27d34ec…` → `/data/configdb` **and** dedicated named volume `root_rocketchat_mongodb` → `/data/db` |
| `/root/docker-compose.yml` services `rocketchat` + `rocketchat-db`, volume `rocketchat_mongodb` | Rocket.Chat only |

Evidence that nothing else depended on them (all commands run on the droplet):

- `docker ps -a` + per-container `docker inspect --format '{{range .Mounts}}…'` → **only**
  `root-rocketchat-1` / `root-rocketchat-db-1` mount any `rocketchat` volume; no other container
  mounts `root_rocketchat_mongodb`.
- `docker ps -a --format '{{.Image}}'` → `mongo:7` is used by **no other container**; Postiz uses
  `postgres:16-alpine` + `redis:7-alpine`, Temporal uses `postgres:16` + `elasticsearch:7.17.27`.
- `crontab -l`, `/root/.env`, `grep -rni rocket /root` → **no** Rocket.Chat/Mongo references.
- `/etc/caddy/Caddyfile` → **no** `chat.mercenta.co.uk` vhost (D1 already removed it); no Mongo
  reverse-proxy route. `caddy validate` → **Valid configuration**.
- `systemctl list-units | grep -iE 'rocket|mongo|chat'` → **no** matching systemd units.
- `docker network ls` → only the default `root_default` bridge (no Rocket.Chat-specific network).

### 1.2 What was removed (exact)

| Action | Object | Result |
|---|---|---|
| Backup taken first | `/root/rocketchat-removal-backup-20260913/` — `docker-compose.yml.before`, `containers-inspect.json`, `volumes-inspect.json` | audit trail preserved on the server |
| Compose edit | deleted the `rocketchat-db` (lines 50–62) + `rocketchat` (64–79) service blocks and the `rocketchat_mongodb` volume entry; added a 4-line removal note | `docker compose config -q` → **COMPOSE_CONFIG_VALID** |
| `docker rm -f -v` | `root-rocketchat-1`, `root-rocketchat-db-1` | both removed (also reaped their anonymous volumes) |
| `docker volume rm` | `root_rocketchat_mongodb` | removed (the two anonymous volumes were already gone with the containers) |
| `docker rmi` | `mongo:7`, `registry.rocket.chat/rocketchat/rocket.chat:latest` | both untagged + deleted |

### 1.3 Post-removal verification

```
containers matching rocket/chat/mongo : (NONE)
volumes    matching rocket/mongo      : (NONE)
images     matching rocket/mongo      : (NONE)
compose rocketchat references         : 1 line (the removal note) · COMPOSE_CONFIG_VALID
ACTIVE CONTAINERS (10, all unaffected):
  root-social-sso-1 · root-postiz-1 · root-temporal-1 (healthy)
  root-temporal-elasticsearch-1 (healthy) · root-temporal-postgresql-1 (healthy)
  root-usertour-1 · root-usertour-db-1 (healthy)
  root-postiz-db-1 (healthy) · root-postiz-redis-1 (healthy) · root-usertour-redis-1 (healthy)
engine reachability : localhost:8100/api/ 200 · https://…sslip.io/api/ 200 · /auth 403 (edge block intact)
postiz postgres     : accepting connections
disk                : 27 GB → 24 GB used (3 GB freed)

---

## PART 2 — PHASE G1: THE BRAND DEDUCTIONS LEDGER (Tour 5)

### 2.1 The gap (documented, not hypothetical)

`src/config/tours/tourDefinitions.ts` → `DEDUCTIONS_TOUR` (Tour 5, `autoStartViews:
['analytics','reports']`) declares four target selectors:

- `[data-tour="deductions-ledger"]`
- `[data-tour="deductions-categories"]`
- `[data-tour="deductions-dispute-btn"]`
- `[data-tour="deductions-outcome-info"]`

`grep -rln 'data-tour=' src/` proved those four anchors existed in **no component anywhere** in
`src/`. The tour could start but had nothing to highlight, and `e2e/tours.spec.ts` t5 could only
reach `test.fixme(true, 'Deductions not visible')` — it had never actually run. The recorded
deferral note was: *"Building the ledger/dispute surface is a LARGER product feature deferred to
a later phase."* This phase builds it.

**The data layer already existed** and was NOT duplicated: `Deduction` (types.ts §19.1), the
derived `demoDeductions` ledger (9 seeded rows across two tenants, covering open / disputed /
accepted / resolved-won / resolved-lost), and the canonical domain operations
`openCommerceDispute` / `resolveCommerceDispute` (commerceLifecycle §E4). Only the **brand-facing
surface** was missing.

### 2.2 What was built

**NEW `src/components/brand/DeductionsLedger.tsx`** — rendered on the two views Tour 5 targets.

| Requirement | Implementation (all reused, nothing invented) |
|---|---|
| Tenant isolation | reads through the **canonical domain read model** `listBrandCommerceExceptions(brandId, actor)` — the tenant check is inside the domain, not the UI |
| RBAC + audit | Dispute calls the **canonical** `openCommerceDispute(id, notes, actor)` with a brand-pinned `CommerceActor` (`{staffId:'brand:<id>', canMutate:true, tenantId:brandId}` — the existing `ProductCatalog` pattern); refusals are surfaced **verbatim** (`res.error` + `res.reasons`) |
| Live refresh | `useCanonicalStoreVersion()` (the existing derived-store re-render signal), referenced inside the memo so a newly-raised deduction can never be missed |
| Real outcomes | reports the **real recorded** `dispute.outcome` per row; a brand cannot declare its own win — the outcome-recording control lives on the existing operator ledger (`RetailPipeline`) and brand console (`CommerceSimulationPanel`); **no third path created** |
| Truthful provenance | `(sim)` from the canonical `Deduction.simulated` flag; no fabricated states, no fake success messages |
| Tour anchors | the four declared selectors, each on a real, always-rendered element (so the tour works at any data depth) |
| Empty state | honest "No deductions posted." / "No deductions to dispute." / "No dispute outcomes…" copy |
| Design system | existing primitives only (`Card`/`Badge`/`Button`), existing tokens/classes — **no new visual language, no styling change to any existing element** |
| No migration | 023 remains the newest migration; nothing was created or executed |

**Mount points (additive only):** `SalesAnalytics.tsx` (analytics) and `BrandReports.tsx`
(reports) — each mounted **after** all existing content, in both the populated and the empty-state
return so the surface exists for every tenant regardless of PO volume.

load average        : 100 → 0.79 immediately after removal
```


### 2.3 The regression gate that previously skipped is now real

`e2e/tours.spec.ts` t5 was rewritten from a visibility-conditional skip into a genuine
functional assertion (`5. Deductions ledger on Analytics (Tour 5 surface)`):

1. all four tour anchors must be **visible** on the brand Analytics view;
2. **tenant isolation asserted from real data**: DeskForge's ledger must **not** contain
   `PO-9000` / `PO-9001` (Zambezi's deductions) and **must** contain `PO-9002`;
3. the real recorded outcome (`outcome: won`) must be surfaced;
4. clicking **Dispute** → entering evidence → **Record dispute** must move the row to `disputed`
   through the canonical domain action (asserted on the confirmation, not on a hopeful click).

### 2.4 Gates (all run in this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** (E9 baseline 0, 0 new) |
| Lint (whole repo) | `npm run lint` | **0 problems** (`react-hooks` rules-of-hooks + exhaustive-deps at error; one violation found while building was **fixed in the source, not disabled**) |
| Build | `npm run build` | **✓ built in 3.43s** |
| Tour spec | `npx playwright test e2e/tours.spec.ts` | **9 passed / 0 failed** (t5 now passes instead of skipping) |
| **Full browser suite** | `npx playwright test` | **209 passed / 0 failed / 3 skipped** (was 208 passed / 4 skipped → **+1 passing, −1 skip, 0 regressions**) |

The 3 remaining skips are the pre-existing data-conditional/product gates documented in 7D/7F
(`compliance-gate` t1 + t2 need 0-doc and 4/5-doc tenants the seeded portal does not contain;
`crm` t3 needs a pending profile-change request state). **No test was weakened, removed, or marked
fixme to make this phase pass.**

### 2.5 Files changed

| File | Change |
|---|---|
| `src/components/brand/DeductionsLedger.tsx` | **NEW** — the brand deductions ledger (Tour 5 surface) |
| `src/components/brand/SalesAnalytics.tsx` | +2 lines: import + append the ledger (populated + empty-state return) |
| `src/components/brand/BrandReports.tsx` | +2 lines: import + append the ledger (populated + empty-state return) |
| `e2e/tours.spec.ts` | t5 rewritten as a genuine functional + tenant-isolation assertion |
| `docs/PRODUCT_CONSOLIDATION_PHASEG1_2026-09-13.md` | this report |
| `PROJECT_STATUS.md`, `HANDOFF.md`, `PRODUCTION_READINESS.md` | canonical state updated |

### 2.6 Honest limitations

- **Visual QA is a DOM/geometry + functional check, not pixel inspection** — this environment
  cannot view images. The new surface uses only existing primitives, tokens and table patterns
  copied from the operator ledger.
- The four tour anchors sit on **real controls and real data panels**; the ledger is truthful for
  tenants with **no** deductions too (honest empty state, anchors still present).
- Mercenta Social / Postiz was deliberately **not** touched: it stays **DEFERRED** (droplet not
  resized, Postiz roadmap not continued). Rakazo remains **LAST** and was not started.

**No active service was stopped, restarted, reconfigured or degraded.** Removal also freed ~3 GB
of disk and collapsed the load spike the stopped containers' restart policy was contributing to.
Mercenta Social/Postiz was **not** changed, resized, or resumed — it remains **DEFERRED** per the
build directive.
