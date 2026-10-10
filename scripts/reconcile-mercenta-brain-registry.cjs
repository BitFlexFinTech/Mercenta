/**
 * §MERCENTA BRAIN — registry reconciliation (IDEMPOTENT).
 *
 * Adds this increment's genuinely new capabilities to the Master Matrix
 * (`requirements-registry.json`) so the five project-state sources agree.
 *
 * Idempotency: re-running is a no-op. An entry whose id already exists is left
 * untouched (its evidence/date are refreshed only if they changed), so running
 * the script twice cannot duplicate a row or inflate `total_entries`.
 *
 * Run: node scripts/reconcile-mercenta-brain-registry.cjs
 */
const fs = require('fs');
const path = 'requirements-registry.json';

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

/**
 * §BATCH 4 (2026-10-10) — SUPERSEDED, AND GUARDED AGAINST REGRESSION.
 *
 * This tool's rows described the MERCENTA BRAIN, which the owner instructed us to
 * REMOVE COMPLETELY ("it serves no purpose"). Its `evidence` strings therefore
 * name DELETED modules (`src/lib/intelligence/brain/*`,
 * `src/components/shared/brain/*`, `src/components/admin/MercentaBrain.tsx`) and
 * a DELETED harness (`scripts/brain-runtime-check.ts`) — and because the script
 * REFRESHES a row's evidence when it differs, re-running it would OVERWRITE the
 * reconciled rows in `requirements-registry.json` and re-introduce citations of
 * deleted files.
 *
 * It is kept (history is never deleted) but REFUSES to run by default: its rows
 * are now recorded as `removed` (or repointed) by hand, and the Brain's ABSENCE
 * is guarded by `scripts/validate-mercenta-brain.mjs` (rewritten into an absence
 * guard, rule 08), which fails if any part of the Brain returns.
 */
if (!process.env.ALLOW_SUPERSEDED_MERCENTA_BRAIN_RECONCILE) {
  console.error(
    'reconcile-mercenta-brain-registry.cjs — SUPERSEDED by §BATCH 4 (2026-10-10): the Mercenta Brain was removed.\n' +
      'Its rows are reconciled in requirements-registry.json (status "removed" / repointed) and guarded by\n' +
      'scripts/validate-mercenta-brain.mjs. Re-running would re-introduce citations of deleted files.\n' +
      'Set ALLOW_SUPERSEDED_MERCENTA_BRAIN_RECONCILE=1 only if you have read that and still intend to run it.'
  );
  process.exit(1);
}

const NEW = [
  {
    id: 'mercenta-brain-entity-model',
    description:
      'MERCENTA BRAIN — canonical entity model: 28 entity kinds (founder, brand, prospect, contact, product, ASIN, SKU, document, purchase order, PO line, shipment, invoice, payment, payout, case, conversation, rule, policy, decision, workflow, LOA, compliance object, commercial readiness, contract, retail channel, integration, provider, automation, agent, knowledge, campaign, source, evidence) declared ONCE with cluster, canonical domain colour, default authority and a note; no duplicate entity was invented where a canonical one exists (BrandProspect, ComplianceDocument, ProductSubmission, Ticket, Message, CommercialReadinessRecord, AUTOMATION_REGISTRY, INTEGRATION_REGISTRY).',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'src/lib/intelligence/brain/types.ts; scripts/validate-mercenta-brain.mjs (entity coverage + catalogue assertions PASS); scripts/brain-runtime-check.ts (27 kinds observed at runtime, ASSERTIONS_FAILED: 0); e2e/mercenta-brain.spec.ts test 1 (executed: real entity/relationship counts rendered in Chromium)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'mercenta-brain-relationship-model',
    description:
      'MERCENTA BRAIN — canonical relationship model: 20 declared relationship kinds, each edge carrying an `evidence` string naming the canonical field that proves it. Represents the operating model explicitly, including the two linked PO identities (the retail channel sends the order to Mercenta; the PO belongs_to the brand), brand authorised_by LOA, and case escalates_to the channel only when Mercenta has actually escalated. The Brain is a projection: it owns no business state and mutates nothing.',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'src/lib/intelligence/brain/buildGraph.ts; scripts/validate-mercenta-brain.mjs (every edge kind declared in the catalogue; every edge cites its evidence); runtime: 401 relationships in Mercenta scope, 0 edges with a missing endpoint; e2e/mercenta-brain.spec.ts tests 4-5 (executed: selecting an entity lists its relationships with their evidence, and relationship inspection re-selects the related entity)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'mercenta-brain-provenance-and-epistemic-honesty',
    description:
      'MERCENTA BRAIN — provenance + the four-state epistemic model (VERIFIED / SIMULATION / INFERENCE / UNKNOWN) that is never collapsed. Every node names its canonical origin and accessor; a non-simulation provider default resolves UNKNOWN (never simulation); an ASIN from a simulated submission is labelled SIMULATION; a purchase order can never be both simulated and verified. Measured: 206 verified / 25 simulation / 0 inference / 68 unknown, 0 unprovenanced nodes.',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'scripts/brain-runtime-check.ts (epistemic-honesty assertions PASS); scripts/validate-mercenta-brain.mjs; src/integrations/types.ts isProviderSimulationSafe consumed rather than re-implemented; e2e/mercenta-brain.spec.ts tests 2-3 (executed: the SIMULATION filter renders only SIMULATION badges; a no-match filter states an honest empty result)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'mercenta-brain-surface',
    description:
      'MERCENTA BRAIN — first-class interactive product surface (Super Admin / Founder): deterministic radial cluster layout (no force simulation, no randomness), interactive SVG canvas with pan/zoom/select/clear plus explicit zoom controls, search + cluster + knowledge-status + entity-type filters, a truthful "visible of TOTAL" entity list (the keyboard-accessible equivalent of the graph, sharing one selection state), and an inspector showing canonical properties, the authority model with its explanation, every relationship with its evidence, the provenance pointer and a drill-down to the real destination view. Super-Admin only: hidden from the nav for every other tier AND guarded at render. Overview / Operational Dashboard / Brain remain three separate destinations.',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'src/components/admin/MercentaBrain.tsx; src/components/shared/brain/BrainCanvas.tsx; src/lib/intelligence/brain/layout.ts; src/components/layout/AdminShell.tsx (nav + render guard); e2e/mercenta-brain.spec.ts (10 passed, 0 failed — executed)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'brand-intelligence-relationship-map',
    description:
      'BRAND INTELLIGENCE — tenant-scoped relationship experience built by the SAME builder with an explicit brand scope. The brand branch never runs the platform/policy/decision/automation/agent/acquisition layers, so prospects, integrations, providers, automations, the AI seam, payout rails, Founder policy and Mercenta-wide decisions are structurally absent rather than filtered out; an unknown tenant fails closed with a stated reason; the boundary statement is shown to the brand. A brand sees its own products, ASINs, SKUs, POs and lines, shipments, invoices, payments, cases, conversations, documents, LOA, contracts and readiness records.',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'src/components/brand/BrandRelationshipMap.tsx; src/components/brand/BrandIntelligence.tsx; scripts/brain-runtime-check.ts (brand scope 39 nodes / 42 relationships, no forbidden kind, no other tenant, unknown tenant refused); e2e/mercenta-brain.spec.ts test 10 (executed: no Brain in a brand shell, no leaked kind, no leaked tenant)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'mercenta-brain-contract-gate',
    description:
      'MERCENTA BRAIN — contract gate: `npm run validate:brain` runs 30 source assertions AND a bundled runtime harness (esbuild → node) that verifies the graph against the real canonical domain stores: entity coverage, EXACT projection of canonical records to nodes, relationship coverage, epistemic honesty, the tenant boundary, the unknown-tenant refusal, determinism across rebuilds, and "every edge kind is declared in the catalogue". Declared relations with no instance in the current canonical data are PRINTED rather than faked. The gate was proven to fail on real defects (missing brand nodes; a comment-blind pattern test) before it passed.',
    source: 'Complete Platform Redesign + Mercenta Brain workstream 2026-09-21',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-mercenta-brain.mjs (MERCENTA_BRAIN_VALIDATION_PASS, 30 assertions, runtime executed, 0 network calls); scripts/brain-runtime-check.ts (BRAIN_RUNTIME_PASS); package.json validate:brain; e2e/mercenta-brain.spec.ts (10 executed tests: counts, filters, empty state, selection, relationships, keyboard, zoom, responsive, reduced motion, tenancy)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
];

let added = 0;
let refreshed = 0;
for (const entry of NEW) {
  const existing = byId(entry.id);
  if (existing) {
    if (existing.evidence !== entry.evidence || existing.last_verified !== entry.last_verified) {
      existing.evidence = entry.evidence;
      existing.last_verified = entry.last_verified;
      refreshed += 1;
    }
    continue;
  }
  reg.entries.push(entry);
  added += 1;
}

reg._meta.last_updated = '2026-09-21';
reg._meta.total_entries = reg.entries.length;
reg._meta.mercenta_brain_increment = {
  increment: 'Complete Platform Redesign + Mercenta Brain (2026-09-21)',
  added: NEW.map((e) => e.id),
  note:
    'The Brain did not exist before this increment (grep -ril brain src e2e docs returned one doc sentence). These rows record the entity model, the relationship model, provenance/epistemic honesty, the surface, the tenant-scoped Brand Intelligence relationship map and the runtime gate. This script is idempotent: re-running adds nothing and duplicates nothing.',
};

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');
console.log(`entries now ${reg.entries.length} (added ${added}, refreshed ${refreshed})`);