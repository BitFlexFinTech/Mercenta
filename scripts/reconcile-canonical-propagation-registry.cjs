/**
 * §CANONICAL PROPAGATION — registry reconciliation (IDEMPOTENT).
 *
 * Records the workstream that turned the two headline surfaces from
 * INTERACTIVE STATIC/SIMULATED PRESENTATION into genuinely dynamic projections
 * of canonical domain state:
 *
 *   1. the canonical change signal promoted to its own module (one counter, one
 *      notification list, one notifier) and fired by EVERY mutation path;
 *   2. one application-wide subscriber that keeps every React Query read of
 *      canonical state in step with the domain;
 *   3. the Brain and the brand relationship map re-projecting on that signal;
 *   4. a permanent gate with SOURCE assertions (no silent mutation) and RUNTIME
 *      assertions (a real domain change MOVES both projections, tenant-scoped);
 *   5. a browser spec proving the same in the running product without a reload.
 *
 * Idempotency: re-running is a no-op (existing ids are skipped; only
 * evidence/last_verified are refreshed).
 *
 * Run: node scripts/reconcile-canonical-propagation-registry.cjs
 */
const fs = require('fs');
const path = 'requirements-registry.json';

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

/**
 * §BATCH 4 (2026-10-10) — SUPERSEDED, AND GUARDED AGAINST REGRESSION.
 *
 * Two of this tool's rows (`brain-dynamic-projection`, and the Brain half of
 * `canonical-propagation-gate`'s evidence) described the MERCENTA BRAIN, which the
 * owner instructed us to REMOVE COMPLETELY. Because the script REFRESHES an existing
 * row's evidence, re-running it would OVERWRITE the reconciled `removed` row in
 * `requirements-registry.json` and re-introduce citations of deleted files — which
 * `scripts/validate-mercenta-brain.mjs` A14 rejects.
 *
 * It is kept (history is never deleted) but REFUSES to run by default: the
 * canonical-signal rows it also managed are unchanged and already correct, the Brain
 * row is recorded as `removed` by hand, and the Brain's ABSENCE is guarded by
 * `scripts/validate-mercenta-brain.mjs`.
 */
if (!process.env.ALLOW_SUPERSEDED_CANONICAL_PROPAGATION_RECONCILE) {
  console.error(
    'reconcile-canonical-propagation-registry.cjs — SUPERSEDED by §BATCH 4 (2026-10-10): the Mercenta Brain was removed.\n' +
      'Its brain-dynamic-projection row is reconciled in requirements-registry.json (status "removed") and the Brain\'s\n' +
      'absence is guarded by scripts/validate-mercenta-brain.mjs. Re-running would re-introduce citations of deleted files.\n' +
      'Set ALLOW_SUPERSEDED_CANONICAL_PROPAGATION_RECONCILE=1 only if you have read that and still intend to run it.'
  );
  process.exit(1);
}

const SOURCE =
  'Canonical propagation workstream — Brain + Logistics as dynamic projections of canonical domain state (2026-09-21 session 6)';
const DATE = '2026-09-21';

const NEW = [
  {
    id: 'canonical-change-signal-single-owner',
    description:
      'CANONICAL CHANGE SIGNAL — ONE OWNER, FIRED EVERYWHERE. `src/lib/domain/canonicalSignal.ts` now owns the platform\'s "the domain changed" signal (one monotonic version counter, one notification list, one notifier, carrying no payload); `src/data/prospectStore.ts` imports and re-exports it, so every existing import path keeps working with exactly ONE implementation. Measured defect this closes: 17 modules / 39 canonical ARRAY-write sites and 30 in-place RECORD mutations (PO status, shipment status/stage, compliance doc status, ticket/case status, deduction status, work items, automation approvals, CRM tasks, company filings, funding pipeline, grants, financial reconciliation) changed canonical state SILENTLY, so every projection stayed on the snapshot it read at mount.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-canonical-propagation.mjs (EXECUTED: 25 PASS / 0 FAIL — S1/S2 assert one implementation and that EVERY mutating function signals). Files signalled: src/data/{api,demoStore,prospectStore,acquisitionStore,commercialReadinessStore,companyStore,googleStore,launchStore,preAuditStore,routingStore}.ts and 14 modules under src/lib/{automation,commerce,compliance,crm,dhl,events,finance,founder,grants,helpdesk,intelligence,simulation,verification,warehouse,work}',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'canonical-query-sync-subscriber',
    description:
      'REACT QUERY CANONICAL SYNC — `useCanonicalQuerySync()` subscribes ONCE for the whole application (mounted in `App.tsx`) to the canonical change signal and invalidates the query cache on each version bump, so every canonical read (shipments, purchase orders, deductions, products, compliance documents, contracts, cases, invoices, payments, audit log …) re-reads the domain after a mutation instead of serving a cached copy until a manual refetch or a reload. No query key is duplicated and no component needs its own subscription.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'src/data/queries.ts (useCanonicalQuerySync + useCanonicalStoreVersion); src/App.tsx mounts it; scripts/validate-canonical-propagation.mjs S3 assertions (EXECUTED)',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'brain-dynamic-projection',
    description:
      'MERCENTA BRAIN — DYNAMIC (no longer a mount-time snapshot). `MercentaBrain` and the brand relationship map now re-project on the canonical change signal (`useCanonicalStoreVersion()` in the memo dependencies, with `void storeVersion;` documenting that the version is a signal and not data). The graph was ALREADY a canonical projection (provenance per node, evidence per edge, no static JSON fixture) — what was missing was propagation, so a domain change was invisible until a remount.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'e2e/canonical-propagation.spec.ts test 1 (EXECUTED: Brain node AND edge counts grow after a real domain mutation, and the new PO is findable as a graph entity — no reload); test 3 (provenance shown in the inspector); scripts/validate-canonical-propagation.mjs R2 + S4 (EXECUTED); scripts/validate-mercenta-brain.mjs still MERCENTA_BRAIN_VALIDATION_PASS (30 assertions, runtime executed)',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'logistics-map-dynamic-projection',
    description:
      'LOGISTICS OPERATIONAL MAP — DYNAMIC (no longer a mount-time snapshot). The map/list/inspector project the canonical shipment + PO records through `buildOperationalMap`, and the projection now moves with the domain: raising a PO, acknowledging it and filing the ASN makes the new consignment appear — with its truth state — without a reload, tenant-scoped. Simulation continues to run through the SAME domain contracts as the future live path (nothing is a separate fake presentation model), and no carrier is invented: Freight Collect stays channel-arranged and Mercenta-arranged consignments resolve through the canonical lane rule.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'e2e/canonical-propagation.spec.ts tests 1 and 2 (EXECUTED: admin map legs grow 3 → 5 after the canonical lifecycle; the owning brand hub shows the new PO; the other tenant does not); scripts/validate-canonical-propagation.mjs R3/R4/R5 (EXECUTED); scripts/validate-logistics-map.mjs still LOGISTICS_MAP_VALIDATION_PASS (60 assertions); e2e/logistics-hub-map.spec.ts 15 passed',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'canonical-propagation-gate',
    description:
      'DYNAMIC-PROJECTION GATE — `scripts/validate-canonical-propagation.mjs` (`npm run validate:canonical-propagation`) makes BOTH halves permanent: SOURCE (one signal implementation; every mutating function signals; the app mounts the one sync subscriber; both Brain projections depend on the signal; the logistics surfaces are fed only from canonical accessors) and RUNTIME (subscriber notified, Brain graph and logistics projection both MOVE on a real domain mutation, another tenant does not, an unknown tenant still fails closed, and with no mutation the projection is unchanged).',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-canonical-propagation.mjs — EXECUTED: 25 PASS / 0 FAIL, 0 network calls; package.json script validate:canonical-propagation',
    last_verified: DATE,
    superseded_by: null,
  },
];

let added = 0;
let refreshed = 0;
for (const row of NEW) {
  const existing = byId(row.id);
  if (existing) {
    existing.evidence = row.evidence;
    existing.last_verified = DATE;
    refreshed++;
  } else {
    reg.entries.push(row);
    added++;
  }
}

reg._meta = reg._meta || {};
reg._meta.last_reconciled = DATE;
reg._meta.total_entries = reg.entries.length;

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');

console.log(
  `CANONICAL PROPAGATION RECONCILE: added ${added}, refreshed ${refreshed}, total_entries ${reg.entries.length}`
);
console.log('ids: ' + NEW.map((r) => r.id).join(', '));
