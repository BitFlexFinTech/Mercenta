// §WAVE 3k — THE CONSOLE'S FOUNDER-VIEW GATE.
//
// WHY THIS EXISTS. Three super-admin surfaces were built on owners the platform already
// has. The failures this gate prevents are the ones that have bitten this project before:
// a surface that LOOKS built but is wired to nothing, a presentation layer that quietly
// re-derives a figure and drifts from its owner, and a second copy of the panel renderer
// appearing by copy-paste. Every assertion is DISCOVERED from the files themselves.
//
//   A. THE NAVIGATION TELLS THE TRUTH — each id is declared implemented AND still
//      super-admin only, read from `navConfig.ts`.
//   B. THE SHELL MOUNTS THEM — each id has a branch returning its screen.
//   C. EACH SCREEN READS ITS OWNER — the screen imports the canonical owner it reports on.
//   D. NO ENGINE IN THE VIEW — a view must not call an owner's ENGINE function (it may
//      import presentation vocabulary such as a label map; that is stated, not hidden).
//   E. ONE PANEL RENDERER — exactly one `export function PanelCard` under `src/next/`,
//      and all three views render through it.
//   F. EVERY SUMMARY CARD DRILLS — each view calls `onNavigate`.
//   G. NO BRAND-SESSION LEAKAGE — no brand-scoped file references the three screens.
//   H. ZERO NETWORK — the whole run makes no live call.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8');
const exists = (rel) => existsSync(join(process.cwd(), rel));

/* ── ZERO NETWORK ─────────────────────────────────────────────────────────── */
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

/* ── The three surfaces this wave added, each with the owner it must report on ── */
const VIEWS = [
  {
    id: 'partnerships',
    screen: 'src/next/screens/admin/AdminPartnershipsScreen.tsx',
    view: 'src/next/screens/admin/AdminPartnershipsView.tsx',
    owners: ['buildFinancierUniverseSummary', 'buildFounderOutreachSummary', 'buildFinancierLifecycleSummary'],
  },
  {
    id: 'founder_centre',
    screen: 'src/next/screens/admin/AdminFounderCentreScreen.tsx',
    view: 'src/next/screens/admin/AdminFounderCentreView.tsx',
    owners: ['getFundingPipeline', 'fundingPipelineSummary', 'buildControlCentre'],
  },
  {
    id: 'brand_intelligence',
    screen: 'src/next/screens/admin/AdminBrandIntelligenceScreen.tsx',
    view: 'src/next/screens/admin/AdminBrandIntelligenceView.tsx',
    owners: ['rankOpportunities', 'rollupByVertical', 'sportsOpportunities'],
  },
];

/* Each entry's owner list is ALSO the engine list: a view must call none of them. */
const enginesOf = (v) => v.owners;

console.log('── A/B. the navigation tells the truth and the shell mounts them ──\n');
const navConfig = read('src/next/navConfig.ts');
const shell = read('src/next/shell/NextShell.tsx');

for (const v of VIEWS) {
  const start = navConfig.indexOf(`id: '${v.id}'`);
  const body = start === -1 ? '' : navConfig.slice(start, navConfig.indexOf('}', start));
  test(`A0 ${v.id} is declared in the console navigation`, start !== -1);
  test(`A1 ${v.id} is declared implemented`, /implemented:\s*true/.test(body), body.replace(/\s+/g, ' ').slice(0, 90));
  test(`A2 ${v.id} is still super-admin only`, /superAdminOnly:\s*true/.test(body));
  test(
    `B1 the shell mounts a screen for ${v.id}`,
    new RegExp(`activeViewId === '${v.id}'`).test(shell) &&
      shell.includes(v.screen.split('/').pop().replace('.tsx', '')),
    v.screen.split('/').pop()
  );
}

console.log('\n── C/D. the screen reads its owner; the view calls no engine ──\n');
for (const v of VIEWS) {
  const screenSrc = read(v.screen);
  const missing = v.owners.filter((o) => !screenSrc.includes(o));
  test(
    `C1 ${v.id} reads its canonical owner(s)`,
    missing.length === 0,
    missing.length ? `MISSING: ${missing.join(', ')}` : v.owners.join(' · ')
  );
  const viewSrc = read(v.view);
  const leaked = enginesOf(v).filter((e) => new RegExp(`${e}\\s*\\(`).test(viewSrc));
  test(
    `D1 ${v.id}'s view calls no owner engine`,
    leaked.length === 0,
    leaked.length ? `LEAKED: ${leaked.join(', ')}` : 'presentation only'
  );
}

console.log('\n── E. ONE panel renderer, used by all three ──\n');
const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === '.git') continue;
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
};
const panelDefs = walk('src/next').filter((f) => /export function PanelCard\b/.test(readFileSync(f, 'utf8')));
test(
  'E1 exactly ONE PanelCard definition exists under src/next (no copied renderer)',
  panelDefs.length === 1 && panelDefs[0].endsWith('ConsolePanels.tsx'),
  panelDefs.map((f) => f.replace(`${process.cwd()}/`, '')).join(', ') || 'none found'
);
for (const v of VIEWS) {
  test(
    `E2 ${v.id}'s view renders through the shared PanelCard`,
    read(v.view).includes("from '@/next/components/ConsolePanels'")
  );
}

console.log('\n── F. every headline card drills somewhere ──\n');
for (const v of VIEWS) {
  test(`F1 ${v.id}'s view routes its cards with onNavigate`, /onNavigate\(/.test(read(v.view)));
}

console.log('\n── G. no brand-session leakage ──\n');
const brandDirs = ['src/components/brand', 'src/next/screens/brand'].filter(exists);
const brandFiles = brandDirs.flatMap((d) => walk(d));
const screenNames = VIEWS.map((v) => v.screen.split('/').pop().replace('.tsx', ''));
const leaks = brandFiles.filter((f) => {
  const src = readFileSync(f, 'utf8');
  return screenNames.some((n) => src.includes(n));
});
test(
  `G1 no brand-scoped file references the three super-admin screens (${brandFiles.length} file(s) scanned)`,
  leaks.length === 0,
  leaks.map((f) => f.replace(`${process.cwd()}/`, '')).join(', ')
);
test('G2 the brand-side scan found files to check (a check that finds nothing is a failure)', brandFiles.length > 0, `${brandFiles.length} file(s)`);

console.log('\n── H. zero network ──\n');
test('H1 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${assertions} assertions · ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

