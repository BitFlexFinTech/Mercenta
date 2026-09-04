/**
 * Postiz — self-hosted social media scheduling client (mock-first).
 *
 * Postiz (gitroomhq/postiz-app, AGPL-3.0) is self-hosted via Docker alongside
 * the Mercenta stack. Its public REST API is used for provisioning and posting
 * from the admin Marketing section.
 *
 * Mock client always active when no Postiz credentials are configured.
 * Real client activates when the Postiz URL and API key are entered.
 */

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