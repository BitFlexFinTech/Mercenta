/**
 * Postiz — self-hosted social media scheduling client (mock-first).
 *
 * Postiz (gitroomhq/postiz-app, AGPL-3.0) is self-hosted via Docker alongside
 * the Mercenta stack. Its public REST API is used for provisioning and posting
 * from the admin Marketing section.
 *
 * Mock client always active when no Postiz credentials are configured.
 * Real client activates when the Postiz URL and API key are entered.
 *
 * ── §Phase E7 ADDITIONS ─────────────────────────────────────────────────────
 * E7 makes the COMPLETE engine application available to approved Mercenta brands
 * as MERCENTA SOCIAL. This module stays the low-level engine client; the
 * customer-facing identity, the module inventory, the provider list and the
 * verified deployment facts live in `src/config/mercentaSocial.ts`.
 *
 * HONESTY NOTE about the methods below: the endpoint paths used by
 * `RealPostizClient` (`/api/health`, `/api/posts`) predate the E7 investigation
 * and are NOT the engine's verified developer API. The engine's real
 * programmatic surface was verified in v1.47.0 as `/public/v1` (see
 * `getSocialEngineStatus()` and SOCIAL_ENGINE_API). Until that client is
 * implemented server-side, `RealPostizClient` must not be described as verified,
 * and no code path may treat an unconfigured engine as live.
 */
import {
  MERCENTA_SOCIAL,
  SOCIAL_DEPLOYMENT_FINDINGS,
  SOCIAL_ENGINE_API,
  SOCIAL_ENGINE_VERIFIED,
  resolveSocialEngineConfig,
  type SocialDeploymentFinding,
} from '@/config/mercentaSocial';

export interface PostizPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: string;
}

export interface PostizScheduleRequest {
  content: string;
  platforms: string[];
  scheduledAt?: string; // ISO date — omit for immediate publish
  mediaUrls?: string[];
}

export interface IPostizClient {
  ping(): Promise<{ ok: boolean; error?: string }>;
  schedulePost(req: PostizScheduleRequest): Promise<{ ok: boolean; post?: PostizPost; error?: string }>;
  getScheduledPosts(status?: string): Promise<{ ok: boolean; posts: PostizPost[]; error?: string }>;
  cancelPost(postId: string): Promise<{ ok: boolean; error?: string }>;
}

/* ── MockClient (no credentials needed) ─────────────────────────────── */

function uid(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export class MockPostizClient implements IPostizClient {
  private posts: PostizPost[] = [];
  private counter = 0;

  async ping(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async schedulePost(req: PostizScheduleRequest): Promise<{ ok: boolean; post?: PostizPost; error?: string }> {
    this.counter++;
    const post: PostizPost = {
      id: uid('postiz-mock'),
      content: req.content,
      platforms: req.platforms,
      scheduledAt: req.scheduledAt ?? new Date().toISOString(),
      status: req.scheduledAt ? 'scheduled' : 'published',
      createdAt: new Date().toISOString(),
    };
    this.posts.push(post);
    return { ok: true, post };
  }

  async getScheduledPosts(status?: string): Promise<{ ok: boolean; posts: PostizPost[]; error?: string }> {
    const filtered = status ? this.posts.filter((p) => p.status === status) : [...this.posts];
    return { ok: true, posts: filtered };
  }

  async cancelPost(postId: string): Promise<{ ok: boolean; error?: string }> {
    const idx = this.posts.findIndex((p) => p.id === postId);
    if (idx === -1) return { ok: false, error: 'Post not found' };
    this.posts[idx].status = 'draft';
    return { ok: true };
  }
}

/* ── RealClient (Postiz REST API) ───────────────────────────────────── */

export class RealPostizClient implements IPostizClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async ping(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { headers: this.headers });
      return res.ok ? { ok: true } : { ok: false, error: `Postiz returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async schedulePost(req: PostizScheduleRequest): Promise<{ ok: boolean; post?: PostizPost; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/posts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: `Postiz ${res.status}: ${err}` };
      }
      const data = await res.json();
      return { ok: true, post: data as PostizPost };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getScheduledPosts(status?: string): Promise<{ ok: boolean; posts: PostizPost[]; error?: string }> {
    try {
      const url = status
        ? `${this.baseUrl}/api/posts?status=${encodeURIComponent(status)}`
        : `${this.baseUrl}/api/posts`;
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return { ok: false, posts: [], error: `Postiz ${res.status}` };
      const data = await res.json();
      return { ok: true, posts: data as PostizPost[] };
    } catch (err: any) {
      return { ok: false, posts: [], error: err.message };
    }
  }

  async cancelPost(postId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: this.headers,
      });
      return res.ok ? { ok: true } : { ok: false, error: `Postiz ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}

/* ── Factory ─────────────────────────────────────────────────────────── */

let _mockClient: MockPostizClient | null = null;

export function getPostizClient(creds?: {
  apiUrl?: string;
  apiKey?: string;
}): IPostizClient {
  if (creds?.apiUrl && creds?.apiKey) {
    return new RealPostizClient(creds.apiUrl, creds.apiKey);
  }
  if (!_mockClient) _mockClient = new MockPostizClient();
  return _mockClient;
}

/* ── §Phase E7 — verified engine status (admin diagnostics + brand surface) ─ */

export interface SocialEngineStatus {
  /** Internal engine identity — admin/technical usage only. */
  engineName: string;
  engineVersion: string;
  engineLicence: string;
  /** Customer-facing product identity. */
  productName: string;
  /** The verified deployment this integration targets (evidence, not config). */
  verified: typeof SOCIAL_ENGINE_VERIFIED;
  /** Configured application URL, when the integration metadata provides one. */
  appUrl: string | null;
  configured: boolean;
  mode: 'simulation' | 'configured';
  blockedReasons: string[];
  /** The engine's verified programmatic API path. */
  developerApiPath: string;
  /** The legacy client's endpoint shapes were never verified against the engine. */
  legacyEndpointsVerified: false;
  findings: SocialDeploymentFinding[];
}

/**
 * The single truthful status object both the admin control centre and the brand
 * surface read. Nothing here upgrades an unconfigured engine to "live".
 */
export function getSocialEngineStatus(meta?: Record<string, string>): SocialEngineStatus {
  const config = resolveSocialEngineConfig(meta);
  return {
    engineName: MERCENTA_SOCIAL.engineName,
    engineVersion: SOCIAL_ENGINE_VERIFIED.version,
    engineLicence: MERCENTA_SOCIAL.engineLicence,
    productName: MERCENTA_SOCIAL.productName,
    verified: SOCIAL_ENGINE_VERIFIED,
    appUrl: config.appUrl,
    configured: config.configured,
    mode: config.mode,
    blockedReasons: config.blockedReasons,
    developerApiPath: SOCIAL_ENGINE_API.versionedPublicApi,
    legacyEndpointsVerified: false,
    findings: SOCIAL_DEPLOYMENT_FINDINGS,
  };
}

/** Finding counts by severity — used by the admin control centre summary. */
export function socialFindingCounts(findings: SocialDeploymentFinding[]): {
  blocking: number;
  warning: number;
  info: number;
} {
  return {
    blocking: findings.filter((f) => f.severity === 'blocking').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
}