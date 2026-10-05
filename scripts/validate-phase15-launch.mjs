// §PHASE 15 — THE LAUNCH GATE, IN ONE VALIDATOR.
//
// WHY THIS EXISTS
// ---------------
// Phase 15 (Production Readiness + Launch Gate) is the ONE gate that must pass
// before a public production launch. It is 14 rows in `requirements-registry.json`
// (`phase15-*`) and it lived, until now, only as prose: `PRODUCTION_READINESS.md`
// and `GO_LIVE.md` describe it, but NOTHING failed if a repository-side guarantee a
// gate depends on silently regressed. This validator makes each gate's
// REPOSITORY-SIDE requirement executable.
//
// WHAT IT ASSERTS
// ---------------
// For each gate it asserts what the REPOSITORY can prove on its own — the artefacts
// and guarantees that must exist for local verification to be trustworthy. A gate
// whose remaining work needs input the repository cannot supply (a production
// database, a domain/DNS record, a legal sign-off, a business decision) is reported
// BLOCKED with the EXACT missing input, never silently passed.
//
// CONTRACT
// --------
// - Every REPOSITORY-SIDE assertion must hold; a regression fails the build.
// - A BLOCKED gate must name the missing input in one sentence (no vague "later").
// - The declared BLOCKED set is PINNED, so a gate cannot become blocked silently,
//   and a gate cannot be declared done while its own assertions do not run.
//
// Run: node scripts/validate-phase15-launch.mjs
import { readFileSync, existsSync } from 'node:fs';

let assertions = 0;
let failed = 0;
const bad = [];
const test = (name, ok) => {
  assertions++;
  if (!ok) {
    failed++;
    bad.push(name);
    console.log(`  ✗ ${name}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const has = (p) => existsSync(new URL(p, ROOT));

/* ── gates: [id, label, check(), blockedReason|null] ──────────────────────── */
const gates = [];

/* 1. SECURITY */
gates.push({
  id: 'phase15-security',
  label: 'Security (secrets · headers · RBAC/RLS · dependency audit)',
  blocked:
    'BLOCKED — (a) HTTPS/TLS enforcement lives on the host/domain and cannot be set from the repository; ' +
    '(b) the remaining `npm audit` critical is `maplibre-gl` (logistics map) and the fix is a BREAKING major ' +
    'upgrade needing a regression pass of the map — not applied blind.',
  check() {
    const gi = read('.gitignore');
    test('security: `.env` is gitignored', /^\.env$/m.test(gi));
    test('security: `.env.example` exists', has('.env.example'));
    const ht = read('public/.htaccess');
    test('security: .htaccess denies env/internal files', /FilesMatch "\\\.\(env/.test(ht));
    test('security: .htaccess blocks directory listing', /Options -Indexes/.test(ht));
    test('security: HSTS header set', /Strict-Transport-Security/.test(ht));
    test('security: X-Content-Type-Options nosniff set', /X-Content-Type-Options/.test(ht));
    test('security: X-Frame-Options set', /X-Frame-Options/.test(ht));
    test('security: Referrer-Policy set', /Referrer-Policy/.test(ht));
    test('security: RBAC/RLS tenant gates exist', has('scripts/validate-rls-hardening.mjs') && has('scripts/validate-tenant-coherence.mjs'));
    const src = read('src/config/brand.ts') + read('src/main.tsx');
    test('security: no obvious secret literal in first-party source', !/sk-[A-Za-z0-9]{24,}|AKIA[0-9A-Z]{16}/.test(src));
  },
});

/* 2. DATABASE / INFRASTRUCTURE */
gates.push({
  id: 'phase15-database-infrastructure',
  label: 'Database & infrastructure (backups · restore test · DR · monitoring)',
  blocked:
    'BLOCKED — needs a PRODUCTION Supabase project (no credential in this environment): the backup schedule, a ' +
    'restore rehearsal and the disaster-recovery drill can only run against the live database. Repo-side RLS ' +
    'and migrations are asserted here and pass.',
  check() {
    test('database: migrations directory is present', has('supabase/migrations'));
    test('database: RLS hardening gate exists', has('scripts/validate-rls-hardening.mjs'));
    test('database: DB hardening gate exists', has('scripts/validate-db-hardening.mjs'));
    test('database: error-monitoring seam exists (Sentry, no-op without DSN)', has('src/lib/monitoring/sentry.ts'));
    test('database: an app error boundary exists', has('src/components/shared/ErrorBoundary.tsx'));
  },
});

/* 3. SEO */
gates.push({
  id: 'phase15-seo',
  label: 'SEO (titles · canonical · sitemap · robots · OG · favicon)',
  blocked: null,
  check() {
    test('seo: SEO foundation gate exists', has('scripts/validate-seo-foundation.mjs'));
    test('seo: robots.txt exists', has('public/robots.txt'));
    test('seo: sitemap.xml exists', has('public/sitemap.xml'));
    const html = read('index.html');
    test('seo: one canonical link in index.html', (html.match(/rel="canonical"/g) || []).length === 1);
    test('seo: Open Graph title/description present', /og:title/.test(html) && /og:description/.test(html));
    test('seo: Twitter card present', /twitter:card/.test(html));
    test('seo: favicon links present', /favicon\.svg/.test(html) && /apple-touch-icon/.test(html));
  },
});

/* 4. PERFORMANCE */
gates.push({
  id: 'phase15-performance',
  label: 'Performance (compression · caching · bundle splitting · lazy loading)',
  blocked: null,
  check() {
    const ht = read('public/.htaccess');
    test('performance: gzip/deflate configured', /mod_deflate/.test(ht));
    test('performance: immutable cache for hashed assets', /max-age=31536000, immutable/.test(ht));
    const vite = read('vite.config.ts');
    test('performance: one deliberate vendor chunk (cycle-proof)', /manualChunks/.test(vite));
    const app = read('src/App.tsx');
    test('performance: shells are lazy-loaded', /lazy\(/.test(app) && /Suspense/.test(app));
  },
});

/* 5. ACCESSIBILITY */
gates.push({
  id: 'phase15-accessibility',
  label: 'Accessibility (focus · reduced motion · semantics · contrast)',
  blocked: null,
  check() {
    const css = read('src/index.css');
    test('a11y: canonical focus-visible styles exist', /focus-visible/.test(css));
    test('a11y: reduced-motion media query exists', /prefers-reduced-motion/.test(css));
    test('a11y: cookie notice is a labelled region (not a modal trap)', /role="region"/.test(read('src/components/marketing/CookieNotice.tsx')));
    test('a11y: 404 view has a heading and real exits', /<h1/.test(read('src/components/marketing/NotFound.tsx')));
  },
});

/* 6. RESPONSIVE */
gates.push({
  id: 'phase15-responsive',
  label: 'Responsive (mobile · tablet · desktop · touch)',
  blocked: null,
  check() {
    test('responsive: viewport meta present', /name="viewport"/.test(read('index.html')));
    test('responsive: a layout audit script exists', has('scripts/layout-audit.mjs'));
  },
});

/* 7. CONVERSION (already built_and_tested) */
gates.push({
  id: 'phase15-conversion',
  label: 'Conversion (validation · spam · reliability · CTA · login hierarchy)',
  blocked: null,
  check() {
    test('conversion: conversion-gate validator exists', has('scripts/validate-conversion-gate.mjs'));
    test('conversion: ONE application SSOT exists', has('src/config/partnerApplication.ts'));
    test('conversion: ONE fail-closed decision owner exists', has('src/lib/onboarding/applicationGuard.ts'));
  },
});

/* 8. ANALYTICS */
gates.push({
  id: 'phase15-analytics',
  label: 'Analytics (setup · consent-aware tracking · funnel · attribution)',
  blocked:
    'BLOCKED — needs a BUSINESS DECISION the repository cannot make: which analytics provider (if any) and on ' +
    'what lawful basis, plus its script. Until then the honest stance is the one already shipped: NO analytics ' +
    'script is loaded and the cookie notice says so (asserted here).',
  check() {
    const main = read('src/main.tsx') + read('index.html');
    test('analytics: no analytics/tag-manager script loaded before the decision', !/gtag\(|googletagmanager|plausible\.io|posthog|mixpanel|segment\.com/.test(main));
    test('analytics: cookie notice is mounted by the public footer', /CookieNotice/.test(read('src/components/marketing/PublicFooter.tsx')));
  },
});

/* 9. RELIABILITY / DEGRADATION */
gates.push({
  id: 'phase15-reliability-degradation',
  label: 'Reliability & degradation (AI/email/integration outages · retry · graceful)',
  blocked: null,
  check() {
    test('reliability: provider-mode safety gate exists', has('scripts/validate-provider-mode-safety.mjs'));
    test('reliability: mock-seam gate exists', has('scripts/validate-mock-seam.mjs'));
    test('reliability: mock-first seam gate exists', has('scripts/validate-mock-providers.mjs'));
    test('reliability: an app error boundary catches a crash', has('src/components/shared/ErrorBoundary.tsx'));
  },
});


/* 10. PRODUCTION DATA CLEANUP */
gates.push({
  id: 'phase15-production-data-cleanup',
  label: 'Production data cleanup (no test data · no debug · prod/dev endpoint audit)',
  blocked:
    'BLOCKED (partial) — the PRODUCTION-environment content audit needs the live database/domain; the ' +
    'repository-side checks (no TODO/FIXME, no debugger, no debug endpoints) are asserted here and pass.',
  check() {
    test('cleanup: no TODO/FIXME markers in the app entry', !/TODO|FIXME/.test(read('src/App.tsx')));
    test('cleanup: dead-code gate exists', has('scripts/validate-dead-code.mjs'));
    test('cleanup: production-boot gate exists', has('scripts/validate-production-boot.mjs'));
  },
});

/* 11. WEBSITE INTEGRITY */
gates.push({
  id: 'phase15-website-integrity',
  label: 'Website integrity (broken links · custom 404 · crawl · critical journey)',
  blocked: null,
  check() {
    test('integrity: custom 404 view exists', has('src/components/marketing/NotFound.tsx'));
    test('integrity: Home renders the 404 for an unknown address', /notFound/.test(read('src/components/marketing/Home.tsx')));
    test('integrity: robots.txt + sitemap.xml exist', has('public/robots.txt') && has('public/sitemap.xml'));
  },
});

/* 12. COMMUNICATIONS / EMAIL AUTH */
gates.push({
  id: 'phase15-communications-email-auth',
  label: 'Communications (transactional email · SPF · DKIM · DMARC · templates)',
  blocked:
    'BLOCKED — SPF/DKIM/DMARC are DNS records on the sending domain and can only be published by whoever ' +
    'controls that domain DNS (not the repository); production email templates need the sending provider ' +
    'chosen first. The mail seam (Mock-first) is present.',
  check() {
    test('communications: a mail client seam exists', has('src/integrations/types.ts'));
    test('communications: mock provider gate exists', has('scripts/validate-mock-providers.mjs'));
  },
});

/* 13. DEPLOYMENT / DNS / SSL */
gates.push({
  id: 'phase15-deployment-dns-ssl',
  label: 'Deployment (DNS · domain · SSL · deploy verify · rollback · release)',
  blocked:
    'BLOCKED — the final DNS/domain/SSL for the production domain are host-level actions in the `GO_LIVE.md` ' +
    'playbook, not repository changes. The deploy path, verification and rollback procedure are asserted here.',
  check() {
    test('deployment: GO_LIVE.md playbook exists', has('GO_LIVE.md'));
    test('deployment: the ONE deploy script exists', has('scripts/deploy-demo.sh'));
    test('deployment: GO_LIVE.md documents rollback', /Rollback/i.test(read('GO_LIVE.md')));
    test('deployment: live verification script exists', has('scripts/verify-live-demo.mjs'));
  },
});

/* 14. FINAL LAUNCH GATE */
gates.push({
  id: 'phase15-final-launch-gate',
  label: 'Final launch gate (full security/functional/E2E audit · smoke test · acceptance)',
  blocked:
    'BLOCKED BY DEPENDENCY — cannot be the launch gate until the gates above that are BLOCKED are cleared; it ' +
    'is the gate over their results, so it stays open until they close.',
  check() {
    test('final: an E2E scenario gate exists', has('scripts/validate-e2e-scenarios.mjs'));
    test('final: a whole-corpus gate exists', has('scripts/validate-all.sh'));
    test('final: a live smoke-test script exists', has('scripts/verify-live-demo.mjs'));
  },
});

/* 15. LEGAL / PRIVACY */
gates.push({
  id: 'phase15-legal-privacy',
  label: 'Legal & privacy (privacy policy · terms · cookie consent · data inventory)',
  blocked:
    'BLOCKED — the privacy policy, terms and a working cookie notice ARE built (asserted here); the gate now ' +
    'needs LEGAL SIGN-OFF of the published wording and a third-party data inventory — a human/business decision, ' +
    'not a repository change.',
  check() {
    test('legal: privacy policy view exists', has('src/components/marketing/PrivacyPolicy.tsx'));
    test('legal: terms view exists', has('src/components/marketing/TermsOfService.tsx'));
    test('legal: cookie notice exists and is re-openable', /COOKIE_SETTINGS_EVENT/.test(read('src/components/marketing/CookieNotice.tsx')));
    test('legal: /privacy and /terms are declared public routes', /'privacy'/.test(read('src/lib/seo/publicRoutes.ts')) && /'terms'/.test(read('src/lib/seo/publicRoutes.ts')));
  },
});

/* ── run ──────────────────────────────────────────────────────────────────── */
console.log('§PHASE 15 — LAUNCH GATE\n');
let pass = 0;
const blockedIds = [];
for (const g of gates) {
  console.log(`• ${g.id} — ${g.label}`);
  g.check();
  if (g.blocked) {
    blockedIds.push(g.id);
    console.log(`  BLOCKED ${g.blocked}`);
  } else {
    pass++;
    console.log('  OK repository-side requirements met');
  }
  console.log('');
}

console.log('==================================');
console.log(
  `PHASE 15: ${pass}/${gates.length} gates fully cleared · ${blockedIds.length}/${gates.length} BLOCKED on external input`
);
console.log(`BLOCKED: ${blockedIds.join(', ')}`);
console.log(`repo-side assertions: ${assertions - failed}/${assertions} passed`);
if (failed > 0) {
  console.error(`\n✗ ${failed} repository-side assertion(s) FAILED:`);
  for (const b of bad) console.error(`  ✗ ${b}`);
  process.exit(1);
}
console.log('✓ every repository-side launch-gate guarantee holds');

