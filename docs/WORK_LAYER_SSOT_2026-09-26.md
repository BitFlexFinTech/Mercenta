# §SSOT — ONE SOURCE OF TRUTH FOR THE WORK LAYER (started 2026-09-26, session 36)

**Why this programme exists.** The Founder opened Work Management on the deployed demo and found
open work that should not have been there. That observation was correct, and the investigation found
the platform does NOT have a single source of truth for derived work: one fact had several writers,
work items could not be closed by doing the work, and nothing enforced any of it.

**Nothing in this document is aspirational. Every claim below was measured this session.**

---

## §1 WHAT THE INVESTIGATION FOUND (evidence, not opinion)

| # | Finding | Evidence |
|---|---|---|
| F1 | The deployed Work Management renders **47 open items** while its nav badge reads **41**, against a documented contract that says the badge "counts EXACTLY what the list shows" | live read-only audit; `workAttentionCount()` filters to critical+high (`workStore.ts:916-922`); contract text `AdminShell.tsx:209-211`, `navBadges.ts:48-58` |
| F2 | **A consignment already at the terminal milestone `live_amazon` was seeded `delayed: true`** — the seed contradicted itself, so Logistics showed "Live on retail-channel" while Work Management showed an open *"Delay — DH-PO-9212"* | `DEMO_SHIPMENTS` flags; live row; proof script |
| F3 | **Three writers owned one fact** (a consignment's in-transit exception): the seed (position arithmetic `i % 4 === 1` / `i % 7 === 3`, in TWO files), the DHL seam (`delayed \|\| shipment.delayed` — could only SET), and the investor-demo script **assigning `shipment.delayed` directly**, with no audit and no canonical notify | `demoData.ts:627-628`; `demoStore.ts:99`; `dhl/domain.ts:238`; `investorDemo.ts:2251/2256`; `scenarioEngine.ts:454` |
| F4 | **No platform action could clear that flag**, so the work item was un-closable: `setShipmentMilestone` wrote `s.status` only. The sole way to remove the item was to mark the TASK done while the RECORD still said exception — two sources of truth for one fact | PROVEN executably: advance the shipment to `live_amazon` → status changes, `exception` stays true, the item remains |
| F5 | **`contract_renewal` has no closing path at all** — `demoContracts` has no writer anywhere (every reference is a read) and `ContractsAdminPanel` keeps a renewal DRAFT in local component state (`extraDrafts`) instead of the canonical store | grep of all `demoContracts` references; `ContractsAdminPanel.tsx:171-183, 225-239` |
| F6 | **57% of the open list (27 of 47) is fabricated by arithmetic**: compliance document states come from `COMPLIANCE_PATTERNS[bi % 3]`, a rotating array indexed by the brand's position | `demoData.ts:659-663, 724-727, 749` |
| F7 | **The work layer's own owner gate was never run.** `scripts/validate-work-layer.mjs` (103 assertions, and it PASSES) is not a registered npm script, and there is no CI — `.github/` contains only `dependabot.yml` | `package.json`; `.github/` listing | **FIXED 2026-09-28 (Batch 1c):** `validate:work-layer` IS registered, and `.github/workflows/ci.yml` now runs it (inside `npm run validate:all`) on every push and pull request. The finding is recorded as it stood on 2026-09-26. |
| F8 | **The reported "whole `validate:*` sweep 36/36" covered 32% of the corpus**: 113 `validate-*.mjs` files exist, 36 were registered. 77 validators — including the work layer's own — had never run in any sweep this project reported as complete | file count vs registered script count |

## §2 THE RULE THIS PROGRAMME ENFORCES

> **For DERIVED work the canonical record owns BOTH existence and status.**
> The work layer may not hold an independent status for derived work, may not hide an item the
> record still qualifies, and every source must be closable BY THE PLATFORM ACTION THAT CHANGES
> THE RECORD — never by marking the task done.
> **No fact may have more than one writer. No demo state may be produced by arithmetic.**

## §3 STAGES

- **S1 — DONE (this session). The consignment exception: three writers → one, with a real closing
  path.** `SHIPMENT_RESOLVED_STATUSES` + `isResolvedShipmentStatus` (`src/types.ts`); the named
  `DEMO_SHIPMENT_EXCEPTION_SCENARIO` replaces position arithmetic in both files; `setShipmentMilestone`
  clears the flags at a resolved milestone (audited); new `raiseShipmentException` (raise-only, audited,
  REFUSES a resolved consignment) and `clearShipmentException` (idempotent, audited) are the ONLY
  writers; `amendShipment`, the DHL seam, the scenario engine and the investor demo all route through
  them; `WORK_SOURCE_CLOSING` declares every source's closing path with its gaps marked.
- **S2 — DONE (2026-09-26, session 37). The parallel status is gone: the record owns
  a derived item's status.** `resolvedDerived` / `derivedStatus` are DELETED from
  `src/lib/work/workStore.ts`; `make()` COMPUTES the status
  (`status: annotation?.status ?? 'open'`) and a derived item can never be `done`.
  `resolveWorkItem` REFUSES a derived item — the refusal names the owning action, the
  canonical writer and the record module from `WORK_SOURCE_CLOSING`, is attributed and
  audited (`work_item_resolution_refused`), and emits no `work_item_resolved` event.
  `setWorkItemStatus(id, 'done')` routes into the same refusal; `in_progress` /
  `blocked` become an ANNOTATION (`WorkOperatorAnnotation`, structurally unable to hold
  `done`) that can never remove the item from the attention set; `reopenWorkItem` on a
  derived item clears the annotation. `canResolveFromWorkLayer` / `describeWorkClosing`
  / `DERIVED_RESOLUTION_REFUSED` / `isDerivedResolutionRefusal` are the surface seam.
  Evidence: `validate-work-layer` §4 rewritten (refusal + naming + audit + annotation,
  no `done`) and a new §18 judges the CODE (no resolution map, computed status, the
  refusal guard, the annotation union) — **PASS, 0 failures**, and the four gates that
  asserted the old contract were REPOINTED, not weakened:
  `validate-work-layer` §11 (a manual task's reminder still stops on resolution; a
  record-qualified reminder survives a refused resolution), `validate-commercial-readiness`
  O6/O7 (the item exists EXACTLY while the record qualifies, in both directions),
  `validate-po-acknowledgement-work` §7 (the canonical `acknowledgePurchaseOrder`
  writer is driven and CLOSES the item; the refusal leaves it), `validate-uiux-redesign`
  (the attention filter plus the absence of any derived resolution map, judged on
  comment-stripped source).
- **S3 — DONE (2026-09-26, session 37). The surfaces offer the OWNING ACTION.**
  `WorkWorkspace.tsx`: one `openOwningRecord(item)` helper (raises the Super-Admin tab
  intent, closes the drawer, navigates) is used by the board card and the drawer; a
  record-qualified card/drawer renders the owning destination as its PRIMARY action with
  the closing path named inline (`work-drawer-closing`, `describeWorkClosing`), plus
  `Start` / `Block` / `Clear mark` annotations — and NO Resolve button; only a manual
  task keeps Resolve/Reopen. The header meta and the "Open work" tile now label the two
  sets honestly (`record-qualified` vs `resolved manually`). Evidence: the browser
  contract was repointed, not deleted — `e2e/work-layer.spec.ts` test 5 now asserts the
  record-qualified drawer has ZERO `work-drawer-resolve`, shows the named closing path,
  and that a mark leaves the row in place; new test 5b asserts a MANUAL task still
  resolves and leaves the list — **13 passed / 0 failed (25.7s)**.
- **S2 — SUPERSEDED TEXT, KEPT FOR THE RECORD (was "the parallel status")**: a derived
  item's status must be COMPUTED from the record, never read from `derivedStatus` /
  `resolvedDerived` (`workStore.ts:254-257, 339-365, 793-866`); `resolveWorkItem` on a
  derived item must be REFUSED while the record still qualifies, naming the owning
  action; operator states become annotations. Repoint the four gates that assert derived
  resolution (`validate-work-layer`, `validate-commercial-readiness:479`,
  `validate-po-acknowledgement-work:243`, `validate-uiux-redesign`). — **DONE above.**
- **S4 — DONE (2026-09-27, session 38). Stop fabricating work.**
  `COMPLIANCE_PATTERNS[bi % 3]` and `COMPLIANCE_SCENARIO_DOC_STATES` are GONE.
  `src/data/demoData.ts` now declares six NAMED document scenarios
  (`DEMO_COMPLIANCE_SCENARIOS`, each with a `why`) and assigns one to every
  canonical brand BY NAME (`DEMO_COMPLIANCE_SCENARIO_BY_BRAND`, 20 explicit
  entries). `complianceScenarioFor()` FAILS CLOSED on an unassigned brand instead
  of defaulting, and the demo baseline is a DECLARED number
  (`DEMO_COMPLIANCE_BASELINE`: 95 documents / 27 blocking). Simulated operational
  state is labelled where it is presented as work: the sentence is declared ONCE
  (`src/config/demo.ts → DEMO_OPERATIONAL_STATE_LABEL`) and rendered by the shared
  work workspace (`data-testid="work-operational-state-label"`). Evidence: the seed
  change is STATE-PRESERVING (same 27 blocking documents, diffed against the
  pre-change measurement); a new validator section §19 asserts the baseline, the
  assignment coverage, the dead-scenario check, the fail-closed refusal, the 1:1
  blocking-document↔item mapping and the label — and was PROVED ABLE TO FAIL
  (one brand re-assigned to `gate_cleared` ⇒ 3 failures, then restored
  byte-identical, sha256 `cf13b24ff623593ba25f5c8170964cb1ac7eea28589e1be3423e57d5c8ef8b8a`).
- **S5 — DONE (2026-09-27, session 39). ONE NUMBER: badge and list from ONE owner, each number labelled.**
  `workCounts()` in `src/lib/work/workStore.ts` is now the ONLY function that counts work, and
  `WORK_COUNT_SETS` declares three sets with the label that must travel with each number
  (`attention` = "Needs attention" — what a badge counts · `open` = "All open work" — what the list
  renders · `overdue` = "Overdue work"). `workAttentionCount` is **DELETED** — it had NO caller once the surfaces were repointed, and a second
  counting name is exactly the drift this stage removes. The rail badge numbers come from `workCounts` and carry
  `NAV_BADGE_LABELS`; the Sidebar renders the label with the number (`data-badge-label` + `aria-label`);
  the work workspace tiles and the Super Admin oversight read the same numbers and the declared labels.
  Evidence: `scripts/validate-work-layer.mjs` §20 (17 assertions) — PROVED ABLE TO FAIL THREE TIMES
  (re-introducing a second counting function ⇒ 3 failures; removing the sidebar label ⇒ 1 failure; both files
  restored byte-identical, `workStore.ts` sha256 `e0a37b2c2a9f5d7db223beed7c85491bdcd725383be3343ebf00c34e30c7b95b`);
  `e2e/work-layer.spec.ts` test 1b asserts in real Chromium that the badge is labelled and equals the
  attention tile. The declarative check in `scripts/validate-uiux-redesign.mjs` that pinned the removed
  identifiers was REPOINTED to `workCounts` / `NAV_BADGE_LABELS`, recorded inline.
- **S6 — enforcement — DONE (closed 2026-09-28 by Batch 1c).** `scripts/validate-all.sh` + `npm run validate:all`
  (the whole corpus: **116 PASS / 0 FAIL** as at 2026-09-28); `validate:work-layer` registered; **CI wiring DONE** —
  `.github/workflows/ci.yml` runs `npm ci` → `typecheck` → `lint` → `build` → `validate:wording` → `validate:all` on
  every push and every pull request, kept honest by `scripts/validate-ci-wiring.mjs` (39 assertions, PROVED ABLE TO
  FAIL). *The pre-Batch-1c text here read "CI wiring still outstanding" — corrected at source, recorded not deleted.*
- **S7 — the contract closing path (F5) — DONE (2026-10-03, Batch 3a).** The canonical contract writers
  `renewContract` / `terminateContract` now exist in `src/data/demoStore.ts` (plus `saveContractDraft`, which
  writes every draft — a new agreement, a renewal draft and a track amendment — to the canonical store).
  `ContractsAdminPanel` no longer keeps a parallel `extraDrafts` array in local React state: its table is the
  canonical store alone and its four write paths route through the writers. `WORK_SOURCE_CLOSING.contract_renewal.
  writer` is repointed from `null` to `renewContract / terminateContract`, so a renewal or termination clears the
  work item BY DOING THE WORK. Gate: `scripts/validate-contract-closing.mjs` (`npm run validate:contract-closing`,
  20 assertions; mutation-proved — a null writer and a re-introduced local draft state each fail it, files restored
  byte-identical). Live: `verify-live-demo.mjs` L24 drives the deployed admin Contracts console and asserts the
  Renew/Terminate controls render in the contract detail.

## §4 DECLARED GAPS (no closing path yet — reported, never hidden)

`founder_compliance` · `founder_funding` · `founder_finance` · `founder_ai_cost`

`contract_renewal` was the seventh gap; it was CLOSED by **S7 (Batch 3a, 2026-10-03)** — `demoContracts` now has
writers.

### Batch 3b (2026-10-03) — six founder gaps examined: two CLOSED, four stay gaps WITH a recorded reason

Each founder work source was examined and its real closing path (or the honest absence of one) established. Every
`WORK_SOURCE_CLOSING` entry now names its **true owner** (the store that owns the record), not the derivation
module.

- **CLOSED — `founder_setup`.** It was a FALSE gap: every item it derives already closes by doing the work. The
  Google items close through `src/data/googleStore.ts` (`setGoogleClientId` / `markGoogleConnected` /
  `saveGoogleSetupRun`) and the launch items through `src/data/launchStore.ts` (`markLaunchSubmitted`). The
  declaration previously named the DERIVATION as the owner, so the writer was never stated.
- **CLOSED — `founder_integration`.** Also a FALSE gap: the item is raised from the canonical connection mirror
  while a provider reports an `error` and cleared the moment the operator repairs or reconnects it, through the
  connection owner's writers (`completeApiKeyConnect` / `markGoogleConnected` / `disconnect` / `setMode` in
  `src/integrations/IntegrationsContext.tsx`).
- **GAP — `founder_compliance` (PARTIAL).** The register-read items DO close (`recordRegistrarSnapshot`), the
  credential item closes (`storeGovernmentSecret`) and the confirmation statement closes
  (`recordManualFiling` + `confirmConfirmationStatementFromRegister`). The **annual-accounts** item has no closing
  action: accounts are prepared and filed OUTSIDE Mercenta on the official service and `companyStore` records no
  accounts-filed state for it to clear on.
- **GAP — `founder_funding` (PARTIAL).** The funding-route items DO close (`recordFundingSubmission` after
  `recordFounderApproval`). The `partner-*` / `relationship-*` routes are derived from the `FOUNDER_PARTNER_TARGETS`
  config (stage `not_approached`, no writer mutates it), `founder-investor-route` is a plan roll-up and
  `fundraising-summary` is a count — none has a closing action.
- **GAP — `founder_finance` (NONE).** Its one item, `finance-contribution`, is a provisional gross-contribution
  roll-up of the cost model — not an action; nothing closes it.
- **GAP — `founder_ai_cost` (NONE).** `ai-cost-summary` is a usage roll-up and `ai-cost-protection` clears only via
  a GLOBAL usage reset (`resetAiUsageLog`), which is a demo reset, not the founder doing the work.

Declared in `src/lib/work/workStore.ts → WORK_SOURCE_CLOSING`, enumerated by `WORK_SOURCE_CLOSING_GAPS`, each gap
carrying a machine-readable `reason`, and printed on every run of `scripts/validate-work-layer.mjs`. Proven by
`scripts/validate-founder-closing.mjs` (`npm run validate:founder-closing`) — **mutation-proved twice** (a nulled
`founder_setup.writer` ⇒ 5 failures; an emptied gap reason ⇒ 1; `workStore.ts` restored byte-identical each time).
