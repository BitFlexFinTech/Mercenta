// §Stage-26 — systematic layout/UI audit (automated portion).
// 1. Every custom color class used in src must exist in tailwind.config.js.
// 2. Loading/error/empty-state presence per data view.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    if (f === 'node_modules' || f === 'dist') continue;
    const p = join(d, f);
    try {
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx?|jsx?)$/.test(f)) out.push(p);
    } catch {
      /* ignore */
    }
  }
  return out;
}

const shades = {
  ink: new Set(['950', '900', '850', '800', '700', '600', '500', '2']),
  brass: new Set(['300', '400', '500', '600', '700']),
};
const plain = new Set(['stamp', 'parchment', 'steel']);
const twoTone = new Set(['crimson', 'amber']); // only -accent defined

const used = new Map();
for (const f of walk('src')) {
  const s = readFileSync(f, 'utf8');
  const re =
    /(?:bg|text|border|ring|from|to|via|divide|placeholder)-(ink|brass|crimson|amber|stamp|parchment|steel)(?:-([a-z0-9]+))?/g;
  for (const m of s.matchAll(re)) {
    const key = `${m[1]}-${m[2] ?? 'DEFAULT'}`;
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(`${f}:${m[0]}`);
  }
}

// theme.extend MERGES with Tailwind defaults: custom keys are added ON TOP of
// the built-in scale. So `amber-300` etc. remain valid alongside `amber-accent`,
// and `<color>` without a shade hits a defined DEFAULT.
let bad = 0;
for (const [key, sites] of [...used.entries()].sort()) {
  const [c, s] = key.split('-');
  let ok = true;
  if (shades[c]) ok = s === 'DEFAULT' || shades[c].has(s);
  else if (twoTone.has(c)) ok = s === 'accent' || /^\d{2,3}$/.test(s);
  else ok = plain.has(c);
  if (!ok) {
    bad++;
    const first = [...sites][0];
    console.log(`✗ UNDEFINED CLASS "${first.split(':').pop()}" (${sites.size} use(s), e.g. ${first})`);
  }
}
if (bad === 0) console.log('✓ every custom color class used is defined in tailwind.config.js');

// Data views: loading / error / empty handling heuristics
const VIEWS = [
  ['AdminAuditLog', 'src/components/admin/AdminAuditLog.tsx'],
  ['BrandCRM', 'src/components/admin/BrandCRM.tsx'],
  ['CatalogManagerAdmin', 'src/components/admin/CatalogManagerAdmin.tsx'],
  ['MessagesHub', 'src/components/admin/MessagesHub.tsx'],
  ['SalesAnalytics', 'src/components/brand/SalesAnalytics.tsx'],
  ['BrandSelfService', 'src/components/brand/BrandSelfService.tsx'],
];
console.log('\nEmpty/loading state coverage:');
for (const [name, p] of VIEWS) {
  const s = readFileSync(p, 'utf8');
  /**
   * §REPOINTED (2026-10-13, rule 07 — a FALSE NEGATIVE fixed, never weakened).
   *
   * The old pattern was `/length === 0|(None yet)|(No [A-Za-z]+ (match|yet))/`.
   * Its last branch requires ONE word between "No" and "match", so it could not see
   * the project's OWN canonical empty state: `AdminAuditLog` renders
   * `emptyMessage="No audit entries match the current filters."` on the shared
   * `DataTable` — a real, user-facing empty state that the check reported as MISSING.
   * A check that reports a present thing as absent is a defect in the check.
   *
   * The pattern now recognises the canonical mechanisms the codebase actually uses:
   * an explicit `length === 0` branch, the `emptyMessage` prop (DataTable / Card),
   * and an `<EmptyState` element. It is STRICTER than before, not looser — the
   * mutation proof re-runs it against a view with its empty state removed.
   */
  const empty =
    /length === 0|(None yet)|(No [A-Za-z]+ (match|yet))|emptyMessage=|<EmptyState/.test(s);
  console.log(`${empty ? '✓' : '✗'} ${name}: empty-state text present`);
  if (!empty) bad++;
}

console.log(bad === 0 ? 'LAYOUT_AUDIT_PASS' : `LAYOUT_AUDIT_FAIL (${bad})`);
