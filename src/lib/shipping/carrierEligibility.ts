/**
 * §WAVE 3 — CARRIER ELIGIBILITY DERIVATION.
 *
 * WHY THIS EXISTS
 * ---------------
 * `carrierRouting.ts` answers "which Mercenta account does the lane rule
 * select?" — a declared lane rule. The Logistics Hub additionally has to answer
 * "which carriers may ACTUALLY be used for this consignment, given what the
 * business has declared and what state each provider is really in?" That is a
 * DERIVATION over:
 *
 *   · the freight term (Collect / WE-PAY vs prepaid) — who arranges carriage;
 *   · the lane (UK domestic vs international), from the brand's nation, the
 *     consignment origin and the destination;
 *   · the declared lane capability of each Mercenta carrier account
 *     (`src/config/shipping.ts → MERCENTA_CARRIER_LANE_CAPABILITY`);
 *   · the AUTHORITATIVE provider state for each carrier
 *     (`src/integrations/types.ts → resolveProviderMode`);
 *   · an optionally declared service requirement (parcel / palletised).
 *
 * FAIL CLOSED ON PROVIDER STATE
 * -----------------------------
 * A carrier is selectable ONLY when its provider mode positively resolves to an
 * OPERATIONAL state (`simulation` or `live`). Every other state — `disabled`,
 * `error`, `degraded`, `configuring`, `available`, `unknown`, `not_registered` —
 * is refused, with the actual state named in the reason. Availability is NOT
 * eligibility, and an unknown provider never becomes eligible (or simulated).
 *
 * WHAT IS *NOT* INVENTED HERE
 * ---------------------------
 * No carrier capability is invented. The declared capabilities come from the
 * canonical business model (international → DHL; UK domestic → Palletline), and
 * the "other" Mercenta account is offered only as an AUDITED ADMIN OVERRIDE
 * candidate — exactly the contract `validateCarrierForShipment` already
 * documents and `validate-logistics-map.mjs` already asserts.
 */
import type { CarrierId, FreightTerm, ShippingLane } from '@/types';
import {
  AMAZON_PARTNERED_CARRIER,
  MERCENTA_CARRIER_ACCOUNTS,
  MERCENTA_CARRIER_LANE_CAPABILITY,
  SHIPPING_CARRIER_ROUTING,
  SHIPPING_LANE_LABELS,
} from '@/config/shipping';
import {
  resolveProviderMode,
  type IntegrationId,
  type IntegrationMode,
  type ProviderResolutionMode,
} from '@/integrations/types';
import { resolveShippingLane } from '@/lib/shipping/carrierRouting';

/** Is the id one of Mercenta's own carrier accounts? (local, no cycle.) */
function isCanonicalMercentaAccount(carrier: string): boolean {
  return (MERCENTA_CARRIER_ACCOUNTS as readonly string[]).includes(carrier);
}

export type CarrierService = 'parcel' | 'palletised';

export interface CarrierEligibilityInput {
  brandNation?: string | null;
  originCountry?: string | null;
  /** Consignment destination, when declared (UK FC destinations are domestic). */
  destinationCountry?: string | null;
  freightTerm?: FreightTerm;
  /** The AUTHORITATIVE provider modes (IntegrationsContext `modes`). */
  providerModes: Partial<Record<IntegrationId, IntegrationMode>>;
  /** Optional declared service requirement; absent = no service constraint. */
  service?: CarrierService;
}

export interface BlockedCarrier {
  carrier: CarrierId;
  /** The provider state that blocked it, or the capability mismatch. */
  reason: string;
}

export interface CarrierEligibility {
  lane: ShippingLane;
  /** True when the retail channel arranges carriage (Collect / WE-PAY). */
  channelArranged: boolean;
  /** The only carrier value permitted on a channel-arranged PO. */
  channelArrangedCarrier: string | null;
  /** The lane's declared Mercenta account (null when channel-arranged). */
  primary: CarrierId | null;
  /** Carriers selectable for this consignment, right now. */
  permitted: CarrierId[];
  /** Selectable ONLY as an attributed, audited admin override. */
  overrideCandidates: CarrierId[];
  /** Carriers refused, each with the actual reason. */
  blocked: BlockedCarrier[];
  /** Human-readable derivation trail (rendered, never hidden). */
  rationale: string[];
}

/** The mode states in which a carrier may actually be used. */
const OPERATIONAL_MODES: readonly ProviderResolutionMode[] = ['simulation', 'live'];

/** Is the provider positively in an operational state? */
export function isCarrierOperational(mode: ProviderResolutionMode): boolean {
  return OPERATIONAL_MODES.includes(mode);
}

/** A truthful label for why a provider state blocks selection. */
export function carrierStateReason(mode: ProviderResolutionMode): string {
  if (mode === 'disabled') return 'the provider is disabled for this workspace';
  if (mode === 'error') return 'the provider is in an error state';
  if (mode === 'degraded') return 'the provider is degraded (connected with errors) — refused fail-closed';
  if (mode === 'configuring') return 'the provider is still configuring';
  if (mode === 'available') return 'the provider is registered but not configured — no adapter is active';
  if (mode === 'not_registered') return 'the provider is not registered';
  return 'the provider state is unknown — never treated as operational';
}

export function providerModeFor(
  providerModes: Partial<Record<IntegrationId, IntegrationMode>>,
  carrier: CarrierId
): ProviderResolutionMode {
  return resolveProviderMode(providerModes, carrier);
}

/**
 * Derive carrier eligibility for a consignment.
 *
 * Deterministic and side-effect free: same inputs → same result. It performs no
 * network call and never activates a provider.
 */
export function deriveCarrierEligibility(input: CarrierEligibilityInput): CarrierEligibility {
  const rationale: string[] = [];
  const blocked: BlockedCarrier[] = [];

  /**
   * The lane is resolved from the brand's nation first, then the consignment
   * origin, then the destination — the SAME precedence the routing rule uses, so
   * the two can never disagree.
   */
  const lane = resolveShippingLane({
    brandNation: input.brandNation,
    originCountry: input.originCountry ?? input.destinationCountry,
  });
  rationale.push(
    `Lane: ${SHIPPING_LANE_LABELS[lane]} — from ${
      input.brandNation
        ? `brand nation (${input.brandNation})`
        : input.originCountry
          ? `consignment origin (${input.originCountry})`
          : 'an undeclared origin (conservative international default)'
    }.`
  );

  /* ── Collect / WE-PAY: the channel arranges carriage ───────────────────── */
  if (input.freightTerm === 'collect') {
    rationale.push(
      'Freight Collect (WE-PAY): the retail channel selects and books the carrier, so the partnered-carrier value is the permitted value and Mercenta does not choose the carrier.'
    );
    /**
     * THE CANONICAL CONTRACT, PRESERVED (asserted by
     * `scripts/validate-logistics-map.mjs`): a Mercenta account on a collect PO is
     * NOT auto-refused — it is permitted ONLY as an attributed, audited admin
     * override. The provider-state gate still applies to it, so a disabled /
     * erroring / unknown provider is refused even as an override.
     */
    const overrideCandidates: CarrierId[] = [];
    for (const carrier of MERCENTA_CARRIER_ACCOUNTS) {
      const mode = providerModeFor(input.providerModes, carrier);
      if (!isCarrierOperational(mode)) {
        blocked.push({ carrier, reason: carrierStateReason(mode) });
        continue;
      }
      overrideCandidates.push(carrier);
      rationale.push(
        `${carrier} is NOT selected on this PO (channel-arranged) — usable only as an attributed, audited admin override.`
      );
    }
    return {
      lane,
      channelArranged: true,
      channelArrangedCarrier: AMAZON_PARTNERED_CARRIER,
      primary: null,
      permitted: [],
      overrideCandidates,
      blocked,
      rationale,
    };
  }

  /* ── Prepaid: Mercenta arranges carriage ──────────────────────────────── */
  const primary = SHIPPING_CARRIER_ROUTING[lane];
  const permitted: CarrierId[] = [];
  const overrideCandidates: CarrierId[] = [];

  for (const carrier of MERCENTA_CARRIER_ACCOUNTS) {
    const capability = MERCENTA_CARRIER_LANE_CAPABILITY[carrier];

    /**
     * HARD REFUSAL — the provider must be positively operational. A provider
     * that is disabled, erroring, degraded, still configuring, merely available,
     * unregistered or unknown is NEVER eligible: availability is not eligibility,
     * and an unknown provider must never silently become selectable (or
     * simulated).
     */
    const mode = providerModeFor(input.providerModes, carrier);
    if (!isCarrierOperational(mode)) {
      blocked.push({ carrier, reason: carrierStateReason(mode) });
      continue;
    }

    const coversLane = capability.lanes.includes(lane);
    const coversService = !input.service || capability.services.includes(input.service);

    if (coversLane && coversService && carrier === primary) {
      permitted.push(carrier);
      continue;
    }

    /**
     * NOT the declared account for this lane (or its declared service does not
     * cover this consignment). It stays usable ONLY as an attributed, audited
     * admin override — the existing documented contract of
     * `validateCarrierForShipment`, preserved here rather than replaced.
     */
    overrideCandidates.push(carrier);
    if (!coversLane) {
      rationale.push(
        `${carrier} does not declare ${SHIPPING_LANE_LABELS[lane]} capability (${capability.label}) — usable only as an attributed admin override.`
      );
    } else if (!coversService) {
      rationale.push(
        `${carrier} does not declare capability for a ${input.service} consignment — usable only as an attributed admin override.`
      );
    }
  }

  rationale.push(
    `Mercenta arranges carriage on the ${SHIPPING_LANE_LABELS[lane]} lane: ${primary} is the lane's declared account.`
  );
  if (permitted.length === 0) {
    rationale.push(
      'NO Mercenta account is currently operational on this lane — no carrier may be selected until a provider state positively resolves to simulation or live.'
    );
  }
  for (const entry of blocked) {
    rationale.push(`Refused ${entry.carrier}: ${entry.reason}.`);
  }

  return {
    lane,
    channelArranged: false,
    channelArrangedCarrier: null,
    primary: permitted.length > 0 ? primary : null,
    permitted,
    overrideCandidates,
    blocked,
    rationale,
  };
}

/** The carrier value the lane rule expects (or the channel-arranged carrier). */
export function expectedCarrierForEligibility(eligibility: CarrierEligibility): string | null {
  return eligibility.channelArranged
    ? eligibility.channelArrangedCarrier
    : (eligibility.primary ?? null);
}

/**
 * May THIS carrier be selected for THIS consignment?
 *
 * The active mode is reported truthfully — a simulated booking is never
 * described as live.
 */
export function isCarrierSelectable(
  input: CarrierEligibilityInput & { carrier: string }
): { ok: boolean; error?: string; mode?: ProviderResolutionMode; overridden?: boolean } {
  const eligibility = deriveCarrierEligibility(input);

  if (eligibility.channelArranged) {
    if (input.carrier === AMAZON_PARTNERED_CARRIER) {
      return { ok: true, mode: providerModeFor(input.providerModes, 'dhl') };
    }
    /**
     * CANONICAL CONTRACT (preserved): a Mercenta account IS valid on a collect PO,
     * but only as an attributed, audited admin override — the channel-arranged
     * carrier remains the value the rule expects. A provider that is not
     * operational is refused (it is absent from `overrideCandidates`).
     */
    const overridden = eligibility.overrideCandidates.find((c) => c === input.carrier);
    if (overridden) {
      return { ok: true, overridden: true, mode: providerModeFor(input.providerModes, overridden) };
    }
    if (isCanonicalMercentaAccount(input.carrier)) {
      const refusal = eligibility.blocked.find((b) => b.carrier === input.carrier);
      return {
        ok: false,
        error: `Carrier "${input.carrier}" is not eligible: ${refusal ? refusal.reason : 'the provider state is not operational'}.`,
      };
    }
    return {
      ok: false,
      error:
        'This PO is Freight Collect — the retail channel arranges the carrier, so only the partnered carrier or a Mercenta account (as an attributed admin override) may be used here.',
    };
  }

  if (input.carrier === AMAZON_PARTNERED_CARRIER) {
    return {
      ok: false,
      error:
        'The partnered carrier may only be used on retail-channel-arranged (Freight Collect) purchase orders.',
    };
  }

  const carrier = input.carrier as CarrierId;
  if (eligibility.overrideCandidates.includes(carrier)) {
    return { ok: true, overridden: true, mode: providerModeFor(input.providerModes, carrier) };
  }
  if (eligibility.permitted.includes(carrier)) {
    return { ok: true, mode: providerModeFor(input.providerModes, carrier) };
  }

  const refusal = eligibility.blocked.find((entry) => entry.carrier === carrier);
  if (refusal) {
    return { ok: false, error: `Carrier "${input.carrier}" is not eligible: ${refusal.reason}.` };
  }
  return { ok: false, error: `Carrier "${input.carrier}" is not a Mercenta carrier account.` };
}
