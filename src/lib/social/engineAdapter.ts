/**
 * §Phase S — THE SOCIAL ENGINE ADAPTER (mock-first, fail-closed).
 *
 * Mercenta Social's REAL engine is deployed and verified (channel connect,
 * developer-API publish accepted, Temporal execution) but its droplet is
 * capacity-limited (2 vCPU / 4 GB, OOM in the provider orchestrator), so the
 * engine cannot complete a publish on today's infrastructure — a PAID resize is
 * required and is NOT something the platform may pretend away.
 *
 * This module is the seam that makes the difference explicit and demonstrable:
 *
 *   - `SimulatedSocialEngineClient` implements the engine's OWN contract — the
 *     provider catalogue, channel connect, the verified post lifecycle
 *     (`DRAFT · QUEUE · PUBLISHED · ERROR`), scheduling, queue execution,
 *     failure + retry recovery, cancellation and analytics — deterministically,
 *     with `simulated: true` on every record and NO network call at all.
 *   - It is FAIL-CLOSED: it may only run when the caller positively identifies
 *     SIMULATION. `configured`/`live`/unknown modes are REFUSED, never silently
 *     downgraded — the same rule the provider layer already enforces.
 *   - It never claims a real publication: a simulated release id is
 *     unmistakably fake (`sim-rel-…`), so no surface can present it as an engine
 *     release.
 *
 * No second product: the provider catalogue comes from the canonical
 * `SOCIAL_PROVIDERS` and the post vocabulary comes from the engine's verified
 * `SOCIAL_ENGINE_VERIFIED.postStates`.
 */
import { SOCIAL_PROVIDERS } from '@/config/mercentaSocial';
import type { SocialPostStateValue } from '@/lib/statusPresentation';

export interface SocialEngineChannel {
  id: string;
  providerId: string;
  label: string;
  /** Always true here — this client is simulation-only. */
  simulated: true;
}

export interface SocialEnginePost {
  id: string;
  channelId: string;
  providerId: string;
  body: string;
  /** ISO timestamp when the post should go out; null = publish immediately. */
  scheduledFor: string | null;
  state: SocialPostStateValue;
  /** Provider release id — clearly fake (`sim-rel-…`), never an engine value. */
  releaseId: string | null;
  error?: string;
  attempts: number;
  simulated: true;
}

export interface SocialEngineAnalytics {
  channels: number;
  posts: number;
  published: number;
  queued: number;
  failed: number;
  drafts: number;
  byProvider: { providerId: string; label: string; posts: number; published: number }[];
}

export type SocialEngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface SocialEngineClient {
  readonly mode: 'simulation';
  listProviders(): { id: string; label: string }[];
  listChannels(): SocialEngineChannel[];
  connectChannel(providerId: string): SocialEngineResult<SocialEngineChannel>;
  disconnectChannel(channelId: string): SocialEngineResult<SocialEngineChannel>;
  createPost(input: {
    channelId: string;
    body: string;
    scheduledFor?: string | null;
  }): SocialEngineResult<SocialEnginePost>;
  listPosts(): SocialEnginePost[];
  /** Runs the queue as of `nowIso` (deterministic — the caller supplies time). */
  runQueue(nowIso: string): SocialEnginePost[];
  retryPost(postId: string): SocialEngineResult<SocialEnginePost>;
  cancelPost(postId: string): SocialEngineResult<SocialEnginePost>;
  analytics(): SocialEngineAnalytics;
  reset(): void;
}

/** Providers whose simulated adapter is DEGRADED — used to exercise the failure
 *  + recovery path deterministically instead of pretending everything works. */
const DEGRADED_PROVIDERS: ReadonlySet<string> = new Set(['tiktok', 'nostr']);

/** A body containing this marker fails on the FIRST attempt (then recovers on
 *  retry) — a deterministic, documented way to demo the error path. */
export const SIMULATED_FAILURE_MARKER = '[fail]';

class SimulatedSocialEngineClient implements SocialEngineClient {
  readonly mode = 'simulation' as const;
  private channels: SocialEngineChannel[] = [];
  private posts: SocialEnginePost[] = [];
  private counter = 0;

  listProviders() {
    return SOCIAL_PROVIDERS.map((p) => ({ id: p.id, label: p.label }));
  }

  listChannels() {
    return [...this.channels];
  }

  connectChannel(providerId: string): SocialEngineResult<SocialEngineChannel> {
    const provider = SOCIAL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return { ok: false, error: `unknown provider: ${providerId}` };
    const id = `sim-ch-${providerId.replace(/\./g, '-')}`;
    const existing = this.channels.find((c) => c.id === id);
    if (existing) return { ok: true, value: existing }; // idempotent, like the engine
    const channel: SocialEngineChannel = {
      id,
      providerId,
      label: provider.label,
      simulated: true,
    };
    this.channels.push(channel);
    return { ok: true, value: channel };
  }

  disconnectChannel(channelId: string): SocialEngineResult<SocialEngineChannel> {
    const channel = this.channels.find((c) => c.id === channelId);
    if (!channel) return { ok: false, error: `channel not found: ${channelId}` };
    this.channels = this.channels.filter((c) => c.id !== channelId);
    return { ok: true, value: channel };
  }

  createPost(input: {
    channelId: string;
    body: string;
    scheduledFor?: string | null;
  }): SocialEngineResult<SocialEnginePost> {
    const channel = this.channels.find((c) => c.id === input.channelId);
    if (!channel) return { ok: false, error: 'connect a channel before composing a post' };
    if (!input.body.trim()) return { ok: false, error: 'a post needs content' };
    this.counter += 1;
    const post: SocialEnginePost = {
      id: `sim-post-${this.counter}`,
      channelId: channel.id,
      providerId: channel.providerId,
      body: input.body.trim(),
      scheduledFor: input.scheduledFor ?? null,
      // A scheduled post waits in the queue; so does an immediate one — exactly
      // the engine's behaviour (its worker drains QUEUE).
      state: 'QUEUE',
      releaseId: null,
      attempts: 0,
      simulated: true,
    };
    this.posts.push(post);
    return { ok: true, value: post };
  }

  listPosts() {
    return [...this.posts];
  }

  /** Deterministic queue execution: every QUEUE post whose schedule has arrived
   *  is attempted. Degraded providers / marked bodies fail on the FIRST attempt. */
  runQueue(nowIso: string): SocialEnginePost[] {
    const now = new Date(nowIso).getTime();
    const touched: SocialEnginePost[] = [];
    for (const post of this.posts) {
      if (post.state !== 'QUEUE') continue;
      if (post.scheduledFor && new Date(post.scheduledFor).getTime() > now) continue;
      post.attempts += 1;
      const failsFirstAttempt =
        post.attempts === 1 &&
        (DEGRADED_PROVIDERS.has(post.providerId) ||
          post.body.toLowerCase().includes(SIMULATED_FAILURE_MARKER));
      if (failsFirstAttempt) {
        post.state = 'ERROR';
        post.error = `simulated provider rejection from ${post.providerId} (no live call was made)`;
      } else {
        post.state = 'PUBLISHED';
        post.releaseId = `sim-rel-${post.id}`;
        post.error = undefined;
      }
      touched.push({ ...post });
    }
    return touched;
  }

  retryPost(postId: string): SocialEngineResult<SocialEnginePost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return { ok: false, error: `post not found: ${postId}` };
    if (post.state !== 'ERROR') return { ok: false, error: 'only a failed post can be retried' };
    post.attempts += 1;
    post.state = 'PUBLISHED';
    post.releaseId = `sim-rel-${post.id}`;
    post.error = undefined;
    return { ok: true, value: { ...post } };
  }

  cancelPost(postId: string): SocialEngineResult<SocialEnginePost> {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return { ok: false, error: `post not found: ${postId}` };
    if (post.state === 'PUBLISHED') {
      return { ok: false, error: 'a published post cannot be cancelled' };
    }
    post.state = 'DRAFT';
    post.scheduledFor = null;
    return { ok: true, value: { ...post } };
  }

  analytics(): SocialEngineAnalytics {
    const byProvider = SOCIAL_PROVIDERS.filter((p) =>
      this.posts.some((post) => post.providerId === p.id)
    ).map((p) => {
      const rows = this.posts.filter((post) => post.providerId === p.id);
      return {
        providerId: p.id,
        label: p.label,
        posts: rows.length,
        published: rows.filter((r) => r.state === 'PUBLISHED').length,
      };
    });
    return {
      channels: this.channels.length,
      posts: this.posts.length,
      published: this.posts.filter((p) => p.state === 'PUBLISHED').length,
      queued: this.posts.filter((p) => p.state === 'QUEUE').length,
      failed: this.posts.filter((p) => p.state === 'ERROR').length,
      drafts: this.posts.filter((p) => p.state === 'DRAFT').length,
      byProvider,
    };
  }

  reset(): void {
    this.channels = [];
    this.posts = [];
    this.counter = 0;
  }
}

/** The one shared simulation instance (a client seam, not a store: the engine
 *  owns the real state; this only ever holds simulated state). */
let simulatedClient: SimulatedSocialEngineClient | null = null;

/**
 * FAIL-CLOSED factory. `modeId` must POSITIVELY identify simulation; every other
 * value — `configured`, `live`, `degraded`, `error`, `disabled`, `unknown`,
 * missing — is refused. There is deliberately no "default to simulation".
 */
export function createSocialEngineClient(
  modeId: string | null | undefined
): SocialEngineResult<SocialEngineClient> {
  if (modeId !== 'simulation') {
    return {
      ok: false,
      error:
        `refused: social engine mode "${modeId ?? 'unknown'}" is not simulation — ` +
        'a non-simulation mode may never execute simulated operations',
    };
  }
  if (!simulatedClient) simulatedClient = new SimulatedSocialEngineClient();
  return { ok: true, value: simulatedClient };
}

/** Test/validator hook: a fresh, isolated client (no shared state). */
export function createIsolatedSimulatedSocialClient(): SocialEngineClient {
  return new SimulatedSocialEngineClient();
}
