/**
 * §PHASE 1 — PRE-AUDIT RESEARCH SEAM (mock-first, fail-closed, ZERO network).
 *
 * THE seam between the assessment and whatever research can actually be done.
 * Two implementations, one interface:
 *
 *   MockPreAuditResearchProvider — deterministic simulation over the declared
 *     fixtures. Runs whenever live research is not configured. Performs ZERO
 *     network calls and labels itself `simulated` everywhere.
 *
 *   RealPreAuditResearchProvider — the real integration. It resolves its
 *     availability from the CANONICAL integration registry (`firecrawl`,
 *     `keepa`, `amazon_sp_api`) rather than keeping its own mode map, so the
 *     pre-audit can never claim a live source the platform itself reports as
 *     simulated/unconfigured. With no live provider it REFUSES — it never
 *     fabricates a result to look successful.
 *
 * NON-NEGOTIABLE RULES
 * -------------------
 * - AN UNKNOWN PROVIDER IS NEVER SIMULATION. Availability is resolved through
 *   `defaultIntegrationMode` + `isProviderSimulationSafe`, the SAME fail-closed
 *   helpers the rest of the platform uses.
 * - NO CLIENT-SIDE SECRET. The real provider takes its credential from a
 *   SERVER-SIDE seam (`preAuditResearchCredentialSeam`), which is absent in
 *   this build. It NEVER reads a `VITE_*` variable.
 * - ZERO NETWORK IN SIMULATION. `networkCalls` is a declared, asserted 0.
 * - A REFUSAL IS EXPLICIT. `ok: false` always carries a human reason; there is
 *   no path that returns `ok: true` with fabricated content.
 */
import { defaultIntegrationMode } from '@/integrations/registry';
import { isProviderSimulationSafe, type ProviderResolutionMode } from '@/integrations/types';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { demoToday } from '@/lib/work/workStore';
import {
  PRE_AUDIT_RESEARCH_SOURCES,
  type PreAuditResearchSourceId,
} from '@/config/ukMarketFit';
import {
  fixtureIsLabelledSimulation,
  selectPreAuditFixture,
  type PreAuditResearchFixture,
} from './fixtures';

export type PreAuditResearchMode = 'simulation' | 'live' | 'unconfigured';

export interface PreAuditResearchRequest {
  brandName: string;
  website: string;
  country: string;
  category: string;
  productName?: string;
  productIdentifiers?: string[];
  origin?: string;
}

/** One declared source the seam consulted, with its HONEST state. */
export interface PreAuditResearchSourceUsage {
  id: PreAuditResearchSourceId;
  label: string;
  /** The canonical provider mode, when the source is backed by one. */
  providerMode: ProviderResolutionMode | null;
  used: boolean;
  /** Why it was or was not used. */
  note: string;
}

export interface PreAuditResearchResult {
  ok: boolean;
  mode: PreAuditResearchMode;
  providerId: string;
  /** Human reason. ALWAYS populated — including on success. */
  reason: string;
  /** True only when the content is deterministic simulation. */
  simulated: boolean;
  /** Present only for a simulated result. */
  fixture: PreAuditResearchFixture | null;
  sources: PreAuditResearchSourceUsage[];
  observedAt: string;
  /** Declared, asserted: the seam performs no network I/O. */
  networkCalls: 0;
}

export interface PreAuditResearchProvider {
  readonly id: string;
  readonly label: string;
  readonly mode: PreAuditResearchMode;
  /** True ONLY when this provider genuinely produces simulated content. */
  readonly simulation: boolean;
  fetchBrandResearch(request: PreAuditResearchRequest): Promise<PreAuditResearchResult>;
}

/* ── Declared source → canonical provider mapping (no second mode map) ────── */

const SOURCE_PROVIDER: Record<PreAuditResearchSourceId, string | null> = {
  brand_website: 'firecrawl',
  marketplace_listing_data: 'keepa',
  marketplace_api: 'amazon_sp_api',
  product_research_provider: 'keepa',
  company_register: 'companies_house',
  public_product_data: null,
};

function sourceUsage(): PreAuditResearchSourceUsage[] {
  return PRE_AUDIT_RESEARCH_SOURCES.map((s) => {
    const providerId = SOURCE_PROVIDER[s.id];
    const providerMode = providerId ? defaultIntegrationMode(providerId) : null;
    return {
      id: s.id,
      label: s.label,
      providerMode,
      used: false,
      /**
       * §PUBLIC MESSAGING B6 (2026-09-29) — THE NOTE IS A PUBLIC STRING, so it no
       * longer names the vendor behind a source or the registry mode that vendor
       * resolves to. It used to read `Backed by the canonical "firecrawl"
       * provider, which resolves to "available".` and this note is RENDERED on
       * the public assessment ("Source consulted: …"), which published the list
       * of services Mercenta buys — the leak the red-line family
       * `service-suppliers` exists to stop.
       *
       * The vendor id and its mode are still recorded in the DATA above
       * (`providerId`/`providerMode`) and still asserted by
       * `scripts/validate-uk-market-fit.mjs`; only the public sentence changed.
       */
      note: providerId
        ? 'A declared research source. Nothing has been fetched from it yet.'
        : 'Not backed by a registered provider — public data only.',
    };
  });
}

/** Every declared source that would need to be live before a real run is possible. */
export function preAuditLiveResearchReadiness(): {
  ready: boolean;
  liveProviders: string[];
  blockedProviders: { provider: string; mode: ProviderResolutionMode }[];
  reason: string;
} {
  const needed = ['firecrawl', 'keepa', 'amazon_sp_api'] as const;
  const blocked: { provider: string; mode: ProviderResolutionMode }[] = [];
  const live: string[] = [];
  for (const provider of needed) {
    const mode = defaultIntegrationMode(provider);
    if (mode === 'live') live.push(provider);
    else blocked.push({ provider, mode });
  }
  return {
    ready: blocked.length === 0,
    liveProviders: live,
    blockedProviders: blocked,
    reason:
      blocked.length === 0
        ? 'Every declared research provider resolves to live.'
        : `Live research is not configured: ${blocked
            .map((b) => `${b.provider} resolves to "${b.mode}"`)
            .join(', ')}.`,
  };
}

/* ── The mock (simulation) provider ──────────────────────────────────────── */

export class MockPreAuditResearchProvider implements PreAuditResearchProvider {
  readonly id = 'preaudit-mock-research';
  readonly label = 'Deterministic research simulation';
  readonly mode: PreAuditResearchMode = 'simulation';
  readonly simulation = true;

  /**
   * The DETERMINISTIC primitive: the same request always yields the same fixture
   * and the same result, with zero network I/O. Synchronous so a deterministic
   * in-process caller (the demo seed) uses the SAME implementation as the async
   * seam rather than duplicating it.
   */
  researchSync(request: PreAuditResearchRequest): PreAuditResearchResult {
    const brandKey = normalizeBrandKey(request.brandName);
    const fixture = selectPreAuditFixture(brandKey || 'unnamed-brand');
    const labelled = fixtureIsLabelledSimulation(fixture);
    const sources = sourceUsage().map((s) => ({
      ...s,
      used: labelled,
      note: labelled
        ? `${s.note} SIMULATED — the fixture supplies the observed values; nothing was fetched.`
        : s.note,
    }));
    return {
      ok: labelled,
      mode: 'simulation',
      providerId: this.id,
      reason: labelled
        ? `Deterministic simulation: fixture ${fixture.fixtureId} supplied the observed values. No live source was contacted.`
        : 'The selected fixture is not labelled as simulation, so it was refused rather than used.',
      simulated: true,
      fixture: labelled ? fixture : null,
      sources,
      observedAt: demoToday(),
      networkCalls: 0,
    };
  }

  async fetchBrandResearch(request: PreAuditResearchRequest): Promise<PreAuditResearchResult> {
    return this.researchSync(request);
  }
}

/* ── The real provider — refuses until its providers are genuinely live ──── */

/**
 * The server-side credential seam. There is no server-side research endpoint in
 * this build, so it resolves to `null` and the real provider cannot run. It
 * NEVER reads a `VITE_*` variable: a provider secret must never reach the
 * browser. Wiring the credential is an activation step, not a code change.
 */
export async function preAuditResearchCredentialSeam(): Promise<string | null> {
  return null;
}

export class RealPreAuditResearchProvider implements PreAuditResearchProvider {
  readonly id = 'preaudit-live-research';
  readonly label = 'Live third-party research';
  readonly mode: PreAuditResearchMode = 'live';
  readonly simulation = false;

  /**
   * Refuses rather than fabricates. There is deliberately NO fallback to the
   * fixture here: silently substituting simulation for a live request is exactly
   * the failure mode this seam exists to prevent (the caller chooses the mock
   * provider explicitly, and the surface labels it).
   */
  async fetchBrandResearch(_request: PreAuditResearchRequest): Promise<PreAuditResearchResult> {
    const readiness = preAuditLiveResearchReadiness();
    const credential = await preAuditResearchCredentialSeam();
    const ok = readiness.ready && credential !== null;
    return {
      ok,
      mode: ok ? 'live' : 'unconfigured',
      providerId: this.id,
      reason: ok
        ? 'Live research providers resolve to live and a server-side credential is present.'
        : `${readiness.reason}${credential === null ? ' No server-side research credential is configured.' : ''} No result was fabricated.`,
      simulated: false,
      fixture: null,
      sources: sourceUsage(),
      observedAt: demoToday(),
      networkCalls: 0,
    };
  }
}

/* ── The factory — the ONLY thing that changes with a credential ─────────── */

/**
 * Fail-closed provider resolution. A provider is treated as simulation ONLY
 * when its mode POSITIVELY resolves to simulation; every other state resolves to
 * the refusing real provider, so an unknown provider can never be silently
 * simulated.
 */
export function resolvePreAuditResearchProvider(): PreAuditResearchProvider {
  const readiness = preAuditLiveResearchReadiness();
  if (readiness.ready) return new RealPreAuditResearchProvider();
  return new MockPreAuditResearchProvider();
}

export function isPreAuditResearchSimulationSafe(
  provider: PreAuditResearchProvider
): provider is MockPreAuditResearchProvider {
  return provider.mode === 'simulation' && provider.simulation === true;
}

/** The truthful status shown on the public surface. */
export function preAuditResearchStatus(): {
  providerId: string;
  mode: PreAuditResearchMode;
  simulationSafe: boolean;
  label: string;
  reason: string;
  /**
   * §PUBLIC MESSAGING B6 (2026-09-29) — THE PUBLIC-SAFE TWIN OF `reason`.
   *
   * `reason` comes from `preAuditLiveResearchReadiness()` and is an OPERATOR
   * contract: `scripts/validate-uk-market-fit.mjs` requires it to NAME every
   * declared research provider (`firecrawl`, `keepa`, `amazon_sp_api`), because a
   * readiness reason that does not say which vendor is missing tells an operator
   * nothing. That contract is unchanged.
   *
   * It must not reach a public page, and until B6 it did: the assessment rendered
   * `Research source: … {status.reason}` verbatim. `publicReason` states the same
   * fact — no live source is connected, so the assessment is simulated and
   * nothing is fetched — without publishing the vendor list or the internal
   * registry modes. A gate asserts that no public surface reads `reason`.
   */
  publicReason: string;
} {
  const provider = resolvePreAuditResearchProvider();
  const readiness = preAuditLiveResearchReadiness();
  return {
    providerId: provider.id,
    mode: provider.mode,
    simulationSafe: isPreAuditResearchSimulationSafe(provider),
    label: provider.label,
    reason: readiness.ready
      ? 'Live research providers resolve to live.'
      : readiness.reason,
    publicReason: readiness.ready
      ? 'Live research sources are connected for this assessment.'
      : 'No live research source is connected, so this assessment runs on a clearly-labelled simulation and nothing is fetched from any external service.',
  };
}

/** Re-exported so callers never import the fixture module directly. */
export type { PreAuditResearchFixture };
export { isProviderSimulationSafe };

