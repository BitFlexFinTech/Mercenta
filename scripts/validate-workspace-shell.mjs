/**
 * §UI/UX REDESIGN (remaining surfaces) — WORKSPACE SHELL CONTRACT VALIDATOR.
 *
 * This is the enforceable half of the redesign's "taste gate". Typecheck and
 * build cannot see any of these failures: a page can compile perfectly while
 * rendering a bespoke `p-6 max-w-[1400px] mx-auto` container, a second
 * dashboard primitive set, or a page heading that is not the canonical
 * `WorkspaceHeader`. That is exactly how the platform ended up with two
 * competing design generations in the first place.
 *
 * What it locks in:
 *  1. THE LEGACY PAGE SHELL IS A SHRINKING BACKLOG. Every `src/**` file that
 *     still declares the pre-workspace container is named in
 *     `LEGACY_SHELL_BACKLOG`. A NEW file using it FAILS the gate, and a file
 *     that has been migrated but left in the backlog ALSO fails (the list can
 *     only ratchet down — the same pattern the repo uses for retired
 *     contracts, repointed rather than weakened).
 *  2. ONE DASHBOARD GENERATION. `src/components/shared/dashboard.tsx` is now a
 *     thin adapter over the canonical workspace primitives and must have NO
 *     operational consumer. A new import of `@/components/shared/dashboard`
 *     from any surface fails.
 *  3. THE CANONICAL FRAME OWNS SURFACE IDENTITY. `WorkspaceFrame` must expose
 *     `testId` and `busy` and render `data-testid` / `aria-busy`, so a surface
 *     never hand-rolls its own outer container again.
 *  4. THE MIGRATED SURFACES COMPOSE THE CANONICAL PRIMITIVES (frame, header,
 *     and a real section/queue/table body).
 *  5. THE RETIRED PAGE-HEADER GENERATION has no operational consumer.
 *
 * Run: node scripts/validate-workspace-shell.mjs   (`npm run validate:workspace-shell`)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/**
 * A file "declares the legacy shell" only when the container appears in CODE.
 * Both the canonical workspace module and the migrated brand dashboard mention
 * the string in their explanatory comments — a comment is not a shell.
 */
const LEGACY_CONTAINER = 'max-w-[1400px] mx-auto';
function declaresLegacyShell(src) {
  return src.split('\n').some((line) => {
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return false;
    return line.includes(LEGACY_CONTAINER);
  });
}

/**
 * THE SHRINKING BACKLOG — the surfaces still carrying the pre-workspace page
 * shell after this redesign pass.
 *
 * REMOVING AN ENTRY IS THE POINT: migrate the file, delete the line here, and
 * the gate proves the migration. Discovering a new one must be added here
 * explicitly (never silently), which is what stops the debt from spreading.
 */
const LEGACY_SHELL_BACKLOG = [
  'src/components/layout/AdminShell.tsx',
  'src/components/admin/CarrierMonitor.tsx',
  'src/components/admin/ContractsAdminPanel.tsx',
  'src/components/admin/FulfillmentTrack.tsx',
  'src/components/admin/MarketingHub.tsx',
  'src/components/admin/MonitoringDashboard.tsx',
  'src/components/admin/RetailPipeline.tsx',
  'src/components/brand/BrandAdvertising.tsx',
  'src/components/brand/BrandTeamMessages.tsx',
  'src/components/brand/ListingAnalyzer.tsx',
  'src/components/brand/MercentaSocial.tsx',
  'src/components/brand/OnboardingSummary.tsx',
  'src/components/carrier/BakLogistics.tsx',
  'src/components/carrier/CarrierDashboard.tsx',
];

const ALL_SRC = walk('src');
/* ── 1. The legacy page shell is a shrinking backlog ────────────────────── */

const stillLegacy = ALL_SRC.filter((f) => declaresLegacyShell(read(f)));

check(
  'no file outside the declared backlog declares the legacy page shell',
  stillLegacy.every((f) => LEGACY_SHELL_BACKLOG.includes(f)),
  `unexpected: ${stillLegacy.filter((f) => !LEGACY_SHELL_BACKLOG.includes(f)).join(', ')}`
);

const staleBacklog = LEGACY_SHELL_BACKLOG.filter((f) => !stillLegacy.includes(f));
check(
  'the backlog only lists files that still carry the legacy shell (ratchet)',
  staleBacklog.length === 0,
  `migrated but still listed: ${staleBacklog.join(', ')}`
);

check(
  'every backlog entry is a real file',
  LEGACY_SHELL_BACKLOG.every((f) => fs.existsSync(path.join(ROOT, f))),
  LEGACY_SHELL_BACKLOG.filter((f) => !fs.existsSync(path.join(ROOT, f))).join(', ')
);

/* ── 2. ONE dashboard generation ────────────────────────────────────────── */

const DASHBOARD_ADAPTER = 'src/components/shared/dashboard.tsx';
check(
  'the retired dashboard module still exists (import path preserved)',
  fs.existsSync(path.join(ROOT, DASHBOARD_ADAPTER))
);

const adapterSrc = read(DASHBOARD_ADAPTER);
check('the retired dashboard module declares itself deprecated', /DEPRECATED/.test(adapterSrc));
check(
  'the retired dashboard module contains NO second implementation of a metric band',
  !adapterSrc.includes('export function KpiGroup') && !adapterSrc.includes('export function DashboardSection')
);
check(
  'the retired dashboard module adapts AttentionPanel onto the canonical Queue',
  adapterSrc.includes("from '@/components/shared/workspace'") && adapterSrc.includes('<Queue')
);

const DASHBOARD_GENERATION_IMPORTERS = ALL_SRC.filter(
  (f) =>
    f !== DASHBOARD_ADAPTER &&
    !f.startsWith('src/components/design/') &&
    /from '@\/components\/shared\/dashboard'/.test(read(f))
);
check(
  'no operational surface imports the retired dashboard generation',
  DASHBOARD_GENERATION_IMPORTERS.length === 0,
  DASHBOARD_GENERATION_IMPORTERS.join(', ')
);

/* ── 3. The canonical frame owns surface identity ───────────────────────── */

const WS_SRC = read('src/components/shared/workspace.tsx');
check(
  'WorkspaceFrame declares a testId seam',
  /testId,/.test(WS_SRC) && WS_SRC.includes('data-testid={testId}')
);
check(
  'WorkspaceFrame declares a busy/aria-busy seam',
  /busy = false/.test(WS_SRC) && WS_SRC.includes('aria-busy={busy')
);
check(
  'the workspace module still owns the canonical metric band + queue',
  WS_SRC.includes('export function MetricBand') && WS_SRC.includes('export function Queue')
);

/* ── 4. The migrated surfaces compose the canonical primitives ──────────── */

/**
 * Surfaces migrated in this redesign pass. Contract per surface: it composes
 * the canonical frame, the canonical header, and at least one REAL body
 * primitive (a workspace section, a metric band, a queue or a data table).
 */
const MIGRATED_SURFACES = [
  'src/components/brand/BrandDashboard.tsx',
  'src/components/brand/BrandReports.tsx',
  'src/components/brand/SalesAnalytics.tsx',
  'src/components/brand/ComplianceHub.tsx',
  'src/components/brand/BrandReturns.tsx',
  'src/components/brand/ProductCatalog.tsx',
  'src/components/brand/BrandSettings.tsx',
  'src/components/admin/HelpdeskDashboard.tsx',
];

for (const f of MIGRATED_SURFACES) {
  const src = read(f);
  check(`${f} composes the workspace frame`, src.includes('<WorkspaceFrame'));
  check(`${f} composes the workspace header`, src.includes('<WorkspaceHeader'));
  check(
    `${f} renders a real workspace body primitive`,
    /<(WorkspaceSection|MetricBand|Queue|DataTable|WorkspaceGrid|Card)\b/.test(src)
  );
  check(`${f} no longer declares the legacy page shell`, !declaresLegacyShell(src));
}

/* ── 5. The retired page-header generation has no operational consumer ──── */

const PAGE_HEADER_CONSUMERS = ALL_SRC.filter(
  (f) =>
    f !== 'src/components/ui.tsx' &&
    !f.startsWith('src/components/design/') &&
    /<PageHeader\b/.test(read(f))
);
check(
  'no operational surface renders the retired PageHeader',
  PAGE_HEADER_CONSUMERS.length === 0,
  PAGE_HEADER_CONSUMERS.join(', ')
);

/* ── 6. The migrated brand dashboard keeps its browser contracts ────────── */

const BRAND_DASH = read('src/components/brand/BrandDashboard.tsx');
for (const contract of [
  'brand-dashboard-loaded',
  'brand-dashboard-loading',
  'po-summary',
  'compliance-summary',
  'kpi-value-',
]) {
  check(`brand dashboard keeps the "${contract}" contract`, BRAND_DASH.includes(contract));
}
check(
  'brand dashboard keeps every pinned attention row id',
  BRAND_DASH.includes('`attention-${it.id}`')
);

console.log(`\nWORKSPACE SHELL: ${pass} PASS / ${fail} FAIL`);
console.log(`Legacy page-shell backlog: ${LEGACY_SHELL_BACKLOG.length} file(s) remaining`);
if (fail > 0) {
  console.log(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}