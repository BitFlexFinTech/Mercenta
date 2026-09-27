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
| F7 | **The work layer's own owner gate was never run.** `scripts/validate-work-layer.mjs` (103 assertions, and it PASSES) is not a registered npm script, and there is no CI — `.github/` contains only `dependabot.yml` | `package.json`; `.github/` listing |
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
- **S4 — the next stage is S5** (one number: nav badge and list from ONE owner,
  with the label stating which set each number is), then S6 (CI wiring), S7 (the
  contract closing path).
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
- **S5 — one number.** Badge and list from one owner, with the label stating which set each number is
  (attention vs all-open), so the two can never read as disagreement.
- **S6 — enforcement.** `scripts/validate-all.sh` + `npm run validate:all` (**DONE — 113 PASS / 0
  FAIL**); `validate:work-layer` registered; CI wiring still outstanding.
- **S7 — the contract closing path (F5).** A canonical contract writer (`renewContract` /
  `terminateContract`) and the renewal draft written to the canonical store instead of component state.

## §4 DECLARED GAPS (no closing path yet — reported, never hidden)

`contract_renewal` · `founder_compliance` · `founder_setup` · `founder_integration` ·
`founder_funding` · `founder_finance` · `founder_ai_cost`

Declared in `src/lib/work/workStore.ts → WORK_SOURCE_CLOSING`, enumerated by
`WORK_SOURCE_CLOSING_GAPS`, and printed on every run of `scripts/validate-work-layer.mjs`.
