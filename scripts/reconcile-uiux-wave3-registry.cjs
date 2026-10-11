/**
 * §UI/UX WAVE 3 PART 1 — REGISTRY RECONCILIATION (2026-09-20).
 *
 * Records, in the granular Master Matrix (`requirements-registry.json`), exactly
 * what this increment DELIVERED and what it DISCOVERED — the standing contract
 * forbids silently dropping discovered work.
 *
 * RULES OBEYED (identical to the other reconcile-*.cjs scripts)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - `built_and_tested` is only used where the evidence names a REAL spec or
 *    validator that exists on disk.
 *
 * Run: node scripts/reconcile-uiux-wave3-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-20';
const SOURCE =
  'UI/UX Redesign Wave 3 Part 1 (2026-09-20) — enterprise shell, workspace hierarchy, operational type scale';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

/** COMPLETED + verified this increment (each names a real spec/validator). */
const BUILT_AND_TESTED = [
  [
    'uiux-wave3-operational-type-scale',
    'The canonical operational type scale, which fixes the measured taste debt (finding D-2) AT THE ROOT. The debt was 1,202 arbitrary sub-12px sizes across 113 files (`text-[8px]` 47 · `text-[9px]` 206 · `text-[10px]` 949) plus 644 `text-[11px]` — and the root cause was a design-system failure, not 1,202 mistakes: no NAMED operational size existed below `text-xs`, so every author invented one. `tailwind.config.js` now declares `text-ds-micro` (11px FLOOR) · `text-ds-label` (12px) · `text-ds-body` (13px) · `text-ds-title` (15px) · `text-ds-page` (20px). Migration is mechanical and IDEMPOTENT (1,845 replacements across 116 files; re-run = 0 changes, proven). The gate FAILS on a reappearing micro size, on a missing token, on a floor below 11px, and on a token that is declared but never consumed. A validator BLIND SPOT was found and closed: the first run — and the first validator — both skipped `.jsx`, so the gate reported PASS while `PublicFooterTmp1.jsx` still carried a micro size; both now scan `.ts/.tsx/.jsx/.js/.css`',
    'scripts/validate-typography-scale.mjs (17 assertions; NEGATIVE TEST PROVEN — injecting `text-[10px]` into a probe file produced TYPOGRAPHY_SCALE_VALIDATION_FAIL with exit 1); scripts/migrate-micro-typography.mjs; docs/DESIGN_SYSTEM.md (scale documented, 11px floor stated)',
  ],
  [
    'uiux-wave3-enterprise-shell',
    'The shared application shell redesigned. (a) The demo ENVIRONMENT SWITCHER was a `fixed bottom-0` floating pill that sat ON TOP of the last rows of every workspace — the app compensated with a blanket `pb-16` on `<main>` that reserved space UNDER content the pill then covered anyway. It is now an INLINE control in the navigation footer, labelled "Environment · Demo" with `role="group"` + `aria-pressed` per option and a compact variant; the `pb-16` hack was removed because its cause was removed. (b) The app bar now carries a REAL COMMAND BAR in its centre (enterprise pattern) instead of a small pill at the right edge — same ⌘K binding, same palette, same RBAC-scoped groups, `app-search-trigger` preserved verbatim. The one-click environment switch is RETAINED deliberately (§22 — do not blindly delete): it is how a reviewer moves between the four role shells',
    'e2e/app-shell.spec.ts (single nav tree, aria-current, data-state, drawer, skip link, keyboard, RBAC, viewport screenshot/no-overflow checks); e2e/uiux-redesign.spec.ts (13 tests incl. palette/RBAC inheritance and 4 no-overflow viewports); e2e/uiux-foundation.spec.ts',
  ],
  [
    'uiux-wave3-navigation-findability',
    'Navigation rail findability + rhythm. The Super Admin rail is 30+ destinations across 8 sections and the ONLY way to reach one was to scroll the whole rail. A navigation FILTER now exists (`data-testid="nav-filter"`) with a real empty state (`nav-filter-empty`). It is presentation-only and derives from the sections the SHELL already scoped, so RBAC is untouched — no destination can be revealed by searching for it (§18: the UI is never the authority). While a filter is active every matching section is shown EXPANDED, because a collapsed section would hide the result the user just searched for. Section rhythm fixed (`mt-2 first:mt-0`, single `mb-1`, header promoted to `font-semibold tracking-[0.14em]`). Every prior contract preserved: `DOMAIN_COLOURS` (no `bg-brass`), one `<aside>` landmark, `aria-current`, `data-state="active|idle"`, `badge?: number`, `nav-badge-*`, pinning, collapsible sections, compact rail',
    'e2e/app-shell.spec.ts (all sections/items render per role, grouping is structural, active item aria-current + data-state, RBAC-hidden views, single nav tree, drawer, keyboard); scripts/validate-uiux-redesign.mjs (nav badge/pin/collapse/compact/one-aside/aria contracts)',
  ],
  [
    'uiux-wave3-workspace-hierarchy',
    'Workspace hierarchy + density, applied platform-wide through the SHARED primitive `WorkspaceHeader` (composed by every migrated surface), plus two REAL defects fixed. (a) STICKY TOOLBAR DEFECT: the offset was `top-[52px]` but the app bar is `h-14` (56px) AND `<main>` is its own scroll container — so the toolbar stuck 52px down inside that scrollport and content visibly scrolled through the band above it. `top-0` is correct because `<main>` already begins below the app bar. (b) METRIC HIERARCHY DEFECT: metric values were `text-xl` (20px) — EXACTLY the page-title size — so a KPI number competed with the `h1` at the same weight; hero values were arbitrary `text-[26px] sm:text-[30px]`. Now hero 24px / default 18px, both BELOW the 20px title while still dominating their row (mono + semibold + white). Title `sm:text-2xl` (24px) → `text-ds-page` (20px) so a serif `h1` reads as an enterprise entity title rather than a marketing headline; description `text-sm` (14px) → `text-ds-body` (13px) so the title clearly wins the first glance; rhythm tightened',
    'e2e/uiux-redesign.spec.ts (workspace frame/header/toolbar composed, KPI drill-down routes, density + grouping genuinely change the queue, charts animated, 4 no-overflow viewports); e2e/dashboard.spec.ts; e2e/design-system.spec.ts',
  ],
  [
    'uiux-wave3-exit-to-site-relabel',
    'A UX defect fixed WITHOUT breaking the suite, after the browser suite caught a regression this session caused. The header control rendered the visible text "Home" while actually calling `signOut()` (title: "Back to homepage"), so an innocent-looking navigation label silently destroyed the session. The first attempt REMOVED the control; `e2e/record-drawer.spec.ts:219` then timed out on `getByTitle("Back to homepage")` — FOUR specs drive the exit-to-public-site path through that title (`access-gate:175`, `homepage-editor:77`, `onboarding-workflow:68`, `record-drawer:219`) and it is the only in-shell route back to the public site. Correct remedy: the control is RESTORED with an honest visible label ("Exit to site") plus a `LogOut` icon, `title` retained (it accurately describes the action and is the specs contract), and NO `aria-label` so the accessible name remains identical to the visible text (WCAG 2.5.3 Label in Name). Typecheck and build cannot catch this class of defect; only the browser suite did',
    'e2e/record-drawer.spec.ts; e2e/access-gate.spec.ts; e2e/homepage-editor.spec.ts; e2e/onboarding-workflow.spec.ts (25 passed / 2 skipped / 0 failed after the fix)',
  ],
];

/** COMPLETED documentation/contract work this increment (no browser spec applies). */
const BUILT = [
  [
    'uiux-wave3-redesign-record',
    'The Wave 3 redesign record: the measured defects (each with file/line evidence), what was built and why, the contracts preserved, the open-source evaluation with explicit ADOPT/REFERENCE/REJECT/BUILD-CUSTOM decisions, the caught regression with its root cause and process failure, the honest statement of what is NOT done, and the environment/authority confirmations (no .env, no credential, no live activation, no Git mutation, no commit)',
    'docs/UIUX_REDESIGN_WAVE3_2026-09-20.md',
  ],
  [
    'uiux-wave3-before-after-evidence',
    'Before/after screenshot evidence for the redesign: the pre-change renders are preserved in `test-screenshots/wave3-before/` against the regenerated renders in `test-screenshots/dashboard/`. The render is byte-different and structurally obvious (floating environment pill gone, real command bar, navigation filter, compact header, metrics no longer competing with the h1)',
    'test-screenshots/wave3-before/ (18 PNGs); test-screenshots/dashboard/',
  ],
];

/** DISCOVERED by this pass — recorded with an owner, never dropped. */
const DISCOVERED = [
  [
    'uiux-wave3-part2-admin-dashboard-composition',
    'NOT DONE in Part 1. The `AdminDashboard` (Operations Overview) COMPOSITION was not restructured; only its header, metric hierarchy and the shell around it changed. The "Command centre" block is still one long list of equally-weighted rows rather than a scannable, prioritised attention surface. This is roadmap item 1 and the next execution scope',
    'not_started',
    'PROJECT_STATUS.md heading 3 item 1; docs/UIUX_REDESIGN_WAVE3_2026-09-20.md §8. Owner: Wave 3 Part 2',
  ],
  [
    'uiux-wave3-part3-brand-surfaces',
    'NOT DONE in Part 1. The Brand surface redesign (BrandDashboard, BrandPurchaseOrders, ProductCatalog, LogisticsHub, ComplianceHub, BrandSupport, BrandSettings, BrandReports, SalesAnalytics, …) has not been started. The brand experience should feel like a polished enterprise partner portal, not an admin template',
    'not_started',
    'PROJECT_STATUS.md heading 3 item 2; docs/UIUX_REDESIGN_WAVE3_2026-09-20.md §8. Owner: Wave 3 Part 3',
  ],
  [
    'uiux-wave3-part4-tables-forms-drawers',
    'NOT DONE in Part 1. Page-level tables / forms / filters / drawers (`DataTable`, `workspace.tsx` `Queue`, `RecordDrawer`) have not been redesigned. Open-source candidates were evaluated and deliberately NOT adopted: TanStack Table / AG Grid are REFERENCE only, because the repo already has a canonical `DataTable` + `Queue` with Playwright contracts on both and replacing them is a separate larger decision',
    'not_started',
    'PROJECT_STATUS.md heading 3 item 3; docs/UIUX_REDESIGN_WAVE3_2026-09-20.md §5 and §8. Owner: Wave 3 Part 4',
  ],
  [
    'uiux-wave3-part5-state-redesign',
    'NOT DONE in Part 1. Empty / loading / error / permission state redesign beyond what already existed has not been attempted as a systematic pass',
    'not_started',
    'PROJECT_STATUS.md heading 3 item 4; docs/UIUX_REDESIGN_WAVE3_2026-09-20.md §8. Owner: Wave 3 Part 5',
  ],
  [
    'uiux-wave3-theme-alpha-shims-removal',
    'CARRIED FORWARD, not attempted. `src/theme-alpha-shims.css` (691 lines) still ships a legacy shim layer alongside the token system (finding D-3). Removing it requires the per-screen token migration first; deleting it now would break un-migrated screens',
    'deferred',
    'PROJECT_STATUS.md heading 3 item 5; docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md finding D-3. Owner: Wave 3 Part 6',
  ],
  [
    'uiux-wave3-visual-regression-gate',
    'CARRIED FORWARD, not implemented — the ONE automated pixel-comparison check over the app`s own screens (finding D-4). §REPOINTED 2026-10-11 (rule 07): the sentence that used to be here — screenshots are captured and committed, and the baseline PNGs are already committed — was TRUE when it was written (2026-09-20) and became FALSE on 2026-09-21, when the clean-slate reconciliation put test-screenshots/ on the NEVER-TRACKED list (.gitignore line 46). Today 224 of these pictures exist ON DISK and NONE of them is kept in the project (git ls-files test-screenshots = 0), so there is NO baseline set inside the project to compare against and no pixel-diff step runs anywhere. The work therefore has TWO parts: (a) capture and KEEP a baseline set of the app screens — the browser walk-throughs already photograph them (e2e/redesign-surfaces.spec.ts writes to test-screenshots/redesign-surfaces/), the pictures are simply not kept — and (b) the BASELINE POLICY decision: what may change a stored picture, and who approves that change. Playwright toHaveScreenshot is available, so the comparison step itself is cheap.',
    'not_started',
    'PROJECT_STATUS.md heading 3 item 6; docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md finding D-4. Owner: Wave 3 Part 6 / Founder baseline-policy decision',
  ],
  [
    'discovered-public-footer-tmp1-orphan',
    'DISCOVERED: `src/components/marketing/PublicFooterTmp1.jsx` is an UNREFERENCED ORPHAN — the repository s only `.jsx` file, dated 2026-09-06, imported by nothing (grep across `src/`, `e2e/`, `scripts/`: zero hits), and a near-duplicate of `PublicFooter.tsx`. It was MIGRATED, NOT DELETED (deleting files requires explicit Founder instruction). Founder decision requested',
    'not_started',
    'grep across src/, e2e/, scripts/ (zero references); docs/UIUX_REDESIGN_WAVE3_2026-09-20.md §6 item 1. Owner: Founder decision',
  ],
  [
    'discovered-adminshell-chunk-size',
    'DISCOVERED by this session s own build output: the `AdminShell` chunk is 1,010 kB (263 kB gzip) and the build warns about it. A real performance finding, owned separately — it was NOT introduced by this increment and was NOT addressed by it',
    'not_started',
    '`npm run build` output (AdminShell-DuA4e77W.js 1,009.90 kB, gzip 263.82 kB); PROJECT_STATUS.md heading 3 item 7. Owner: performance workstream',
  ],
];

/** Build the next registry: replace rows this script owns, append new ones. */
const owned = new Map();
for (const [id, description, evidence] of BUILT_AND_TESTED) {
  owned.set(id, { id, description, status: 'built_and_tested', evidence, source: SOURCE, last_updated: TODAY });
}
for (const [id, description, evidence] of BUILT) {
  owned.set(id, { id, description, status: 'built', evidence, source: SOURCE, last_updated: TODAY });
}
for (const [id, description, status, evidence] of DISCOVERED) {
  owned.set(id, { id, description, status, evidence, source: SOURCE, last_updated: TODAY });
}

const preserved = [];
const replacedIds = new Set();
/**
 * §Wave-3 Part 4 (2026-10-08) — DEFECT FIXED AT SOURCE. The `DISCOVERED` templates
 * are the 2026-09-20 "not done yet" statements for parts 2–5. Parts 2, 3 and 4 were
 * each DELIVERED later and their live rows were rewritten by hand, but the templates
 * here were never updated — so re-running this script would have SILENTLY REVERTED
 * three delivered rows to "NOT DONE in Part 1", which is exactly the drift
 * rule 07 forbids. A row that has since progressed past its template's status is
 * therefore left AS IT IS: this script may create a discovered row, but it never
 * un-delivers one.
 */
const liveById = new Map(entries.map((e) => [e.id, e]));
let heldLive = 0;
for (const e of entries) {
  if (owned.has(e.id)) {
    const live = liveById.get(e.id);
    const template = owned.get(e.id);
    if (live && live.status !== template.status && template.status === 'not_started') {
      preserved.push(live);
      // Marked as handled so `appended` below cannot add the template a SECOND
      // time (which Guard 1 would then refuse as a duplicate id).
      replacedIds.add(e.id);
      heldLive++;
      continue;
    }
    replacedIds.add(e.id);
    preserved.push(template);
  } else {
    preserved.push(e);
  }
}
const applied = [...owned.values()];
const appended = applied.filter((r) => !replacedIds.has(r.id));
const next = [...preserved, ...appended];

/** Guard 1 — no duplicate ids. */
const ids = next.map((e) => e.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length > 0) {
  console.error(`REFUSING TO WRITE — duplicate id(s): ${[...new Set(dupes)].join(', ')}`);
  process.exit(1);
}

/** Guard 2 — known status only. */
const ALLOWED = new Set(registry._meta.status_enum);
const badStatus = applied.filter((d) => !ALLOWED.has(d.status));
if (badStatus.length > 0) {
  console.error(`REFUSING TO WRITE — unknown status: ${badStatus.map((d) => `${d.id}=${d.status}`).join(', ')}`);
  process.exit(1);
}

/** Guard 3 — every `built_and_tested` row must name a spec/validator that exists. */
const missingSpecs = applied.filter((r) => {
  if (r.status !== 'built_and_tested') return false;
  const specs = r.evidence.match(/e2e\/[\w.-]+\.spec\.ts|scripts\/[\w.-]+\.mjs/g) ?? [];
  return specs.length === 0 || specs.some((s) => !fs.existsSync(path.resolve(__dirname, '..', s)));
});
if (missingSpecs.length > 0) {
  console.error(
    `REFUSING TO WRITE — built_and_tested without a real spec/validator: ${missingSpecs.map((r) => r.id).join(', ')}`
  );
  process.exit(1);
}

const added = next.length - entries.length;

registry.entries = next;
registry._meta.last_updated = TODAY;
registry._meta.total_entries = next.length;
registry._meta.uiux_wave3_part1 = {
  stage: SOURCE,
  note:
    'Wave 3 Part 1 delivered the shared enterprise shell (inline demo-environment mechanism, real command bar, navigation filter), the workspace header/metric hierarchy, and the canonical operational type scale WITH A PROVEN-FAILING GATE. It is PART 1: the page-by-page surface redesign (AdminDashboard composition, Brand surfaces, tables/forms/drawers, states) is recorded as its own not_started rows with an owner rather than dropped, together with the two carried-forward findings (theme-alpha-shims removal, visual-regression gate) and two NEW discoveries (the orphaned PublicFooterTmp1.jsx awaiting a Founder decision, and the 1,010 kB AdminShell chunk). No historical row was deleted. One validator assertion was REPOINTED (not weakened) to the current canonical source of truth.',
  added_ids: applied.map((r) => r.id),
  built_and_tested: BUILT_AND_TESTED.length,
  built: BUILT.length,
  discovered: DISCOVERED.length,
  by_status: next.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(
  `UIUX_WAVE3_REGISTRY_OK — entries ${entries.length} → ${next.length} (added ${added}, historical rows deleted 0)`
);
console.log(`  built_and_tested: ${BUILT_AND_TESTED.length} · built: ${BUILT.length} · discovered: ${DISCOVERED.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.uiux_wave3_part1.by_status)}`);



