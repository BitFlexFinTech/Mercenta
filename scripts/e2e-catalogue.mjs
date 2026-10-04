// §BATCH 0 — THE E2E SCENARIO CATALOGUE GENERATOR (not a validator).
//
// WHY THIS EXISTS
// ---------------
// The end-to-end suite must cover every scenario for the ENTIRE platform, and
// "every scenario" must be a MEASURABLE target a machine holds us to — not a
// sentence someone types. This generator owns the two mechanical halves:
//
//   `--seed`  build/refresh `e2e/scenario-catalogue.json` — THE ONE OWNER of the
//             scenario list — seeding one scenario per existing `e2e/*.spec.ts`
//             so the invariant "no spec is un-named" holds from day one;
//   `--doc`   project the catalogue into `docs/E2E_SCENARIO_CATALOGUE.md`, so the
//             human document is GENERATED and cannot drift from the owner.
//
// The GATE that enforces the invariants is `scripts/validate-e2e-scenarios.mjs`
// (swept by `npm run validate:all`). This file only writes; it never asserts.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const CATALOGUE = 'docs/scenario-catalogue.json';
const DOC = 'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md';

const abs = (p) => new URL(p, ROOT);
const read = (p) => readFileSync(abs(p), 'utf8');

/** Map a spec's file name to the platform capability family it proves. */
function capabilityOf(journey) {
  const n = journey.toLowerCase();
  if (/onboard|acquisition|commercial|conversion|uk-market|opportunity/.test(n)) return 'onboarding_acquisition';
  if (/po|ack|shipment|asn|delivery|logistics|supply-route|inventory|catalog|compliance/.test(n)) return 'commerce_logistics';
  if (/billing|invoic|payout|deduction|dispute|xero|finance|costs/.test(n)) return 'finance';
  if (/crm|brand-intelligence|marketing|amazon-ads|discovery/.test(n)) return 'brands_marketing';
  if (/work|command-centre|brain|monitoring|automation|notification|tour/.test(n)) return 'operations';
  if (/integration|embedded-social|social|whatsapp|helpdesk|messaging|mail|google/.test(n)) return 'integrations';
  if (/founder|investor|funding|partnership|company-control|operating-costs/.test(n)) return 'founder';
  return 'platform';
}

/** Every method axis — the cross-product that DEFINES the scenario space. */
const AXES = {
  object: ['PO-line', 'PO', 'shipment', 'ASN', 'document', 'invoice', 'payment', 'deduction', 'return', 'case', 'compliance_doc', 'contract', 'onboarding', 'payout'],
  actor: ['brand_user', 'brand_admin', 'mercenta_admin', 'super_admin', 'channel', 'carrier', 'system', 'public_visitor'],
  trigger: ['channel_event', 'brand_action', 'admin_action', 'time_deadline', 'provider_event', 'system_sweep'],
  outcome: ['success', 'refusal', 'exception', 'timeout', 'override'],
  data_condition: ['complete', 'incomplete', 'unknown', 'conflicting', 'duplicate'],
  tenancy: ['own_tenant', 'cross_tenant_refused'],
  provider_mode: ['simulation', 'live', 'degraded', 'unknown_refused'],
  time: ['before_window', 'at_boundary', 'past_window'],
};

function seed() {
  const specs = readdirSync(abs('e2e')).filter((f) => f.endsWith('.spec.ts')).sort();
  const scenarios = specs.map((f) => {
    const journey = f.replace('.spec.ts', '');
    return {
      id: `spec-${journey}`,
      capability: capabilityOf(journey),
      journey: journey.replace(/-/g, ' '),
      actor: 'mixed',
      type: 'happy',
      spec: `e2e/${f}`,
      expects: `The ${journey.replace(/-/g, ' ')} journey renders and behaves as its spec asserts.`,
    };
  });
  const capabilities = [...new Set(scenarios.map((s) => s.capability))].sort();
  const catalogue = {
    _comment:
      '§BATCH 0 — THE ONE OWNER of the end-to-end SCENARIO CATALOGUE. ' +
      'docs/E2E_SCENARIO_CATALOGUE.md is GENERATED from this file (do NOT edit the doc by hand). ' +
      'The gate is scripts/validate-e2e-scenarios.mjs. Regenerate the doc with: node scripts/e2e-catalogue.mjs --doc',
    meta: { owner: CATALOGUE, generatedDoc: DOC, generator: 'node scripts/e2e-catalogue.mjs --doc' },
    method: {
      principle:
        'A scenario is a cell in the cross-product of an object lifecycle with the axes below; only meaningful cells are listed, and the gate refuses BOTH an orphan test (a spec no scenario names) and a missing one (a scenario whose spec does not exist).',
      axes: AXES,
    },
    capabilities,
    scenarios,
  };
  writeFileSync(abs(CATALOGUE), JSON.stringify(catalogue, null, 2) + '\n');
  console.log(`[e2e-catalogue] seeded ${CATALOGUE}: ${scenarios.length} scenarios across ${capabilities.length} capabilities`);
}

/** Pure: render the catalogue to the markdown document text (no side effects). */
export function renderDoc(c) {
  const byCap = new Map();
  for (const s of c.scenarios) {
    if (!byCap.has(s.capability)) byCap.set(s.capability, []);
    byCap.get(s.capability).push(s);
  }
  const lines = [];
  lines.push('# WHOLE-PLATFORM E2E COVERAGE MATRIX');
  lines.push('');
  lines.push('> **GENERATED FILE — do not edit by hand.** The ONE owner is');
  lines.push(`> \`${c.meta.owner}\`; regenerate this document with`);
  lines.push('> `node scripts/e2e-catalogue.mjs --doc`. The gate `scripts/validate-e2e-scenarios.mjs`');
  lines.push('> fails if this document drifts from the owner.');
  lines.push('');
  lines.push(`**Scenarios:** ${c.scenarios.length} · **Capabilities:** ${c.capabilities.length}`);
  lines.push('');
  lines.push('## The method (the axes that define the space)');
  lines.push('');
  lines.push(c.method.principle);
  lines.push('');
  for (const [axis, values] of Object.entries(c.method.axes)) {
    lines.push(`- **${axis}** — ${values.join(' · ')}`);
  }
  lines.push('');
  lines.push('## Coverage by capability');
  lines.push('');
  lines.push('| Capability | Scenarios |');
  lines.push('|---|---|');
  for (const cap of c.capabilities) {
    lines.push(`| ${cap} | ${(byCap.get(cap) ?? []).length} |`);
  }
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  lines.push('| id | capability | actor | type | spec | proved by (test) |');
  lines.push('|---|---|---|---|---|---|');
  for (const s of [...c.scenarios].sort((a, b) => a.id.localeCompare(b.id))) {
    /* §BATCH 1 — `proved by` names the individual test that proves the scenario,
       so the enumeration is traceable to a real case (the gate enforces it). */
    lines.push(`| ${s.id} | ${s.capability} | ${s.actor} | ${s.type} | \`${s.spec}\` | ${s.test ? `\`${s.test}\`` : '—'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function doc() {
  const c = JSON.parse(read(CATALOGUE));
  writeFileSync(abs(DOC), renderDoc(c));
  console.log(`[e2e-catalogue] wrote ${DOC} (${c.scenarios.length} scenarios)`);
}

/**
 * Run the CLI ONLY when this file is executed directly — never when it is
 * `import`ed by the gate (`scripts/validate-e2e-scenarios.mjs` reuses `renderDoc`).
 * Without this guard the imported module would print usage and `process.exit(2)`,
 * failing the gate for no reason.
 */
const isEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  const mode = process.argv[2];
  if (mode === '--seed') seed();
  else if (mode === '--doc') {
    if (!existsSync(abs(CATALOGUE))) seed();
    doc();
  } else {
    console.log('usage: node scripts/e2e-catalogue.mjs --seed | --doc');
    process.exit(2);
  }
}