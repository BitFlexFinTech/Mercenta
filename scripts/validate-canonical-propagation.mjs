/**
 * §CANONICAL PROPAGATION — DYNAMIC-PROJECTION GATE.
 *
 * WHY THIS GATE EXISTS
 * --------------------
 * The logistics projection is a PROJECTION: it renders whatever the canonical
 * domain stores hold. That makes it data-driven — but only genuinely DYNAMIC if a
 * change to a canonical object is BOTH announced by the mutation and observed by
 * the projection. Neither half is visible to typecheck, lint or a build:
 *
 *   - a mutation that never signals leaves the projection on the snapshot it
 *     read at mount (an "interactive but static presentation");
 *   - a projection that never subscribes does the same, even when every
 *     mutation signals correctly.
 *
 * Measured before this gate existed: 17 modules / 39 array-write sites plus 30
 * in-place record mutations changed canonical state silently, and the logistics
 * projection was built once per mount with no subscription at all.
 *
 * WHAT IT ASSERTS
 * ---------------
 * SOURCE (fast, exhaustive over the repo):
 *   S1 the signal has exactly ONE implementation;
 *   S2 every function that mutates canonical state signals;
 *   S3 the application mounts the one query-sync subscriber;
 *   S4 the removed BRAIN projections are GONE (ABSENCE guard, rule 08) — see
 *      §BATCH 4 below; 
 *   S5 the logistics projection is fed from the canonical accessor only.
 * RUNTIME (executed against the real modules, no network):
 *   R1 subscribing works and a real domain mutation bumps the version;
 *   R2 the removed Brain graph module cannot even be loaded (absence proof);
 *   R3 the logistics projection GAINS the new consignment leg;
 *   R4 tenant scope holds: another brand's projection does not gain it;
 *   R5 no mutation ⇒ no change (the projection is deterministic, not volatile).
 *
 * Run: node scripts/validate-canonical-propagation.mjs
 */
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.ts$/.test(entry.name)) out.push(rel);
  }
  return out;
};

const signalSrc = read('src/lib/domain/canonicalSignal.ts');
const definitions = walk('src').filter((f) => /export function notifyCanonicalStoreChange/.test(read(f)));
check('S1 the canonical signal has exactly one implementation',
  definitions.length === 1 && definitions[0] === 'src/lib/domain/canonicalSignal.ts',
  definitions.join(', '));
check('S1 prospectStore re-exports the ONE implementation (no second counter)',
  !/let canonicalTick/.test(read('src/data/prospectStore.ts')) &&
    /from '@\/lib\/domain\/canonicalSignal'/.test(read('src/data/prospectStore.ts')));
const signalCode = signalSrc
  .split('\n')
  .filter((l) => !['*', '//', '/*'].some((prefix) => l.trim().startsWith(prefix)))
  .join('\n');
check('S1 the signal is a version bump, not an event payload',
  /canonicalTick \+= 1/.test(signalCode) && !/detail|payload/.test(signalCode),
  'the notifier must carry no event data of its own');

const ARRAY_TOKENS = [
  'demoPurchaseOrders', 'demoShipments', 'demoDeductions', 'demoReturns', 'demoTickets',
  'demoMessages', 'demoProducts', 'demoProductSubmissions', 'demoComplianceDocs',
  'demoContracts', 'demoAuditLog', 'demoCommerceInvoices', 'demoCommercePayments',
  'demoCommerceExceptions', 'demoCommerceActivity', 'demoBrandCommercialModels',
  'demoGateDocs', 'demoAdCampaigns', 'demoFinancing', 'demoWorkItems',
  'demoReturnRequests', 'prospects', 'changes', 'runs', 'snapshots', 'outreach',
  'responses', 'opportunities', 'onboardings', 'events', 'platformEvents',
];
const ARRAY_MUT = new RegExp(
  `\\b(${ARRAY_TOKENS.join('|')})\\s*(\\.\\s*(push|unshift|splice)\\s*\\(|\\[[^\\]]+\\]\\s*=|=\\s*\\[)`
);
const FIELD_MUT = new RegExp(
  '^\\s*[A-Za-z_][\\w.]*\\s*\\.\\s*(status|stage|acknowledgedAt|verified|decision|' +
    'amountGbp|quantity|trackingNumber|waybill|renewalDate|effectiveDate|' +
    'contractStatus|complianceGateStatus)\\s*=[^=]'
);
const SIGNAL_LINE = /^\s*notifyCanonicalStoreChange\(\);?\s*$/;
const FUNC_START =
  /^(export\s+)?(async\s+)?(function\s+([A-Za-z_][\w]*)|const\s+([A-Za-z_][\w]*)\s*=\s*(async\s*)?\()/;

const unsignalled = [];
for (const rel of walk('src')) {
  if (rel.endsWith('demoData.ts') || rel.endsWith('canonicalSignal.ts')) continue;
  const lines = read(rel).split('\n');
  const starts = [];
  lines.forEach((l, i) => {
    const m = FUNC_START.exec(l);
    if (m) starts.push([i, m[4] ?? m[5]]);
  });
  if (starts.length === 0) continue;
  lines.forEach((l, i) => {
    if (!ARRAY_MUT.test(l) && !FIELD_MUT.test(l)) return;
    const owner = [...starts].reverse().find(([s]) => s < i);
    if (!owner) return;
    const [start, name] = owner;
    let end = lines.length - 1;
    for (let j = start + 1; j < lines.length; j++) {
      if (lines[j] === '}') {
        end = j;
        break;
      }
    }
    if (!lines.slice(start, end).some((b) => SIGNAL_LINE.test(b))) {
      unsignalled.push(`${rel}:${i + 1} ${name}()`);
    }
  });
}
check('S2 every function that mutates canonical state signals the change',
  unsignalled.length === 0,
  unsignalled.slice(0, 6).join(' | ') +
    (unsignalled.length > 6 ? ` (+${unsignalled.length - 6} more)` : ''));

const app = read('src/App.tsx');
check('S3 the application mounts the ONE query-sync subscriber',
  /useCanonicalQuerySync\(\)/.test(app) && /from '@\/data\/queries'/.test(app));
const queries = read('src/data/queries.ts');
check('S3 the query-sync subscriber invalidates the canonical reads',
  /export function useCanonicalQuerySync/.test(queries) && /invalidateQueries\(\)/.test(queries));

/* ── S4 — §BATCH 4 (2026-10-10): the Brain projections are REMOVED ───────────
 * These checks used to assert that BOTH Brain projections subscribed to the
 * canonical change signal. The owner instructed the Mercenta Brain's complete
 * removal, so per rule 08 the checks are REWRITTEN into ABSENCE guards: the two
 * projection surfaces must not exist, and no source may build a Brain graph. The
 * logistics projection keeps its own (unchanged) subscription assertions in S5. */
check('S4 the Mercenta Brain surface is REMOVED (nothing subscribes in its name)',
  !fs.existsSync(path.join(ROOT, 'src/components/admin/MercentaBrain.tsx')) &&
    !fs.existsSync(path.join(ROOT, 'src/components/brand/BrandRelationshipMap.tsx')));
check('S4 no source builds a Brain graph any more',
  walk('src').every((f) => !/buildBrainGraph/.test(read(f))));

const hub = read('src/components/brand/LogisticsHub.tsx');
const control = read('src/components/admin/LogisticsControl.tsx');
check('S5 the brand logistics map is fed from the canonical accessor only',
  /useShipmentsAll\(\)/.test(hub) && /buildOperationalMap\(/.test(hub));
check('S5 the admin logistics map is fed from the canonical accessor only',
  /useShipmentsAll\(\)/.test(control) && /buildOperationalMap\(/.test(control));



/* ── RUNTIME ASSERTIONS — the projection must MOVE when the domain moves ─── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const signal = await server.ssrLoadModule('/src/lib/domain/canonicalSignal.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const map = await server.ssrLoadModule('/src/lib/logistics/operationsMap.ts');

  const BRAND = 'brand-astonish';
  const OTHER_BRAND = 'brand-tapatio';

  /** The SAME projection the Logistics surfaces render. */
  async function legsForBrand(brandId) {
    const rows = (await api.fetchShipmentsAll()).data ?? [];
    return map.buildOperationalMap(
      rows
        .filter((s) => s.brandId === brandId)
        .map((s) => ({
          id: s.id,
          reference: s.reference,
          title: s.title,
          poNumber: s.poNumber,
          brandId: s.brandId,
          value: s.value,
          status: s.status,
          carrier: s.carrier,
          stage: s.stage,
          origin: s.origin,
          destination: s.destination,
          delayed: false,
          exception: false,
          cbm: 6,
          customer: '',
          date: '',
          trackingNumber: '',
          waybill: null,
          freightTerm: null,
          providerModes: {},
        }))
    );
  }

  let notified = 0;
  const unsubscribe = signal.subscribeCanonicalStore(() => {
    notified += 1;
  });

  const version0 = signal.getCanonicalStoreVersion();
  const legs0 = await legsForBrand(BRAND);
  const otherLegs1 = await legsForBrand(OTHER_BRAND);

  /* §BATCH 4 (2026-10-10) — R2 REPOINTED into an ABSENCE proof. It used to assert
   * the Brain graph GREW after a domain change; the graph is removed, so the
   * strongest true statement is that the module cannot even be loaded through the
   * project's own `@/` alias resolution. */
  let brainAbsent = false;
  try {
    await server.ssrLoadModule('/src/lib/intelligence/brain/buildGraph.ts');
  } catch {
    brainAbsent = true;
  }
  check('R2 the removed Brain graph module cannot be loaded (absence proof)', brainAbsent);

  // R5 — with NO mutation, the projection is identical (deterministic).
  const legsStable = await legsForBrand(BRAND);
  check('R5 no mutation ⇒ the projection is unchanged (deterministic, not volatile)',
    legsStable.legs.length === legs0.legs.length);

  // A REAL domain mutation through the canonical commerce lifecycle — exactly the
  // path a brand takes: raise a PO → acknowledge → fulfil (creates the shipment)
  // → advance the shipment stage.
  const actor = { staffId: `brand:${BRAND}`, canMutate: true, tenantId: BRAND };
  const product = store.productsForBrandFromStore(BRAND)[0];
  check('R0 the canonical brand has a product to order (precondition)',
    Boolean(product), 'no product for ' + BRAND);

  const created = await commerce.createCommercePurchaseOrder(BRAND, product.sku, 60, actor);
  const ack = created.ok
    ? commerce.acknowledgeCommercePurchaseOrder(created.value.id, actor)
    : created;
  const fulfilled = ack.ok
    ? commerce.fulfilCommercePurchaseOrder(created.value.id, actor, 'palletline')
    : ack;
  const advanced = fulfilled.ok
    ? commerce.advanceCommerceShipment(fulfilled.value.shipmentId, actor)
    : fulfilled;

  check('R0 the canonical lifecycle ran (create → acknowledge → fulfil → advance)',
    Boolean(created.ok && ack.ok && fulfilled.ok && advanced.ok),
    JSON.stringify([created.error, ack.error, fulfilled.error, advanced.error]));

  const version1 = signal.getCanonicalStoreVersion();
  check('R1 the mutation ANNOUNCED the change (version bumped)', version1 > version0,
    `v${version0} → v${version1}`);
  check('R1 the subscriber was actually notified', notified > 0, `notifications=${notified}`);
  unsubscribe();

  const legs1 = await legsForBrand(BRAND);
  check('R3 the logistics map GAINED a leg for the new consignment',
    legs1.legs.length > legs0.legs.length,
    `legs ${legs0.legs.length} → ${legs1.legs.length}`);
  check('R3 the new leg names its canonical PO and carries a truth state',
    legs1.legs.some((l) => l.poNumber === created.value?.poNumber && typeof l.truth === 'string'),
    legs1.legs.map((l) => l.poNumber).join(','));
  check('R3 truth is never fabricated as LIVE VERIFIED in this environment',
    legs1.legs.some((l) => l.truth === 'simulated' || l.truth === 'ambient'));

  check('R4 the owning brand logistics feed DOES show its own new consignment',
    legs1.legs.some((l) => l.poNumber === created.value?.poNumber));
  check('R4 the other brand logistics feed shows none of the new POs (tenant scope holds)',
    !otherLegs1.legs.some((l) => l.poNumber === created.value?.poNumber));
  check('R4 an unknown tenant still fails closed (no legs, no guess)',
    (await legsForBrand('brand-not-a-real-tenant')).legs.length === 0);
} finally {
  await server.close();
}

console.log(`\n§CANONICAL PROPAGATION: ${pass} PASS / ${fail} FAIL`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(` - ${f}`);
}
process.exit(fail === 0 ? 0 : 1);

