#!/usr/bin/env node
/**
 * §CREDENTIAL VAULT GATE (T-7 / matrix D16-05).
 *
 * The row `discovered-credential-vault` records that the durable credential
 * architecture required by Founder decision T-7 — Super Admin entry, replacement,
 * secure persistence, masked readback, validation, enable/disable and
 * provider-specific fields, with credentials never exposed in the frontend — is
 * not implemented. This increment adds the ONE owner
 * (`src/config/credentialVault.ts`) and the pure resolver
 * (`src/lib/integrations/resolveCredentialVault.ts`). The properties a comment
 * cannot guarantee are proved here:
 *
 *   · the contract is DERIVED from the canonical registry (one per provider, the
 *     ids EXACTLY the canonical order, the secret fields taken from the field
 *     owner — never re-declared);
 *   · the resolver FAILS CLOSED — an unknown provider, no stored value, a disabled
 *     credential, a missing required field and a NON-DURABLE store are ALL
 *     refused, while a declared, stored, enabled, complete credential on a DURABLE
 *     store is USABLE (every branch proved);
 *   · with the default (in-memory, empty) store NO provider is usable (nothing is
 *     treated as a production credential);
 *   · a MASKED readback is the only thing returned — the value never leaves;
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand
 *     import), USED by the Control Centre and RENDERED by the founder surface.
 *
 * Run: node scripts/validate-credential-vault.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const owner = await server.ssrLoadModule('/src/config/credentialVault.ts');
  const res = await server.ssrLoadModule('/src/lib/integrations/resolveCredentialVault.ts');
  const reg = await server.ssrLoadModule('/src/integrations/registry.ts');

  const contracts = owner.CREDENTIAL_VAULT_CONTRACTS;
  const order = reg.INTEGRATION_ORDER;

  console.log('\n── A. the declared contract ──');
  test('at least one provider contract is declared', contracts.length > 0, String(contracts.length));
  test('provider ids are unique', new Set(contracts.map((c) => c.providerId)).size === contracts.length);
  test('the contract covers EXACTLY the canonical provider order',
    equals(contracts.map((c) => c.providerId).sort(), [...order].sort()));
  test('every contract stores a vault reference and a known auth method',
    contracts.every((c) => c.storesSecretRef === true && (c.authMethod === 'oauth' || c.authMethod === 'api_key')));
  const emailDef = reg.INTEGRATION_REGISTRY.email;
  const emailContract = contracts.find((c) => c.providerId === 'email');
  test('the secret field keys are DERIVED from the canonical registry (email → api_key)',
    equals(emailContract.secretFieldKeys, emailDef.fields.filter((f) => f.secret).map((f) => f.key)) &&
      equals(emailContract.secretFieldKeys, ['api_key']));
  test('a provider with NO fields declares no secret field (dhl)',
    (contracts.find((c) => c.providerId === 'dhl')?.secretFieldKeys ?? ['x']).length === 0);

  console.log('\n── B. the mask policy (a value is never readable) ──');
  test('a longer value reveals only the last few characters',
    owner.maskCredentialValue('abcdef12') === '•••• ef12', owner.maskCredentialValue('abcdef12'));
  test('a short value is masked completely', owner.maskCredentialValue('ab') === '••••');
  test('a vault reference is recognised as a handle, not a value',
    owner.looksLikeVaultRef('vault:email-1') === true && owner.looksLikeVaultRef('sk_live_123') === false);

  const secretProvider = contracts.find((c) => c.secretFieldKeys.length > 0).providerId;
  const secretKeys = contracts.find((c) => c.providerId === secretProvider).secretFieldKeys;
  const entry = (over = {}) => ({
    secretRef: `vault:${secretProvider}-x`,
    masked: '•••• 0000',
    storedAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    fieldKeys: [...secretKeys],
    ...over,
  });
  const durable = (seed) => res.createDurableCredentialVault(seed);
  const memory = (seed) => res.createInMemoryCredentialVault(seed);
  const one = (seed, store) => res.resolveCredentialVault(secretProvider, { store: store(seed) });

  console.log('\n── C. the resolver FAILS CLOSED ──');
  test('an unknown provider is REFUSED (VAULT_PROVIDER_UNKNOWN)',
    res.resolveCredentialVault('not_a_provider', { store: durable({}) }).refusal === 'VAULT_PROVIDER_UNKNOWN');
  test('a declared provider with no stored value is REFUSED (VAULT_NOT_STORED)',
    one({}, durable).refusal === 'VAULT_NOT_STORED');
  test('a stored but DISABLED credential is REFUSED (VAULT_DISABLED)',
    one({ [secretProvider]: entry({ enabled: false }) }, durable).refusal === 'VAULT_DISABLED');
  test('a credential missing a required secret field is REFUSED (VAULT_FIELD_MISSING)',
    one({ [secretProvider]: entry({ fieldKeys: [] }) }, durable).refusal === 'VAULT_FIELD_MISSING');
  test('a credential on a NON-DURABLE store is REFUSED (VAULT_NOT_DURABLE)',
    one({ [secretProvider]: entry() }, memory).refusal === 'VAULT_NOT_DURABLE');
  test('a declared, stored, enabled, complete credential on a DURABLE store is USABLE',
    one({ [secretProvider]: entry() }, durable).usable === true && one({ [secretProvider]: entry() }, durable).refusal === null);
  test('the readback is a MASK only (the value is never returned)',
    one({ [secretProvider]: entry() }, durable).masked === '•••• 0000');

  console.log('\n── D. DETERMINISTIC — no AI / provider / network / random ──');
  const ownerSrc = read('src/config/credentialVault.ts');
  const resSrc = read('src/lib/integrations/resolveCredentialVault.ts');
  const banned = (s) =>
    /\bopenai\b|\banthropic\b|\bopenrouter\b|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date|\bimport\s*\(/i.test(s);
  test('neither the owner nor the resolver makes an AI / provider / network / random / dynamic-import call',
    !banned(ownerSrc) && !banned(resSrc));
  test('the owner fails closed at module load (guards present)',
    /at least one provider contract must be declared/.test(ownerSrc) &&
      /has no vault contract/.test(ownerSrc) &&
      /must not declare pasted secret fields/.test(ownerSrc));

  console.log('\n── E. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) =>
    /credentialVault|CredentialVault|resolveCredentialVault/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the credential vault', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── F. the founder summary (derived) ──');
  const summary = res.buildCredentialVaultSummary();               // default: empty, non-durable
  test('the summary covers every provider contract',
    summary.providerCount === contracts.length && summary.providers.length === contracts.length);
  test('with the default store NO provider is usable (nothing treated as production)',
    summary.usableCount === 0 && summary.storedCount === 0 && summary.durableStore === false);
  test('the live USABLE example fires (durable store + stored + enabled + complete)',
    summary.exampleUsable.usable === true && summary.exampleUsable.refusal === null);
  test('the live NOT-DURABLE example is REFUSED',
    summary.exampleNotDurable.refusal === 'VAULT_NOT_DURABLE' && summary.exampleNotDurable.usable === false);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.reusesProviderFieldOwner && summary.masksReadback && summary.neverExposesValue && summary.failsClosed);

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes credentialVault',
    /buildCredentialVaultSummary/.test(cc) && /credentialVault:\s*CredentialVaultSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the credential vault section',
    /control-credential-vault-list/.test(fcc) && /model\.credentialVault/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  test('an unknown-provider decision REFUSES — proves the refused branch works',
    res.resolveCredentialVault('', { store: memory({}) }).refusal === 'VAULT_PROVIDER_UNKNOWN');
} catch (err) {
  console.error('CREDENTIAL_VAULT_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
