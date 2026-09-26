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
- **S2 — the parallel status.** A derived item's status must be COMPUTED from the record, never read
  from `derivedStatus` / `resolvedDerived` (`workStore.ts:254-257, 339-365, 793-866`). `resolveWorkItem`
  on a derived item must be REFUSED while the record still qualifies, naming the owning action;
  operator states become annotations. Repoint the four gates that assert derived resolution
  (`validate-work-layer`, `validate-commercial-readiness:479`, `validate-po-acknowledgement-work:243`,
  `validate-uiux-redesign`).
- **S3 — the surfaces.** Kanban / detail panel must offer the OWNING ACTION for derived items instead
  of a Resolve button (`WorkWorkspace.tsx:637, 647, 657, 1032, 1045, 1057`).
- **S4 — stop fabricating work.** Replace `COMPLIANCE_PATTERNS[bi % 3]` with named scenarios; assert
  the demo baseline count; label simulated operational state where it is presented as work.
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
