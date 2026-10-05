/*
 * §PHASE 15 — THE REPO-SIDE SCOPE THE GATE DECLARED BUT NOTHING CHECKED — registry
 * reconciliation (2026-10-05, 3rd follow-up).
 *
 * WHAT THIS RECORDS: the launch gate named scope (an "API exposure audit",
 * "health monitoring", "no debug content / development endpoint audit",
 * "production email templates", a "release procedure") that had no owner and no
 * check. This increment BUILT each one — plus three real defects fixed at source:
 *   · a browser attempt to read a secret token name (xeroClient — PROTECTED,
 *     Founder-approved; behaviour-preserving);
 *   · a debug console.log shipping to production;
 *   · a FABRICATED health check (`Math.random()` + invented probe readings);
 *   · a literal-backslash-n line break in every transactional email.
 *
 * Run: node scripts/reconcile-phase15-reposide-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const restate = (id, status, evidence) => {
  const row = byId.get(id);
  if (!row) {
    console.error('MISSING ROW:', id);
    process.exit(1);
  }
  row.status = status;
  row.evidence = evidence;
  row.last_verified = DATE;
  row.superseded_by = null;
};

restate(
  'phase15-security',
  'built',
  'scripts/validate-phase15-launch.mjs; scripts/validate-api-exposure.mjs · public/.htaccess (security headers) · ' +
    '.gitignore (.env never tracked) · scripts/validate-rls-hardening.mjs · scripts/validate-tenant-coherence.mjs. ' +
    '§Phase 15 (2026-10-05, 3rd follow-up): the "API exposure audit" the scope names is now BUILT — ' +
    '`validate:api-exposure` (7 assertions) asserts NO non-`VITE_` env read ships, every `VITE_` var read is on a ' +
    'declared browser-safe allowlist, no secret literal ships, and auth is pinned to the RBAC/tenant/RLS gates; it ' +
    'also caught and FIXED a browser attempt to read a secret token name (xeroClient — PROTECTED, Founder-approved). ' +
    'STILL BLOCKED: HTTPS/TLS enforcement is host/domain-level (the demo host already 301-redirects to HTTPS).'
);

restate(
  'phase15-database-infrastructure',
  'blocked',
  'scripts/validate-rls-hardening.mjs; scripts/validate-health-readiness.mjs · supabase/migrations/ · ' +
    'src/lib/monitoring/sentry.ts (error-monitoring seam) · src/lib/monitoring/health.ts · ' +
    'src/components/shared/ErrorBoundary.tsx. §Phase 15 (2026-10-05, 3rd follow-up): "health monitoring" is now ' +
    'BUILT as an HONEST owner — `validate:health-readiness` (11 assertions) replaces the dashboard fabricated ' +
    'health (`Math.random()` + invented "Database: ok ... 240ms" readings) with a deterministic read of real signals. ' +
    'STILL BLOCKED: a PRODUCTION Supabase project — the backup schedule, restore rehearsal and DR drill only run ' +
    'against the live database.'
);

restate(
  'phase15-production-data-cleanup',
  'blocked',
  'scripts/validate-production-hygiene.mjs; scripts/validate-dead-code.mjs · scripts/validate-production-boot.mjs. ' +
    '§Phase 15 (2026-10-05, 3rd follow-up): the "no debug content / development endpoint audit" the scope names is ' +
    'now BUILT — `validate:production-hygiene` (3 assertions) asserts no `console.log`/`console.debug`/`debugger`, no ' +
    '`TODO`/`FIXME`, and no undeclared dev-only host in shipped source; it caught and FIXED a debug `console.log` that ' +
    'shipped to production. STILL BLOCKED: the PRODUCTION-environment content audit needs the live database/domain.'
);

restate(
  'phase15-communications-email-auth',
  'blocked',
  'src/lib/mail/mail.ts; src/lib/mail/templates.ts · scripts/validate-email-templates.mjs · ' +
    'scripts/validate-mock-providers.mjs. §Phase 15 (2026-10-05, 3rd follow-up): "production email templates" now ' +
    'have ONE owner — `validate:email-templates` (13 assertions) proves each template and FIXED a real bug: every ' +
    'body used a literal backslash-n instead of a line break. STILL BLOCKED: SPF/DKIM/DMARC DNS records + the ' +
    'sending provider chosen (external).'
);

const NEW = [
  {
    id: 'phase15-api-exposure-audit',
    description:
      'Phase 15 — the security launch gate API exposure audit: a gate that refuses any non-`VITE_` env read in shipped source (the browser can only read `VITE_` vars), keeps every `VITE_` read on a declared browser-safe allowlist, scans for secret literals, and pins authentication security to the RBAC/tenant/RLS gates',
    source: '§Phase 15 security gate (2026-10-05, 3rd follow-up)',
    status: 'built',
    evidence:
      'scripts/validate-api-exposure.mjs; (7 assertions, PROVED ABLE TO FAIL — injecting a non-`VITE_` read re-tripped it, ' +
      'file restored byte-identical) · src/services/xero/xeroClient.ts (PROTECTED path — a browser secret-read attempt ' +
      'removed, Founder-approved, behaviour-preserving). Registered as `validate:api-exposure`.',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'phase15-production-hygiene-audit',
    description:
      'Phase 15 — the production-data-cleanup gate no-debug-content / development-endpoint audit: a gate that refuses debug output and placeholder markers in shipped source and allows dev-only hosts only via a declared allowlist',
    source: '§Phase 15 production-data-cleanup gate (2026-10-05, 3rd follow-up)',
    status: 'built',
    evidence:
      'scripts/validate-production-hygiene.mjs; (3 assertions, PROVED ABLE TO FAIL — injecting `console.log` re-tripped it, ' +
      'file restored byte-identical) · src/components/admin/ApplicationsPanel.tsx (a debug `console.log` that shipped to ' +
      'production removed). Registered as `validate:production-hygiene`.',
    last_verified: DATE,
    superseded_by: null,
  },
];


const MORE_NEW = [
  {
    id: 'phase15-health-readiness-owner',
    description:
      'Phase 15 — health monitoring: an HONEST readiness owner replacing the Monitoring dashboard fabricated health (a `Math.random()` check plus an invented database/Edge-Function response time), reading only signals the client genuinely holds and stating plainly what it cannot probe',
    source: '§Phase 15 database/infrastructure gate (2026-10-05, 3rd follow-up)',
    status: 'built',
    evidence:
      'src/lib/monitoring/health.ts; (the pure owner) · src/components/admin/MonitoringDashboard.tsx (rewired) · ' +
      'scripts/validate-health-readiness.mjs (11 assertions, EXECUTES the owner, PROVED ABLE TO FAIL — re-introducing ' +
      '`Math.random()` re-tripped it, file restored byte-identical). Registered as `validate:health-readiness`.',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'phase15-email-template-owner',
    description:
      'Phase 15 — production email templates: the ONE owner of transactional email copy, and the fix of a real line-break bug (every body used a literal backslash-n instead of a newline)',
    source: '§Phase 15 communications gate (2026-10-05, 3rd follow-up)',
    status: 'built',
    evidence:
      'src/lib/mail/templates.ts; (the ONE owner) · src/components/admin/ApplicationsPanel.tsx (repointed) · ' +
      'scripts/validate-email-templates.mjs (13 assertions, EXECUTES the templates, PROVED ABLE TO FAIL — doubling the ' +
      'backslashes re-tripped it, file restored byte-identical). Registered as `validate:email-templates`.',
    last_verified: DATE,
    superseded_by: null,
  },
];

for (const row of [...NEW, ...MORE_NEW]) {
  if (byId.has(row.id)) Object.assign(byId.get(row.id), row);
  else reg.entries.push(row);
}

const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-phase15-reposide-registry.cjs after the Phase 15 repo-side ' +
    'audits/owners increment (4 rows restated; +4 rows). Snapshot only.',
  ...counts,
};
reg._meta.phase15_reposide_increment = {
  increment: '§PHASE 15 — THE REPO-SIDE SCOPE THE GATE DECLARED BUT NOTHING CHECKED (2026-10-05)',
  added: [...NEW, ...MORE_NEW].map((r) => r.id),
  validators: [
    'scripts/validate-api-exposure.mjs',
    'scripts/validate-production-hygiene.mjs',
    'scripts/validate-health-readiness.mjs',
    'scripts/validate-email-templates.mjs',
  ],
  note:
    'Three real defects fixed at source (a browser secret-read attempt; a debug console.log in production; a ' +
    'FABRICATED health check) plus a literal-backslash-n email line-break bug. Launch gate repo-side now 68/68.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));

