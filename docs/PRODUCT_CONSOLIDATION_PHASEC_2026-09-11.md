# MERCENTA PRODUCT CONSOLIDATION — PHASE C: BRAND INTELLIGENCE → ICP → OUTREACH → CRM FOUNDATION (2026-09-11)

> Phase C of the master product-consolidation pass — **CORE PRODUCT FIRST,
> RAKAZO LAST** (fresh-session continuation after Phase B, HEAD `9f935f4`).
> Scope: make the canonical Brand Intelligence prospects the ACTIVE acquisition
> universe and build the real downstream domain workflow —
> ICP consumption → contact/targeting → outreach preparation from BI evidence →
> human approval (modify/approve/reject) → simulated send → response →
> Opportunity → CRM relationship context — with NO Rakazo, NO Postiz work, NO
> Rocket.Chat dependency, NO live credentials and NO UI redesign.
> Evidence classes: **CODE** · **E2E** (Playwright) · **VALIDATOR**
> (scripts/validate-*.mjs) · **GIT** · **DOC**. Every claim below was executed
> and verified against the working tree in this session.

---

## 1. Repository state (re-verified at start)

| Item | Value | Evidence |
|---|---|---|
| Branch | `redesign/foundation` | `git branch --show-current` |
| Starting checkpoint | `9f935f4` (Phase B gate) | `git log --oneline` |
| Protected baseline | `959b4d2` (tag `mercenta-baseline-before-redesign-20260907`) untouched | `git tag -l` |
| Working tree at start | only generated artefacts dirty (`Review Zip/mercenta-review.zip`, `playwright-report/`, `test-results/`) + pre-existing untracked forensic/design files — **no source file dirty** | `git status` |
| Baseline gate re-run before work | typecheck 0 · lint 0 · build PASS | executed |

## 2. Objective (governing prompt §5)

```
Brand Intelligence → canonical real prospects → ICP consumption → contact/targeting
→ outreach preparation → human approval → simulated send → response tracking
→ Opportunity creation → CRM relationship context
```

Prove it with the REAL canonical BI brands, deterministically, with zero
external network calls, no Rakazo/Postiz/Rocket.Chat dependency, and no
fabricated replacement brands.

## 3. What Phase B actually left (verified by reading code, not assumed)

- `src/data/prospectStore.ts` — canonical BI universe (12 tracked / 10 active),
  run history, change events, snapshots. ✔ as documented.
- `src/lib/intelligence/prospectPipeline.ts` — identity bridge
  (`matchLeadToProspect(s)`, `deriveLeadFromProspect`). ✔
- `src/lib/intelligence/prospectLifecycle.ts` — discovery runs, sticky
  disqualify/requalify, `getPipelineStatus`. ✔
- **Gap A:** the ICP acquisition universe was still the seeded `INITIAL_LEADS`
  (8 fictional companies) loaded into `GlobalStateContext`, so the ten real BI
  brands never reached ICP at all.
- **Gap B:** `deriveLeadFromProspect` demanded an explicit region from a
  4-region model (`us|eu|africa|canada`) while **7 of the 10 canonical brands
  are UK-origin** — they were unable to enter ICP. Phase A had documented this
  as a limitation; Phase C had to resolve it to satisfy §7 ("the ten real brands
  must flow into the ICP workflow").
- **Gap C (Phase B data loss, root-caused):** `MockClient.scoreProspect()` built
  a fresh object literal and therefore **dropped every field it did not own** —
  `countries`, `incumbentChallenged`, `notes`, `owner`, check stamps — the
  moment the canonical universe booted. `incumbentChallenged` is rendered in the
  prospect detail (Tapatío's "Challenging: Tabasco" was silently blank), and
  `countries` is exactly what origin-region derivation needs.
- **Gap D (dead code, confirmed):** `src/lib/intelligence/outreachGenerator.ts`
  (BI-evidence outreach copy) had **zero callers**; `classifyInboundReply()`
  (hot-lead intent detection) had **zero callers**; `ProspectOutreachRecord`
  existed only as a type. Phase C wired all three instead of writing new ones.

## 4. Implementation (exact)

### 4.1 Data model — `src/types.ts`
- `LeadRegion` type added (`'us' | 'eu' | 'uk' | 'africa' | 'canada'`) and
  `Lead.region` widened to it. `uk` is required because 7 of the 10 canonical
  BI brands are UK-market brands. There is **no `leads` table** in
  `supabase/migrations` (verified: `grep -rln leads supabase/` → no results),
  so this client-side widening has no DB ripple.
- `ProspectOutreachRecord` extended (additive): `status` is now
  `OutreachApprovalStatus` (`draft | pending_approval | approved | rejected |
  sent | opened | replied`) plus `revision`, `evidenceSummary`, `approvalNote`,
  `approvedBy/At`, `rejectedBy/At`, `modifiedBy/At`, `transport`, `leadId`.
- New entities: `Opportunity`, `OpportunityStage`, `OutreachResponse`,
  `AcquisitionEvent`, `AcquisitionEventType`, `AcquisitionRelationship`,
  `AcquisitionPipelineSummary`.

### 4.2 BI → ICP derivation — `src/lib/intelligence/prospectPipeline.ts`
- `ICP_REGION_BY_COUNTRY` — the SINGLE source of the country→origin mapping.
- `deriveIcpOriginRegion(prospect)`: first declared `countries` entry that maps,
  else an explicit `ukPresence: true` → `uk`, else `null` (**never invented**).
- `buildAcquisitionLead(prospect)` — projects a canonical prospect into an ICP
  lead with the deterministic id `lead-<prospectId>`; identity is preserved,
  never re-created.
- `leadStageForOutreachStatus()` / `outreachStatusForLeadStage()` — the
  documented two-way mapping between the canonical BI outreach ladder and the
  existing ICP `Lead.outreachStatus` ladder.
- `src/data/prospectStore.ts` gained `getAcquisitionLeads()` — the ICP universe
  DERIVED from the canonical store (active prospects only).

### 4.3 Root-cause fix — `src/lib/intelligence/brandIntelligenceClient.ts`
`scoreProspect()` now spreads the caller's record first (preserving every field
the scoring engine does not own) and then applies the computed truth
(score / disqualification / source). Verified: Tapatío carries
`countries: ['US','UK','Canada']` and `incumbentChallenged: ['Tabasco']` in the
canonical store (validator A5).

### 4.4 Acquisition store — `src/data/acquisitionStore.ts` (NEW)
- In-memory session store for outreach revisions, responses, opportunities and
  acquisition events. Every record keyed by the **canonical prospect id**.
- Mutations also append to the existing platform audit registry
  (`demoAuditLog`) — one audit log, not two.
- `getRelationship(prospectId)` composes the canonical relationship context:
  BI prospect + outreach history + responses + opportunity + events + the
  messages logged for that identity in the ONE canonical message store.
- `getSummary()` pipeline counts; `resetAcquisitionStore()` for determinism.
- The canonical change signal (`getCanonicalStoreVersion` /
  `subscribeCanonicalStore` / `notifyCanonicalStoreChange`, defined in
  `prospectStore.ts`) lets every BI/ICP/CRM panel re-read one truth.


### 4.5 Lifecycle engine — `src/lib/acquisition/outreachLifecycle.ts` (NEW)
`enrollProspect` → `prepareOutreach` → `modifyOutreach` / `approveOutreach` /
`rejectOutreach` → `sendOutreach` → `recordResponse` / `simulateResponse` →
`createOpportunityFromResponse` → `setOpportunityStage`, plus read models
`listAcquisitionProspects`, `getRelationshipContext`, `getAcquisitionSummary`,
`outreachDestination`, `reconcileLeadWithProspect`.
Rules enforced in the DOMAIN layer (not trusted to the UI):
- RBAC: every mutator takes `AcquisitionActor { staffId, canMutate }` and
  returns `FORBIDDEN` for a view-only account.
- State machine: send requires `approved`; approve/reject/modify require
  `pending_approval`; a response requires a `sent` outreach; an opportunity
  requires a response; opportunity stages are validated against
  `OPPORTUNITY_TRANSITIONS` (illegal jumps refused, terminal stages never
  regress).
- Every transition is audited TWICE: on the canonical BI prospect timeline
  (`setProspectOutreachStatus` → `ProspectChangeEvent`) and in the platform
  audit log.

### 4.6 Transport seam — `src/lib/acquisition/outreachSender.ts` (NEW)
`OutreachTransport { mode: 'simulation' | 'live', send(req) }`;
`simulationOutreachTransport` (deterministic, zero network) is the default;
`transportFromEmailClient(client, live)` adapts the EXISTING email provider
client (`lib/messaging/email.ts`, configured by the Integrations card) so a
connected provider activates without any workflow change. No second simulation
framework was created.

### 4.7 Canonical BI lifecycle extended — `prospectLifecycle.ts`
New `setProspectOutreachStatus(prospectId, next, note, by)` — the ONLY way a
downstream stage may move the canonical prospect; writes the prospect record and
appends an audited `outreachStatus` change event.

### 4.8 ICP universe wiring — `src/context/GlobalStateContext.tsx`
- Bootstrap now seeds `leads` from `prospectStore.getAcquisitionLeads()`; the
  seeded `INITIAL_LEADS` fixture stays in `bootstrap.ts` but is no longer the
  active acquisition source.
- `updateLeadStatus` projects a BI-linked lead's stage onto the canonical
  prospect (audited); `refreshLeadsFromProspects()` re-derives the list from the
  canonical store, preserving CSV-imported leads and the ICP fit score persisted
  at their last transition; a canonical-store subscription keeps it in sync.

### 4.9 Minimum UI wiring (no redesign, no styling pass)
- `src/components/admin/AcquisitionWorkflow.tsx` (NEW) — the shared operator
  surface: BI evidence block ("why we are contacting this brand"), contact/
  channel targeting, recommendation editor, PREPARE / MODIFY / APPROVE / REJECT /
  SEND (Simulated) / SIMULATE RESPONSE / CREATE OPPORTUNITY, responses with
  classification, opportunity with stage buttons, relationship timeline and the
  canonical conversation.
- `ProspectDetailPanel.tsx` — new **Outreach** tab rendering that workflow for
  the selected canonical prospect.
- `src/components/admin/AcquisitionPipeline.tsx` (NEW) — ICP consumption view
  inside the existing **Marketing** view: canonical prospects, BI score, ICP
  identity (`lead-<prospectId>`), derived region, acquisition stage, prepare
  action, pipeline KPIs. No navigation architecture change.
- `src/components/admin/AcquisitionRelationships.tsx` (NEW) + `BrandCRM.tsx` —
  the CRM now shows pre-onboarding acquisition relationships (opportunity +
  stage + BI snapshot + the same canonical relationship context).
- `MarketingHub.tsx` — ICP builder gained the **UK origin** option (the default
  ICP now includes `uk`); scored rows print the canonical BI identity
  (`BI prospect-tapatio`) so the link is visible, not merely claimed.
- `MessagesHub.tsx` — a thread keyed by a canonical prospect id resolves its
  display name from the prospect store (`Tapatío (prospect)`): the acquisition
  conversation is the SAME thread as in the CRM, in the ONE message store.
- `BrandComm.tsx` — `useBrandComms()` also exposes the raw `emailClient`, so the
  workflow uses the existing provider seam as its transport.

> Note on one UI primitive: the shared `Badge` component accepts only
> `children`/`className`, so `data-*` attributes placed on it render nothing.
## 5. Domain flow as built (identity preserved end-to-end)

```
BI canonical prospect (prospect-tapatio · Tapatío · Grocery · score 68/100)
  │  deriveIcpOriginRegion → 'us' (from countries ['US','UK','Canada'])
  ▼
ICP lead  lead-prospect-tapatio   (Lead.prospectId = prospect-tapatio)
  │  enrollProspect → canonical outreachStatus 'ready_to_contact' (+ audited)
  ▼
Outreach recommendation  revision 1 · status pending_approval
  │  evidenceSummary = BI outreach summary; leadId = lead-prospect-tapatio
  │  modifyOutreach (revision 2) · approveOutreach → approved · rejectOutreach → rejected
  ▼
sendOutreach (transport = simulation) → status sent · sentAt · transport simulation
  │  logs '[SIMULATED SEND — no live provider connected] …' to demoMessages
  │  (brandId = prospect-tapatio, the canonical identity)
  ▼
simulateResponse → recordResponse → classifyInboundReply → wantsHuman = true
  │  logs '[SIMULATED INBOUND …]' inbound · requiresHuman = true
  ▼
Opportunity  opp-prospect-tapatio  stage qualified · BI snapshot 68/100 tier_4 · evidenceSummary
  ▼
CRM relationship context (pre-onboarding) = BI record + outreach + responses +
   opportunity + acquisition timeline + the SAME canonical Messages thread
```

## 6. Real brands used (unchanged, canonical)

Tapatío · Cholula · Valentina · Astonish · Seep · Delphis Eco · Fly By Jing ·
LocknLock · Mike's Hot Honey · Kit & Kin — the same ten real brands Phase B
established. No brand was replaced, regenerated, or invented; `source: 'mock'`
continues to mean "no live provider produced this record", **not** "fictional".
Derived origin regions (deterministic, from BI evidence): `us` ×3 (Tapatío,
Cholula, Valentina — first mappable country) and `uk` ×7 (UK-presence brands).

## 7. Files changed

**New:** `src/data/acquisitionStore.ts` ·
`src/lib/acquisition/outreachLifecycle.ts` · `src/lib/acquisition/outreachSender.ts` ·
`src/components/admin/AcquisitionWorkflow.tsx` ·
`src/components/admin/AcquisitionPipeline.tsx` ·
`src/components/admin/AcquisitionRelationships.tsx` ·
`scripts/validate-acquisition-pipeline.mjs` · `e2e/acquisition-pipeline.spec.ts` ·
`docs/PRODUCT_CONSOLIDATION_PHASEC_2026-09-11.md` (this report).

**Modified:** `src/types.ts` · `src/data/prospectStore.ts` ·
`src/data/queries.ts` · `src/lib/intelligence/prospectPipeline.ts` ·
`src/lib/intelligence/prospectLifecycle.ts` ·
`src/lib/intelligence/brandIntelligenceClient.ts` ·
`src/context/GlobalStateContext.tsx` ·
`src/components/admin/ProspectDetailPanel.tsx` ·
`src/components/admin/MarketingHub.tsx` ·
`src/components/admin/MessagesHub.tsx` · `src/components/admin/BrandCRM.tsx` ·
`src/components/admin/BrandIntelligencePanel.tsx` ·
`src/components/shared/BrandComm.tsx` · `scripts/validate-prospect-pipeline.mjs` ·
`e2e/domain-acceptance.spec.ts` + the five project-memory files.

## 8. Dead code / duplicate-system audit (Phase C scope)

| Candidate | Finding | Action |
|---|---|---|
| `INITIAL_LEADS` (8 fictional) | Was the active acquisition source in `GlobalStateContext` | Removed from the ACTIVE path (retained as a validation fixture); E2E asserts none of its companies appear |
| `outreachGenerator.ts` (BI-evidence copy) | Zero callers | Wired into `prepareOutreach` — its intended purpose |
| `classifyInboundReply` (marketing.ts) | Zero callers, documented dead | Wired into `recordResponse` — the single response path |
| `ProspectOutreachRecord` | Type only, no producer/consumer | Now the canonical outreach artefact (extended with approval state) |
| A second acquisition universe (`INITIAL_LEADS_V2`/`MOCK_PROSPECTS`/…) | The quick shortcut | NOT created — validator B4 asserts absence |
| A second message/conversation store | Would duplicate Messages | NOT created — outreach + replies go through `logMessage` into `demoMessages`; validators L1–L4 prove single source |
| Rocket.Chat / Rakazo / Postiz | Outside Phase C | Untouched; no new dependency (Rakazo-independence E2E still passes) |


## 9. State transitions (as implemented)

| Entity | Transition | Guard |
|---|---|---|
| Canonical prospect (`outreachStatus`) | `uncontacted/researching → ready_to_contact → contacted → replied/interested → meeting_scheduled` | `setProspectOutreachStatus` only; audited `ProspectChangeEvent` |
| Outreach recommendation | `pending_approval → approved` / `rejected`; `approved → sent`; `sent → replied` | status must match; MODIFY only while `pending_approval` (revision++) |
| ICP lead (`Lead.outreachStatus`) | projection of the canonical status (`Scraped → Sequenced → Email Sent → Replied → Meeting Booked`) | derived, never independently owned |
| Response | created only when a `sent` outreach exists; `wantsHuman` from `classifyInboundReply` | engine refuses otherwise |
| Opportunity | `responded/qualified` on creation; then `→ won` / `→ lost` (via `OPPORTUNITY_TRANSITIONS`) | illegal jumps refused; terminal stages never regress |

## 10. Human approval (not decorative)

- PREPARE produces `pending_approval`; MODIFY edits it (revision + `modifiedBy/At`);
  APPROVE → `approved` (+ `approvedBy/At`); REJECT → `rejected` (+ reason).
- Each outcome is a distinct stored state, an `AcquisitionEvent`, a
  prospect-timeline entry, and a platform audit row.
- Operable entirely in the Admin dashboard with Rakazo unavailable.

## 11. Simulation behaviour (no credentials, no network)

- Default transport: `simulationOutreachTransport` → `{ ok: true, sandbox: true }`
  — no `fetch` exists anywhere in the acquisition engine (validator H2).
- Every simulated artefact is unmistakable: message bodies carry
  `[SIMULATED SEND …]` / `[SIMULATED INBOUND …]`, the UI shows a `simulated`
  badge, unverified contacts resolve to a reserved `.example` address.
- Live activation: connect an email provider in Integrations → the same workflow
  passes the provider client through the same seam (`transportFromEmailClient`).

## 12. Response handling

- ONE path: `recordResponse` is used by the deterministic `simulateResponse` and
  by any genuine inbound reply — so classification, the canonical message, the
  prospect transition and the audit can never diverge between simulated and real.
- Intent detection uses the previously-dead `classifyInboundReply`; a hot reply
  sets `requiresHuman` on the canonical message and moves the prospect to
  `interested`, which is what qualifies the opportunity.

## 13. Opportunity + CRM integration

- `createOpportunityFromResponse` snapshots the BI score/tier and the BI evidence
  summary ONTO the opportunity (never re-derived later); the id is deterministic
  (`opp-<prospectId>`), so re-running the step is idempotent and can never create
  a duplicate; terminal stages never regress.
- CRM: `BrandCRM` renders "Acquisition Relationships (pre-onboarding)" and opens
  the canonical relationship context (BI record + outreach revisions + responses
  + opportunity + timeline + the canonical conversation).
- `opportunity.brandId` stays unset until a prospect actually onboards — the
  record never pretends the brand is already a tenant.

## 14. Communication source of truth

- The ONE canonical message store (`demoMessages` via `logMessage`) holds the
  outreach send and the inbound reply, keyed by the canonical prospect id.
- The CRM relationship panel and Admin → Messages render the SAME rows
  (validator L1 proves equality with `demoMessages`); no second conversation
  store exists (L3); prospect ids can never collide with a demo brand tenant id
  (L4/M2), and the brand session cannot see the thread (E2E test 3).

## 15. Security / RBAC / tenant isolation

- RBAC is enforced in the domain layer: all nine mutators refuse a view-only
  actor with `FORBIDDEN` and change no state (validator N1/N2); the UI
  additionally disables the controls and labels the session read-only.
- Tenant isolation: acquisition data is prospect-scoped, not brand-scoped; a
  brand session has no acquisition surface and no access to the thread
  (E2E test 3); `assertBrandScope`/`scopedBrandId` remain the brand-side guard
  (unchanged).

## 16. Persistence semantics (documented, not fabricated)

- SIMULATION PERSISTENCE: in-memory, session-lifetime, single runtime universe —
  exactly the `demoStore`/`prospectStore` contract. Survives view navigation; a
  full page reload re-boots the BI universe deterministically from seeds while
  acquisition artefacts start empty (no acquisition has happened in the new
  session).
- LIVE/PRODUCTION PERSISTENCE: none for Phase C. Acquisition artefacts do NOT
  write to Supabase today (there is no acquisitions/opportunities table and no
  `leads` table); the live seam is the existing `logMessage` dual-write plus the
  future Supabase repository pattern. Stated as a gap, not implied.


## 17. Tests + validators (executed this session)

- `npm run typecheck` → **0 errors**; `npm run lint` → **0 errors**;
  `npm run build` → **✓ built in 2.46s**.
- NEW `node scripts/validate-acquisition-pipeline.mjs` →
  **ACQUISITION_PIPELINE_VALIDATION_PASS (64/64)**:
  A BI→ICP identity · B no INITIAL_LEADS / no duplicate universe · C ten real
  brands · D BI evidence propagation · E contact/targeting · F approve/reject/
  modify (incl. invalid transitions) · G simulated send · H zero external
  fetches · I response + canonical classification · J opportunity + BI snapshot +
  idempotence · K CRM relationship context · L canonical communication (no
  duplicate store) · M tenant isolation · N RBAC · O reload/persistence
  semantics.
- `validate-prospect-pipeline.mjs` → **PASS (26/26)** — extended for Phase C:
  the stale `region='uk' == null` assertion was honestly replaced (`'mars'` =
  invalid; `'uk'` now valid), plus "INITIAL_LEADS retained but not the
  acquisition source", "10/10 leads linked", "us×3 / uk×7", "the ten real brands
  all reach ICP", "disqualified prospects never enter the universe".
- `validate-bi-lifecycle.mjs` → **PASS (29/29)** (no Phase B regression).
- Existing validators re-run: mock-providers, mock-seam, provider-workflows,
  discovery, postiz, automation, csv-import, demo-completeness (27/27),
  design-tokens → **ALL PASS**.
- Playwright: NEW `e2e/acquisition-pipeline.spec.ts` **4/4 PASS**
  (full workflow · CRM + canonical thread · reject path · tenant isolation) and
  `e2e/domain-acceptance.spec.ts` test 3 rewritten for the BI-derived universe.
- **Full E2E: 160 passed / 4 skipped / 0 failed** (2.3m). Phase B baseline was
  156/0/4 → **+4 new tests, 0 regressions**. The 4 skips are the same documented
  pre-existing ones (access-gate t6/t8/t9 + tours t5 — deductions-surface gap).

## 18. Known limitations / remaining gaps (honest)

1. **No live provider credentials exercised.** No live send/reply was verified
   against a real provider — only the seam that will carry it.
2. **Acquisition state is session-only** (§16). A reload loses outreach
   approvals/opportunities; BI survives because it re-boots from seeds.
3. **ICP fit score ≠ BI score by design**: the ICP engine scores region/category/
   keyword overlap (Tapatío fit 85 under the default Grocery ICP) while BI scores
   Amazon/PO evidence (Tapatío 68/100). Both are shown; neither replaces the other.
4. **Valentina's primary origin (Mexico) has no ICP origin region**; it is
   classified by its first *mappable* declared country (US). Documented, not hidden.
5. **Opportunity → onboarding hand-off is not wired**: `Opportunity.brandId`
   exists but no flow yet turns a won opportunity into a brand application/tenant.
   Phase D.
6. **No automatic BI scheduling**: discovery runs remain operator-triggered
   (Phase B behaviour, unchanged) — no cron was invented.
7. **Edge Functions**: none added or required; `validate-edge-functions.mjs`
   remains stale/unused as previously documented.
8. **Rocket.Chat removal, Postiz exposure, Rakazo integration, full UI redesign**
   are explicitly NOT started (later phases). No Rakazo/Postiz/Rocket.Chat call
   exists anywhere in the Phase C path.

## 19. Commit + next phase

- Phase C commit: **one** dedicated commit on top of `9f935f4` whose message
  begins `phaseC:`. Per the project convention established in Phases A/B, a
  commit cannot contain its own hash — the hash is recorded by the next session's
  status reconciliation and quoted in this session's hand-back message.
- **Exact next phase: PHASE D — outreach/provider/send/response hardening**
  (live-provider activation through the existing seam, acquisition persistence
  via the Supabase repository pattern, prospect→application→onboarding hand-off).
  Do NOT begin Rocket.Chat removal, Postiz exposure, Rakazo, or the UI redesign.

> The workflow therefore puts the machine-readable stage attributes on wrapper
> `<span>`s (caught by a failing E2E assertion, not by typecheck).