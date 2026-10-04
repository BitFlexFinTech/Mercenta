/**
 * §MERCENTA BRAIN — RUNTIME CONTRACT HARNESS (validator only, never bundled
 * into the app).
 *
 * `scripts/validate-mercenta-brain.mjs` bundles this file with esbuild and runs
 * it under Node, so the Brain's graph contract is verified against the ACTUAL
 * canonical domain data at runtime — not by reading source text. It exits
 * non-zero on a failed contract and prints the real counts it observed, so a
 * report can quote evidence rather than a claim.
 */
import {
  buildBrainGraph,
  brainStats,
  isNodeInScope,
} from '@/lib/intelligence/brain/buildGraph';
import { BRAIN_RELATION_DEFINITIONS } from '@/lib/intelligence/brain/types';
import type { BrainEntityKind, BrainGraph } from '@/lib/intelligence/brain/types';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import {
  demoCommerceInvoices,
  demoCommercePayments,
  demoComplianceDocs,
  demoPurchaseOrders,
  demoShipments,
} from '@/data/demoStore';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { allApprovals } from '@/lib/automation/registry';

const failures: string[] = [];
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function kindCounts(graph: BrainGraph): Record<string, number> {
  return graph.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.kind] = (acc[n.kind] ?? 0) + 1;
    return acc;
  }, {});
}

const mercenta = buildBrainGraph({ kind: 'mercenta' });
const brand = buildBrainGraph({ kind: 'brand', tenantId: 'brand-astonish' });
const otherBrand = buildBrainGraph({ kind: 'brand', tenantId: 'brand-tapatio' });
const unknownTenant = buildBrainGraph({ kind: 'brand', tenantId: 'brand-not-a-real-tenant' });

/* ── 1. The graph is real, populated, and fully attributed ─────────────────── */

const mStats = brainStats(mercenta);
check('mercenta graph has nodes', mercenta.nodes.length > 100, `nodes=${mercenta.nodes.length}`);
check('mercenta graph has edges', mercenta.edges.length > 50, `edges=${mercenta.edges.length}`);
check('every node names its canonical provenance', mStats.unprovenanced === 0, `unprovenanced=${mStats.unprovenanced}`);
const mIds = new Set(mercenta.nodes.map((n) => n.id));
check('no edge has a missing endpoint', mercenta.edges.every((e) => mIds.has(e.from) && mIds.has(e.to)));
check('every edge cites the canonical field that proves it', mercenta.edges.every((e) => e.evidence.length > 10));
check('node ids are unique', mIds.size === mercenta.nodes.length);
check('edge ids are unique', new Set(mercenta.edges.map((e) => e.id)).size === mercenta.edges.length);

/* ── 2. Entity-model coverage (the §4 required entities) ──────────────────── */

/**
 * Kinds that MUST exist from the canonical seed alone. `invoice`, `payment`,
 * `shipment` and `decision` are deliberately NOT in this list: their canonical
 * stores are empty until the commerce flow or an approval gate records one, and
 * asserting their presence would be a claim about the demo's runtime progress
 * rather than about the Brain. Section 2b proves the projection is exact for
 * them instead — which is the stronger assertion.
 */
const REQUIRED_KINDS: BrainEntityKind[] = [
  'founder', 'brand', 'prospect', 'contact', 'product', 'asin', 'sku',
  // §M12 wording safeguard (2026-09-21) — the retail-channel kind was renamed from the
  // internal identifier 'amazon' to 'retail_channel' so no source literal names the
  // channel. The CONTRACT is unchanged: the retail channel must still be represented.
  'purchase_order', 'po_line', 'case', 'conversation', 'retail_channel', 'integration',
  'provider', 'rule', 'policy', 'loa', 'document', 'source', 'evidence', 'agent',
  'automation', 'campaign', 'knowledge', 'commercial_readiness', 'contract', 'workflow',
];
const mKinds = kindCounts(mercenta);
const missing = REQUIRED_KINDS.filter((k) => !mKinds[k]);
check('every required entity kind is represented', missing.length === 0, `missing=${missing.join(', ')}`);
check('every canonical brand has a node', mKinds.brand === ALL_DEMO_BRANDS.length, `brands=${mKinds.brand}/${ALL_DEMO_BRANDS.length}`);

/**
 * §M12 WORDING SAFEGUARD (added 2026-09-21, clean-slate reconciliation).
 *
 * The brand-scoped Brain is RENDERED to a brand (`BrandRelationshipMap` draws this
 * graph), and the shared channel layer is added to BOTH scopes — so the copy the
 * brand graph carries must name no retail channel. This is a REAL defect the static
 * wording gate caught: the shared node's LABEL read "Retail channel (Amazon UK
 * Vendor)". The static gate guards the SOURCE files; this assertion guards the
 * PROJECTED graph, so the defect cannot return by another route (a label moved into
 * a seed, a computed subtitle, an edge note).
 *
 * SCOPE OF THE ASSERTION — RENDERED COPY ONLY (labels, subtitles, edge labels and
 * edge notes). Property VALUES are deliberately NOT asserted: several are
 * PROVENANCE (an evidence URL such as an ASIN product page, which the repository's
 * rules require to stay accurate and verifiable for exactly the reason
 * `src/data/brandProspectSeed.ts` is exempt from the static wording lint). Stripping
 * provenance to satisfy a wording rule would destroy evidence, which is a worse
 * failure than the rule it would be appeasing. A CLAIM is copy; a source URL is
 * data, and the two are treated differently by design.
 *
 * The Mercenta scope is deliberately NOT asserted either: admin-only labels are
 * exempt by rule and MAY name the channel.
 */
const CHANNEL_TERMS = /\b(amazon|vendor central|seller central)\b/i;
function brandRenderedCopy(): string[] {
  const out: string[] = [];
  for (const n of brand.nodes) {
    out.push(n.label);
    if (n.subtitle) out.push(n.subtitle);
  }
  for (const e of brand.edges) {
    /* §OPTION-A — the rendered copy of an EDGE is its relation definition: the
       Brain UI renders `BRAIN_RELATION_DEFINITIONS[edge.kind].label`
       (`MercentaBrain.tsx`). A `BrainEdge` itself carries no `label`/`note`, so
       the previous code read two properties that do not exist and silently
       collected nothing — this scan is now real. */
    const def = BRAIN_RELATION_DEFINITIONS[e.kind];
    if (def) {
      out.push(def.label);
      out.push(def.note);
    }
  }
  return out;
}
const brandLeaks = brandRenderedCopy().filter((s) => CHANNEL_TERMS.test(s));
check(
  'the BRAND-scoped Brain names no retail channel in any rendered copy string',
  brandLeaks.length === 0,
  `leaks=${brandLeaks.slice(0, 3).join(' | ')}`
);
// Negative control — the guard must be capable of failing if the defect returns.
check(
  'the channel-name guard actually detects the defect it exists to prevent',
  CHANNEL_TERMS.test('Retail channel (Amazon UK Vendor)') && !CHANNEL_TERMS.test('Retail channel')
);

/* 2b. The projection is EXACT — a node exists for every canonical record, and
   the count matches. This is what stops the Brain from showing a curated subset
   while claiming to be the whole picture. */
function countRecords(graph: BrainGraph, kind: BrainEntityKind, predicate: (n: { ref?: string }) => boolean): number {
  return graph.nodes.filter((n) => n.kind === kind && predicate(n)).length;
}
check(
  'every canonical purchase order has a node',
  countRecords(mercenta, 'purchase_order', () => true) === demoPurchaseOrders.length,
  `nodes=${mKinds.purchase_order} store=${demoPurchaseOrders.length}`
);
check(
  'every canonical shipment has a node',
  countRecords(mercenta, 'shipment', () => true) === demoShipments.length,
  `nodes=${mKinds.shipment ?? 0} store=${demoShipments.length}`
);
check(
  'every canonical invoice has a node',
  countRecords(mercenta, 'invoice', () => true) === demoCommerceInvoices.length,
  `nodes=${mKinds.invoice ?? 0} store=${demoCommerceInvoices.length}`
);
check(
  'every canonical payment has a node',
  countRecords(mercenta, 'payment', () => true) === demoCommercePayments.length,
  `nodes=${mKinds.payment ?? 0} store=${demoCommercePayments.length}`
);
check(
  'every canonical compliance document has a node',
  countRecords(mercenta, 'document', () => true) + countRecords(mercenta, 'loa', (n) => !n.ref?.startsWith('letter_of_auth')) >=
    demoComplianceDocs.length,
  `store=${demoComplianceDocs.length}`
);
check(
  'every recorded decision has a node (decisions appear when a gate blocks)',
  countRecords(mercenta, 'decision', () => true) === allApprovals().length,
  `nodes=${mKinds.decision ?? 0} store=${allApprovals().length}`
);

/* ── 3. Relationship-model coverage (§5) ─────────────────────────────────── */

const relationKinds = new Set<string>(mercenta.edges.map((e) => e.kind));
/** Relations that must exist from the canonical seed alone. */
for (const required of [
  'owns', 'maps_to', 'authorised_by', 'sends', 'belongs_to', 'contains',
  'relates_to', 'governs', 'supports', 'derived_from', 'pays_via', 'reviews',
] as const) {
  check(`relationship "${required}" is represented`, relationKinds.has(required));
}
/** Store-dependent relations — asserted only when their source record exists. */
if (demoCommercePayments.length > 0) check('relationship "settles" is represented', relationKinds.has('settles'));
if (demoShipments.length > 0) check('relationship "fulfils" is represented', relationKinds.has('fulfils'));
if (demoTickets.some((t) => t.relatedPoNumber)) check('relationship "concerns" is represented', relationKinds.has('concerns'));
if (demoTickets.some((t) => t.amazonCase)) check('relationship "escalates_to" is represented', relationKinds.has('escalates_to'));
if (allApprovals().length > 0) check('relationship "approved" is represented', relationKinds.has('approved'));

/**
 * Every relation instance must be a DECLARED relation kind. This is the check
 * that stops a builder author inventing an ad-hoc edge label.
 */
const DECLARED_RELATIONS = new Set(Object.keys(BRAIN_RELATION_DEFINITIONS));
check('every edge kind is declared in the relation catalogue', mercenta.edges.every((e) => DECLARED_RELATIONS.has(e.kind)));

/**
 * Declared relations with no instance in the current canonical data are
 * REPORTED, never hidden. `uses` and `executes` are the current examples: every
 * automation declares `externalProviders: []` and no automation declares a
 * workflow it executes, so the Brain has nothing true to draw.
 */
const RELATIONS_WITHOUT_INSTANCE = [...DECLARED_RELATIONS].filter((k) => !relationKinds.has(k)).sort();

/* ── 4. Epistemic honesty — simulation is never presented as verified ─────── */

check('simulated records exist and are labelled', mStats.byStatus.simulation > 0, `simulation=${mStats.byStatus.simulation}`);
check('unknown state is stated rather than guessed', mStats.byStatus.unknown > 0, `unknown=${mStats.byStatus.unknown}`);
const poNodes = mercenta.nodes.filter((n) => n.kind === 'purchase_order');
check('a purchase order is never both simulated and verified', poNodes.every((n) => !(n.simulated === true && n.status === 'verified')));
const submissionAsins = mercenta.nodes.filter((n) => n.provenance.ref.includes('demoProductSubmissions'));
check('ASINs from a simulated submission are labelled simulation', submissionAsins.every((n) => n.status === 'simulation'));

/* ── 5. Tenant isolation (§8) — the boundary is real, not decorative ──────── */

const brandStats = brainStats(brand);
check('brand graph has nodes', brand.nodes.length > 10, `nodes=${brand.nodes.length}`);
check('brand graph is fully attributed', brandStats.unprovenanced === 0);
check('brand graph is inside its own tenant boundary', brand.nodes.every((n) => isNodeInScope(n, brand.scope)));
const FORBIDDEN_IN_BRAND: BrainEntityKind[] = [
  'prospect', 'contact', 'integration', 'provider', 'automation', 'agent', 'policy', 'decision',
];
const leaked = FORBIDDEN_IN_BRAND.filter((k) => brand.nodes.some((n) => n.kind === k));
check('no Mercenta-internal machinery leaks into a brand graph', leaked.length === 0, `leaked=${leaked.join(', ')}`);
check('a brand graph contains exactly one brand', brand.nodes.filter((n) => n.kind === 'brand').length === 1);
check('a brand graph contains no other tenant record', brand.nodes.every((n) => n.tenantId === null || n.tenantId === 'brand-astonish'));
check(
  'two different brands produce different graphs',
  brand.nodes.map((n) => n.id).join('|') !== otherBrand.nodes.map((n) => n.id).join('|')
);
check(
  'an unknown tenant is REFUSED rather than defaulted to Mercenta-wide',
  unknownTenant.nodes.length === 0 && unknownTenant.exclusions.length > 0
);
check('exclusions are always stated', mercenta.exclusions.length > 0 && brand.exclusions.length > 0);

/* ── 6. Determinism — the same domain state yields the same graph ─────────── */

const rebuilt = buildBrainGraph({ kind: 'mercenta' });
check(
  'the graph is deterministic across rebuilds',
  JSON.stringify(rebuilt.nodes.map((n) => n.id)) === JSON.stringify(mercenta.nodes.map((n) => n.id)) &&
    JSON.stringify(rebuilt.edges.map((e) => e.id)) === JSON.stringify(mercenta.edges.map((e) => e.id))
);
check('cluster summaries account for every node', mercenta.clusters.reduce((s, c) => s + c.nodeCount, 0) === mercenta.nodes.length);

/* ── Evidence output ─────────────────────────────────────────────────────── */

const report = {
  MERCENTA_SCOPE: { ...mStats, nodes: mercenta.nodes.length, edges: mercenta.edges.length },
  BRAND_SCOPE: { tenantId: 'brand-astonish', ...brandStats, nodes: brand.nodes.length, edges: brand.edges.length },
  UNKNOWN_TENANT: { nodes: unknownTenant.nodes.length, refused: unknownTenant.exclusions.length > 0 },
  KINDS: mKinds,
  RELATIONS: [...relationKinds].sort(),
  DECLARED_RELATIONS_WITHOUT_INSTANCE: RELATIONS_WITHOUT_INSTANCE,
  ASSERTIONS_FAILED: failures.length,
};

if (failures.length > 0) {
  console.error('BRAIN_RUNTIME_FAIL');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(JSON.stringify(report, null, 1));
  process.exit(1);
}
console.log('BRAIN_RUNTIME_PASS');
console.log(JSON.stringify(report, null, 1));