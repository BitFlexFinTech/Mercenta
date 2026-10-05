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
 *  1. THE LEGACY PAGE SHELL IS GONE. `LEGACY_SHELL_BACKLOG` is now EMPTY and no
 *     file in `src/**` may declare the pre-workspace container in code. The
 *     backlog mechanism is retained (not deleted) so a reintroduction must be
 *     explicit and visible in review rather than silent.
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
 * THE SHRINKING BACKLOG — EMPTY, and that is the point.
 *
 * It listed the surfaces still carrying the pre-workspace page shell. All 14
 * have now been migrated onto `WorkspaceFrame` / `WorkspaceHeader`, so the list
 * is empty and the assertion below has flipped from "no new offender" to
 * "**no file anywhere in `src/` may declare the legacy shell at all**".
 *
 * The mechanism is deliberately retained rather than deleted: a future edit that
 * reintroduces `p-6 … max-w-[1400px] mx-auto` as a page container must now
 * either fix the file or add it here explicitly, where the review will see it.
 * Discovery is never silent.
 */
const LEGACY_SHELL_BACKLOG = [];

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

/**
 * §UI/UX REDESIGN (backlog retirement pass) — the 14 files that carried the
 * legacy shell are now on the canonical frame/header. Several are GUARD
 * branches or terminal surfaces rather than full operational pages, so the
 * contract asserted here is the shell contract (frame + header + no legacy
 * container) rather than the full body contract above.
 */
const SHELL_MIGRATED_SURFACES = [
  'src/components/layout/AdminShell.tsx',
  'src/components/admin/ContractsAdminPanel.tsx',
  'src/components/admin/FulfillmentTrack.tsx',
  'src/components/admin/MarketingHub.tsx',
  'src/components/admin/MonitoringDashboard.tsx',
  'src/components/admin/RetailPipeline.tsx',
  'src/components/brand/BrandAdvertising.tsx',
  'src/components/brand/BrandTeamMessages.tsx',
  'src/components/brand/ListingAnalyzer.tsx',
  'src/components/brand/MercentaSocial.tsx',
  /* §P9 (programme decision 4) — REPOINTED: 'src/components/admin/CarrierMonitor.tsx',
     'src/components/carrier/BakLogistics.tsx' and 'src/components/carrier/CarrierDashboard.tsx'
     are REMOVED from SHELL_MIGRATED_SURFACES with the carrier surface. Their absence
     is asserted below. */
  'src/components/brand/OnboardingSummary.tsx',
];

/* §P9 — the removed surfaces must be GONE, not merely unmigrated. */
for (const f of [
  'src/components/admin/CarrierMonitor.tsx',
  'src/components/carrier/BakLogistics.tsx',
  'src/components/carrier/CarrierDashboard.tsx',
  'src/components/layout/CarrierShell.tsx',
]) {
  check(`§P9 removed surface is deleted: ${f}`, !fs.existsSync(path.join(ROOT, f)));
}
const logisticsControlSrc = read('src/components/admin/LogisticsControl.tsx');
check('§P9 the rehomed carrier console composes the canonical frame',
  logisticsControlSrc.includes('<WorkspaceFrame'));
check('§P9 the rehomed carrier console exposes the canonical manifest hooks',
  logisticsControlSrc.includes('dataTable="carrier-manifest"') &&
    logisticsControlSrc.includes('aria-label={`Update milestone for ${s.reference}`}'));
check('§P9 the advance is attributed to the Founder / Super Admin (not a carrier login)',
  logisticsControlSrc.includes("actorId: 'mercenta-admin-logistics'") &&
    !logisticsControlSrc.includes("'carrier-terminal'"));

for (const f of SHELL_MIGRATED_SURFACES) {
  const src = read(f);
  check(`${f} composes the workspace frame`, src.includes('<WorkspaceFrame'));
  check(`${f} composes the workspace header`, src.includes('<WorkspaceHeader'));
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
/**
 * §P2 (2026-09-22) — REPOINTED, not weakened.
 *
 * OLD CONTRACT: `brand dashboard keeps every pinned attention row id`
 * (`BRAND_DASH.includes('`attention-${it.id}`')`) — the brand OVERVIEW had to
 * carry the attention queue.
 *
 * WHY IT MOVED: the Founder's dashboard programme makes the Overview an OBSERVE
 * surface and the brand's Operations group the action centre, with the work layer
 * (`BrandWorkManagement` → `WorkWorkspace`) as the SINGLE action list — the same
 * consolidation the admin Overview received in §Dashboard-cleanup. The new
 * contract is therefore STRONGER in both directions: the brand overview must keep
 * its pinned observe contracts AND the new §P2 observe tiles, must NOT emit a
 * second action list, and the canonical action surface must still exist.
 */
check(
  'brand dashboard no longer emits a second action list (consolidated onto the work layer)',
  !BRAND_DASH.includes('`attention-${it.id}`') &&
    !BRAND_DASH.includes('testId: `action-')
);
check(
  'brand dashboard carries the §P2 observe tiles (earnings, open PO value, outstanding invoices)',
  ['earnings-total', 'open-po-value', 'invoices-outstanding', 'open-deductions', 'returns-recorded'].every(
    (id) => BRAND_DASH.includes(`id: '${id}'`)
  )
);
check(
  'the brand action centre is the canonical work workspace',
  read('src/components/brand/WorkManagement.tsx').includes('WorkWorkspace') &&
    read('src/components/shared/WorkWorkspace.tsx').includes('work-row-${w.id}')
);

console.log(`\nWORKSPACE SHELL: ${pass} PASS / ${fail} FAIL`);
console.log(`Legacy page-shell backlog: ${LEGACY_SHELL_BACKLOG.length} file(s) remaining`);
if (fail > 0) {
  console.log(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}