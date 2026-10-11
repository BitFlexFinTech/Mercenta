// §BATCH 7 (2026-10-10) — THE CLEANUP GATE.
//
// Covers two defect classes fixed in Batch 7:
//
//   Part 4.2 — DANGLING BRAND / RECORD SEEDS.
//     The seeded helpdesk tickets and the returns-tracking rows used to name
//     brands from the RETIRED 17-brand universe (`brand-regatta`, `brand-seep`,
//     `brand-clipper`) that are not demo tenants, so the brand lookup fell back to
//     the raw id and those surfaces rendered a raw id as if it were a brand name.
//     Asserted here, through the REAL modules (SSR-loaded), not by reading text:
//       · every ticket's brand resolves to a canonical demo brand;
//       · every ticket's messageId exists in the canonical message store; and
//       · every returns-tracking row's brand resolves to a canonical brand AND
//         matches the brand of the canonical RETURN it describes (the row can no
//         longer drift from the return);
//       · no retired-universe brand id survives in any seed source.
//
//   Part 4.3 — THREE INERT CONTROLS REMOVED.
//     `AccountingPanel` "Sync Now" / "Sync Costs" and the design-showcase "Manage"
//     action carried NO handler (a `Button` defaults to `type="button"`, there is no
//     <form>), so they became enabled and then did nothing. Absence guards below.
//     The source is COMMENT-STRIPPED first, so the removal comment that NAMES the
//     removed controls cannot itself satisfy the absence guard.
//
// Rules 07/08: each guard is proved able to fail (mutate → FAIL → restore
// byte-identical) — see the §BATCH 7 report.
import { createServer } from 'vite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

/** Strip // and /* *\/ comments so prose can neither satisfy nor break an assertion. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const readStripped = (rel) => stripComments(readFileSync(resolve(ROOT, rel), 'utf-8'));

// ── Part 4.3 — the three inert controls are ABSENT ──────────────────────
const accounting = readStripped('src/components/admin/AccountingPanel.tsx');
const showcase = readStripped('src/components/design/DesignSystemShowcase.tsx');
test('§BATCH7 no "Sync Now" control in AccountingPanel', !/Sync Now/.test(accounting));
test('§BATCH7 no "Sync Costs" control in AccountingPanel', !/Sync Costs/.test(accounting));
test(
  '§BATCH7 no unhandled "Manage" action in DesignSystemShowcase',
  !/actions=\{<Button[^>]*>\s*Manage\s*<\/Button>\}/.test(showcase)
);

// ── Part 4.1 — the work item's "Open record" DEEP-LINKS to the record ────
// The defect (iss_a82e04e941f9): "Open record" on "Ship window for PO-9200"
// opened the purchase-order LIST, not the record. The fix routes a purchase-order
// work item through the ONE address layer with the record's id, and the PO list
// (both shells) selects that record on load.
const workWs = readStripped('src/components/shared/WorkWorkspace.tsx');
const adminPoList = readStripped('src/components/admin/AdminPurchaseOrderList.tsx');
const brandPoList = readStripped('src/components/brand/BrandPurchaseOrders.tsx');
test(
  '§BATCH7 work drawer deep-links a purchase-order item to its record',
  /navigateProductView\(\s*scope,\s*item\.actionView,\s*\{\s*po:\s*item\.entity\.label\s*\}\)/.test(
    workWs
  )
);
test('§BATCH7 admin PO list consumes the ?po= deep link', /currentQueryParam\('po'\)/.test(adminPoList));
test('§BATCH7 brand PO list consumes the ?po= deep link', /currentQueryParam\('po'\)/.test(brandPoList));
test('§BATCH7 admin PO list opens the deep-linked record', /setSelectedPoId\(\s*match\.id\s*\)/.test(adminPoList));
test('§BATCH7 brand PO list opens the deep-linked record', /setExpandedPO\(\s*match\.id\s*\)/.test(brandPoList));

// ── Part 4.2 — seed brand + record integrity, through the real modules ──
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const demoData = await server.ssrLoadModule('/src/data/demoData.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
  const ticketsMod = await server.ssrLoadModule('/src/lib/helpdesk/ticketStore.ts');
  const trackingMod = await server.ssrLoadModule('/src/lib/warehouse/returnsTracking.ts');

  const canonical = new Set(demoData.ALL_DEMO_BRANDS.map((b) => b.id));
  const messageIds = new Set(demoData.DEMO_MESSAGES.map((m) => m.id));

  test(
    '§BATCH7 every helpdesk ticket brand is a canonical demo brand',
    ticketsMod.demoTickets.every((t) => canonical.has(t.brandId))
  );
  test(
    '§BATCH7 every helpdesk ticket messageId exists in DEMO_MESSAGES',
    ticketsMod.demoTickets.every((t) => t.messageIds.every((id) => messageIds.has(id)))
  );

  const tracking = trackingMod.getAllReturnTracking();
  test(
    '§BATCH7 every return-tracking brand is a canonical demo brand',
    tracking.every((t) => canonical.has(t.brandId))
  );
  test(
    '§BATCH7 every return-tracking brand matches its canonical return',
    tracking.every(
      (t) => demoStore.demoReturns.find((r) => r.id === t.returnId)?.brandId === t.brandId
    )
  );

  // No retired-universe brand id survives in any seed source (comment-stripped).
  const RETIRED = ['brand-regatta', 'brand-seep', 'brand-clipper'];
  const SEED_SOURCES = [
    'src/lib/helpdesk/ticketStore.ts',
    'src/lib/warehouse/returnsTracking.ts',
    'src/components/admin/HelpdeskDashboard.tsx',
    'src/data/demoData.ts',
  ];
  for (const f of SEED_SOURCES) {
    const src = readStripped(f);
    test(`§BATCH7 no retired brand id in ${f}`, !RETIRED.some((id) => src.includes(id)));
  }

  console.log(failures === 0 ? 'BATCH7_CLEANUP_VALIDATION_PASS' : `BATCH7_CLEANUP_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
