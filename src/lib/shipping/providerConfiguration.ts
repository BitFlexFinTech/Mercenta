/**
 * §P10 (programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P10)
 * — CARRIER PROVIDER CONFIGURATION.
 *
 * WHY THIS EXISTS
 * ---------------
 * Matrix `D10-10` lists **provider configuration** as part of the target Brand/Admin
 * logistics workspace and records it as outstanding. Every input it needs already has
 * an owner that a surface must never re-derive by hand:
 *
 *   · which Mercenta account is used for which lane, what each account is called and
 *     what it is declared capable of → `src/config/shipping.ts`;
 *   · whether a provider is registered, its category/default mode, and the mode
 *     derivation → `src/integrations/registry.ts` + `types.ts` (`modeForState`);
 *   · the live connection state per provider → `IntegrationsContext` (the Integrations
 *     Hub owns credentials).
 *
 * This module is the ONE projection of those owners into the logistics workspace. It
 * introduces **no second routing table, no second mode model and no credential store**.
 *
 * FAIL CLOSED
 * -----------
 * A carrier is OPERATIONAL only when its mode positively resolves to `simulation` or
 * `live`. Every other state — `available`, `configuring`, `disabled`, `degraded`,
 * `error`, `unknown`, `not_registered` — is NOT operational and is named with its exact
 * reason. "Available" is never presented as simulation, and an unknown provider is never
 * presented as a working account.
 *
 * WHO CONFIGURES WHAT (the business rule, declared once)
 * -----------------------------------------------------
 * Mercenta holds the carrier accounts. A **brand never configures a carrier** and never
 * chooses one: the lane decides (programme §1–§2). Credentials are Mercenta's and are
 * entered in the Integrations Hub, which activates the already-built adapter with no code
 * change. Nothing here exposes Mercenta's cost base: the negotiated discount, mark-up,
 * fees and VAT are shipping-commercial terms (`SHIPPING_COMMERCIAL_TERMS`) and are
 * deliberately NOT part of a provider configuration record.
 */
import type { CarrierId, ShippingLane } from '@/types';
import {
  MERCENTA_CARRIER_ACCOUNTS,
  MERCENTA_CARRIER_LABELS,
  MERCENTA_CARRIER_LANE_CAPABILITY,
  SHIPPING_CARRIER_ROUTING,
  SHIPPING_LANE_LABELS,
  isRetiredCarrier,
} from '@/config/shipping';
import { INTEGRATION_REGISTRY } from '@/integrations/registry';
import {
  resolveProviderMode,
  type IntegrationId,
  type IntegrationMode,
  type IntegrationState,
  type ProviderResolutionMode,
} from '@/integrations/types';

/** The carrier accounts this module describes — the canonical declared list. */
export const CONFIGURABLE_CARRIER_PROVIDERS: readonly CarrierId[] =
  MERCENTA_CARRIER_ACCOUNTS as readonly CarrierId[];

/**
 * The ONLY modes in which a carrier account may perform an operation. Stated here so
 * the configuration surface and `carrierEligibility`'s derivation cannot disagree.
 */
const OPERATIONAL_MODES: readonly ProviderResolutionMode[] = ['simulation', 'live'];

export function isProviderOperational(mode: ProviderResolutionMode): boolean {
  return OPERATIONAL_MODES.includes(mode);
}

/** Truthful label for a provider state — never "live" for anything unverified. */
export function providerStateLabel(mode: ProviderResolutionMode): string {
  switch (mode) {
    case 'live':
      return 'Live — verified connection';
    case 'simulation':
      return 'Simulation — no live carrier call';
    case 'available':
      return 'Not configured';
    case 'configuring':
      return 'Connection in progress';
    case 'disabled':
      return 'Disabled by an operator';
    case 'degraded':
      return 'Degraded — needs attention';
    case 'error':
      return 'Error — last connection attempt failed';
    default:
      return 'Unknown provider — never treated as simulation';
  }
}

export interface CarrierProviderConfiguration {
  carrier: CarrierId;
  /** The registry id is the carrier id — one identity, no mapping table. */
  providerId: IntegrationId;
  /** Mercenta's own account label (e.g. "DHL Express (Mercenta account)"). */
  accountLabel: string;
  /** The declared lane/service capability of the account. */
  capabilityLabel: string;
  /** Every lane the account declares capability for. */
  lanes: readonly ShippingLane[];
  laneLabels: readonly string[];
  /**
   * The lanes whose canonical routing rule selects THIS account as the lane's
   * account (declared in `SHIPPING_CARRIER_ROUTING`, never re-derived here).
   */
  routingLanes: readonly ShippingLane[];
  /** parcel / palletised, as declared on the account. */
  services: readonly ('parcel' | 'palletised')[];
  mode: ProviderResolutionMode;
  /** True ONLY for a positively operational state (simulation | live). */
  operational: boolean;
  stateLabel: string;
  /** WHY the state is what it is (connection state + which owner derived it). */
  basis: string;
  /** The tool that owns the credential — never a second credential path. */
  controlPlane: string;
  /** What turns this provider live (a credentials-only step). */
  activation: string;
  /** The relationship of the account — declared, not implied. */
  configurationOwner: 'mercenta';
  /** A brand can never choose or configure a carrier account. */
  brandConfigurable: false;
}

export interface CarrierProviderConfigurationInput {
  /** The AUTHORITATIVE provider modes (`IntegrationsContext.modes`). */
  modes: Partial<Record<IntegrationId, IntegrationMode>>;
  /** Optional non-secret connection state, used to state the BASIS truthfully. */
  connections?: Partial<Record<IntegrationId, IntegrationState>>;
}

/** The connection-state sentence: the basis the mode was derived from. */
function basisFor(state: IntegrationState | undefined, mode: ProviderResolutionMode): string {
  if (!state) {
    return `No connection record is held for this provider, so its declared default mode (${mode}) applies.`;
  }
  if (state.disabled) {
    return 'An operator has disabled this provider; its configuration is kept, but it cannot operate.';
  }
  switch (state.status) {
    case 'connected':
      return state.sandbox
        ? 'Connected in sandbox — the mode derives to simulation, never to live.'
        : 'Connected with a verified non-sandbox connection.';
    case 'connecting':
      return 'A connection attempt is in progress; the provider is not operational until it completes.';
    case 'code_received':
      return 'An authorization code was received; the server-side exchange has not completed.';
    case 'needs_attention':
      return state.error
        ? `The last connection attempt failed: ${state.error}`
        : 'The connection needs attention before the provider can operate.';
    default:
      return 'No verified connection is held, so the provider cannot perform an operation.';
  }
}

function routingLanesFor(carrier: CarrierId): ShippingLane[] {
  return (Object.keys(SHIPPING_CARRIER_ROUTING) as ShippingLane[]).filter(
    (lane) => SHIPPING_CARRIER_ROUTING[lane] === carrier
  );
}

/**
 * Configure ONE account. A retired carrier id (decision 1) is NOT configurable and is
 * refused by name rather than described as an account Mercenta holds.
 */
export function carrierProviderConfiguration(
  carrier: CarrierId | string,
  input: CarrierProviderConfigurationInput
): CarrierProviderConfiguration {
  if (isRetiredCarrier(carrier)) {
    throw new Error(
      `Carrier "${carrier}" is retired: it is not a Mercenta account and has no configuration.`
    );
  }
  if (!(MERCENTA_CARRIER_ACCOUNTS as readonly string[]).includes(carrier)) {
    throw new Error(`Carrier "${carrier}" is not a declared Mercenta carrier account.`);
  }
  const account = carrier as CarrierId;
  const capability = MERCENTA_CARRIER_LANE_CAPABILITY[account];
  const mode = resolveProviderMode(input.modes, account);
  const state = input.connections?.[account];
  return {
    carrier: account,
    providerId: account,
    accountLabel: MERCENTA_CARRIER_LABELS[account],
    capabilityLabel: capability.label,
    lanes: capability.lanes,
    laneLabels: capability.lanes.map((lane) => SHIPPING_LANE_LABELS[lane]),
    routingLanes: routingLanesFor(account),
    services: capability.services,
    mode,
    operational: isProviderOperational(mode),
    stateLabel: providerStateLabel(mode),
    basis: basisFor(state, mode),
    controlPlane: `${INTEGRATION_REGISTRY[account].name} in the Integrations Hub (Mercenta credentials)`,
    activation:
      'Entering the verified account credential in the Integrations Hub activates the existing adapter — no code change.',
    configurationOwner: 'mercenta',
    brandConfigurable: false,
  };
}

/** Every Mercenta carrier account, in the canonical declared order. */
export function carrierProviderConfigurations(
  input: CarrierProviderConfigurationInput
): CarrierProviderConfiguration[] {
  return CONFIGURABLE_CARRIER_PROVIDERS.map((carrier) =>
    carrierProviderConfiguration(carrier, input)
  );
}

/**
 * The brand-facing rule, declared once so two surfaces cannot phrase it differently: the
 * account model, who configures it, and that the lane — not the brand — decides.
 */
export const BRAND_PROVIDER_CONFIGURATION_NOTICE =
  'Mercenta holds and configures these carrier accounts. The lane decides which account is used, so a brand never selects or configures a carrier, and never holds its credentials.';
