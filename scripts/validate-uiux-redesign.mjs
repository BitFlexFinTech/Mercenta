/**
 * §UI/UX Wave 2 — MERCENTA REDESIGN CONTRACT VALIDATOR.
 *
 * Locks the redesigned UI/UX architecture so it cannot silently drift back into
 * "an old dashboard with a new palette":
 *
 *  1. SATURATED PALETTE — all six themes declare the eight canonical palette
 *     hues + an on-palette text colour, and the palette is SATURATED (not a
 *     washed-out pastel set).
 *  2. ONE MOTION + DENSITY LANGUAGE — motion/density tokens are declared
 *     IDENTICALLY in every theme.
 *  3. BRASS IS NOT THE DOMINANT INTERACTIVE COLOUR — the primary homepage CTAs
 *     and the app's active-navigation treatment no longer use the brass ramp.
 *  4. WORKSPACE ARCHITECTURE — the Operations Overview composes the workspace
 *     primitives (frame/header/metrics/pipeline/queue/context) rather than
 *     stacked cards, and every primitive is exported and used.
 *  5. CHARTS — the canonical chart system is animated, thin-stroked, and the
 *     legacy recharts surfaces consume the canonical tokens.
 *  6. COLOUR SSOT — no component hardcodes a palette hex.
 *  7. HOMEPAGE — redesigned from the content model, TAM/SAM removed, no
 *     Amazon-specific customer-facing framing, tracker animation preserved.
 *  8. FINDABILITY — the command palette exists, is mounted by the shell, and is
 *     built from the shell's own RBAC-scoped navigation.
 *  9. NAVIGATION — badges, pinning and the compact rail exist; the single
 *     nav-tree + aria-current contracts are preserved.
 * 10. REDUCED MOTION — every new animation is disabled under
 *     prefers-reduced-motion.
 *
 * Run: node scripts/validate-uiux-redesign.mjs
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

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

/* ── 1. Saturated palette in every theme ────────────────────────────────── */

const THEMES_SRC = read('src/config/themes.ts');
const THEME_IDS = ['minimal-light', 'professional', 'bold', 'fun', 'serious', 'current'];
const PALETTE = ['indigo', 'cyan', 'green', 'amber', 'orange', 'pink', 'violet', 'red'];

/** Extract each theme block the same way the foundation validator does. */
const themeBlocks = THEME_IDS.map((id) => {
  const start = THEMES_SRC.indexOf(`    id: '${id}',`);
  const after = THEMES_SRC.slice(start + 12);
  const nextId = after.indexOf("    id: '");
  const end = nextId === -1 ? THEMES_SRC.indexOf('};', start) : start + 12 + nextId;
  return { id, body: THEMES_SRC.slice(start, end) };
});

check('six theme blocks parsed', themeBlocks.length === 6, `got ${themeBlocks.length}`);

for (const { id, body } of themeBlocks) {
  for (const hue of PALETTE) {
    check(`theme ${id} declares --mr-palette-${hue}`, body.includes(`'--mr-palette-${hue}'`));
  }
  check(`theme ${id} declares --mr-on-palette`, body.includes("'--mr-on-palette'"));
}

/** Saturation check: HSL saturation of each palette hue must be >= 55%. */
function hslSaturation(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return (l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100;
}

let paletteSamples = 0;
for (const { id, body } of themeBlocks) {
  for (const hue of PALETTE) {
    const m = body.match(new RegExp(`'--mr-palette-${hue}': '(#[0-9A-Fa-f]{6})'`));
    if (!m) continue;
    paletteSamples++;
    const sat = hslSaturation(m[1]);
    check(
      `theme ${id} palette ${hue} is saturated (${m[1]} → ${sat.toFixed(0)}%)`,
      sat >= 55
    );
  }
}
check(
  'palette samples found for every theme+hue',
  paletteSamples === 6 * PALETTE.length,
  `${paletteSamples}`
);

/* ── 2. One motion + density language ───────────────────────────────────── */

const MOTION_VARS = [
  '--mr-motion-fast',
  '--mr-motion-base',
  '--mr-motion-slow',
  '--mr-ease-standard',
  '--mr-ease-emphasized',
  '--mr-density-row',
  '--mr-density-gap',
  '--mr-density-pad',
];
for (const { id, body } of themeBlocks) {
  for (const v of MOTION_VARS) {
    check(`theme ${id} declares ${v}`, body.includes(`'${v}'`));
  }
}
for (const v of MOTION_VARS) {
  const values = themeBlocks.map(({ body }) => {
    const m = body.match(new RegExp(`'${v}': '([^']+)'`));
    return m ? m[1] : null;
  });
  check(
    `motion/density token ${v} is identical across all six themes`,
    values.every((x) => x !== null && x === values[0]),
    JSON.stringify(values)
  );
}


/* ── 3. Brass is identity accent, not the dominant interactive colour ───── */

const HOME_SRC = read('src/components/marketing/Home.tsx');
check(
  'homepage primary CTA is not brass',
  !/className="[^"]*bg-brass-500[^"]*px-6 py-3/.test(HOME_SRC) &&
    !/className="[^"]*bg-brass [^"]*px-6 py-3/.test(HOME_SRC)
);
check('homepage primary CTA uses the saturated palette', HOME_SRC.includes('bg-palette-indigo'));
check(
  'homepage primary CTA pairs the palette fill with on-palette text',
  HOME_SRC.includes('text-on-palette')
);
const SIDEBAR_SRC = read('src/components/layout/Sidebar.tsx');
check(
  'navigation active state is palette-driven, not brass',
  SIDEBAR_SRC.includes('DOMAIN_COLOURS') && !SIDEBAR_SRC.includes('bg-brass')
);

/* ── 4. Workspace architecture ──────────────────────────────────────────── */

for (const f of [
  'src/components/shared/workspace.tsx',
  'src/components/shared/CommandPalette.tsx',
  'src/components/shared/charts/rechartsTokens.ts',
  'src/lib/nav/navBadges.ts',
]) {
  check(`seam exists: ${f}`, exists(f));
}

const WS_SRC = read('src/components/shared/workspace.tsx');
for (const exportName of [
  'WorkspaceFrame',
  'WorkspaceHeader',
  'WorkspaceGrid',
  'WorkspaceSection',
  'MetricBand',
  'MetricTile',
  'PipelineTrack',
  'Queue',
  'ContextPanel',
  'ActivityFeed',
  'RecordDrawer',
  'RecordFieldList',
  'SegmentedControl',
  'DomainChip',
  'SeverityMarker',
]) {
  check(
    `workspace primitive exported: ${exportName}`,
    WS_SRC.includes(`export function ${exportName}`)
  );
}

const OVERVIEW_SRC = read('src/components/admin/AdminDashboard.tsx');
for (const use of [
  'WorkspaceFrame',
  'WorkspaceHeader',
  'WorkspaceGrid',
  'WorkspaceSection',
  'MetricBand',
  'PipelineTrack',
  'Queue',
  'ContextPanel',
  'ActivityFeed',
  'SegmentedControl',
]) {
  check(`Operations Overview composes ${use}`, OVERVIEW_SRC.includes(`<${use}`));
}
check(
  'Operations Overview no longer uses the stacked-card dashboard sections',
  !OVERVIEW_SRC.includes('<DashboardSection') && !OVERVIEW_SRC.includes('<KpiGroup')
);
check(
  'Operations Overview keeps the loaded/loading/error test contracts',
  OVERVIEW_SRC.includes('data-testid="dashboard-loaded"') &&
    OVERVIEW_SRC.includes('data-testid="dashboard-loading"') &&
    OVERVIEW_SRC.includes('data-testid="dashboard-error"')
);
check(
  'Operations Overview keeps the attention-row test contract',
  OVERVIEW_SRC.includes('attention-${a.id}')
);
check(
  'Operations Overview keeps the next-action test contract',
  OVERVIEW_SRC.includes('action-${a.id}')
);
check(
  'KPI value/drill-down testids are produced by the shared metric primitive',
  WS_SRC.includes('kpi-value-${data.id}') && WS_SRC.includes('kpi-open-${data.id}')
);
check(
  'Operations Overview exposes real chart series (line + bars + doughnut)',
  OVERVIEW_SRC.includes('<MercentaLineChart') &&
    OVERVIEW_SRC.includes('<MercentaBars') &&
    OVERVIEW_SRC.includes('<MercentaDoughnut')
);
check(
  'Operations Overview offers real density + grouping controls',
  OVERVIEW_SRC.includes('setDensity') && OVERVIEW_SRC.includes('groupAttention')
);


/* ── 5. Charts: animated, thin, one language ────────────────────────────── */

const CHART_SRC = read('src/components/shared/charts/MercentaCharts.tsx');
check('chart draw-in animation wired', CHART_SRC.includes('animate-chart-draw'));
check('chart arc animation wired', CHART_SRC.includes('animate-chart-arc'));
check('chart draw uses pathLength normalisation', CHART_SRC.includes('pathLength={1000}'));
check('chart hover guide implemented', CHART_SRC.includes('data-chart-guide'));
check('chart tooltip implemented', CHART_SRC.includes('data-chart-tooltip'));
check('sparkline primitive present', CHART_SRC.includes('export function MercentaSparkline'));
check('bars primitive present', CHART_SRC.includes('export function MercentaBars'));
check(
  'chart strokes remain delicate (never 2px or thicker)',
  !/strokeWidth=\{[2-9]/.test(CHART_SRC) && !/strokeWidth="[2-9]/.test(CHART_SRC)
);

const REC_SRC = read('src/components/shared/charts/rechartsTokens.ts');
check('recharts tokens export a hook', REC_SRC.includes('export function useRechartsTokens'));

for (const legacy of [
  'src/components/brand/BrandReports.tsx',
  'src/components/brand/SalesAnalytics.tsx',
  'src/components/admin/FulfillmentTrack.tsx',
]) {
  check(`legacy chart surface exists: ${legacy}`, exists(legacy));
}

check(
  'SalesAnalytics consumes the canonical chart tokens',
  read('src/components/brand/SalesAnalytics.tsx').includes('useRechartsTokens')
);
check(
  'FulfillmentTrack consumes the canonical chart tokens',
  read('src/components/admin/FulfillmentTrack.tsx').includes('useRechartsTokens')
);

/* ── 6. Colour single source of truth ───────────────────────────────────── */

const PALETTE_HEXES = [
  '#6366F1', '#06B6D4', '#22C55E', '#FBBF24', '#F97316', '#EC4899', '#8B5CF6', '#EF4444',
  '#4F46E5', '#0E7490', '#047857', '#B45309', '#C2410C', '#BE185D', '#6D28D9', '#B91C1C',
];
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(f)) out.push(p);
  }
  return out;
}
const srcFiles = walk(path.join(ROOT, 'src'));
const hexOffenders = [];
for (const f of srcFiles) {
  if (f.endsWith(path.join('config', 'themes.ts'))) continue;
  const text = fs.readFileSync(f, 'utf8');
  for (const hex of PALETTE_HEXES) {
    if (new RegExp(`${hex}\\b`, 'i').test(text)) {
      hexOffenders.push(`${path.relative(ROOT, f)}:${hex}`);
    }
  }
}
check(
  'no component hardcodes a palette hex (domains resolve via themes.ts)',
  hexOffenders.length === 0,
  hexOffenders.slice(0, 6).join(', ')
);


/* ── 7. Homepage ────────────────────────────────────────────────────────── */

const HOME_CONTENT = read('src/config/homepageContent.ts');
/** Strip comments so doc-comment prose can never satisfy/fail a copy check. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}
const HOME_CONTENT_COPY = stripComments(HOME_CONTENT);
const HOME_SRC_COPY = stripComments(HOME_SRC);
check('homepage content model declares visibility section', HOME_CONTENT.includes('visibility: {'));
check('homepage content model declares protection section', HOME_CONTENT.includes('protection: {'));
check(
  'homepage renders the new visibility + protection sections',
  HOME_SRC.includes('c.visibility.heading') && HOME_SRC.includes('c.protection.heading')
);
check('TAM/SAM section removed from the homepage', !HOME_SRC.includes('TamSamAggregate'));
check(
  'no market-size content in the homepage copy model',
  !/\bTAM\b|\bSAM\b|market size/i.test(HOME_CONTENT_COPY)
);
check('no Amazon framing on the homepage component', !/amazon/i.test(HOME_SRC_COPY));
check('no Amazon framing in the homepage copy model', !/amazon/i.test(HOME_CONTENT_COPY));
check(
  'no guaranteed-outcome claims in the homepage copy model',
  !/guarantee/i.test(HOME_CONTENT_COPY)
);
check('tracker animation preserved (route dot)', HOME_SRC.includes('animate-route-dot'));
check('tracker animation preserved (live ping)', HOME_SRC.includes('animate-tracker-ping'));
check('tracker keyframes preserved in CSS', read('src/index.css').includes('@keyframes route-dot'));
check('UnlockGrowth element preserved', HOME_SRC.includes('<UnlockGrowth'));
check(
  'homepage tracker colours moved into the palette',
  HOME_SRC.includes('var(--mr-palette-cyan)') && HOME_SRC.includes('var(--mr-palette-green)')
);
check(
  'homepage editor wording gate covers the new sections',
  read('src/components/admin/HomepageEditor.tsx').includes('content.visibility.heading') &&
    read('src/components/admin/HomepageEditor.tsx').includes('content.protection.heading')
);

/* ── 8. Findability ─────────────────────────────────────────────────────── */

const SHELL_SRC = read('src/components/layout/AppShell.tsx');
check('shell mounts the command palette', SHELL_SRC.includes('<CommandPalette'));
check('shell binds ⌘K / Ctrl-K', SHELL_SRC.includes("e.key.toLowerCase() === 'k'"));
check(
  'palette destinations are built from the shell navSections (RBAC inherited)',
  SHELL_SRC.includes('navSections.flatMap')
);
const HEADER_SRC = read('src/components/layout/Header.tsx');
check('header exposes the search trigger', HEADER_SRC.includes('app-search-trigger'));
check('header keeps the navigation drawer toggle contract', HEADER_SRC.includes('app-menu-toggle'));

/* ── 9. Navigation: badges, pinning, compact rail, preserved contracts ──── */

check('nav item badge contract added', SIDEBAR_SRC.includes('badge?: number'));
check('nav badge rendered with testid', SIDEBAR_SRC.includes('nav-badge-'));
check(
  'nav pinning implemented',
  SIDEBAR_SRC.includes('togglePin') && SIDEBAR_SRC.includes('nav-pin-')
);
check('nav sections collapsible', SIDEBAR_SRC.includes('toggleSection'));
check('compact rail opt-in implemented', SIDEBAR_SRC.includes('onToggleCompact'));
check('single nav landmark preserved (one <aside>)', (SIDEBAR_SRC.match(/<aside/g) ?? []).length === 1);
check('aria-current per active item preserved', SIDEBAR_SRC.includes('aria-current={active ?'));
check('data-state active/idle preserved', SIDEBAR_SRC.includes("active ? 'active' : 'idle'"));
const BADGES_SRC = read('src/lib/nav/navBadges.ts');
check(
  'brand badge counts are tenant-scoped (assertBrandScope)',
  BADGES_SRC.includes('assertBrandScope(session')
);
check(
  'nav badge counts use the canonical status presentation',
  BADGES_SRC.includes('poStatusPresentation(')
);
check(
  'nav badges are wired into the admin shell',
  read('src/components/layout/AdminShell.tsx').includes('useAdminNavBadges')
);
check(
  'nav badges are wired into the brand shell',
  read('src/components/layout/BrandShell.tsx').includes('useBrandNavBadges')
);

/* ── 10. Reduced motion ─────────────────────────────────────────────────── */

const CSS_SRC = read('src/index.css');
const NEW_ANIMATIONS = [
  'animate-rise',
  'animate-drawer-in',
  'animate-chart-draw',
  'animate-chart-arc',
  'animate-value-change',
  'animate-pipeline-grow',
];
const rmBlock = CSS_SRC.slice(CSS_SRC.indexOf('@media (prefers-reduced-motion: reduce)'));
for (const a of NEW_ANIMATIONS) {
  check(`reduced-motion covers .${a}`, rmBlock.includes(`.${a}`));
}
check(
  'motion keyframes use the canonical tokens',
  CSS_SRC.includes('var(--mr-motion-base') && CSS_SRC.includes('var(--mr-ease-standard')
);

/* ── 11. §UI/UX Wave 2 COMPLETION — record queue + drawer architecture ──── */

/**
 * The remaining record-bearing queues were migrated onto the same workspace
 * architecture, and RecordDrawer (built in Wave 2 but previously wired into NO
 * surface) is now the QUEUE → PREVIEW step over REAL records. These assertions
 * lock that in so a future edit cannot quietly revert a surface to its old
 * stacked-card composition or drop the drawer.
 */
const RECORD_SURFACES = [
  'src/components/admin/AdminPurchaseOrderList.tsx',
  'src/components/admin/ComplianceApprovals.tsx',
  'src/components/admin/ReturnsTrackingDashboard.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',
];
for (const f of RECORD_SURFACES) {
  const src = read(f);
  check(`${f} composes the workspace frame`, src.includes('<WorkspaceFrame'));
  check(`${f} composes a workspace header`, src.includes('<WorkspaceHeader'));
  check(`${f} composes a metric band (interactive metrics)`, src.includes('<MetricBand'));
  check(`${f} renders the shared RecordDrawer`, src.includes('<RecordDrawer'));
  check(`${f} uses RecordFieldList for the record summary`, src.includes('<RecordFieldList'));
  check(
    `${f} still reads its canonical store (no new data source)`,
    /@\/data\/(queries|api|demoStore|demoData)/.test(src)
  );
}
check(
  'the admin PO drawer hands off to the EXISTING full record page',
  read('src/components/admin/AdminPurchaseOrderList.tsx').includes('<AdminPurchaseOrderDetail')
);
check(
  'the compliance drawer hands off to the EXISTING full document preview',
  read('src/components/admin/ComplianceApprovals.tsx').includes('setPreviewId(drawerDoc.id)')
);
check(
  'the returns drawer carries the REAL stage-advance action',
  read('src/components/admin/ReturnsTrackingDashboard.tsx').includes('handleNextStage(selectedTracking.id)')
);
check(
  'the returns forward tracking number is deterministic (no Math.random in code)',
  !/Math\.random\(\)/.test(
    read('src/components/admin/ReturnsTrackingDashboard.tsx')
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n')
  )
);
check(
  'density is a REAL control (row markup carries data-density)',
  read('src/components/admin/AdminPurchaseOrderList.tsx').includes('data-density={density}') &&
    read('src/components/admin/ComplianceApprovals.tsx').includes('data-density={density}')
);
check(
  'the compliance brand card exposes the explicit testid the E2E suite selects',
  read('src/components/admin/ComplianceApprovals.tsx').includes('data-testid="compliance-brand-card"')
);
check(
  'the returns row click is no longer dead state',
  /const \[selectedId, setSelectedId\]/.test(read('src/components/admin/ReturnsTrackingDashboard.tsx')) &&
    read('src/components/admin/ReturnsTrackingDashboard.tsx').includes('selectedTracking')
);

/* ── 12. Persisted homepage content can never render partially ──────────── */

const CONTENT_SRC = read('src/config/homepageContent.ts');
check(
  'the content model exports a single normaliser',
  /export function normaliseHomepageContent\(/.test(CONTENT_SRC)
);
check(
  'the normaliser covers the Wave-2 visibility/protection sections',
  CONTENT_SRC.includes('visibility: {') &&
    CONTENT_SRC.includes('protection: {') &&
    /cards\(visibility\.points/.test(CONTENT_SRC) &&
    /cards\(protection\.points/.test(CONTENT_SRC)
);
check(
  'the persisted payload is normalised at the ONE api seam',
  /live: normaliseHomepageContent\(data\.content\)/.test(read('src/data/api.ts'))
);
check(
  'the homepage editor exposes the visibility/protection form',
  read('src/components/admin/HomepageEditor.tsx').includes('<PointsEditor') &&
    read('src/components/admin/HomepageEditor.tsx').includes("setSectionHeading('visibility'") &&
    read('src/components/admin/HomepageEditor.tsx').includes("setSectionHeading('protection'")
);
check(
  'the homepage editor exposes an explicit revert (cancel/reset) control',
  read('src/components/admin/HomepageEditor.tsx').includes('homepage-editor-revert')
);


/* ── 13. §Sprint — canonical WORK layer + derived CALENDAR ─────────────── */

const WORK_STORE = read('src/lib/work/workStore.ts');
const WORK_CAL = read('src/lib/work/calendar.ts');
const WORK_WS = read('src/components/shared/WorkWorkspace.tsx');

check('the work layer has ONE canonical store', WORK_STORE.includes('export function deriveWorkItems'));
check(
  'work ids are deterministic (no time/random derivation)',
  !/Math\.random\(/.test(WORK_STORE) && !/work-[^\n]*\$\{Date\.now/.test(WORK_STORE)
);
check(
  'work derivation projects real canonical records',
  WORK_STORE.includes("from '@/data/demoStore'") &&
    WORK_STORE.includes('demoPurchaseOrders') &&
    WORK_STORE.includes('demoComplianceDocs')
);
check(
  'the tenant filter lives in ONE place (getWorkItems)',
  /export function getWorkItems\(/.test(WORK_STORE) && WORK_STORE.includes("scope === 'brand'")
);
check(
  'resolution removes the item from the attention set (reminders stop)',
  WORK_STORE.includes('resolvedDerived.set') &&
    WORK_STORE.includes("scoped.filter((r) => r.status !== 'done')")
);
check(
  'every work mutation is audited',
  WORK_STORE.includes('pushAudit(') && WORK_STORE.includes("'work_item_resolved'")
);
check(
  'every work mutation emits a canonical platform event',
  WORK_STORE.includes("type: 'work_item_raised'") && WORK_STORE.includes("type: 'work_item_resolved'")
);
check(
  'the calendar derives from work items (never disconnected state)',
  WORK_CAL.includes('deriveCalendarEntries') && WORK_CAL.includes('getWorkItems(')
);
check(
  'the calendar month grid is a pure function of the month string',
  WORK_CAL.includes('export function buildMonthGrid') && !/Math\.random\(/.test(WORK_CAL)
);
check(
  'the shared work workspace composes the workspace primitives',
  WORK_WS.includes('<WorkspaceFrame') &&
    WORK_WS.includes('<WorkspaceHeader') &&
    WORK_WS.includes('<MetricBand') &&
    WORK_WS.includes('<RecordDrawer') &&
    WORK_WS.includes('<ContextPanel')
);
check(
  'the shared work workspace offers LIST, KANBAN and CALENDAR',
  WORK_WS.includes("'list'") && WORK_WS.includes("'board'") && WORK_WS.includes("'calendar'") &&
    WORK_WS.includes('KanbanBoard') && WORK_WS.includes('CalendarBoard')
);
check(
  'work surfaces hand off to EXISTING destinations (no duplicated record UI)',
  WORK_WS.includes('onNavigate(item.actionView)')
);
check(
  'both scopes are wired into the shells',
  read('src/components/layout/AdminShell.tsx').includes('<AdminWorkManagement') &&
    read('src/components/layout/AdminShell.tsx').includes('<AdminWorkCalendar') &&
    read('src/components/layout/BrandShell.tsx').includes('<BrandWorkManagement') &&
    read('src/components/layout/BrandShell.tsx').includes('<BrandWorkCalendar')
);
check(
  'the brand work surfaces are tenant-scoped from the session',
  read('src/components/brand/WorkManagement.tsx').includes('scope="brand"') &&
    read('src/components/brand/WorkManagement.tsx').includes('tenantId={tenantId}')
);
check(
  'the notification centre consumes the work layer (reminders stop on resolution)',
  read('src/components/shared/NotificationCenter.tsx').includes('useWorkItems(') &&
    read('src/components/shared/NotificationCenter.tsx').includes('WORK_NOTIFY_SOURCES')
);
check(
  'the nav rail counts outstanding work from the canonical store',
  read('src/lib/nav/navBadges.ts').includes('workAttentionCount(') &&
    read('src/lib/nav/navBadges.ts').includes('overdueWorkItems(')
);
check(
  'the work views are RBAC allowlisted for both tiers',
  read('src/lib/auth/rbac.ts').includes("'work', 'calendar'")
);

console.log(`\nUIUX REDESIGN: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.log(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}

