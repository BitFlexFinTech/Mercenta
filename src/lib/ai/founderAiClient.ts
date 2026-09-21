/**
 * §Founder OS — FOUNDER OPS AI CLIENT (mock-first, FREE-FIRST, optional).
 *
 * AI is an OPTIONAL layer over canonical Mercenta state. This module is the only
 * place a founder-facing model call can be made, and it is deliberately built so
 * that the platform is complete without it:
 *
 *   deterministic facts → optional AI NARRATIVE (labelled) → the same facts
 *
 * NON-NEGOTIABLE RULES
 * -------------------
 * - NO SECRET IS EVER READ FROM A CLIENT-SIDE ENVIRONMENT VARIABLE. The real
 *   client takes its credential from a SERVER-SIDE seam (`serverCredentialSeam`),
 *   which is absent in this build — so the real client cannot be constructed here
 *   and the deterministic client is used. Wiring the credential is an activation
 *   step, not a code change.
 * - FREE MODELS ONLY, NO PAID FALLBACK. Every call is authorised through
 *   `authoriseAiCall` (the canonical cost-protection policy). A task with no
 *   approved free model is REFUSED rather than upgraded.
 * - A REFUSAL IS NOT AN ERROR AND NEVER A FAKE ANSWER. When AI is unavailable the
 *   client returns a deterministic, clearly-labelled summary of the same facts.
 * - AI OUTPUT IS NEVER CANONICAL STATE. Its basis is `ai_interpretation`; it is
 *   never written into a record, a score or a business decision.
 */
import { authoriseAiCall, recordAiCallOutcome } from '@/lib/costs/usageLog';
import { FREE_RUNTIME_MODELS, selectRuntimeModelForTask } from '@/lib/costs/modelPolicy';
import { defaultIntegrationMode } from '@/integrations/registry';
import { isProviderSimulationSafe, type ProviderResolutionMode } from '@/integrations/types';

export type AiAvailabilityState = 'unavailable' | 'deterministic_only' | 'free_model_ready';

export interface AiAvailability {
  provider: 'openrouter';
  /** The canonical provider mode (fail-closed: unknown is never simulation). */
  mode: ProviderResolutionMode;
  simulationSafe: boolean;
  state: AiAvailabilityState;
  /** The FREE model that would be used — null when AI is not available. */
  model: string | null;
  reason: string;
  /** The runtime policy permits ONLY free models. */
  paidFallbackAllowed: false;
  credentialSeam: 'server_side';
  /** What still works when AI is unavailable (never "nothing"). */
  degradation: string;
}

/**
 * The server-side credential seam. In this build there is no server-side AI
 * endpoint, so it resolves to `null` and every AI-assisted feature runs in
 * deterministic mode. It NEVER reads a `VITE_*` variable: a provider secret must
 * never be shipped to the browser.
 */
export async function serverCredentialSeam(): Promise<string | null> {
  return null;
}

/** The current AI availability, resolved from the canonical provider registry. */
export function aiAvailability(): AiAvailability {
  const mode = defaultIntegrationMode('openrouter');
  const simulationSafe = isProviderSimulationSafe(mode);
  const decision = selectRuntimeModelForTask('founder_brief_narrative');
  const degradation =
    'Deterministic automation, the work layer, dashboards, finance, compliance, acquisition records and the full founder brief continue unchanged; only the AI narrative and AI-phrased answers are withheld, and the surface says so.';

  if (mode === 'not_registered' || mode === 'unknown') {
    return {
      provider: 'openrouter',
      mode,
      simulationSafe,
      state: 'unavailable',
      model: null,
      reason: `The AI provider resolves to "${mode}" — an unknown provider is never treated as usable. AI-assisted features are unavailable.`,
      paidFallbackAllowed: false,
      credentialSeam: 'server_side',
      degradation,
    };
  }

  if (mode !== 'live' || decision.refused || decision.model === null) {
    return {
      provider: 'openrouter',
      mode,
      simulationSafe,
      state: 'deterministic_only',
      model: null,
      reason:
        mode !== 'live'
          ? `No AI credential is configured (provider mode "${mode}"). Mercenta runs in deterministic mode and no model call is made.`
          : decision.reason,
      paidFallbackAllowed: false,
      credentialSeam: 'server_side',
      degradation,
    };
  }

  return {
    provider: 'openrouter',
    mode,
    simulationSafe,
    state: 'free_model_ready',
    model: decision.model,
    reason: `Free model ${decision.model} is approved for this task; paid models are never used.`,
    paidFallbackAllowed: false,
    credentialSeam: 'server_side',
    degradation,
  };
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface AiNarrativeRequest {
  /** A declared runtime task id — an unknown task is refused, never guessed. */
  taskId: string;
  /** The canonical fact lines the narrative may summarise. Nothing else. */
  factLines: string[];
  /** For "Ask Mercenta": the founder's question. */
  question?: string;
  entity?: string;
}

export interface AiNarrativeResult {
  text: string;
  /** `deterministic` = composed locally; `ai_interpretation` = written by a model. */
  basis: 'deterministic' | 'ai_interpretation';
  model: string | null;
  simulated: boolean;
  tokens: number;
  degraded: boolean;
  reason: string;
}

export interface FounderAiClient {
  readonly mode: 'deterministic' | 'real';
  readonly model: string | null;
  narrate(request: AiNarrativeRequest): Promise<AiNarrativeResult>;
}

/* ── The deterministic client (what runs when AI is unavailable) ───────────── */

/**
 * Composes a plain, deterministic summary from the canonical fact lines. It
 * NEVER claims to be AI: `basis` is `deterministic`, `simulated` is true, and
 * `reason` states exactly why no model was called. This is the honest fallback,
 * not a fake model answer.
 */
export class DeterministicFounderAiClient implements FounderAiClient {
  readonly mode = 'deterministic' as const;
  readonly model = null;

  async narrate(request: AiNarrativeRequest): Promise<AiNarrativeResult> {
    const headline = request.factLines.slice(0, 4);
    const text =
      headline.length === 0
        ? 'No canonical facts are available for this request.'
        : headline.join(' ');
    return {
      text,
      basis: 'deterministic',
      model: null,
      simulated: true,
      tokens: 0,
      degraded: true,
      reason:
        'No AI provider is configured, so this summary was composed deterministically from the canonical facts. No model call was made and no paid fallback exists.',
    };
  }
}

/* ── The real client (server-side credential, free models only) ────────────── */

export class RealOpenRouterFounderAiClient implements FounderAiClient {
  readonly mode = 'real' as const;
  readonly model: string | null;

  constructor(
    private readonly credential: string,
    private readonly transport: FetchLike,
    private readonly fallback: FounderAiClient = new DeterministicFounderAiClient()
  ) {
    const decision = selectRuntimeModelForTask('founder_brief_narrative');
    this.model = decision.model ?? FREE_RUNTIME_MODELS[0];
  }

  async narrate(request: AiNarrativeRequest): Promise<AiNarrativeResult> {
    // 1. The canonical cost-protection policy decides, not this client.
    const decision = authoriseAiCall({ taskId: request.taskId, entity: request.entity });
    if (!decision.allowed) {
      return this.fallback.narrate(request);
    }
    // 2. Free models only — a model outside the approved list is refused.
    const model = decision.decision.model;
    if (!model) return this.fallback.narrate(request);

    try {
      const res = await this.transport('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credential}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages: [
            {
              role: 'system',
              content:
                'You summarise ONLY the facts provided. Never add a fact, number, brand or claim that is not in the facts. Never claim a retail-channel relationship, partnership or guaranteed order. Keep it under 120 words.',
            },
            {
              role: 'user',
              content: `${request.question ? `Question: ${request.question}\n\n` : ''}Facts:\n${request.factLines.join('\n')}`,
            },
          ],
        },
      });
      if (!res.ok) {
        recordAiCallOutcome({ taskId: request.taskId, tokens: 0, status: 'error', note: `OpenRouter HTTP ${res.status}` });
        return this.fallback.narrate(request);
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const tokens = Number(body.usage?.total_tokens ?? 0);
      recordAiCallOutcome({ taskId: request.taskId, tokens, status: 'ok' });
      return {
        text: String(body.choices?.[0]?.message?.content ?? '').trim() || (await this.fallback.narrate(request)).text,
        basis: 'ai_interpretation',
        model,
        simulated: false,
        tokens,
        degraded: false,
        reason: 'Free model narrative — every fact came from the canonical fact lines supplied.',
      };
    } catch (error) {
      recordAiCallOutcome({
        taskId: request.taskId,
        tokens: 0,
        status: 'error',
        note: error instanceof Error ? error.message : String(error),
      });
      return this.fallback.narrate(request);
    }
  }
}

/**
 * The factory. The ONLY thing that changes when a real credential is configured
 * is the credential itself: this function then returns the real client, and no
 * call site changes.
 */
export async function createFounderAiClient(transport?: FetchLike): Promise<FounderAiClient> {
  const availability = aiAvailability();
  if (availability.state !== 'free_model_ready' || !transport) {
    return new DeterministicFounderAiClient();
  }
  const credential = await serverCredentialSeam();
  if (!credential) return new DeterministicFounderAiClient();
  return new RealOpenRouterFounderAiClient(credential, transport);
}

