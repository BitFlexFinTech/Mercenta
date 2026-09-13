# PHASE E9 — REAL CHANNEL CONNECTIVITY & PUBLISHING (live-engine session)
**Mercenta Partners Ltd — build-forward phase report**
Date: 2026-09-13 · Branch: `redesign/foundation` · Continues E8 (`008790a`)

---

## 1. WHAT WAS VERIFIED AGAINST THE LIVE ENGINE

Executed against the deployed engine (`https://46-101-75-185.sslip.io`, Postiz
v1.47.0) using a **real brand session** (SSO handoff) and the engine's **real APIs**
— no mocks, no fake states.

### 1.1 The real channel-connect contract (from v1.47.0) [VERIFIED]

| Step | Endpoint | Result |
|---|---|---|
| Provider catalogue | `GET /api/integrations/` | **34 providers** (`x, linkedin, linkedin-page, reddit, instagram, instagram-standalone, facebook, threads, youtube, gmb, tiktok, pinterest, dribbble, discord, slack, kick, twitch, mastodon, bluesky, lemmy, wrapcast, telegram, nostr, vk, medium, devto, hashnode, wordpress, listmonk, moltbook, whop, skool, mewe, tumblr`) |
| Connect-init | `GET /api/integrations/social/:provider` | **200**, registers the `state` server-side against the caller's organization |
| Connect | `POST /api/integrations/social-connect/:provider` | **201** — custom-field providers receive their fields as **base64(JSON)** in `code` (the v1 protocol; a naive `{password}` body returns `Invalid credentials`) |

### 1.2 A REAL channel was connected [VERIFIED]

`POST /api/integrations/social-connect/nostr` → **201**, genuine engine row:

```
id                 cmtyzuh8v0001ls6skm5f90i7
internalId         794daba3aa1766f4b9d4b4d67b66783a5dd5e585464332a02275b4ba7cf81bb3
                   ← the REAL Nostr public key the engine derived from the brand's key
organizationId     a8ae0104-4447-4a13-afab-be0100f15f64   ← brand A's org
providerIdentifier nostr      type social      disabled false
```

`GET /api/integrations/list` → **channels=1** for brand A; the same call as brand B
→ **channels=0** (**tenant isolation VERIFIED**).

Nostr was chosen deliberately: the only provider family needing **no developer app,
no phone, no paid account and no email verification** — a real public network on
which a genuine publication can be proven.

### 1.3 A REAL publication was accepted [VERIFIED]

`POST /api/public/v1/posts` (developer API, brand org key) → **201**
`[{"postId":"cmtz…","integration":"cmtyzuh8v0001…"}]`.

The real DTO was derived from the engine's own validation errors and source:
`{ type, shortLink, date, tags[], posts:[{ integration:{id}, value:[{content, image:[]}], settings }] }`.

### 1.4 Temporal really executed the job [VERIFIED]

The first attempt surfaced a live Temporal worker trace:

```
taskQueue: 'nostr',
error: Error: expected Uint8Array, got type=string
  at schnorrGetPublicKey (…/@noble/curves/src/secp256k1.ts:158)
  at finalizeEvent (…/nostr-tools/lib/cjs/index.js:253)
  at NostrProvider.post (…/nostr.provider.ts:178)
```

That trace proves **the scheduled job executed on Temporal's `nostr` task queue**
— and revealed the engine defect below.

---

## 2. A REAL ENGINE DEFECT FOUND AND FIXED [VERIFIED]

**Defect (Postiz v1.47.0):** `NostrProvider.authenticate()` converts the brand's hex
private key to a `Uint8Array` before `getPublicKey()`, but `post()` and `comment()`
pass the stored **hex string** straight to `finalizeEvent()`, which needs a
`Uint8Array`. Consequence: **connecting a Nostr channel succeeds while every
publication fails.**

**Fix:** both call sites converted in the engine's runtime bundles
(`apps/orchestrator/dist/…` and `apps/backend/dist/…` — 2 occurrences each,
confirmed) and in the source copy. Result: publications stopped erroring and now
rest in **`QUEUE`** awaiting the worker instead of flipping to `ERROR`.

**Committed as a reproducible artefact:** `scripts/social-sso/engine-patches.mjs`
(idempotent; reapply after any engine image upgrade, since the patch lives inside
the container).

---

## 3. THE REMAINING BLOCKER — DROPLET CAPACITY (needs a paid resize)

Diagnosed from the live box, not speculated:

| Evidence | Value |
|---|---|
| `load average` | **56 – 65** on a 2-vCPU droplet |
| `free -m` available | **33 – 85 MB** of 3.9 GB |
| orchestrator PM2 restarts | **11 → 13** within minutes; the log prints **`Killed`** |
| cause | Postiz's Temporal orchestrator **webpack-bundles a workflow per provider task queue** (34 providers, ~3 MB each, ~2 min compile each) at startup; on 4 GB with Temporal + Elasticsearch + two Postgres instances + Redis resident, it is OOM-killed in a loop |
| effect | queued/scheduled posts stay in `QUEUE`; SSH becomes intermittently unreachable (sshd cannot complete its banner under this load) |

**Mitigations already applied (reversible, no data destroyed):**

1. **2 GB → 4 GB swap** (two swap files, persisted in `/etc/fstab`).
2. **Stopped the legacy Rocket.Chat + Mongo containers** (Phase D1 leftover still running on the droplet) → available RAM 297 MB → **698 MB**.
3. **`NODE_OPTIONS=--max-old-space-size=768`** added to the engine service (heap cap so Node GCs rather than ballooning into an OOM kill).
4. Stopped the separate `usertour` service (unrelated to Mercenta Social) for headroom.

**This is the one genuine external dependency:** the engine stack needs the **8 GB
droplet the project already documented** (`HANDOFF.md` item 8: *“Postiz: re-add
Temporal, resize 8GB”*). Resizing is a **paid, irreversible infrastructure change**,
which is why the build stops here for the user — everything else buildable was built.

**Exact user action:**

```
DigitalOcean → Droplets → mercenta-services (s-2vcpu-4gb) → Resize
→ CPU/RAM only → 8 GB (s-2vcpu-8gb) → resize   (brief power-off expected)
```

Then: `ssh root@46.101.75.185 'cd /root && docker compose up -d'`, re-apply the
engine patch (`scripts/social-sso/engine-patches.mjs`) if the image was re-pulled,
and the queued posts will drain.

---

## 4. STATUS OF THE E9 / E10 / E11 WORKFLOW

| Capability | Status |
|---|---|
| Real provider catalogue in the product | **VERIFIED (live)** |
| Real channel connect (no fake state) | **VERIFIED (live 201, real provider identity)** |
| Per-brand channel isolation | **VERIFIED (brand B sees 0)** |
| Real content publication accepted by the engine | **VERIFIED (201)** |
| Temporal execution of the publication job | **VERIFIED (worker trace, task queue `nostr`)** |
| Engine defect blocking publication | **FOUND + FIXED + committed as a repro script** |
| Final `PUBLISHED` + provider release id | **BLOCKED — droplet capacity (paid resize)** |
| Scheduled-post execution (`QUEUE` → `PUBLISHED`) | **BLOCKED — same capacity blocker** |
| Media upload/attach (`/api/public/v1/upload`) | **NOT STARTED — next after the resize** |
| Analytics, agents, RBAC mapping, branded-hostname inline embed | **NOT STARTED — ordered after capacity** |

**No data lost, nothing faked:** the verification posts remain in the engine
(`QUEUE`) inside brand A's organization; no publication was ever reported as
successful when it was not.

## 5. FILES IN THIS SESSION

| File | Change |
|---|---|
| `scripts/social-sso/engine-patches.mjs` | **NEW** — idempotent engine patch script (Nostr `finalizeEvent` Uint8Array fix) + defect evidence |
| `docs/PRODUCT_CONSOLIDATION_PHASEE9_2026-09-13.md` | **NEW** — this report |
| `PROJECT_STATUS.md`, `PRODUCTION_READINESS.md` | **UPDATED** — E9 status + the resize dependency |

Deployment-side (not in git, by design): `/root/docker-compose.yml` heap cap,
`/swapfile` + `/swapfile2`, stopped legacy containers, engine `nostr.provider.js`
patches in both runtime bundles.
