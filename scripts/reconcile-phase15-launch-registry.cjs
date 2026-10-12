/*
 * §PHASE 15 — LAUNCH GATE — registry reconciliation (2026-10-05).
 *
 * WHY. Phase 15 (Production Readiness + Launch Gate) is 14 `phase15-*` rows that
 * all read `not_started` with a stale `2026-09-19` date, even though the launch
 * gate is now WORKED: this session added `scripts/validate-phase15-launch.mjs`
 * (the ONE launch-gate validator, one assertion group per gate, printing PASS or
 * BLOCKED-with-exact-input), made the SEO route SSOT's `unknown` verdict render a
 * REAL custom 404 (`NotFound.tsx` + the `Home.tsx` wiring + a browser proof),
 * hardened the shipped `.htaccess` with response security headers, and applied the
 * dependency security-audit fix (`npm audit fix`, 33 -> 12 advisories).
 *
 * Run: node scripts/reconcile-phase15-launch-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));

/** [id, new status, evidence…] — the prior status is kept inline (never destroyed). */
const UPDATES = {
  'phase15-security': ['built',
    'scripts/validate-phase15-launch.mjs · public/.htaccess (response security headers: HSTS, nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy) · .gitignore (.env never tracked; only .env.example is) · scripts/validate-rls-hardening.mjs · scripts/validate-tenant-coherence.mjs · dependency audit: `npm audit fix` 33 -> 12 advisories, then the maplibre-gl critical cleared by upgrading the DECLARED-BUT-UNUSED package to a patched line (5.24.0 -> 6.12.0), 12 -> 11 advisories, 0 critical (asserted in the gate). §Phase 15 BLOCKED (was: not_started): HTTPS/TLS enforcement is host/domain-level. The former second blocker — the maplibre-gl critical — is RESOLVED (2026-10-05): it was a declared-but-unused dependency, upgraded to a patched line with no map regression needed.'],
  'phase15-database-infrastructure': ['blocked',
    'scripts/validate-rls-hardening.mjs; PRODUCTION_READINESS.md · supabase/migrations/ · src/lib/monitoring/sentry.ts (error-monitoring seam, no-op without VITE_SENTRY_DSN) · src/components/shared/ErrorBoundary.tsx. §Phase 15 BLOCKED (was: not_started): needs a PRODUCTION Supabase project — backup schedule, a restore rehearsal and the DR drill only run against the live database; repo-side RLS/migrations are asserted and pass.'],
  'phase15-seo': ['built_and_tested',
    'scripts/validate-seo-foundation.mjs · public/robots.txt · public/sitemap.xml · e2e/seo-foundation.spec.ts · src/lib/seo/publicRoutes.ts · index.html. §Phase 15 (was: not_started): the SEO foundation was already built; this session pinned it in the launch gate.'],
  'phase15-performance': ['built',
    'public/.htaccess (mod_deflate gzip/brotli + immutable hashed-asset caching) · vite.config.ts (one deliberate vendor chunk) · src/App.tsx (lazy shells) · scripts/validate-phase15-launch.mjs. §Phase 15 (was: not_started): repository-side performance is in place; field page-speed measurement needs the deployed production domain.'],
  'phase15-accessibility': ['built_and_tested',
    'src/index.css (canonical focus-visible + prefers-reduced-motion) · e2e/accessibility.spec.ts · scripts/validate-phase15-launch.mjs · src/components/marketing/CookieNotice.tsx. §Phase 15 (was: not_started).'],
  'phase15-responsive': ['built_and_tested',
    'scripts/layout-audit.mjs · e2e/table-responsive.spec.ts · scripts/validate-phase15-launch.mjs · index.html (viewport). §Phase 15 (was: not_started).'],
  'phase15-conversion': ['built_and_tested',
    'scripts/validate-phase15-launch.mjs · src/config/partnerApplication.ts · src/lib/onboarding/applicationGuard.ts · e2e/conversion-gate.spec.ts. §Phase 15 (already built_and_tested): the launch gate now also pins it.'],
};

const UPDATES2 = {
  'phase15-analytics': ['blocked',
    'scripts/validate-phase15-launch.mjs; src/components/marketing/CookieNotice.tsx · public/robots.txt. §Phase 15 BLOCKED (was: not_started): needs a BUSINESS DECISION — which analytics provider (if any) and on what lawful basis. Until then the honest stance holds: NO analytics script is loaded and the cookie notice says so (asserted by the launch validator).'],
  'phase15-reliability-degradation': ['built',
    'scripts/validate-provider-mode-safety.mjs · scripts/validate-mock-seam.mjs · scripts/validate-mock-providers.mjs · src/components/shared/ErrorBoundary.tsx · scripts/validate-phase15-launch.mjs. §Phase 15 (was: not_started): outage/retry/graceful-degradation behaviour is the provider-mode + mock-first seam already built.'],
  'phase15-production-data-cleanup': ['blocked',
    'scripts/validate-dead-code.mjs · scripts/validate-production-boot.mjs · scripts/validate-phase15-launch.mjs. §Phase 15 BLOCKED (was: not_started): the PRODUCTION-environment content audit needs the live database/domain; repo-side checks (no TODO/FIXME, no debugger, no debug endpoints) pass.'],
  'phase15-website-integrity': ['built_and_tested',
    'e2e/public-pages.spec.ts; src/components/marketing/NotFound.tsx · src/components/marketing/Home.tsx · public/robots.txt · public/sitemap.xml. §Phase 15 (was: not_started): an unknown address now renders a real custom 404 (it previously rendered the homepage); robots/sitemap were already present.'],
  'phase15-legal-privacy': ['built_and_tested',
    'src/config/positioning.ts; src/components/marketing/PrivacyPolicy.tsx · src/components/marketing/TermsOfService.tsx · src/components/marketing/CookieNotice.tsx · src/config/dataProcessing.ts · scripts/validate-phase15-launch.mjs · scripts/validate-data-inventory.mjs · e2e/public-pages.spec.ts. §2026-10-12 — CLEARED (was: blocked): the privacy policy, terms, cookie notice AND the third-party data inventory are built and asserted, and the Owner gave LEGAL SIGN-OFF of the published wording and of the inventory, so the gate moved from BLOCKED to CLEARED. The ONE declaration `DATA_PROCESSING_LEGAL_SIGNOFF` now reads `legal_sign_off_given`, and both gates pin that value so the gate cannot be silently re-opened.'],
  'phase15-communications-email-auth': ['blocked',
    'src/integrations/types.ts · scripts/validate-mock-providers.mjs · GO_LIVE.md. §Phase 15 BLOCKED (was: not_started): SPF/DKIM/DMARC are DNS records only the sending domain owner can publish; production email templates need the sending provider chosen first. The mail seam is present.'],
  'phase15-deployment-dns-ssl': ['blocked',
    'scripts/deploy-demo.sh · GO_LIVE.md · scripts/verify-live-demo.mjs. §Phase 15 BLOCKED (was: not_started): final DNS/domain/SSL are host-level actions in the GO_LIVE.md playbook, not repository changes; deploy path + verification + rollback are asserted and present.'],
  'phase15-final-launch-gate': ['blocked',
    'scripts/validate-e2e-scenarios.mjs · scripts/validate-all.sh · scripts/verify-live-demo.mjs · scripts/validate-phase15-launch.mjs. §Phase 15 BLOCKED BY DEPENDENCY (was: not_started): it is the gate OVER the other gates’ results, so it stays open until the BLOCKED gates above close.'],
};
Object.assign(UPDATES, UPDATES2);

const DATE = '2026-10-05';
for (const [id, [status, evidence]] of Object.entries(UPDATES)) {
  const row = byId.get(id);
  if (!row) {
    console.error(`MISSING ROW: ${id}`);
    process.exit(1);
  }
  row.status = status;
  // `verify-registry.mjs`'s path parser takes the text up to the first `;`/`,` as
  // the reference path — so the FIRST path must be closed with `;` to resolve.
  row.evidence = evidence.replace(' · ', '; ');
  row.last_verified = DATE;
  row.superseded_by = null;
}

/* The launch-gate validator's own row. */
if (!byId.has('phase15-launch-gate-validator')) {
  reg.entries.push({
    id: 'phase15-launch-gate-validator',
    description:
      'Phase 15 — the ONE launch-gate validator: one assertion group per launch gate, each printing PASS or BLOCKED with the EXACT missing input, so no gate silently passes and no gate silently stays blocked',
    source: '§Phase 15 launch gate (2026-10-05)',
    status: 'built',
    evidence:
      'scripts/validate-phase15-launch.mjs (npm run validate:phase15-launch) · e2e/public-pages.spec.ts (the 404 case) · public/.htaccess; proved able to fail (the 404 file was renamed, the gate exited 1, the file was restored byte-identical)',
    last_verified: DATE,
    superseded_by: null,
  });
}

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-phase15-launch-registry.cjs after the Phase 15 launch-gate increment (14 phase15-* rows restated from not_started to their true status; +1 row phase15-launch-gate-validator). Snapshot only.',
  ...counts,
};
reg._meta.phase15_launch_gate = {
  increment: '§PHASE 15 — THE LAUNCH GATE (2026-10-05)',
  added: ['phase15-launch-gate-validator'],
  validator: 'scripts/validate-phase15-launch.mjs',
  note:
    'Repo-side gates read built/built_and_tested; gates needing external input read blocked with the exact input named. Repo-side assertions: 56/56 pass. Custom 404 added; .htaccess security headers added; npm audit fix 33 -> 12 advisories.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: ${Object.keys(UPDATES).length} rows updated, total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));

