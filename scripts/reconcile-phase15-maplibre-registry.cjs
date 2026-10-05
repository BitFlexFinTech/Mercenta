/*
 * §PHASE 15 — THE `maplibre-gl` CRITICAL RESOLVED — registry reconciliation (2026-10-05).
 *
 * WHY. The Phase 15 security gate recorded its remaining `npm audit` critical as
 * "a breaking major upgrade needing a logistics-map regression pass". That was
 * FALSE: `maplibre-gl` is declared in `package.json` but imported by ZERO files
 * (the logistics map is hand-drawn SVG; the 3D hero uses `three`). The honest,
 * risk-free fix was the project's own rule (REMOVE/UPGRADE before ADD): move the
 * DECLARED-BUT-UNUSED package onto a patched line (5.24.0 -> 6.12.0, clearing
 * GHSA-jrc7-96c5-q579), with NO regression pass. `scripts/validate-phase15-launch.mjs`
 * now asserts the package stays on a patched line, proved able to fail.
 *
 * Run: node scripts/reconcile-phase15-maplibre-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

/* The security gate row: the former second blocker (b) is now RESOLVED; only the
   host-level HTTPS/TLS blocker (a) remains. Status stays `built` (it was already). */
const security = byId.get('phase15-security');
if (!security) {
  console.error('MISSING ROW: phase15-security');
  process.exit(1);
}
security.status = 'built';
security.evidence =
  'scripts/validate-phase15-launch.mjs; public/.htaccess (response security headers: HSTS, nosniff, X-Frame-Options SAMEORIGIN, ' +
  'Referrer-Policy, Permissions-Policy) · .gitignore (.env never tracked; only .env.example is) · scripts/validate-rls-hardening.mjs · ' +
  'scripts/validate-tenant-coherence.mjs · dependency audit: `npm audit fix` 33 -> 12 advisories, then the maplibre-gl critical cleared ' +
  'by upgrading the DECLARED-BUT-UNUSED package to a patched line (5.24.0 -> 6.12.0), 12 -> 11 advisories, 0 critical (asserted in the gate). ' +
  '§Phase 15 BLOCKED (was: not_started): HTTPS/TLS enforcement is host/domain-level. The former second blocker — the maplibre-gl critical — ' +
  'is RESOLVED (2026-10-05): it was a declared-but-unused dependency, upgraded to a patched line with no map regression needed.';
security.last_verified = DATE;
security.superseded_by = null;

/* NEW row: the resolved dependency critical + its regression guard. Status is
   `built`, NOT `built_and_tested`: the fix is proven by the node gate
   (validate:phase15-launch), and no browser test exercises an unused package. */
const ROW = {
  id: 'phase15-maplibre-critical-resolved',
  description:
    'Phase 15 — the `maplibre-gl` audit critical resolved: the DECLARED-BUT-UNUSED dependency was moved onto a patched line (5.24.0 -> 6.12.0, clearing GHSA-jrc7-96c5-q579) with no map regression, and the false "breaking upgrade + regression pass" description was corrected at every citation; the launch gate now asserts the package cannot be downgraded back into the vulnerable band',
  source: '§Phase 15 security gate (2026-10-05)',
  status: 'built',
  evidence:
    'scripts/validate-phase15-launch.mjs; package.json (maplibre-gl ^6.12.0) · package-lock.json · PRODUCTION_READINESS.md · ' +
    'scripts/reconcile-phase15-launch-registry.cjs. §Phase 15 (2026-10-05): npm audit 12 -> 11 advisories, the 1 critical -> 0. ' +
    'The gate asserts the declared range stays >=6.4.1 and was PROVED ABLE TO FAIL — a downgrade to ^5.24.0 re-tripped the gate with ' +
    'exit 1, and package.json was restored byte-identical, sha256 78280a2f0c37…. The package is imported by zero files (the logistics ' +
    'map is SVG; the 3D hero uses three), so no regression pass was needed. The package is KEPT deliberately for the future 3D logistics map.',
  last_verified: DATE,
  superseded_by: null,
};
const existing = byId.get(ROW.id);
if (existing) {
  Object.assign(existing, ROW);
} else {
  reg.entries.push(ROW);
}

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-phase15-maplibre-registry.cjs after the maplibre-gl critical fix ' +
    '(phase15-security: blocker (b) resolved; +1 row phase15-maplibre-critical-resolved). Snapshot only.',
  ...counts,
};
reg._meta.maplibre_critical_increment = {
  increment: '§PHASE 15 — THE maplibre-gl CRITICAL RESOLVED (2026-10-05)',
  added: ['phase15-maplibre-critical-resolved'],
  validator: 'scripts/validate-phase15-launch.mjs',
  note:
    'The critical was on a DECLARED-BUT-UNUSED dependency; the fix was the risk-free upgrade to a patched line, not a breaking upgrade + ' +
    'regression pass. The gate asserts the declared range stays >=6.4.1. Launch gate repo-side now 64/64.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
