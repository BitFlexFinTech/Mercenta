/**
 * §CREDENTIAL VAULT RESOLVER — the pure rules over the ONE owner, plus the
 * swappable STORE SEAM (T-7 / matrix D16-05).
 *
 * The owner (`src/config/credentialVault.ts`) declares the vault CONTRACT (one
 * contract per provider, DERIVED from the canonical registry) and the MASK
 * policy; this module applies them and holds NO secret value.
 *
 * It is PURE and DETERMINISTIC: no clock, no randomness, no network, no AI, no
 * filesystem. The durable STORE is INJECTED (`store`), so the resolver never
 * reaches for persistence itself — the Control Centre supplies the real store,
 * and a caller that supplies nothing gets the honest fail-closed default: a
 * NON-durable, empty store, so every provider resolves as `VAULT_NOT_STORED`.
 *
 * THE RULES IT ENFORCES (FAIL CLOSED), in this order:
 *   · a provider not declared in the contract is REFUSED (VAULT_PROVIDER_UNKNOWN);
 *   · a declared provider with no stored value is REFUSED (VAULT_NOT_STORED);
 *   · a stored but switched-OFF credential is REFUSED (VAULT_DISABLED);
 *   · a credential missing a required provider-specific secret field is REFUSED
 *     (VAULT_FIELD_MISSING);
 *   · a credential on a NON-DURABLE store is REFUSED (VAULT_NOT_DURABLE) — it is
 *     stored, but not production-grade, so it is never treated as a usable
 *     production credential;
 *   · only a declared, STORED, ENABLED credential with every required field on a
 *     DURABLE store is USABLE.
 *
 * A MASKED readback is the ONLY thing ever returned; the full value is never
 * reachable from here.
 */
import {
  CREDENTIAL_VAULT_BASIS,
  CREDENTIAL_VAULT_CONTRACTS,
  CREDENTIAL_VAULT_DISCLAIMER,
  CREDENTIAL_VAULT_RULES,
  ONE_CREDENTIAL_VAULT_OWNER,
  VAULT_FAILS_CLOSED,
  VAULT_MASKS_READBACK,
  VAULT_NEVER_EXPOSES_VALUE,
  VAULT_REUSES_PROVIDER_FIELD_OWNER,
  maskCredentialValue,
  type CredentialVaultContract,
  type CredentialVaultStatus,
} from '@/config/credentialVault';

const CONTRACT_BY_ID = new Map<string, CredentialVaultContract>(
  CREDENTIAL_VAULT_CONTRACTS.map((c) => [c.providerId, c])
);

/** True only when the value is a DECLARED vault provider id. */
export function isVaultProvider(value: string | null | undefined): boolean {
  return typeof value === 'string' && CONTRACT_BY_ID.has(value);
}

/** The canonical contract for a provider, or null (fail closed). */
export function findVaultContract(id: string | null | undefined): CredentialVaultContract | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  return CONTRACT_BY_ID.get(id) ?? null;
}

/** One credential held in the vault. NEVER carries the value — only a mask + handle. */
export interface CredentialVaultEntry {
  /** A `vault:` handle. The value itself lives in the durable store, not here. */
  secretRef: string;
  /** Display mask only, e.g. `•••• 4F2A`. */
  masked: string;
  storedAt: string;
  /** The operator can switch a stored credential OFF while keeping it configured. */
  enabled: boolean;
  /** The provider-specific secret field keys actually present for this credential. */
  fieldKeys: string[];
}

/**
 * The swappable STORE SEAM. `durable` is the property that separates a
 * production-grade vault from the in-memory placeholder the integration layer
 * holds today: a credential is USABLE only from a durable store.
 */
export interface CredentialVaultStore {
  readonly durable: boolean;
  get(providerId: string): CredentialVaultEntry | null;
}

/** The honest default: NOT durable and empty, so nothing resolves as usable. */
export function emptyCredentialVault(): CredentialVaultStore {
  return { durable: false, get: () => null };
}

/**
 * The in-memory store — the CURRENT reality, formally labelled NOT durable. A
 * credential on it is refused as a production credential, exactly as T-7
 * requires until the durable store exists.
 */
export function createInMemoryCredentialVault(
  seed: Record<string, CredentialVaultEntry> = {}
): CredentialVaultStore {
  const map = new Map(Object.entries(seed));
  return { durable: false, get: (id) => map.get(id) ?? null };
}

/**
 * A DURABLE store — the ACTIVATION shape (e.g. a server-side secret store). It is
 * supplied here only as a seam so the durable branch can be proved; wiring the
 * real persistence is an infrastructure step, never a credential.
 */
export function createDurableCredentialVault(
  seed: Record<string, CredentialVaultEntry> = {}
): CredentialVaultStore {
  const map = new Map(Object.entries(seed));
  return { durable: true, get: (id) => map.get(id) ?? null };
}

/* ── The decision ──────────────────────────────────────────────────────────── */

export type CredentialVaultRefusal =
  | 'VAULT_PROVIDER_UNKNOWN'
  | 'VAULT_NOT_STORED'
  | 'VAULT_DISABLED'
  | 'VAULT_FIELD_MISSING'
  | 'VAULT_NOT_DURABLE';

export interface CredentialVaultDecision {
  providerId: string;
  /** True only when the provider is declared in the vault contract. */
  declared: boolean;
  /** True only when the credential may be used as a production credential. */
  usable: boolean;
  refusal: CredentialVaultRefusal | null;
  reason: string;
  /** Masked readback only — null when nothing is stored, never the value. */
  masked: string | null;
}

export interface CredentialVaultContext {
  /** The vault store. Defaults to the honest non-durable, empty store. */
  store?: CredentialVaultStore;
}

function decide(
  providerId: string,
  declared: boolean,
  usable: boolean,
  refusal: CredentialVaultRefusal | null,
  reason: string,
  masked: string | null
): CredentialVaultDecision {
  return { providerId, declared, usable, refusal, reason, masked };
}

/** Apply the vault rules to ONE provider. Fail closed. */
export function resolveCredentialVault(
  providerId: string | null | undefined,
  context: CredentialVaultContext = {}
): CredentialVaultDecision {
  const store = context.store ?? emptyCredentialVault();
  const contract = findVaultContract(providerId);
  if (!contract) {
    return decide(
      typeof providerId === 'string' ? providerId : '',
      false,
      false,
      'VAULT_PROVIDER_UNKNOWN',
      'VAULT_PROVIDER_UNKNOWN — the provider is not declared in the vault contract, so nothing is stored or used for it.',
      null
    );
  }
  const entry = store.get(contract.providerId);
  if (!entry) {
    return decide(
      contract.providerId,
      true,
      false,
      'VAULT_NOT_STORED',
      'VAULT_NOT_STORED — no credential has been stored for this provider, so there is nothing to use.',
      null
    );
  }
  if (!entry.enabled) {
    return decide(
      contract.providerId,
      true,
      false,
      'VAULT_DISABLED',
      'VAULT_DISABLED — the credential is stored but switched OFF, so it is refused while its configuration is kept.',
      entry.masked
    );
  }
  const missing = contract.secretFieldKeys.filter((k) => !entry.fieldKeys.includes(k));
  if (missing.length > 0) {
    return decide(
      contract.providerId,
      true,
      false,
      'VAULT_FIELD_MISSING',
      `VAULT_FIELD_MISSING — the required secret field(s) are not present: ${missing.join(', ')}.`,
      entry.masked
    );
  }
  if (!store.durable) {
    return decide(
      contract.providerId,
      true,
      false,
      'VAULT_NOT_DURABLE',
      'VAULT_NOT_DURABLE — the credential is stored and enabled, but the store is in-memory (not durable), so it is refused as a production credential.',
      entry.masked
    );
  }
  return decide(
    contract.providerId,
    true,
    true,
    null,
    'USABLE — the provider is declared, a value is stored, the credential is enabled, every required field is present and the store is durable.',
    entry.masked
  );
}

/** The vault status a decision implies (for display). */
export function vaultStatusFor(decision: CredentialVaultDecision): CredentialVaultStatus {
  if (!decision.declared || decision.refusal === 'VAULT_NOT_STORED') return 'not_stored';
  if (decision.refusal === 'VAULT_DISABLED') return 'disabled';
  return 'stored';
}
/* ── The summary ───────────────────────────────────────────────────────────── */

export interface CredentialVaultProviderView {
  providerId: string;
  authMethod: 'oauth' | 'api_key';
  secretFieldKeys: string[];
  stored: boolean;
  usable: boolean;
  status: CredentialVaultStatus;
  refusal: CredentialVaultRefusal | null;
  masked: string | null;
  reason: string;
}

export interface CredentialVaultExample {
  providerId: string;
  usable: boolean;
  refusal: CredentialVaultRefusal | null;
  masked: string | null;
  reason: string;
}

export interface CredentialVaultSummary {
  providers: CredentialVaultProviderView[];
  providerCount: number;
  storedCount: number;
  usableCount: number;
  disabledCount: number;
  notStoredCount: number;
  durableStore: boolean;
  /** A live example that is USABLE (durable store + stored + enabled + fields). */
  exampleUsable: CredentialVaultExample;
  /** A live example REFUSED because the store is not durable (the current reality). */
  exampleNotDurable: CredentialVaultExample;
  oneOwner: boolean;
  reusesProviderFieldOwner: boolean;
  masksReadback: boolean;
  neverExposesValue: boolean;
  failsClosed: boolean;
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

const DEMO_STORED_AT = '2026-01-01T00:00:00.000Z';

/** A fully-valid demo entry for a contract — used only to prove the branches fire. */
function demoEntry(contract: CredentialVaultContract): CredentialVaultEntry {
  return {
    secretRef: `vault:${contract.providerId}-demo`,
    masked: maskCredentialValue('demo-credential-0000'),
    storedAt: DEMO_STORED_AT,
    enabled: true,
    fieldKeys: [...contract.secretFieldKeys],
  };
}

/** The first contract that actually carries a secret field — a realistic example. */
function exampleContract(): CredentialVaultContract {
  return (
    CREDENTIAL_VAULT_CONTRACTS.find((c) => c.secretFieldKeys.length > 0) ??
    CREDENTIAL_VAULT_CONTRACTS[0]
  );
}

function toExample(decision: CredentialVaultDecision): CredentialVaultExample {
  return {
    providerId: decision.providerId,
    usable: decision.usable,
    refusal: decision.refusal,
    masked: decision.masked,
    reason: decision.reason,
  };
}

/**
 * Summarise the vault for the founder surface. The counts and the two live
 * examples are DERIVED (computed, not written), so the surface shows the rules
 * actually firing rather than merely describing them.
 */
export function buildCredentialVaultSummary(
  context: CredentialVaultContext = {}
): CredentialVaultSummary {
  const store = context.store ?? emptyCredentialVault();
  const providers: CredentialVaultProviderView[] = CREDENTIAL_VAULT_CONTRACTS.map((c) => {
    const decision = resolveCredentialVault(c.providerId, { store });
    return {
      providerId: c.providerId,
      authMethod: c.authMethod,
      secretFieldKeys: c.secretFieldKeys,
      stored: decision.declared && decision.refusal !== 'VAULT_NOT_STORED',
      usable: decision.usable,
      status: vaultStatusFor(decision),
      refusal: decision.refusal,
      masked: decision.masked,
      reason: decision.reason,
    };
  });

  const ex = exampleContract();
  const usableDecision = resolveCredentialVault(ex.providerId, {
    store: createDurableCredentialVault({ [ex.providerId]: demoEntry(ex) }),
  });
  const notDurableDecision = resolveCredentialVault(ex.providerId, {
    store: createInMemoryCredentialVault({ [ex.providerId]: demoEntry(ex) }),
  });

  return {
    providers,
    providerCount: providers.length,
    storedCount: providers.filter((p) => p.stored).length,
    usableCount: providers.filter((p) => p.usable).length,
    disabledCount: providers.filter((p) => p.status === 'disabled').length,
    notStoredCount: providers.filter((p) => p.status === 'not_stored').length,
    durableStore: store.durable,
    exampleUsable: toExample(usableDecision),
    exampleNotDurable: toExample(notDurableDecision),
    oneOwner: ONE_CREDENTIAL_VAULT_OWNER,
    reusesProviderFieldOwner: VAULT_REUSES_PROVIDER_FIELD_OWNER,
    masksReadback: VAULT_MASKS_READBACK,
    neverExposesValue: VAULT_NEVER_EXPOSES_VALUE,
    failsClosed: VAULT_FAILS_CLOSED,
    rules: CREDENTIAL_VAULT_RULES,
    basis: CREDENTIAL_VAULT_BASIS,
    disclaimer: CREDENTIAL_VAULT_DISCLAIMER,
  };
}

