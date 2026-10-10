/**
 * §BATCH 3c PART 2b — THE FUNCTIONAL-PARITY GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The mandatory page-by-page functional-parity audit (global rule
 * `06-page-by-page-functional-parity-audit.md`, adopted by this project in
 * `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §6 Batch 3c) requires five
 * checks before any UI stage is called complete. Batch 3c part 1 (evidence
 * integrity) and part 2a (the browser suite made green) covered the repointing
 * and the smoke-render half. This gate is part 2b: the three remaining
 * dimensions, made MECHANICAL and mutation-provable so the defect class cannot
 * return. Typecheck, lint and build ALL pass cleanly on every defect this gate
 * catches — only an explicit scan finds them:
 *
 *   F1 HOOK-LINT PIN — the Rules-of-Hooks guard must stay an ERROR. A hook called
 *      in a loop/condition passes typecheck AND build and only crashes at render;
 *      the eslint `react-hooks/rules-of-hooks` / `exhaustive-deps` rules set to
 *      `error` are the ONLY thing standing between that bug and the browser. A
 *      config that silently flips them to `off`/`warn` re-opens the whole class.
 *
 *   F2 DATASET COMPLETENESS — a surface that lists a canonical dataset (brands,
 *      products, POs, shipments, documents) must READ the canonical source, never
 *      a hardcoded subset. A screen that silently shows 3 of 11 renders without
 *      error, so no typecheck/build/test that only asserts "renders" can catch it.
 *
 *   F3 NAME-IMPLIES-CAPABILITY — a component whose NAME promises a capability
 *      (CRM / Hub / Centre / Manager / Control) must implement it INLINE, not
 *      redirect the user to a different screen.
 *
 *   F4 INTERACTIVITY — every metric card must open into the set it counts. A
 *      `MetricBand` fed a `MetricTileData[]` in which NO tile drills down is a
 *      wall of dead numbers; a static figure with no path to its records is
 *      incomplete, not done.
 *
 * Deterministic, no browser, no network, no clock. Mutation-proved (see the
 * session report): each mutation-sensitive assertion was shown able to fail and
 * the mutated file restored byte-identical.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let checks = 0;
let failures = 0;
function test(name, ok, detail) {
  checks++;
  if (ok) console.log(`✓ ${name}`);
  else {
    failures++;
    console.log(`✗ ${name}`);
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 700)}`);
  }
}

/* ── F1 — the Rules-of-Hooks guard must stay an ERROR ─────────────────────── */
const eslint = read('eslint.config.js');
test("F1 react-hooks/rules-of-hooks is enforced as an ERROR",
  /'react-hooks\/rules-of-hooks':\s*'error'/.test(eslint),
  'a hook in a loop/condition passes typecheck AND build and only crashes at render — the eslint rule is the only guard');
test("F1 react-hooks/exhaustive-deps is enforced as an ERROR",
  /'react-hooks\/exhaustive-deps':\s*'error'/.test(eslint),
  'a stale dependency renders wrong data silently; the rule must be an error, not a warning');
test("F1 the hooks guard is never disabled (no 'off' override)",
  !/rules-of-hooks':\s*'off'/.test(eslint) && !/exhaustive-deps':\s*'off'/.test(eslint),
  'turning the rule off re-opens the whole render-time-crash class');
const pkg = JSON.parse(read('package.json'));
test("F1 eslint-plugin-react-hooks is a declared dependency",
  Boolean((pkg.devDependencies || {})['eslint-plugin-react-hooks'] || (pkg.dependencies || {})['eslint-plugin-react-hooks']),
  'the plugin must be installed for the rules to run at all');

/* ── F2 — DATASET COMPLETENESS (a listing reads the canonical source) ──────── */
const DATASET_CONSUMERS = [
  ['src/components/admin/BrandCRM.tsx', /useBrands\(/, 'admin Brand CRM lists the canonical brand set'],
  ['src/components/admin/CatalogManagerAdmin.tsx', /useBrands\(/, 'catalog lists the canonical brands'],
  ['src/components/admin/CatalogManagerAdmin.tsx', /useProducts\(/, 'catalog lists the canonical products'],
  ['src/components/admin/AdminPurchaseOrderList.tsx', /usePurchaseOrders\(/, 'admin PO list reads the canonical POs'],
  ['src/components/admin/LogisticsControl.tsx', /useShipmentsAll\(/, 'logistics lists the canonical shipments'],
  ['src/components/admin/LogisticsControl.tsx', /usePurchaseOrders\(/, 'logistics lists the canonical POs'],
  ['src/components/admin/MessagesHub.tsx', /useBrands\(/, 'messages hub lists the canonical brands'],
  ['src/components/admin/MessagesHub.tsx', /useMessages\(/, 'messages hub reads the canonical messages'],
  ['src/components/brand/ComplianceHub.tsx', /useComplianceDocuments\(/, 'compliance hub lists the canonical documents'],
  ['src/components/brand/LogisticsHub.tsx', /useShipmentsAll\(/, 'brand logistics lists the canonical shipments'],
];
for (const [rel, re, why] of DATASET_CONSUMERS) {
  test(`F2 ${rel} — ${why}`, re.test(read(rel)),
    'must read the canonical dataset, never a hardcoded subset (a screen that silently shows a subset passes every render test)');
}

/* ── F3 — NAME-IMPLIES-CAPABILITY (the capability is INLINE, no redirect) ──── */
const NAMED_CAPABILITY = [
  ['src/components/admin/BrandCRM.tsx', ['BrandCommPanel', 'BrandCrmDepth'], 'a CRM must carry comms + CRM depth inline'],
  ['src/components/admin/MarketingHub.tsx', ['AcquisitionPipeline'], 'a Hub must carry its pipeline inline'],
  ['src/components/admin/MessagesHub.tsx', ['useBrandComms'], 'a Hub must carry its comms inline'],
  ['src/components/admin/CatalogManagerAdmin.tsx', ['ImageSetEditor', 'evaluateProductCompleteness'], 'a Manager must carry editing + evaluation inline'],
  ['src/components/admin/CompanyControlCentre.tsx', ['companiesHouseConnectionCredentials'], 'a Centre must carry its connection inline'],
  ['src/components/admin/FounderControlCentre.tsx', ['buildFounderBrief'], 'a Centre must carry its brief inline'],
  /**
   * §BATCH 3 (2026-10-10) — REPOINTED, not weakened.
   *
   * OLD CONTRACT: 'a Control must carry its map + queue inline' — the symbol
   * list named `LogisticsMapCanvas`. The owner instructed the interactive map's
   * removal from BOTH logistics surfaces, so the Control no longer carries a map;
   * the cross-tenant DOCUMENT QUEUE it also carries is unchanged. The map's
   * ABSENCE is proved by `scripts/validate-logistics-map.mjs` §BATCH3 (which
   * FAILS if the map returns); this entry keeps asserting the capability the
   * Control still owes its name.
   */
  ['src/components/admin/LogisticsControl.tsx', ['PoDocumentQueuePanel'], 'a Control must carry its document queue inline'],
  ['src/components/admin/PartnershipsCentre.tsx', ['getProspects'], 'a Centre must carry its records inline'],
  ['src/components/brand/ComplianceHub.tsx', ['generateCustomsDocBundle'], 'a Hub must carry its document generation inline'],
  ['src/components/brand/LogisticsHub.tsx', ['buildOperationalMap'], 'a Hub must carry its consignment derivation inline'],
];
const REDIRECT = /<Navigate\b|useNavigate\(/;
for (const [rel, symbols, why] of NAMED_CAPABILITY) {
  const src = read(rel);
  const missing = symbols.filter((s) => !src.includes(s));
  test(`F3 ${rel} implements its named capability inline (${symbols.join(', ')})`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')} — ${why}` : undefined);
  test(`F3 ${rel} does NOT redirect the user away`,
    !REDIRECT.test(src),
    'a component named CRM/Hub/Centre/Manager/Control must implement the capability inline, not bounce the user elsewhere');
}

/* ── F4 — INTERACTIVITY (every metric card opens into the set it counts) ───── */
function walkComponents(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkComponents(p, out);
    else if (entry.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}
const COMPONENTS = join(ROOT, 'src/components');
const allTsx = walkComponents(COMPONENTS);

/* F4a — no DEAD metric band: a file that declares a MetricTileData[] AND renders
 * <MetricBand> must give at least one tile a drill-down. The primitive DEFINITION
 * (`shared/workspace.tsx`) is not matched — it declares the prop type and exports
 * MetricBand, but never renders `<MetricBand`. */
const deadBands = [];
for (const abs of allTsx) {
  const src = readFileSync(abs, 'utf8');
  if (!/MetricTileData\[\]/.test(src) || !/<MetricBand\b/.test(src)) continue;
  if (!/onOpen/.test(src)) deadBands.push(abs.slice(COMPONENTS.length + 1));
}
test('F4 no dead metric band (every MetricBand fed a MetricTileData[] has a drill-down)',
  deadBands.length === 0,
  deadBands.length ? `dead bands (a wall of numbers with no drill-down):\n      ${deadBands.join('\n      ')}` : undefined);

/* F4b — §BATCH 4 (2026-10-10) — REPOINTED, not deleted (rule 08). This block used
 * to pin the Brain's KPI band (six tiles, each giving a drill-down). The owner
 * instructed the Brain's complete removal, so the dead-end-number risk it guarded
 * no longer exists; the check now pins the ABSENCE of the surfaces, and F4a above
 * still catches a dead metric band anywhere else in the product. */
const BRAIN_SURFACES = [
  'src/components/admin/MercentaBrain.tsx',
  'src/components/brand/BrandRelationshipMap.tsx',
];
test('F4 §BATCH4 the removed Brain surfaces stay removed',
  BRAIN_SURFACES.every((rel) => !existsSync(join(ROOT, rel))), BRAIN_SURFACES.join(', '));

/* F4c — the audited metric surfaces keep their drill-down. */
const DRILLDOWN = [
  ['src/components/admin/BrandCRM.tsx', 'crm-metric-brands', 'Brand CRM brand-count tile'],
  ['src/components/admin/BrandIntelligencePanel.tsx', 'bi-kpi-tracked', 'Brand Intelligence tracked tile'],
];
for (const [rel, testId, why] of DRILLDOWN) {
  const src = read(rel);
  test(`F4 ${why} keeps its drill-down (testId ${testId} + onOpen)`,
    src.includes(testId) && src.includes('onOpen'),
    `${rel} lost its tile testId or its drill-down handler`);
}

/* F4d — the metric primitive renders a drill-down as a REAL button. */
const workspacePrimitive = read('src/components/shared/workspace.tsx');
test('F4 the metric primitive renders a drill-down as a real button (kpi-open-* testid)',
  /onClick=\{data\.onOpen\}/.test(workspacePrimitive) && /kpi-open-\$\{data\.id\}/.test(workspacePrimitive),
  'a drill-down must be a focusable button with a stable test-id, not a decorative div');

console.log(`\nFUNCTIONAL PARITY: ${checks} assertions · failures: ${failures}`);
console.log(failures === 0 ? 'FUNCTIONAL_PARITY_PASS' : `FUNCTIONAL_PARITY_FAIL (${failures})`);
// exitCode (never process.exit) so buffered stdout is never truncated on a pipe.
process.exitCode = failures === 0 ? 0 : 1;

