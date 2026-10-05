/*
 * §ADMIN-SHELL-CHUNK — the BRAND-shell bundle budget — registry row (2026-10-05).
 *
 * WHY. The SAME defect fixed in `AdminShell` was found in `BrandShell` in the same
 * session: the shell EAGERLY imported all 24 brand view panels, so they all landed
 * in ONE ~637 kB `BrandShell-*.js` chunk and a brand downloaded every panel to open
 * any one of them. Every panel is now a `React.lazy(() => import(…))` dynamic
 * import rendered inside a `<Suspense>`, so the shell chunk is 28.57 kB.
 *
 * This script ADDS the row `discovered-brandshell-chunk-size` (it did not exist —
 * the finding was discovered this session) and recomputes `_meta`. It touches NO
 * other row, so the rows the sibling script reconciled keep their `_audit_note`.
 *
 * Run: node scripts/reconcile-brand-shell-chunk-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const DATE = '2026-10-05';
const ID = 'discovered-brandshell-chunk-size';

if (reg.entries.some((e) => e.id === ID)) {
  console.error('ROW ALREADY EXISTS: ' + ID);
  process.exit(1);
}

reg.entries.push({
  id: ID,
  description:
    'DISCOVERED (2026-10-05, this session) while fixing `discovered-adminshell-chunk-size`: the SAME defect ' +
    'existed in the BRAND portal shell. `BrandShell` eagerly imported all 24 brand view panels, so they all ' +
    'landed in ONE ~637 kB `BrandShell-*.js` chunk and a brand downloaded every panel to open any one of them. ' +
    'FIXED at source: every panel is now a `React.lazy(() => import(…))` dynamic import rendered inside a ' +
    '`<Suspense>` (plus a `BrandViewFallback`), so the shell chunk is 28.57 kB (9.07 kB gzip). APP-code ' +
    'splitting only — `node_modules` still lands in the ONE `vendor` chunk (§P3).',
  source: 'Discovered while fixing discovered-adminshell-chunk-size (§ADMIN-SHELL-CHUNK, 2026-10-05)',
  status: 'built_and_tested',
  evidence:
    'scripts/validate-admin-shell-bundle.mjs (npm run validate:admin-shell-bundle) — its BrandShell section ' +
    'asserts the shell holds NO static import from `@/components/brand/`, declares ≥20 `lazy(() => import(` ' +
    'bindings, renders its switch inside a `<Suspense>`, holds the BrandShell chunk ≤ 300 kB, and splits ≥18 of ' +
    '23 panels (incl. the heaviest, ProductCatalog + LogisticsHub) into their own chunks. Browser: ' +
    'e2e/brand-operational-surfaces.spec.ts + e2e/app-shell.spec.ts render the brand shell and navigate its ' +
    'views, loading the lazily-split chunks.',
  last_verified: DATE,
  superseded_by: null,
});

/* ── _meta: counts, date, changelog ────────────────────────────────────────── */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-brand-shell-chunk-registry.cjs after the §ADMIN-SHELL-CHUNK ' +
    'increment added the row discovered-brandshell-chunk-size (the sibling script reconciled ' +
    'discovered-adminshell-chunk-size + the two STALE cleanup rows). Snapshot only.',
  ...counts,
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
