/**
 * §UI/UX Wave 2 — MERCENTA REDESIGN CONTRACT VALIDATOR.
 *
 * Locks the redesigned UI/UX architecture so it cannot silently drift back into
 * "an old dashboard with a new palette":
 *
 *  1. SATURATED PALETTE — all five themes declare the eight canonical palette
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
/** §BRAND REDESIGN (2026-11-19) — read the brand colours from their ONE owner. */
const BRAND_PALETTE = (() => {
  const from = THEMES_SRC.indexOf('export const BRAND_PALETTE');
  const to = THEMES_SRC.indexOf('} as const', from);
  const block = from === -1 || to === -1 ? '' : THEMES_SRC.slice(from, to);
  const out = {};
  for (const m of block.matchAll(/([A-Za-z]+):\s*'([^']*)'/g)) out[m[1]] = m[2];
  return out;
})();
/* §Phase WAVE-0 — REPOINTED (was the six-theme list including the retired
   legacy `current` theme). Five themes are canonical now. */
/* §BRAND REDESIGN (2026-11-19) — REPOINTED. The owner declares TWO appearances;
   the five OpenShip-mapped themes are retired in full. */
const THEME_IDS = ['brand-dark', 'brand-light'];
const PALETTE = ['indigo', 'cyan', 'green', 'amber', 'orange', 'pink', 'violet', 'red'];

/** Extract each theme block the same way the foundation validator does. */
const themeBlocks = THEME_IDS.map((id) => {
  const start = THEMES_SRC.indexOf(`    id: '${id}',`);
  const after = THEMES_SRC.slice(start + 12);
  const nextId = after.indexOf("    id: '");
  const end = nextId === -1 ? THEMES_SRC.indexOf('};', start) : start + 12 + nextId;
  return { id, body: THEMES_SRC.slice(start, end) };
});

check('the two appearance blocks parsed', themeBlocks.length === 2, `got ${themeBlocks.length}`);

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
    /* §BRAND REDESIGN — a palette value can be an identifier (BRAND_PALETTE.orange),
       so resolve it from its owner instead of only accepting a hex literal. */
    const m = body.match(new RegExp(`'--mr-palette-${hue}': (?:'(#[0-9A-Fa-f]{6})'|BRAND_PALETTE\\.(\\w+))`));
    if (!m) continue;
    const hex = m[1] !== undefined ? m[1] : (BRAND_PALETTE[m[2]] ?? null);
    if (!hex) continue;
    paletteSamples++;
    const sat = hslSaturation(hex);
    /* §BRAND REDESIGN (2026-11-19) — REPOINTED, and STRICTLY STRONGER for `violet`.
       The approved identity FORBIDS purple. The token NAME `violet` is kept only
       because hundreds of call sites reference it; its VALUE is deliberately a
       DESATURATED SLATE (dark #94A3B8, light #475569). So `violet` must now sit UNDER
       the saturation floor — that is the anti-purple contract, and it FAILS if a
       saturated purple is ever put back — while every other hue keeps the floor. */
    if (hue === 'violet') {
      check(
        `theme ${id} palette violet is a DESATURATED slate, not a purple (${hex} → ${sat.toFixed(0)}% saturation)`,
        sat < 55
      );
    } else {
      check(
        `theme ${id} palette ${hue} is saturated (${hex} → ${sat.toFixed(0)}%)`,
        sat >= 55
      );
    }
  }
}
/* §Phase WAVE-0 — REPOINTED: the sample count is derived from the canonical
   THEME_IDS list rather than a hardcoded theme count, so removing the retired
   legacy `current` theme (6 → 5) cannot silently re-break this gate. */
check(
  'palette samples found for every theme+hue',
  paletteSamples === THEME_IDS.length * PALETTE.length,
  `${paletteSamples} expected ${THEME_IDS.length * PALETTE.length}`
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
    `motion/density token ${v} is identical across both appearances`,
    values.every((x) => x !== null && x === values[0]),
    JSON.stringify(values)
  );
}


/* ── 3. Brass is identity accent, not the dominant interactive colour ───── */

const HOME_SRC = read('src/components/marketing/Home.tsx');
/* §BRAND REDESIGN (2026-11-19) — REPOINTED. The homepage is composed from four design
   components plus the preserved tracker, so "the homepage" for these checks is the
   UNION of the shell that wires it and the files it composes. */
/*
 * §BRAND REDESIGN (2026-11-20) — REPOINTED, NOT WEAKENED.
 *
 * `home/sections.tsx` used to hold the nine primitives all four designs shared.
 * It is DELETED: the four designs now compose their own sections, so nothing
 * imported it and it was 278 lines of unreachable code (caught by
 * `validate-dead-code` DC1 the moment it became orphaned).
 *
 * The scan now reads the modules that actually render the homepage — the four
 * designs, the shared CTA owner, and the image component — so it covers MORE
 * surface than before, not less.
 */
const HOMEPAGE_FILES = [
  'src/components/marketing/Home.tsx',
  'src/components/marketing/home/HomeDesigns.tsx',
  'src/components/marketing/home/HeroTracker.tsx',
  'src/components/marketing/home/designShared.tsx',
  'src/components/marketing/home/HomeImage.tsx',
  'src/components/marketing/home/DesignA.tsx',
  'src/components/marketing/home/DesignB.tsx',
  'src/components/marketing/home/DesignC.tsx',
  'src/components/marketing/home/DesignD.tsx',
  /* §BATCH 3 (2026-11-21) — the approved Concept 3 direction is a fifth design
     module; the scan must cover it too, or a regression in E would be invisible. */
  'src/components/marketing/home/DesignE.tsx',
].map(read).join('\n');
check(
  'homepage primary CTA is not brass',
  !/className="[^"]*bg-brass-500[^"]*px-6 py-3/.test(HOME_SRC) &&
    !/className="[^"]*bg-brass [^"]*px-6 py-3/.test(HOME_SRC)
);
/* §BRAND REDESIGN — the CTA is the ONE brand accent action (not a per-card hue). */
check('homepage primary CTA uses the ONE brand accent token', HOMEPAGE_FILES.includes('bg-[var(--mr-accent)]'));
check(
  'homepage primary CTA pairs the accent fill with on-accent text',
  HOMEPAGE_FILES.includes('text-[var(--mr-on-accent)]')
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
]) {
  check(`Operations Overview composes ${use}`, OVERVIEW_SRC.includes(`<${use}`));
}
/**
 * §Dashboard-cleanup (2026-09-22) — REPOINTED to the current canonical source of
 * truth, not weakened. The old contract asserted that the Overview composed
 * `ActivityFeed` and `SegmentedControl`, carried an attention-row test contract
 * (`attention-${a.id}`) and a next-action test contract (`action-${a.id}`), and
 * offered density/grouping controls. Those belonged to the duplicated
 * "Activity" rail panel, "Needs your attention" queue, "Next actions" tiles and
 * their display controls — all REMOVED from the Overview so that each concern has
 * ONE authoritative owner (work layer / Control Centre / Messages).
 *
 * The repointed checks assert the CLEANED contract POSITIVELY, so the duplication
 * cannot silently return: the overview must NOT compose the removed primitives,
 * must NOT emit those test ids, and must NOT reintroduce the display controls.
 */
for (const absent of ['ActivityFeed', 'SegmentedControl']) {
  check(
    `Operations Overview no longer composes ${absent} (removed with the duplicated surfaces)`,
    !OVERVIEW_SRC.includes(`<${absent}`)
  );
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
  'Operations Overview no longer emits an attention-row test contract (owned by the work layer / Control Centre)',
  !OVERVIEW_SRC.includes('attention-${a.id}')
);
check(
  'Operations Overview no longer emits a next-action test contract (owned by the Control Centre / Command Centre)',
  !OVERVIEW_SRC.includes('action-${a.id}')
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
  'Operations Overview carries the business figures from the canonical cost model (revenue / contribution / margin)',
  OVERVIEW_SRC.includes('operatingCostSummary') &&
    OVERVIEW_SRC.includes("id: 'revenue'") &&
    OVERVIEW_SRC.includes("id: 'contribution'") &&
    OVERVIEW_SRC.includes("id: 'margin'")
);
check(
  'Operations Overview no longer offers density/grouping controls (removed with the queue they served)',
  !OVERVIEW_SRC.includes('setDensity') && !OVERVIEW_SRC.includes('groupAttention')
);
/**
 * §discovered-overview-vestigial-toolbar-strip (2026-10-12, option (a)) — the
 * Overview's sticky `toolbar` slot is REMOVED. It held only the inert "⌘K for
 * records and destinations" hint and rendered as an EMPTY control bar; the hint
 * now lives in the header's own facts (`meta`) line. Asserted POSITIVELY, so the
 * empty strip cannot silently return and the shortcut guidance is not lost with it.
 */
check(
  'Operations Overview no longer renders the vestigial sticky toolbar strip (removed 2026-10-12)',
  !OVERVIEW_SRC.includes('toolbar={')
);
check(
  'the ⌘K shortcut hint lives in the Overview header facts line (not a toolbar strip)',
  OVERVIEW_SRC.includes('⌘K for records and destinations')
);
check(
  'the Overview renders Portfolio at a glance before every other section',
  OVERVIEW_SRC.indexOf('title="Portfolio at a glance"') > -1 &&
    OVERVIEW_SRC.indexOf('title="Portfolio at a glance"') < OVERVIEW_SRC.indexOf('title="Order pipeline"')
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
/*
 * §BRAND REDESIGN (2026-11-20) — REPOINTED, AND STRONGER.
 *
 * The old check looked for the literal strings `content.visibility.heading` and
 * `content.protection.heading` inside one concatenated blob of homepage source.
 * That tested a SYNTAX, not a behaviour: a design could render both sections
 * through a helper (which they do — `[content.visibility, content.protection]`)
 * and still fail, while a design that merely mentioned the property in a comment
 * would pass.
 *
 * The real contract is that EVERY design renders BOTH sections from the content
 * model. This now asserts that per design, so a redesign of one direction cannot
 * quietly drop either block.
 */
for (const design of ['DesignA', 'DesignB', 'DesignC', 'DesignD']) {
  const src = stripComments(read(`src/components/marketing/home/${design}.tsx`));
  check(`${design} renders the visibility section from the content model`,
    src.includes('content.visibility'));
  check(`${design} renders the protection section from the content model`,
    src.includes('content.protection'));
}
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
check('tracker animation preserved (route dot)', HOMEPAGE_FILES.includes('animate-route-dot'));
check('tracker animation preserved (live ping)', HOMEPAGE_FILES.includes('animate-tracker-ping'));
check('tracker keyframes preserved in CSS', read('src/index.css').includes('@keyframes route-dot'));
/* §BRAND REDESIGN — the retired UnlockGrowth band is superseded by the shared
   journey/services/proof sections, so this is now an ABSENCE guard: the retired
   element must not survive as a dead import on the homepage. */
check(
  'the retired UnlockGrowth band is GONE from the homepage',
  !HOME_SRC.includes('UnlockGrowth')
);
/**
 * §REPOINTED (2026-10-13, rules 07/09 — NOT weakened; strictly stronger).
 *
 * OLD CONTRACT: this required the homepage to contain BOTH
 * `var(--mr-palette-cyan)` and `var(--mr-palette-green)`. It was written when the
 * page handed a different saturated hue to each card, and the cyan half was
 * satisfied INCIDENTALLY — by the services/visibility hue arrays, not by the
 * tracker the check names.
 *
 * The owner asked for the opposite: the homepage should read as a premium
 * business, not "a bunch of colors". The decorative domain hues are gone from the
 * marketing page (they mean logistics/compliance/finance/insight only INSIDE the
 * product, where they label real records; on a public page they were decoration).
 *
 * The new contract keeps the half that was real and makes it STRICTER: the
 * homepage keeps the tracker's own two tokens (the green status dot and the orange
 * moving waypoint — the animation the owner asked to preserve), and is now
 * FORBIDDEN the decorative ones.
 */
/* §BRAND REDESIGN — the tracker is drawn from its OWN owned tokens
   (`--mr-tracker-route`) plus the ONE brand accent, so it cannot drift from the
   approved identity. */
check(
  'the homepage tracker is drawn from its own owned tokens and the ONE brand accent',
  HOMEPAGE_FILES.includes('var(--mr-tracker-route)') && HOMEPAGE_FILES.includes('var(--mr-accent)')
);
check(
  'the marketing page hands out NO decorative domain hue (ABSENCE guard: cyan · amber · violet · pink)',
  !HOMEPAGE_FILES.includes('var(--mr-palette-cyan)') &&
    !HOMEPAGE_FILES.includes('var(--mr-palette-amber)') &&
    !HOMEPAGE_FILES.includes('var(--mr-palette-violet)') &&
    !HOMEPAGE_FILES.includes('var(--mr-palette-pink)')
);
/* §BRAND REDESIGN — the marketing page hands out NO decorative domain hue, so the
   only permitted palette use is the tracker's own semantic pair. */
check(
  'the marketing page hands out NO decorative palette hue (the tracker pair is the only permitted use)',
  (HOMEPAGE_FILES.match(/var\(--mr-palette-/g) || []).length <=
    (HOMEPAGE_FILES.match(/var\(--mr-palette-(green|orange|red)\)/g) || []).length
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
/*
 * §OPENSHIP BATCH 5 (2026-10-15) — REPOINTED, not weakened. This assertion counted
 * `<aside` in the RAW source, so a COMMENT that merely mentions the element broke it:
 * BATCH 5's rail records the landmark fix in a comment beside the element, and the
 * assertion then read 2 asides while the file still renders exactly one. The project's
 * own convention for such guards (`scripts/validate-shared-surfaces.mjs`) is to assert
 * against CODE, not prose, so the count is taken from the comment-stripped source — the
 * contract is unchanged (exactly one element), and the a11y contract is now checked too.
 */
const SIDEBAR_CODE_COPY = stripComments(SIDEBAR_SRC);
check(
  'single nav landmark preserved (one `<aside>` element in code, not counting prose)',
  (SIDEBAR_CODE_COPY.match(/<aside\b/g) ?? []).length === 1,
  `found ${(SIDEBAR_CODE_COPY.match(/<aside\b/g) ?? []).length}`
);
check(
  'exactly ONE "Primary" landmark label is rendered (the `<nav>`; a duplicate name is ambiguous)',
  (SIDEBAR_CODE_COPY.match(/aria-label="Primary"/g) ?? []).length === 1,
  `found ${(SIDEBAR_CODE_COPY.match(/aria-label="Primary"/g) ?? []).length}`
);
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
/**
 * §SSOT S2 (2026-09-26) — REPOINTED, NOT WEAKENED. OLD CONTRACT (recorded):
 *
 *   WORK_STORE.includes('resolvedDerived.set') &&
 *     /authorised\.filter\(\(r\) => r\.status !== 'done'\)/.test(WORK_STORE)
 *
 * That asserted the work layer held its OWN resolution for derived work — which is
 * precisely the defect S2 removes (a ticked task hiding record-qualified work). The
 * invariant is now asserted against the CURRENT canonical owner: derived items are
 * never `done`, the resolution map does not exist, and the attention filter is
 * unchanged. The check is STRONGER (three conditions, plus the refusal guard), and
 * it judges CODE rather than comments.
 */
const WORK_STORE_CODE = WORK_STORE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
check(
  'the attention set is closed by the RECORD, never by a resolved derived task',
  !WORK_STORE_CODE.includes('resolvedDerived') &&
    !WORK_STORE_CODE.includes('derivedStatus') &&
    WORK_STORE_CODE.includes("status: annotation?.status ?? 'open'") &&
    WORK_STORE_CODE.includes('DERIVED_RESOLUTION_REFUSED') &&
    /authorised\.filter\(\(r\) => r\.status !== 'done'\)/.test(WORK_STORE)
);
check(
  'the work list fails closed on Super-Admin-only items',
  /opts\?\.superAdmin \? scoped : scoped\.filter\(\(r\) => r\.superAdminOnly !== true\)/.test(WORK_STORE)
);
/**
 * §SSOT S4 (2026-09-27) — HONEST LABELLING. Every row on the work surface is
 * projected from a SEEDED operational record, so the surface must say the state is
 * simulated. The sentence is declared ONCE (`src/config/demo.ts`); the component
 * imports it, so the wording cannot drift between surfaces.
 */
check(
  'the work surface labels simulated operational state instead of presenting it as live',
  WORK_WS.includes('DEMO_OPERATIONAL_STATE_LABEL') &&
    WORK_WS.includes('work-operational-state-label') &&
    read('src/config/demo.ts').includes('export const DEMO_OPERATIONAL_STATE_LABEL') &&
    !/['"]Simulated operational state/.test(WORK_WS)
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
  /**
   * §SSOT S5 — REPOINTED. The old contract asserted `workAttentionCount(` and
   * `overdueWorkItems(` in `navBadges.ts`. Both were removed as independent
   * counting paths: the badge numbers and their declared labels now come from the
   * ONE owner (`workCounts` / `WORK_COUNT_SETS`), so the old literals no longer
   * exist by design. The assertion is re-pointed to the current canonical source,
   * not weakened — the rail must still count from the canonical store.
   */
  read('src/lib/nav/navBadges.ts').includes('workCounts(') &&
    read('src/lib/nav/navBadges.ts').includes('NAV_BADGE_LABELS')
);
check(
  'the work views are RBAC allowlisted for both tiers',
  read('src/lib/auth/rbac.ts').includes("'work', 'calendar'")
);

/* ── §Sprint 2 — the remaining core surfaces are now workspaces ─────────────
 *
 * The `uiux-wave2-core-surfaces-remaining` row is only completable if every one
 * of those surfaces actually COMPOSES the shared workspace architecture rather
 * than keeping its own page composition. These assertions pin that, so the row
 * cannot drift back to "an old page with a new palette".
 */
const SPRINT2_SURFACES = [
  ['admin Brand Intelligence', 'src/components/admin/BrandIntelligencePanel.tsx'],
  ['brand Market Intelligence', 'src/components/brand/BrandIntelligence.tsx'],
  ['Ad Spend', 'src/components/admin/AmazonAdsDashboard.tsx'],
  ['Accounting', 'src/components/admin/AccountingPanel.tsx'],
  ['Super Admin', 'src/components/admin/SuperAdminPanel.tsx'],
  ['Integrations', 'src/components/admin/integrations/IntegrationsPanel.tsx'],
  ['Onboarding Tours', 'src/components/admin/UsertourAdminPanel.tsx'],
  ['admin CRM', 'src/components/admin/BrandCRM.tsx'],
  ['admin Catalogue', 'src/components/admin/CatalogManagerAdmin.tsx'],
  ['admin Logistics', 'src/components/admin/LogisticsControl.tsx'],
  ['admin Communications', 'src/components/admin/MessagesHub.tsx'],
];
for (const [label, file] of SPRINT2_SURFACES) {
  const src = read(file);
  check(
    `${label} composes the workspace frame`,
    src.includes('WorkspaceFrame') && src.includes('WorkspaceHeader')
  );
  check(
    `${label} has a real metric band (no static KPI tiles)`,
    src.includes('MetricBand') && src.includes('onOpen:')
  );
  check(
    `${label} has no leftover bespoke page composition`,
    !src.includes('max-w-[1400px] mx-auto')
  );
}

check(
  'every migrated surface carries a real context panel or workspace section',
  SPRINT2_SURFACES.every(([, file]) => {
    const src = read(file);
    return src.includes('ContextPanel') || src.includes('WorkspaceSection');
  })
);
check(
  'the surfaces that consume the operating layer reference the canonical work store',
  ['src/components/admin/LogisticsControl.tsx', 'src/components/admin/AccountingPanel.tsx',
   'src/components/admin/MessagesHub.tsx', 'src/components/admin/SuperAdminPanel.tsx']
    .every((f) => read(f).includes("useWorkItems(") || read(f).includes("from '@/lib/work/"))
);
check(
  'the proactive reminder runner exists and is explicitly invoked (never a timer)',
  read('src/lib/work/reminderRunner.ts').includes('export function runReminderSweep(') &&
    !/setInterval\s*\(/.test(read('src/lib/work/reminderRunner.ts'))
);
check(
  'the work workspace exposes the reminder runner to the operator',
  read('src/components/shared/WorkWorkspace.tsx').includes('runReminderSweep(') &&
    read('src/components/shared/WorkWorkspace.tsx').includes('work-run-reminders')
);
check(
  'both new derivation paths are declared and derived',
  read('src/lib/work/workStore.ts').includes("make('invoice_due'") &&
    read('src/lib/work/workStore.ts').includes("make('onboarding_step'")
);

/* ── §Founder OS — the Control Centre composes the workspace architecture ────
 *
 * The Founder Operating System's first surface must be a real operating
 * workspace, not a collection of generic cards: frame + header + sticky toolbar,
 * a metric band whose tiles all drill down, a pipeline, a queue, the shared
 * record drawer and a context rail. These assertions pin that so a future edit
 * cannot quietly revert it to a card stack.
 */
const CC_SRC = read('src/components/admin/FounderControlCentre.tsx');
check('Control Centre composes the workspace frame', CC_SRC.includes('WorkspaceFrame') && CC_SRC.includes('WorkspaceHeader'));
check('Control Centre has a sticky workspace toolbar', CC_SRC.includes('data-workspace-toolbar="true"'));
check('Control Centre has a real metric band with drill-downs', CC_SRC.includes('MetricBand') && CC_SRC.includes('onOpen:'));
check('Control Centre uses the canonical pipeline track', CC_SRC.includes('PipelineTrack'));
check('Control Centre uses the canonical queue', CC_SRC.includes('<Queue'));
check('Control Centre uses the shared record drawer', CC_SRC.includes('RecordDrawer'));
check('Control Centre carries a context rail', CC_SRC.includes('ContextPanel'));
check('Control Centre has no leftover bespoke page composition', !CC_SRC.includes('max-w-[1400px] mx-auto'));
check(
  'Control Centre surfaces the declared automation scheduler seam',
  CC_SRC.includes('automation-scheduler') && read('src/lib/automation/registry.ts').includes('describeAutomationScheduler')
);
check(
  'the automation registry never uses a timer as its source of truth',
  !/setInterval\s*\(|setTimeout\s*\(/.test(
    read('src/lib/automation/registry.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  )
);
check(
  'the Founder Ops AI layer is optional and labelled',
  read('src/lib/ai/founderAiClient.ts').includes('DeterministicFounderAiClient') &&
    read('src/lib/ai/founderAiClient.ts').includes('paidFallbackAllowed: false')
);
check(
  'the Control Centre is Super-Admin guarded in the shell',
  read('src/components/layout/AdminShell.tsx').includes("adminView === 'control_centre' && (isSuper ?")
);
check(
  'the Control Centre nav entry is hidden from non-Super-Admin tiers',
  /HIDDEN_FOR_NON_SUPER = new Set\(\[[\s\S]*?'control_centre'/.test(read('src/components/layout/AdminShell.tsx'))
);

/* ── §Phase 1 — Explore UK Market Fit composes the existing design language ──
 *
 * The pre-audit surface must reuse the EXISTING public visual language, not
 * introduce a second one: the same ink surfaces, the same saturated palette
 * tokens, the same public nav/footer, and the same primary-CTA treatment as the
 * homepage. These assertions pin that so a future edit cannot quietly fork the
 * design system.
 */
const UKMF_SRC = read('src/components/marketing/ExploreUkMarketFit.tsx');
const UKMF_NAV = read('src/components/marketing/PublicNav.tsx');
const UKMF_CFG = read('src/config/ukMarketFit.ts');
check('the pre-audit surface reuses the public nav', UKMF_SRC.includes('<PublicNav'));
check('the pre-audit surface reuses the public footer', UKMF_SRC.includes('<PublicFooter'));
check(
  'the pre-audit surface uses the canonical ink surfaces',
  /* §REPOINTED §BATCH 7 (2026-11-21) — `bg-ink-900`/`bg-ink-850` became
     `bg-surface`/`bg-surface-raised`. Same subject (the surface takes a THEME surface
     role rather than a literal); the canonical names are now the expected ones. The
     negative lookahead keeps each exact, so a different STEP would not satisfy it. */
  /bg-surface(?!-)/.test(UKMF_SRC) && UKMF_SRC.includes('bg-surface-raised')
);
check('the pre-audit surface uses the display font for headings', UKMF_SRC.includes('font-display'));
/*
 * §UI/UX Wave 3 — REPOINTED.
 * OLD CONTRACT: `font-mono text-[10px] uppercase tracking-[0.2em]`.
 * The arbitrary 10px size was migrated to the canonical operational type token
 * `text-ds-micro` (11px, the readable floor) by
 * scripts/migrate-micro-typography.mjs. The INTENT of this assertion — the
 * pre-audit surface uses the mono eyebrow treatment — is unchanged; only the
 * size token it names moved to the current canonical source of truth
 * (tailwind.config.js → theme.extend.fontSize).
 */
check('the pre-audit surface uses the mono eyebrow treatment', UKMF_SRC.includes('font-mono text-ds-micro uppercase tracking-[0.2em]'));
check(
  'the pre-audit primary CTA uses the saturated palette, not brass',
  UKMF_SRC.includes('bg-palette-indigo') && UKMF_SRC.includes('text-on-palette')
);
check('the pre-audit surface contains no bespoke hex colour', !/#[0-9a-fA-F]{6}\b/.test(UKMF_SRC));
check(
  'the pre-audit indicator accents come from the shared palette tokens',
  UKMF_SRC.includes('var(--mr-palette-green)') &&
    UKMF_SRC.includes('var(--mr-palette-cyan)') &&
    UKMF_SRC.includes('var(--mr-palette-red)') &&
    UKMF_SRC.includes('var(--mr-palette-orange)')
);
check('the pre-audit surface is responsive (single column below md)', UKMF_SRC.includes('grid-cols-1 md:grid-cols-2'));
check('the pre-audit surface has no leftover bespoke page container', !UKMF_SRC.includes('max-w-[1400px] mx-auto'));

/* ── §PUBLIC MESSAGING B6 (2026-09-29) — THE PRE-AUDIT TAKES THE SHELL THEME ──
 *
 * WHY THIS EXISTS. The pre-audit was the LAST public surface that hardcoded the
 * dark palette: its root was `bg-ink text-parchment` with no `data-shell-theme`,
 * so the light-shell remap layer never activated inside the page. That is not
 * cosmetic — measured on the rendered page, `main` had NO enclosing
 * `[data-shell-theme]` element at all (the only one on the page belonged to the
 * cookie notice), TWO secondary buttons rendered LITERAL `text-white` (invisible
 * on a light surface), and every hairline stayed white-alpha.
 *
 * The assertion is made on the COMMENT-STRIPPED source, so a comment mentioning
 * `text-white` cannot satisfy or break it.
 */
const UKMF_CODE = stripComments(UKMF_SRC);
check(
  'the pre-audit surface takes the SHELL THEME (not the fixed dark palette)',
  UKMF_CODE.includes('data-shell-theme={shellMode}') &&
    UKMF_CODE.includes("backgroundColor: 'var(--mr-bg)'") &&
    UKMF_CODE.includes('useTheme')
);
check('the pre-audit surface renders no literal white text', !/\btext-white\b/.test(UKMF_CODE));
check(
  'the pre-audit surface opens with the canonical public eyebrow',
  /* §REPOINTED §BATCH 7 (2026-11-21) — `text-brass` became `text-accent`. Same subject
     (the eyebrow's canonical type + colour step); only the canonical accent class name
     moved. */
  UKMF_CODE.includes('{PUBLIC_CATEGORY}') &&
    UKMF_CODE.includes('font-mono uppercase text-ds-micro tracking-[0.06em] text-accent sm:text-ds-label sm:tracking-[0.25em]')
);
check(
  'the pre-audit surface renders the PUBLIC research reason, never the operator string',
  UKMF_CODE.includes('status.publicReason') && !UKMF_CODE.includes('status.reason')
);
check(
  /**
   * §PUBLIC MESSAGING B4 (2026-09-29) — REPOINTED, not weakened.
   *
   * OLD CONTRACT: the header consumed `EXPLORE_UK_MARKET_FIT_CTA` directly, so
   * the label's ONE owner was proven by finding that import in `PublicNav.tsx`.
   *
   * NEW CONTRACT: the label is still declared exactly ONCE
   * (`src/config/ukMarketFit.ts`), but the header now consumes it THROUGH the
   * navigation owner (`src/config/positioning.ts` §12), so the header and the
   * footer cannot name the same route differently. The INTENT is identical — one
   * declaration, consumed by the surfaces — and it is now asserted at both hops,
   * so a second copy of the label in either file still fails this check.
   */
  'the pre-audit CTA label is declared ONCE and consumed by the nav and the hero',
  UKMF_CFG.includes("EXPLORE_UK_MARKET_FIT_CTA = 'Explore UK Market Fit'") &&
    read('src/config/positioning.ts').includes('EXPLORE_UK_MARKET_FIT_CTA') &&
    UKMF_NAV.includes('PUBLIC_NAV') &&
    read('src/components/marketing/Home.tsx').includes('c.hero.primaryCta')
);
check(
  'Partner Login is a header utility action with its own declared test id',
  UKMF_NAV.includes('data-testid={PRE_AUDIT_TESTIDS.headerUtility}') &&
    UKMF_CFG.includes('PUBLIC_HEADER_UTILITY_ACTION')
);

/* ── §WAVE 3 PART 3.1 (§BATCH 6, 2026-10-10) — THE CATALOGUE PRODUCT IMAGE ──
 *
 * WHY THIS EXISTS. The owner enlarged the catalogue thumbnail 32px → 64px. The
 * image itself already scaled (its width/height come from `size`), but the
 * PLACEHOLDER branch did not: its glyph size (`text-lg`, a fixed 18px) and its
 * neutral icon (`h-5 w-5`, a fixed 20px) were both HARD-CODED, so a 64px tile
 * would have painted a 20px icon adrift in the middle of a 64px box.
 *
 * The contract asserted here has three parts, all on the COMMENT-STRIPPED source
 * so a comment naming the old classes can neither satisfy nor break it:
 *   1. the catalogue still renders through the ONE owner (no bespoke `<img>`);
 *   2. the catalogue's size really is the enlarged 64px;
 *   3. the placeholder derives BOTH sizes from `size`, and those ratios still
 *      reproduce the previously shipped 32px sizes EXACTLY (18px / 20px), so the
 *      surfaces that were not asked to change do not move.
 *
 * MUTATION PROOF (both ways, restored byte-identical afterwards): restoring
 * `text-lg` + `h-5 w-5` fails checks 3a/3b; reverting the catalogue to
 * `size={32}` fails check 2; changing the glyph ratio so 32px no longer yields
 * 18px fails check 3c.
 */
const THUMB_CODE = stripComments(read('src/components/shared/ProductThumb.tsx'));
const CATALOG_CODE = stripComments(read('src/components/brand/ProductCatalog.tsx'));
check(
  'the catalogue renders its product image through the ONE owner (no bespoke <img>)',
  /<ProductThumb\b/.test(CATALOG_CODE) && !/<img\b/.test(CATALOG_CODE)
);
check(
  'the catalogue thumbnail is rendered at the enlarged 64px size',
  /<ProductThumb\b[^>]*\bsize=\{64\}/.test(CATALOG_CODE)
);
check(
  'the placeholder GLYPH scales with the size (no hard-coded text-lg)',
  /fontSize:\s*glyphPx/.test(THUMB_CODE) && !/\btext-lg\b/.test(THUMB_CODE)
);
check(
  'the placeholder ICON scales with the size (no hard-coded h-5 w-5)',
  /<Package\b[^>]*style=\{\{\s*width:\s*iconPx/.test(THUMB_CODE) && !/\bh-5\b/.test(THUMB_CODE)
);
const GLYPH_RATIO = Number(
  (THUMB_CODE.match(/glyphPx\s*=\s*Math\.round\(size\s*\*\s*([0-9.]+)\)/) ?? [])[1]
);
const ICON_RATIO = Number(
  (THUMB_CODE.match(/iconPx\s*=\s*Math\.round\(size\s*\*\s*([0-9.]+)\)/) ?? [])[1]
);
check(
  'the placeholder ratios reproduce the previously shipped 32px sizes exactly',
  Math.round(32 * GLYPH_RATIO) === 18 && Math.round(32 * ICON_RATIO) === 20,
  `at 32px: glyph ${Math.round(32 * GLYPH_RATIO)}px (expected 18), icon ${Math.round(32 * ICON_RATIO)}px (expected 20)`
);

console.log(`\nUIUX REDESIGN: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.log(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}

