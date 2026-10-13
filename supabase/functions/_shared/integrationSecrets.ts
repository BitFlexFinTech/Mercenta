/**
 * §PHASE B (2026-10-13) — WHICH PROVIDERS MAY BE ASKED ABOUT, SERVER-SIDE.
 *
 * This is a deliberate ALLOWLIST, not a convenience list. The
 * `integration-secrets-status` function accepts a caller-supplied provider list,
 * so without this allowlist any authenticated operator could ask the server to
 * probe arbitrary Vault names — turning a harmless status endpoint into a
 * name-disclosure surface. Only these providers may be probed.
 *
 * DO NOT EDIT THIS LIST BY HAND IN ISOLATION. The CLIENT registry
 * (`src/integrations/registry.ts → INTEGRATION_META[…].serverSecretName`) is the
 * owner of the same fact, and `scripts/validate-integration-proxy.mjs` FAILS if
 * the two disagree — so the two can never drift apart silently.
 *
 * The naming comes from `credentialSecretName()` in `./vault.ts`, so a secret
 * written by the Integrations connect wizard is discoverable here by
 * construction, rather than by a second hand-maintained naming rule.
 */
import { credentialSecretName, vaultSecretRef } from './vault.ts';

/** The providers whose keys may be held server-side, in Vault. */
export const INTEGRATION_SECRET_PROVIDERS: readonly string[] = [
  'email',
  'openrouter',
  'hunter',
  'instantly',
];

/**
 * The Vault name PREFIX under which this provider's credential is stored. The
 * connect wizard may store `integration_openrouter` or
 * `integration_openrouter_<provider>` depending on the provider sub-key, so the
 * status check matches on the prefix and reports presence if either exists.
 */
export function secretPrefixFor(integrationId: string): string {
  /* Derived from the SAME function the wizard writes with — never retyped. */
  return credentialSecretName(integrationId, '');
}

/** A full reference (for callers that have an exact name, not a prefix). */
export function secretRefFor(integrationId: string): string {
  return vaultSecretRef(credentialSecretName(integrationId, ''));
}
