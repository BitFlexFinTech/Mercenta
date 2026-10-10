# MERCENTA BRAIN — IMPLEMENTATION RECORD (2026-09-21)

> ## ⚠ SUPERSEDED — THE MERCENTA BRAIN WAS REMOVED (§BATCH 4, 2026-10-10)
> **This document is a HISTORICAL IMPLEMENTATION RECORD and is preserved as history only.** On 2026-10-10 the owner
> instructed the Mercenta Brain's **complete removal** ("it serves no purpose"). Deleted: `src/components/admin/MercentaBrain.tsx`,
> `src/components/shared/brain/`, `src/lib/intelligence/brain/`, `src/components/brand/BrandRelationshipMap.tsx`,
> `src/lib/hooks/useWebglPalette.ts`, `src/lib/hooks/usePrefersReducedMotion.ts` and `scripts/brain-runtime-check.ts`.
> Every "the Brain is…" statement below therefore describes a surface that **no longer exists**. The absence is guarded
> by `scripts/validate-mercenta-brain.mjs` (the contract validator rewritten into an ABSENCE guard, rule 08) and by
> `e2e/mercenta-brain.spec.ts`. Authority: `docs/NEXT_BUILD_PLAN_2026-10-10.md` Part 2.5.


**Status:** implemented + browser-verified this session · **Branch:** `redesign/foundation`
**Companions:** `PROJECT_STATUS.md` (current position block) · `HANDOFF.md` · `requirements-registry.json` ·
`docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md` · `docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md`

> Every number in this document was produced by **running** the code this session, not by reading it. Where
> something is not done, it says so.

---

## 1. WHY THE BRAIN EXISTS

The platform's information architecture has three distinct questions. They are deliberately **not** merged, and
none of them replaced another:

| Destination | Question it answers |
|---|---|
| Overview | What is happening across Mercenta? |
| Operational Dashboard | What do I need to do? |
| **Mercenta Brain** | **How is everything connected, what do we know, and why?** |
| Domain modules | The actual work (catalogue, POs, logistics, finance, cases, compliance, …) |

**Before this session the Brain did not exist.** `grep -ril 'brain' src e2e docs` returned exactly one hit — a
sentence in `docs/UIUX_REDESIGN_WAVE3_2026-09-20.md` noting that the three destinations "remain three separate
destinations as required". There was no entity model, no relationship model, no surface and no test.

## 2. WHAT THE BRAIN IS *NOT*

- **Not a second truth system.** It owns no business state and mutates nothing. Every node is derived from the
  canonical module that already owns the fact, and carries a `provenance.ref` naming it. Every edge carries an
  `evidence` string naming the canonical field that proves it.
- **Not Brand Intelligence.** The Brain is Mercenta-wide and Super-Admin only. Brand Intelligence is the
  tenant-scoped experience built from the same builder with a brand scope (§7).
- **Not a decorative network picture.** It is interactive, filterable, inspectable, keyboard-accessible, and every
  entity drills down to the real destination where its work happens.
- **Not an agent surface.** Agents reason; domain services own truth. The Brain *shows* where authority sits — it
  never takes any.

## 3. ENTITY MODEL

Declared once, in `src/lib/intelligence/brain/types.ts` → `BRAIN_KIND_DEFINITIONS`. **28 kinds**, each with a
cluster, a canonical domain colour binding, a default authority and a note explaining what it is an instance of.

| Cluster | Kinds |
|---|---|
| **Portfolio** | `founder`, `brand`, `prospect`, `contact` |
| **Catalogue** | `product`, `asin`, `sku`, `document` |
| **Commerce** | `purchase_order`, `po_line`, `shipment`, `invoice`, `payment`, `payout`, `case`, `conversation` |
| **Governance** | `rule`, `policy`, `decision`, `workflow`, `loa`, `compliance_object`, `commercial_readiness`, `contract` |
| **Platform** | `amazon`, `integration`, `provider`, `automation`, `agent`, `knowledge`, `campaign`, `source`, `evidence` |

**No duplicate entities were invented.** Where the repository already has a canonical entity, the Brain projects
that entity: `BrandProspect` (not a second "lead"), `ComplianceDocument` (not a second "certificate"),
`ProductSubmission` (not a second "listing"), `Ticket` (the canonical Mercenta case — there is deliberately **no**
second case store), `Message` (the canonical conversation), `CommercialReadinessRecord` (the canonical route
decision), `AUTOMATION_REGISTRY` (the canonical automation), `INTEGRATION_REGISTRY` (the canonical integration).
`payout` and `compliance_object` are declared kinds the current canonical data does not yet instantiate; they are
declared because the model must be able to represent them, and the harness reports them honestly rather than
fabricating instances.

**Measured at runtime (Mercenta scope):**

```
brand 20 · document 75 · integration 22 · campaign 21 · loa 21 · contract 20 · conversation 20
asin 13 · prospect 12 · provider 9 · automation 9 · po_line 8 · knowledge 7 · contact 5 · case 5
product 4 · sku 4 · purchase_order 4 · policy 4 · commercial_readiness 4 · evidence 3 · rule 3
founder 1 · amazon 1 · agent 1 · workflow 1 · source 1
```

## 4. RELATIONSHIP MODEL

Declared once in `BRAIN_RELATION_DEFINITIONS`. **20 relationship kinds**: `owns`, `maps_to`, `authorised_by`,
`sends`, `belongs_to`, `contains`, `concerns`, `fulfils`, `relates_to`, `settles`, `governs`, `supports`,
`changes`, `uses`, `executes`, `approved`, `derived_from`, `escalates_to`, `reviews`, `pays_via`.

The operating model is represented explicitly, including the two identities the canonical model refuses to
collapse:

- `amazon → purchase_order` **sends** (the channel issues the order to Mercenta) **and**
  `purchase_order → brand` **belongs_to** (Mercenta routes it into the tenant). Two linked identities, never one.
- `brand → loa` **authorised_by** — the universal base requirement authorising Mercenta to act.
- `case → amazon` **escalates_to** only when `Ticket.amazonCase` exists: Mercenta escalates, **never the brand**.
- `founder → provider(rail)` **pays_via**, with `PAYOUT_REQUIRES_HUMAN_APPROVAL` shown as a property.

**Measured at runtime, the relations the canonical data actually produces:**

```
belongs_to · contains · derived_from · governs · maps_to · owns · pays_via · relates_to · reviews · sends · supports
```

**Declared relations with NO instance in the current canonical data — reported, never faked:**

```
approved · changes · concerns · escalates_to · executes · fulfils · settles · uses
```

Why: every automation declares `externalProviders: []` (so no `uses` edge to an integration exists); no seed
ticket carries `relatedPoNumber` or `amazonCase` (so no `concerns`/`escalates_to` instance exists); the commerce
invoice/payment stores start empty (so `settles`/`fulfils` appear only once the commerce flow records them); and
no automation declares a workflow it executes (so `executes` has no instance, while `reviews` — the commercial
readiness monitor checking every stored route against the gate — does). The harness prints this list every run.

## 5. PROVENANCE AND THE FOUR EPISTEMIC STATES

Every node carries `provenance: { origin, ref, asOf? }` where `origin` is one of
`domain_store | registry | config | runtime_state | document` and `ref` names the exact canonical module or
accessor (e.g. `src/data/demoStore.ts demoPurchaseOrders`, `src/config/payouts.ts PAYOUT_RAILS`,
`src/lib/compliance.ts getComplianceRequirements`). **`unprovenanced` is measured at 0 and asserted by the gate.**

Four states are never merged:

| State | Meaning | Example in the graph |
|---|---|---|
| **VERIFIED** | Read directly from a canonical store/registry/config | a brand, a PO line, a policy |
| **SIMULATION** | Explicitly labelled simulated in the source | a catalogue submission's ASIN, a simulated invoice/payment |
| **INFERENCE** | Derived, not directly observed | a document whose status is not yet `approved` when linked to its requirement |
| **UNKNOWN** | Not positively resolved — stated, never guessed | an integration whose default mode is `available`; a payout rail; campaign performance |

Two honesty rules are enforced by the builder, not by convention:

1. **A non-simulation integration default is UNKNOWN, not simulation.** `defaultIntegrationMode` resolves through
   `isProviderSimulationSafe`, and only a positively resolved `simulation` produces the SIMULATION state. 11
   integrations resolve simulation; the rest are UNKNOWN. Measured split: **206 VERIFIED · 25 SIMULATION ·
   0 INFERENCE · 68 UNKNOWN.**
2. **An ASIN reached through a simulated submission is labelled SIMULATION**, and a purchase order can never be
   simultaneously `simulated: true` and VERIFIED — asserted by the harness.

## 6. EXECUTION AND AUTHORITY MODEL

`authority` records where authority actually sits. Measured split: **193 code · 30 mixed · 9 automation ·
66 human · 1 agent.**

- **CODE** — deterministic domain code owns the state; no reasoning required.
- **AUTOMATION** — repeatable work orchestrated by the canonical registry.
- **AGENT** — reasoning is required; the agent interprets and **never** mutates authoritative state. The graph
  carries the real capabilities: mutation capability NONE, external action capability NONE, human gate, manual
  fallback (the deterministic client answers when no model is available), and live-model status **UNKNOWN**.
- **MIXED** — code owns the state; a human decision or an external counterpart completes the loop.
- **HUMAN** — authority sits with a person and the system stops.

Automation nodes carry the registry's own declarations: cadence, entry point, determinism, whether AI is required
(optional, degrades to deterministic), the approval gate, tenant scoping, the idempotency key, the failure mode,
the manual fallback and the global kill-switch state.

## 7. TENANT BOUNDARY (§8) — ENFORCED IN THE BUILDER

`BrainScope` is an explicit union: `{ kind: 'mercenta' } | { kind: 'brand'; tenantId }`. There is **no runtime
filter** a caller could set wrongly.

- The **brand branch** of `buildBrainGraph` runs only: channel + rules + knowledge + portfolio + catalogue +
  brand records + readiness + orders + money + support. It **never calls** `addPlatformLayer`,
  `addPoliciesLayer`, `addDecisionLayer` or `addAcquisitionLayer` — so prospects, integrations, providers,
  automations, the AI seam, payout rails, Founder policy and Mercenta-wide decisions are structurally absent.
- An **unknown tenant fails closed**: `refusedGraph(tenantId)` returns an empty graph and states the reason,
  rather than defaulting to Mercenta-wide data.
- The brand's **own ASINs** are legitimately included (they are its marketplace identifiers, sourced from
  research evidence with the source URL retained); the **prospect entity** that discovered them is not.
- Every graph carries non-optional `exclusions[]` text stating what it does not contain.

Asserted at runtime by the harness: brand graph has exactly **one** brand, contains **no** other tenant's record,
leaks **none** of `prospect|contact|integration|provider|automation|agent|policy|decision`, and two different
brands produce different graphs.

## 8. INTERACTION MODEL

- **Pan** — pointer drag on the canvas.
- **Zoom** — wheel (registered with a non-passive listener so `preventDefault` is permitted) and explicit
  zoom in/out/reset controls; clamped 35 %–400 %.
- **Select** — click an entity; click empty canvas to clear.
- **Focus by relationship** — clicking a relationship in the inspector re-selects the entity at the other end.
- **Filter** — search (label, subtitle, kind, canonical ref), cluster, knowledge status, entity type; "Clear"
  resets all four. An edge is drawn **only** when both endpoints pass the filters, so a filter can never imply a
  relationship the data does not contain.
- **Truthful totals** — the entity section always states `visible of TOTAL`; the list is capped at 120 rows with an
  explicit note, never a silent subset.
- **Empty states** — a no-match filter shows a stated empty state (and an overlay on the canvas), not a blank box.
- **Keyboard** — the SVG is one `role="img"` with a text alternative, and the entity list is the accessible
  equivalent: real `<button>`s with `aria-pressed`, sharing one selection state with the graph. Verified by an
  Enter-key test.
- **Reduced motion** — transitions are suppressed under `prefers-reduced-motion`; verified by emulating it.

## 9. LAYOUT AND DESIGN-SYSTEM USAGE

`src/lib/intelligence/brain/layout.ts` is deterministic: five clusters own fixed 72° sectors, nodes are sorted by
(kind, id) and placed on concentric rings (inner radius 132 px, +54 px per ring, ≤6 rings), and node radius is
declared once per kind. No force simulation, no randomness — the same domain state always draws the same picture.

The surfaces use the existing canonical primitives and tokens only: `WorkspaceFrame`, `WorkspaceHeader`,
`WorkspaceGrid`, `WorkspaceSection`, `ContextPanel`, `RecordFieldList`, `SegmentedControl`, `KpiGroup`,
`StatusBadge`, `EmptyState`, `Button`, `Input`; `DOMAIN_COLOURS` from `src/config/themes.ts` for the canonical
hue→domain mapping; the `text-ds-*` operational type scale; `rounded-ds-*`, `transition-ds`, `duration-ds-*` motion
tokens. **No new colour, size, radius or motion value was introduced.** No dependency was added.

## 10. DESIGN RESOURCES — WHAT WAS ACTUALLY INSPECTED AND DECIDED

| Resource | Inspected | Decision | Reason |
|---|---|---|---|
| `github.com/amirmushichge/brand-system-skill` | Yes (README, licence, structure) | **REFERENCE** (not adopted) | CC-BY-4.0, agent-guided **creative-direction** workflow for generative brand assets via Lovart Agent. No UI components, no code to adopt, and it targets brand-asset generation rather than an enterprise operating surface. Its "Brand Lock" separation principle — an anchor kit controls logo/typography/colour while references control composition only — informed how the Brain keeps **presentation** (layout, palette, type) strictly separate from **projection** (canonical data). Attribution burden if adopted; rejected as a dependency. |
| `designmd.me` | Yes (product, output format, pricing) | **REFERENCE** (not adopted) | Produces a structured `DESIGN.md` token spec + live preview + Figma import from a URL, at 4–8 credits per spec. It validates the machine-readable-token-spec pattern — which Mercenta already has in a stronger form (`src/config/themes.ts` as the single token source, `tailwind.config.js` for the scale, `docs/DESIGN_SYSTEM.md` as the human projection, plus `scripts/validate-design-tokens.mjs` and `scripts/validate-typography-scale.mjs` as gates). A paid external spec generator would add a dependency and a cost for something already enforced locally. **REJECT** as a service. |
| `styles.refero.design`, `open-design.ai`, `designmd.supply`, `getdesign.md`, `aura.build`, `neuform.ai`, `design-md.hyperbrowser.ai`, `typeui.sh`, `sokosumi.com/tools/design-md`, `thealpy.studio/ai-taste`, `getmd.design` | **NOT INSPECTED this session** | **NO DECISION** | Recorded honestly rather than claimed. No component, licence or compatibility assessment was performed, so no ADOPT/ADAPT/REJECT decision can truthfully be reported for these eleven. |

**Open-source components evaluated:** none adopted. The graph canvas is hand-written SVG plus pointer/wheel
handlers (~300 lines). A graph library was considered and rejected for this increment: it would add a dependency
and a single point of failure for a view whose layout is deterministic and whose node count (299) renders
comfortably without one. `DataTable`/`Queue` remain the canonical table primitives (unchanged).

## 11. FILES

**New — domain**
- `src/lib/intelligence/brain/types.ts` — entity/relationship catalogue, epistemic model, authority model, contracts.
- `src/lib/intelligence/brain/buildGraph.ts` — the deterministic builder, scopes, exclusions, read helpers, stats.
- `src/lib/intelligence/brain/layout.ts` — deterministic cluster/ring layout.

**New — presentation**
- `src/components/shared/brain/BrainCanvas.tsx` — the interactive SVG canvas.
- `src/components/admin/MercentaBrain.tsx` — the Super Admin surface + entity inspector.
- `src/components/brand/BrandRelationshipMap.tsx` — the tenant-scoped relationship experience.

**New — verification**
- `e2e/mercenta-brain.spec.ts` — 10 executed browser tests.
- `scripts/validate-mercenta-brain.mjs` — 30 source assertions + the bundled runtime phase.
- `scripts/brain-runtime-check.ts` — the runtime harness.
- `test-screenshots/mercenta-brain/*.png` — 6 real rendered screenshots.

**Modified**
- `src/components/layout/AdminShell.tsx` — nav item, render route, Super-Admin guard, breadcrumb, `Brain` icon.
- `src/components/brand/BrandIntelligence.tsx` — the relationship map as a first-class section.
- `package.json` — `validate:brain`.

## 12. VERIFICATION EVIDENCE (REAL OUTPUT, THIS SESSION)

```
$ npx tsc --noEmit -p tsconfig.app.json
(no output — 0 errors)

$ npx eslint src/lib/intelligence/brain src/components/shared/brain src/components/admin/MercentaBrain.tsx \
    src/components/brand/BrandRelationshipMap.tsx src/components/layout/AdminShell.tsx \
    src/components/brand/BrandIntelligence.tsx
(no output — 0 errors, 0 warnings)

$ npm run build
✓ built in 4.58s

$ npm run validate:brain
BRAIN_RUNTIME_STATUS: PASS
MERCENTA_BRAIN_VALIDATION_PASS (30 assertions, runtime executed, 0 network calls)
  → MERCENTA_SCOPE { nodes: 299, edges: 401, kinds: 27, verified: 206, simulation: 25, inference: 0,
                     unknown: 68, unprovenanced: 0 }
  → BRAND_SCOPE   { tenantId: brand-astonish, nodes: 39, edges: 42, unprovenanced: 0 }
  → UNKNOWN_TENANT{ nodes: 0, refused: true }
  → ASSERTIONS_FAILED: 0

$ npx playwright test e2e/mercenta-brain.spec.ts --reporter=line
  10 passed (11.4s)     EXIT:0

$ npx playwright test e2e/app-shell.spec.ts e2e/uiux-foundation.spec.ts e2e/design-system.spec.ts \
    e2e/command-centre.spec.ts e2e/multi-tenant.spec.ts e2e/brand-intelligence-lifecycle.spec.ts \
    e2e/bi-intelligence-preservation.spec.ts e2e/access-gate.spec.ts e2e/record-drawer.spec.ts --reporter=line
  2 skipped
  80 passed (1.3m)      EXIT:0
```

**Gates that were proven to fail, not merely to pass** — this is what makes them worth having:

1. The first `validate-mercenta-brain.mjs` run reported **7 runtime assertion failures** and **3 source
   failures**, including two genuine defects (`brand` nodes never created; the validator failing on a doc comment).
2. The first `e2e/mercenta-brain.spec.ts` run was **7 passed / 3 failed**, and both failures were real
   integration defects in my own code: `Input` takes `dataTestid` (not `data-testid`) so the search box was
   unaddressable, and the brand nav label is `Market Intel` (not `Market Intelligence`). Both were fixed and the
   suite re-run to green.

**Not executed:** the full 300+ declaration Playwright suite (recorded as a coverage gap, owner S12). No
accessibility-tree audit tool (e.g. axe) was run — accessibility was verified through roles, accessible names,
`aria-pressed`/`aria-selected` assertions, keyboard execution and reduced-motion emulation, **not** through an
automated contrast/label audit.

## 13. WHAT IS NOT DONE (HONEST)

- The Brain is **not** wired into the Command Palette as a destination, and has no per-entity deep-link route
  (selection is in-page state).
- `payout` and `compliance_object` are declared but have no canonical instances, so no node of either kind is
  rendered.
- `uses`, `executes`, `settles`, `fulfils`, `concerns`, `escalates_to`, `approved` and `changes` have no instance
  in the current demo data (see §4) — the model supports them; the data does not yet exercise them.
- The Amazon-truth semantics (`docs/AMAZON_RECONCILIATION_STATUS.md`: 52 findings, APPLIED = 0) and the
  Payoneer-primary payout inverse default were **not** changed by this increment — see `PROJECT_STATUS.md`
  heading 3.
- The rest of the complete-platform-redesign workstream (page-by-page surface redesign) remains open.

