/*
 * §CREDENTIAL VAULT — registry reconciliation (2026-10-08).
 *
 * WHY. The row `discovered-credential-vault` recorded that the durable credential
 * architecture required by Founder decision T-7 (Super Admin entry, replacement,
 * secure persistence, masked readback, validation, enable/disable and
 * provider-specific fields, with credentials never exposed in the frontend) was
 * NOT implemented. THIS increment builds the ONE owner
 * (`src/config/credentialVault.ts`) and the pure fail-closed resolver
 * (`src/lib/integrations/resolveCredentialVault.ts`), with the provider-specific
 * fields DERIVED from the canonical integration registry (never re-declared), and
 * surfaces the summary on the Super-Admin Founder Control Centre. The DURABLE
 * store itself is the activation seam the resolver injects — the in-memory store
 * the integration layer holds today is NOT durable, so NO provider resolves as a
 * production credential. The row therefore records the ARCHITECTURE built and the
 * durable-store wiring as ACTIVATION, not a fabricated "everything works".
 *
 * Run: node scripts/reconcile-credential-vault-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-08';

const row = byId.get('discovered-credential-vault');
if (!row) {
  console.error('MISSING ROW: discovered-credential-vault');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;
const OLD_DESCRIPTION = row.description;

row.status = 'built';
row.description =
  'Credential vault (T-7 / matrix D16-05) — the durable credential architecture. BUILT (2026-10-08): ' +
  'the ONE owner `src/config/credentialVault.ts` DERIVES one contract per integration provider from the ' +
  'canonical registry (which are OAuth or API-key and which secret fields each requires — the fields are ' +
  'REUSED, never re-declared) and declares the vault status vocabulary, the MASK policy, the entry / ' +
  'replacement / secure-persistence / masked-readback / validation / enable-disable RULES and the pinned ' +
  'invariants. The pure fail-closed resolver `src/lib/integrations/resolveCredentialVault.ts` decides when a ' +
  'credential may be USED: it is usable ONLY when the provider is declared, a value is STORED, the credential ' +
  'is ENABLED, every required secret field is present AND the store is DURABLE — an unknown provider, no ' +
  'stored value, a disabled credential, a missing field and a NON-DURABLE store are ALL refused, and only a ' +
  'MASK is ever read back (the value never leaves). The durable store is the injected ACTIVATION seam: the ' +
  'in-memory store the integration layer holds today is NOT durable, so NO provider resolves as a production ' +
  'credential until it is wired (an infrastructure step, never a credential).';
row.evidence =
  'src/config/credentialVault.ts (the ONE owner — the derived contract, the status vocabulary, the mask ' +
  'policy and the rules); src/lib/integrations/resolveCredentialVault.ts (the pure fail-closed resolver + the ' +
  'swappable store seam: empty / in-memory / durable); src/lib/commandCentre/controlCentre.ts (computes + ' +
  'exposes credentialVault); src/components/admin/FounderControlCentre.tsx (Brands view → Credential vault ' +
  '(T-7), Super-Admin only); gate scripts/validate-credential-vault.mjs (npm run validate:credential-vault, ' +
  '29 assertions, mutation-proved); e2e/founder-operating-system.spec.ts test 26 renders it live. REUSES the ' +
  'canonical field owner src/integrations/registry.ts (INTEGRATION_REGISTRY fields / authMethod) — the ' +
  'provider-specific fields are never re-declared.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§CREDENTIAL VAULT (T-7 / matrix D16-05) (2026-10-08) — STATUS RAISED not_started -> built (old values ` +
  `recorded inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD description: ` +
  `${JSON.stringify(OLD_DESCRIPTION)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ONE owner ` +
  `+ the pure fail-closed resolver over a swappable store seam; the provider-specific fields are DERIVED from ` +
  `the canonical integration registry and never re-declared. The DURABLE store is the ACTIVATION seam — the ` +
  `in-memory store held today is NOT durable, so no provider resolves as a production credential, and only a ` +
  `mask is ever read back. Surface declared in the E6 scope guard (CREDENTIAL_VAULT_SCOPE).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-08 by scripts/reconcile-credential-vault-registry.cjs after the §CREDENTIAL VAULT ' +
    '(T-7 / D16-05) increment (discovered-credential-vault not_started -> built; no row added or removed: ' +
    'total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log('[reconcile-credential-vault] discovered-credential-vault not_started -> built');
console.log('[reconcile-credential-vault] counts:', JSON.stringify(counts));
