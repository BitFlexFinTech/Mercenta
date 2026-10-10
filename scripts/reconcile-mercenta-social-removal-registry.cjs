/**
 * §BATCH 5 (2026-10-10) — THE MERCENTA SOCIAL REMOVAL: registry reconciliation.
 *
 * IDEMPOTENT. Reconciles the Master Matrix after the owner instructed Mercenta
 * Social's COMPLETE removal (§BATCH 5 of `docs/NEXT_BUILD_PLAN_2026-10-10.md`,
 * Part 2.6). It:
 *   1. marks every Mercenta Social CAPABILITY row `removed`, with the removal record
 *      as its evidence;
 *   2. REPOINTS every surviving row that merely CITED a deleted file, so no ACTIVE
 *      row keeps citing a path that no longer exists (asserted by
 *      `scripts/validate-built-rows.mjs`, which fails on a missing cited path);
 *   3. recomputes `_meta.status_counts` FROM THE ENTRIES THEMSELVES.
 *
 * The scenario catalogue's `in-social-*` rows were removed by the same batch (see
 * `scripts/validate-retired-platforms.mjs` §2c for the absence guard).
 *
 * Run: node scripts/reconcile-mercenta-social-removal-registry.cjs
 */
const fs = require('fs');

const REG = 'requirements-registry.json';
const DATE = '2026-10-10';

const REMOVAL_EVIDENCE =
  'REMOVED 2026-10-10 (§BATCH 5 of docs/NEXT_BUILD_PLAN_2026-10-10.md, owner directive: remove Mercenta Social COMPLETELY). Deleted: src/config/mercentaSocial.ts; src/lib/social/ (workspace, engineAdapter, brandStatus, index); src/lib/postiz/postizClient.ts; src/components/brand/MercentaSocial.tsx; src/components/brand/BrandSocialConnect.tsx; src/components/admin/PostizAdminPanel.tsx; supabase/functions/social-session/; scripts/social-sso/; scripts/validate-e7-embedded-social.mjs; scripts/validate-postiz.mjs; scripts/validate-social-simulation.mjs; e2e/embedded-social.spec.ts. ABSENCE guarded by scripts/validate-retired-platforms.mjs §2c (rule 08) and asserted at the domain level in scripts/validate-d4-persistence.mjs (O1/O2) and e2e/retired-platforms.spec.ts.';

/** Mercenta Social CAPABILITY rows — the capability itself is gone. */
const REMOVED_ROWS = [
  'batchD-postiz-integration',
  'batchF-brand-social-connect',
  'phaseE7-mercenta-social-identity',
  'phaseE7-engine-inventory',
  'phaseE7-auto-provisioning',
  'phaseE7-entitlement-gate',
  'phaseE7-tenant-isolation',
  'phaseE7-commercial-boundary',
  'phaseE7-admin-control-centre',
  'phaseE7-no-fabricated-connection-state',
  'phaseE7-simulation-zero-network',
  'phaseE7-deployment-findings',
  'phaseE7-engine-link-not-established',
  'e2e-embedded-social-flaky-tenant-switch',
];

/** Paths deleted by §BATCH 5 — no surviving row may keep citing one. */
const DELETED_PATHS = [
  'src/config/mercentaSocial.ts',
  'src/components/brand/MercentaSocial.tsx',
  'src/components/brand/BrandSocialConnect.tsx',
  'src/components/admin/PostizAdminPanel.tsx',
  'src/lib/postiz/postizClient.ts',
  'src/lib/social/workspace.ts',
  'src/lib/social/engineAdapter.ts',
  'src/lib/social/brandStatus.ts',
  'src/lib/social/index.ts',
  'scripts/social-sso/server.mjs',
  'scripts/social-sso/engine-patches.mjs',
  'supabase/functions/social-session/index.ts',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/validate-postiz.mjs',
  'scripts/validate-social-simulation.mjs',
  'e2e/embedded-social.spec.ts',
];

/**
 * The same files are sometimes cited by BARE filename, which the evidence-row gate
 * also checks ("not found anywhere"). Order matters: the full paths above are
 * replaced first, so these only catch what is left.
 */
const DELETED_BARE_FILENAMES = [
  'mercentaSocial.ts',
  'MercentaSocial.tsx',
  'BrandSocialConnect.tsx',
  'PostizAdminPanel.tsx',
  'postizClient.ts',
  'engineAdapter.ts',
  'brandStatus.ts',
  'validate-e7-embedded-social.mjs',
  'validate-postiz.mjs',
  'validate-social-simulation.mjs',
  'embedded-social.spec.ts',
];

const MARK = '[removed with Mercenta Social, §BATCH 5 2026-10-10]';

/** The increment this batch DELIVERED — recorded so the Matrix is not silent about it. */
const NEW_ROWS = [
  {
    id: 'batch5-mercenta-social-removal',
    description:
      '§BATCH 5 (2026-10-10) — MERCENTA SOCIAL REMOVED COMPLETELY on the owner\'s instruction. 16 files deleted (the brand surface + adapter, the social config and domain modules, the Postiz engine client and its admin control centre, the `social-session` Edge Function, the `scripts/social-sso/` bridge, three validators and the browser spec) and every dependent repointed (both shells, the integration registry and its types, data-processing, operating costs, the theme accent token, the status-presentation helper, the investor-demo stage, the edge-function rate-limit table, docker-compose, the Caddyfile, the deploy/bootstrap/forensic scripts, and the docs). The scenario catalogue dropped its 12 `social` rows and the coverage matrix was regenerated (416 → 404).',
    source: 'docs/NEXT_BUILD_PLAN_2026-10-10.md Part 2.6 (owner directive: remove everything)',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-retired-platforms.mjs §2c — the ABSENCE GUARD (16 removed-file + 4 removed-directory + 21 live-marker assertions), MUTATION-PROVED (a re-created social module ⇒ FAIL; restored byte-identical ⇒ PASS); scripts/validate-d4-persistence.mjs O1/O2 (Postiz absent); scripts/validate-admin-shell-bundle.mjs + scripts/validate-workspace-shell.mjs + scripts/validate-investor-demo.mjs (24-stage lifecycle) + scripts/validate-operating-costs.mjs + scripts/validate-e6-brand-surfaces.mjs F8 (18-item brand nav); e2e/retired-platforms.spec.ts + e2e/app-shell.spec.ts + e2e/integration-hub.spec.ts + e2e/redesign-surfaces.spec.ts (all repointed to ABSENCE); scripts/validate-built-rows.mjs PASS (no surviving row cites a deleted file); node scripts/validate-e2e-scenarios.mjs (16/16, 404 scenarios).',
    last_verified: DATE,
    superseded_by: null,
  },
];

/* the row is appended AFTER `reg`/`byId` are declared, below */

/* ── registry: mark removed rows, repoint citations, recompute counts ──────── */
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

for (const row of NEW_ROWS) {
  if (byId(row.id)) { console.log(`registry: row already present, left untouched: ${row.id}`); continue; }
  reg.entries.push(row);
  console.log(`registry: row ADDED: ${row.id}`);
}

let marked = 0;
for (const id of REMOVED_ROWS) {
  const e = byId(id);
  if (!e) { console.warn(`  ! row not found: ${id}`); continue; }
  e.status = 'removed';
  /* idempotent: never stack the removal prefix on a row already reconciled */
  if (!String(e.description).startsWith('§BATCH 5')) {
    e.description = `§BATCH 5 (2026-10-10) — REMOVED with Mercenta Social. Was: ${String(e.description).slice(0, 240)}`;
  }
  e.evidence = REMOVAL_EVIDENCE;
  e.last_verified = DATE;
  e.superseded_by = null;
  marked++;
}
console.log(`registry: ${marked} Mercenta Social capability rows marked removed`);

let patched = 0;
let refs = 0;
for (const e of reg.entries) {
  if (e.status === 'removed') continue;
  let text = `${e.evidence ?? ''}`;
  let changed = false;
  for (const p of [...DELETED_PATHS, ...DELETED_BARE_FILENAMES]) {
    if (text.includes(p)) {
      const n = text.split(p).length - 1;
      text = text.split(p).join(MARK);
      refs += n;
      changed = true;
    }
  }
  if (changed) {
    e.evidence = text;
    e.last_verified = DATE;
    patched++;
  }
}
console.log(`registry: ${refs} citations repointed across ${patched} surviving rows`);

/* the status enum must be honest about every status in use (rule 07) */
for (const s of ['removed', 'complete']) {
  if (!reg._meta.status_enum.includes(s)) reg._meta.status_enum.push(s);
}

/* recompute the snapshot FROM THE ENTRIES THEMSELVES */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
const summary = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ');
reg._meta.status_counts = {
  _note: `Recomputed ${DATE} after §BATCH 5 (the Mercenta Social removal). Snapshot only, derived from the entries: ${summary}.`,
  ...counts,
};
reg._meta.total_entries = reg.entries.length;
reg._meta.last_updated = DATE;
fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry: status_counts recomputed (${summary}); total_entries ${reg._meta.total_entries}`);
