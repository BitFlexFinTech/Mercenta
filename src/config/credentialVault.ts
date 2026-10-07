/**
 * §CREDENTIAL VAULT — THE ONE OWNER (T-7 / matrix D16-05).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `discovered-credential-vault` records that the durable
 * credential architecture required by Founder decision T-7 — Super Admin ENTRY,
 * REPLACEMENT, SECURE PERSISTENCE, MASKED READBACK, VALIDATION, ENABLE/DISABLE
 * and PROVIDER-SPECIFIC CREDENTIAL FIELDS, with credentials NEVER exposed in the
 * frontend — is not implemented: the integration layer holds credentials in an
 * in-memory `Map` (`src/integrations/types.ts`) mirrored from `localStorage`,
 * which is not sufficient for production.
 *
 * What was already declared ONCE (and is therefore REUSED here, never
 * re-declared) is the PROVIDER-SPECIFIC FIELD contract: which integration
 * providers exist, whether each authenticates by OAuth or API key, and which
 * fields each requires (secret or not) already live in
 * `src/integrations/registry.ts` (`INTEGRATION_REGISTRY[...].fields` /
 * `.authMethod`). Re-declaring them here would create a second owner that drifts.
 *
 * This module is the ONE owner of the VAULT CONTRACT that was missing: it DERIVES,
 * per provider, the credential contract from the canonical registry, and declares
 * once the vault STATUS vocabulary, the MASK policy, the vault RULES and the
 * pinned invariants. It declares the CONTRACT — not any secret value, and not the
 * durable store itself (that is the activation seam, see the resolver).
 *
 * NO SECRET VALUE IS EVER STORED OR RETURNED HERE. The module is fully
 * deterministic: no AI, no clock, no randomness, no network.
 */
import {
  INTEGRATION_ORDER,
  INTEGRATION_REGISTRY,
} from '@/integrations/registry';
import type { AuthMethod, IntegrationId } from '@/integrations/types';

/* ── 1. The vault status vocabulary — declared once ───────────────────────── */

/**
 * The lifecycle of one provider's credential in the vault. `not_stored` is the
 * honest default (nothing has been entered); `pending_exchange` is an OAuth
 * authorisation code that has been captured but whose server-side token exchange
 * has not completed (the same state `IntegrationStatus = 'code_received'` records
 * on the connection); `stored` means a value has been entered and held as a
 * masked reference; `disabled` means the operator has switched the credential OFF
 * while keeping it configured.
 */
export type CredentialVaultStatus = 'not_stored' | 'pending_exchange' | 'stored' | 'disabled';

export const CREDENTIAL_VAULT_STATUS_LABELS: Record<CredentialVaultStatus, string> = {
  not_stored: 'Not stored',
  pending_exchange: 'Pending exchange',
  stored: 'Stored',
  disabled: 'Disabled',
};

/* ── 2. The mask policy — declared once ───────────────────────────────────── */

/**
 * How many trailing characters of a stored value may be shown in a MASKED
 * readback. The full value is NEVER returned by the vault to the frontend; only
 * this mask is, so an operator can recognise which credential is stored without
 * the platform ever exposing it. A value shorter than or equal to this length is
 * masked completely (nothing is revealed).
 */
export const VAULT_MASK_LAST_CHARS = 4;

/** The canonical masked readback for a value. The value itself never leaves here. */
export function maskCredentialValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= VAULT_MASK_LAST_CHARS) return '••••';
  return `•••• ${trimmed.slice(-VAULT_MASK_LAST_CHARS)}`;
}

/** A `vault:` reference is a HANDLE, never the value — the durable-store contract. */
export const VAULT_REF_PREFIX = 'vault:';

export function looksLikeVaultRef(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VAULT_REF_PREFIX);
}

/* ── 3. The vault contract, DERIVED from the canonical registry ────────────── */

export interface CredentialVaultContract {
  providerId: IntegrationId;
  /** OAuth (popup consent) or API key (a pasted value). REUSED from the registry. */
  authMethod: AuthMethod;
  /**
   * The provider-specific SECRET field keys the vault must hold for this
   * provider. DERIVED from `INTEGRATION_REGISTRY[providerId].fields` (the ONE
   * field owner) — never re-declared here. OAuth providers hold a server-side
   * `vault:` reference instead of field values, so their list is empty.
   */
  secretFieldKeys: string[];
  /**
   * Every provider stores a server-side `vault:` SECRET REFERENCE (a handle); the
   * value itself is written to the durable store and discarded from the record.
   * True for every provider by construction (T-7: never expose the value).
   */
  storesSecretRef: boolean;
}

/** The ONE vault contract per declared integration provider, DERIVED (not retyped). */
export const CREDENTIAL_VAULT_CONTRACTS: CredentialVaultContract[] = INTEGRATION_ORDER.map((id) => {
  const def = INTEGRATION_REGISTRY[id];
  return {
    providerId: id,
    authMethod: def.authMethod,
    secretFieldKeys: def.fields.filter((f) => f.secret).map((f) => f.key),
    storesSecretRef: true,
  };
});

/* ── 4. The declared rules, basis, disclaimer and pinned invariants ────────── */

export const CREDENTIAL_VAULT_RULES = [
  'Entry — a Super Admin enters the provider-specific fields through the existing connect wizard; the value is written to the durable store and immediately discarded from the record, which keeps only a `vault:` handle and a mask.',
  'Replacement — re-entering a credential REPLACES the stored handle rather than adding a second, so a provider never holds two live credentials at once.',
  'Secure persistence — a credential is USABLE only from a DURABLE store; the in-memory store the integration layer holds today is NOT durable, so a credential on it is refused rather than treated as production.',
  'Masked readback — only a mask (the last few characters) is ever returned; the full value is never exposed to the frontend, the audit trail, metadata or a report.',
  'Validation — a credential is VALID only when every provider-specific secret field the registry declares for that provider is present.',
  'Enable / disable — a stored credential can be switched OFF while keeping its configuration; a disabled credential is refused.',
  'Provider-specific fields — the fields are DERIVED from the canonical integration registry (the ONE field owner) and are never re-declared per surface.',
] as const;

export const CREDENTIAL_VAULT_BASIS =
  'The credential vault is declared once here: one contract per integration provider, DERIVED from the canonical registry (which providers exist, whether each is OAuth or API-key, and the secret fields each requires) — the fields are never re-declared. A credential is USABLE only when the provider is declared, a value is STORED, the credential is ENABLED, every required secret field is present, AND the store is DURABLE. The in-memory store the integration layer holds today is NOT durable, so a credential on it is refused rather than treated as production. Only a mask is ever read back — the value never leaves the durable store. It is deterministic — no AI, no clock.';

export const CREDENTIAL_VAULT_DISCLAIMER =
  'This declares the vault CONTRACT and the rule that decides when a credential may be used; it does not itself hold any secret. Until the durable store is activated (an infrastructure step, never a credential), no provider resolves as a production credential — none is asserted as usable, and no value is ever fabricated or exposed.';

/** Pinned invariants the gate asserts. */
export const ONE_CREDENTIAL_VAULT_OWNER = true;
export const VAULT_REUSES_PROVIDER_FIELD_OWNER = true;
export const VAULT_MASKS_READBACK = true;
export const VAULT_NEVER_EXPOSES_VALUE = true;
export const VAULT_FAILS_CLOSED = true;

/* ── 5. Module-load guards (fail closed) ───────────────────────────────────── */

function assertCredentialVaultIntegrity(): void {
  if (CREDENTIAL_VAULT_CONTRACTS.length === 0) {
    throw new Error('[credentialVault] at least one provider contract must be declared');
  }
  if (VAULT_MASK_LAST_CHARS < 1) {
    throw new Error('[credentialVault] the mask must reveal at least one character');
  }
  const ids = CREDENTIAL_VAULT_CONTRACTS.map((c) => c.providerId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('[credentialVault] two providers must not share a contract');
  }
  // COVERAGE: the contract must cover EXACTLY the canonical provider order, so a
  // newly-registered provider can never silently escape the vault.
  const declared = new Set<string>(ids);
  for (const id of INTEGRATION_ORDER) {
    if (!declared.has(id)) {
      throw new Error(`[credentialVault] the canonical provider "${id}" has no vault contract`);
    }
  }
  for (const c of CREDENTIAL_VAULT_CONTRACTS) {
    if (c.authMethod !== 'oauth' && c.authMethod !== 'api_key') {
      throw new Error(`[credentialVault] provider "${c.providerId}" declares an unknown auth method`);
    }
    const declaredFields = INTEGRATION_REGISTRY[c.providerId].fields.length;
    if (c.authMethod === 'api_key' && declaredFields > 0 && c.secretFieldKeys.length === 0) {
      throw new Error(
        `[credentialVault] the API-key provider "${c.providerId}" declares fields but none secret to store`
      );
    }
    if (c.authMethod === 'oauth' && c.secretFieldKeys.length > 0) {
      throw new Error(
        `[credentialVault] the OAuth provider "${c.providerId}" must not declare pasted secret fields`
      );
    }
    if (!c.storesSecretRef) {
      throw new Error(`[credentialVault] provider "${c.providerId}" must store a vault reference`);
    }
  }
}

assertCredentialVaultIntegrity();
