# PRODUCT CONSOLIDATION — PHASE D3: OUTREACH / PROVIDER HARDENING

> Date: 2026-09-11 · Branch: `redesign/foundation` · Pre-D3 HEAD: `8bbb694`
> (D2 gate). Protected baseline (never touched): `959b4d2` /
> tag `mercenta-baseline-before-redesign-20260907`.
> Session type: **IMPLEMENTATION**. No new audit: the transport/credential seam
> was read directly (`outreachSender.ts`, `messaging/email.ts`, the `sendOutreach`
> path, `BrandComm`), and the gaps below were found by the D3 gate's own
> assertions, not by inspection.

---

## 1. The gaps D3 closes (verified by reading the implementation)

1. **The mode decision was caller-supplied, not resolved.** `AcquisitionWorkflow`
   computed `comms.emailLive || comms.emailSandbox` and passed a boolean into
   `transportFromEmailClient(client, live)`. The canonical provider-mode model
   (`modeForState` + the registry default — the model the Integrations Hub and the
   scenario engine already use) was not consulted, so the outreach decision could
   drift from the rest of the platform.
2. **No domain-level verification of a live claim.** `sendOutreach()` derived the
   recorded transport from `transport.mode`:
   `effectiveTransport = transport.mode === 'simulation' || outcome.sandbox ? 'simulation' : 'live'`.
   A transport that simply declared `mode:'live'` **and returned `{ok:true}`** was
   recorded as a live send. Nothing proved the provider was actually live, so an
   unavailable provider could have been silently treated as live.
3. **`UNKNOWN ≠ SIMULATION` was not expressed for outreach.** There was no explicit
   resolution of `available / configuring / unknown / degraded / error / disabled`
   → each collapsed into an ad-hoc boolean.
4. **REAL DEFECT — outreach revision history was being destroyed.** The BI content
   generator mints record ids from `Date.now()` (`out-email-<prospectId>-<ms>`).
   Two preparations inside the same millisecond produced the **same id**, and
   `saveOutreach()` upserts by id — so the earlier revision was **silently
   overwritten and lost**, breaking the documented "history is never discarded"
   invariant. Proven with a throwaway diagnostic before being fixed:
   `ids …-911 | …-911 | sameId? false true | stored 2 | statuses 1:pending_approval 3:pending_approval`
   (revision 2 destroyed).

## 2. What was built

### 2.1 `src/lib/acquisition/outreachSender.ts` (+141/−25)

- `OutreachTransport` now declares `readonly providerState: OutreachProviderState`
  (`live | sandbox | not_configured | unavailable`) and an optional
  `isVerifiedLive()`.
- **`isVerifiedLiveTransport(transport)`** — the fail-closed predicate: true only
  when a transport both claims `live` **and** proves its credentials are verified.
- **`resolveOutreachTransport(emailState, client)`** — THE canonical resolution.
  Derives the mode from `modeForState(emailState, integrationMeta('email').defaultMode)`
  (single source of truth — the same model the Hub and scenario engine use) and
  returns `{ transport, providerState, resolvedMode, live }`. Fail-closed rules:
  - `live` + verified client → live transport;
  - `live` + no client **or** unverified credentials → **downgraded** to
    `unavailable` + simulation;
  - `simulation` (sandbox connection) → simulation transport delegating to the
    sandbox client (no network);
  - `degraded | error | disabled` → `unavailable` + simulation;
  - `available | configuring | unknown | not_registered` → `not_configured` + simulation.
- `describeOutreachProvider(state)` — honest operator-facing label.
- `transportFromEmailClient()` retained as the documented low-level adapter, now
  with `providerState` + a credential-backed `isVerifiedLive()` so it can no
  longer fabricate a live claim.

**No second email provider abstraction was created**: the existing
`createEmailClient` (`src/lib/messaging/email.ts`) — the client the §14 Integrations
card already configures — is reused unchanged through the same seam.

### 2.2 `src/lib/acquisition/outreachLifecycle.ts` (+49/−14)

- **Fail-closed live gate in `sendOutreach()`**: if `transport.mode === 'live'`
  and `isVerifiedLiveTransport(transport)` is false, the send is **REFUSED**
  (`PROVIDER_NOT_LIVE`) *before* any send attempt, audited as
  `acquisition_outreach_send_refused`, and the revision is left untouched.
- `effectiveTransport` is now derived from the **verified** predicate (plus the
  sandbox-outcome check as defence in depth) — `transport: 'live'` can no longer
  be recorded without verified live credentials.
- **`outreachRecordId(prospectId, revision)`** — collision-proof, workflow-owned
  record ids (`outreach-<prospectId>-r<revision>`), fixing the revision-destroying
  defect. `prepareOutreach()` now computes `revision` once and uses it for the id,
  the revision number and the `intelligenceRef`.

### 2.3 `src/components/admin/AcquisitionWorkflow.tsx` (+31/−25, minimal)

The hand-rolled boolean transport choice was replaced by
`resolveOutreachTransport(integrations.email, comms.emailClient)`; the send notice
and the provider label now read `resolved.live` / `describeOutreachProvider(...)`,
so the operator sees the honest state (`simulation (no provider connected)` by
default). No styling, layout, navigation or design-system change.

### 2.4 New gates

| File | Purpose |
|---|---|
| **`scripts/validate-outreach-provider-hardening.mjs`** (302 lines) | Domain gate — **44 assertions** (A–I). |
| **`e2e/outreach-provider-hardening.spec.ts`** (110 lines) | Browser gate — 3 tests. |

## 3. Verification evidence (this session, real output)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (`TYPECHECK_EXIT=0`) |
| Lint | `npm run lint` | **PASS** (`LINT_EXIT=0`) |
| Build | `npm run build` | **PASS** — `✓ built in 3.31s` |
| **D3 validator** | `node scripts/validate-outreach-provider-hardening.mjs` | **PASS** — `OUTREACH_PROVIDER_HARDENING_VALIDATION_PASS` (**44 ✓ / 0 ✗**) |
| D3 E2E | `npx playwright test e2e/outreach-provider-hardening.spec.ts` | **3 passed (15.3s)** |
| Relevant E2E | outreach-provider-hardening · acquisition-pipeline · bi-intelligence-preservation · domain-acceptance · crm · rakazo · simulation-control · multi-tenant | **50 passed (44.5s)** |
| Full E2E | `npx playwright test` | **172 passed / 4 skipped / 0 failed, EXIT=0 (2.5m)** — D2 baseline 169/4/0 → **+3 tests, 0 new failures, 0 new skips** |
| Existing validators | acquisition-pipeline · bi-intelligence-preservation (42) · bi-lifecycle · prospect-pipeline · rocketchat-removal · demo-completeness (27) · mock-providers · mock-seam · provider-workflows · design-tokens · whatsapp | **ALL PASS** |

### 3.1 What the D3 validator asserts (44)

- **A. Human-approval workflow (13)** — prepare (revision 1, pending) → MODIFY
  (revision 2, body changed, still pending) → APPROVE (audited) → simulation send
  (recorded `simulation`, `[SIMULATED SEND` prefix, logged to the ONE message
  store) → intent-classified simulated response → Opportunity (BI snapshot) →
  complete CRM relationship context; REJECT → re-prepare (**new** revision, the
  rejected one preserved) → re-approve; illegal transitions refused
  (double-approve / modify-approved / send-rejected); view-only actor refused on
  every mutating step.
- **B. Transport resolution (9)** — live+verified → live; sandbox → simulation;
  **live but unverified → downgraded to unavailable**; live with no client →
  unavailable (never live); disconnected/undefined/configuring →
  `not_configured` simulation; degraded/error/disabled → unavailable simulation;
  the resolver reports the canonical `resolvedMode` it derived from; the demo
  default is simulation; honest descriptions exposed.
- **C. Fail-closed live gate (7)** — a live claim with **no** verifier is refused;
  a live claim whose verifier returns false is refused; a refusal leaves the
  revision untouched and logs no message / no success audit; each refusal is
  audited; a live-claiming transport that reports a sandbox outcome is recorded
  `simulation` (defence in depth); the ONE verified-live transport reaches the
  provider seam and is recorded `live`, with the message **not** marked simulated.
- **D. Zero network (3)** — invoking the simulation transport makes no provider
  call and no network request; a sandbox send is reported `sandbox` and never
  reaches the provider; missing credentials return `EMAIL_NOT_CONNECTED` and
  **never** break simulation.
- **E. Never silently live (3)** — exactly ONE record in the whole run is recorded
  `live` (the verified-live send); `isVerifiedLiveTransport` is false for the
  simulation transport and for a verifier-less live claim; the low-level adapter
  refuses a live claim unless the client itself verifies credentials.
- **F. Rakazo/Postiz independence (3)** — the acquisition + approval source files
  contain **no** Rakazo/Postiz reference; no Rakazo/Postiz export is required by
  the domain; the entire workflow ran with no external service contacted.
- **G. Isolation (2)** — another prospect shows no outreach/response/opportunity
  leakage; every stored artefact is keyed to the canonical prospect id.
- **I. Revision-history integrity (3)** — three rapid preparations create three
  **distinct** records (no collision, no overwrite); the id is deterministic per
  prospect+revision (workflow-owned, not `Date.now()`); every stored revision is
  preserved with its own revision number.
- **H. Safety summary (1)** — **ZERO** external network calls across the suite.

### 3.2 Browser gate

1. The demo default reports `simulation (no provider connected)` — never a live
   claim — and the full flow (prepare → modify → approve → send) completes with
   **no credentials configured**; the stored revision shows
   `transport simulation` and never `transport live`.
2. A page-level request listener proves **zero external network requests** across
   the flow.
3. Human approval needs neither Rakazo nor Postiz: no Rakazo iframe, no
   Rakazo/Postiz text in the workflow container, and the approval controls are
   present and enabled on the acquisition surface alone.

## 4. Known limitations / honest caveats

- **No manual browser click-through** — verification is Playwright against the
  local dev server, not a human pass, and not against `demo.mercenta.co.uk`
  (no deploy in this phase).
- **No live provider send was exercised against a real provider.** The live path is
  proven with an injected provider transport (a spy `FetchLike`) so the assertion
  is real without contacting anything: the spy is reached **exactly once**, and only
  through a positively-live state with verified credentials. A genuine
  `/functions/v1/send-email` endpoint is deploy-time infrastructure and remains
  absent — unchanged and unclaimed.
- **`transportFromEmailClient()` still takes a caller-supplied `live` boolean.** It
  is retained as the documented low-level adapter, but it can no longer produce a
  *verified* live claim by itself (`isVerifiedLive()` consults the client), and the
  domain gate refuses any live claim it cannot verify. Product code now uses
  `resolveOutreachTransport()`.
- Acquisition artefacts (including the new `outreach-<prospectId>-r<n>` records)
  remain session-only in-memory — that is D4.
- The tracked out-of-scope single-source-of-truth finding from D2
  (`src/components/shared/BrandComm.tsx` — `brandInboxAddress` re-implements the
  placeholder-slug derivation) **still stands and is still untouched**; D3 did not
  widen its scope.
- The 4 skipped E2E tests are the pre-existing/intentional skips.

## 5. Explicitly NOT done in this phase

- No new email provider abstraction (the existing `createEmailClient` is reused).
- No live provider activated, no credentials requested, no network call introduced.
- No Rakazo/Postiz work. No persistence work (D4). No UI redesign, no styling,
  no navigation change.
- No change to simulation semantics, the RBAC model, or tenant isolation.
- No deploy, no push, no generated artefacts committed.

## 6. Next phase

**D4 — persistence / domain hardening**: move production-relevant acquisition state
toward the existing persistence architecture (Supabase repository pattern) without
inventing a second database, preserving deterministic simulation. D4 does not start
until this gate is accepted.

---

## Commit record

- **D3 implementation commit: `d3cbbd4`** — `phaseD3: harden the outreach transport
  / provider seam (fail-closed, UNKNOWN != LIVE)` (11 files changed, 968 insertions,
  38 deletions) on `redesign/foundation`. Verified in the same session (typecheck 0 ·
  lint 0 · build PASS · D3 validator 44/44 · D3 E2E 3/3 · full E2E 172/0/4).
- **Pre-D3 HEAD:** `8bbb694` (D2 gate). **D1:** `bf31151` · **D2:** `fe0c893`.
- **Protected baseline (untouched):** `959b4d2` / tag `mercenta-baseline-before-redesign-20260907`.


