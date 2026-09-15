/**
 * §21 (M13 Phase 8) — Google Workspace adapter (mock-first).
 *
 * The REAL client talks to Google's Drive/Docs/Sheets/Slides/Calendar APIs
 * through the Mercenta Edge Function proxy, which holds the OAuth tokens. The
 * browser only ever sends a `secretRef` handle — never a token — so a refresh
 * token cannot leak into the client, localStorage, source, Git or a report.
 *
 * Factory discipline (same seam as SP-API / Companies House / DHL): a verified
 * non-sandbox connection with a `vault:` secret ref returns the REAL client;
 * anything else returns the deterministic MOCK client with identical signatures.
 */

export interface GoogleCredentials {
  secretRef: string;
  verified: boolean;
}

export interface GoogleItem {
  id: string;
  name: string;
  kind: 'folder' | 'sheet' | 'doc' | 'slides' | 'calendar_event';
  /** Openable URL — a `mock:` URL when the mock client produced it. */
  url: string;
  /** Which API created it (provenance for the wizard). */
  api: 'drive' | 'sheets' | 'docs' | 'slides' | 'calendar';
}

export interface GoogleOpResult {
  ok: boolean;
  item?: GoogleItem;
  error?: string;
  /** True when the mock client produced the result — never presented as live. */
  simulated?: boolean;
}

export interface GoogleSearchResult {
  ok: boolean;
  items: GoogleItem[];
  error?: string;
  simulated?: boolean;
}

export type GoogleFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultFetch: GoogleFetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createGoogleClient(
  getCredentials: () => GoogleCredentials | null,
  edgeFunctionBase: string,
  transport: GoogleFetchLike = defaultFetch
) {
  function requireCredentials(): GoogleCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('Google is not connected. Use the Google setup wizard in Super Admin to authorize the account.');
    }
    if (!creds.verified) {
      throw new Error('The Google connection is not verified — complete the OAuth exchange before creating files.');
    }
    return creds;
  }

  async function call(
    path: string,
    body: Record<string, unknown>
  ): Promise<{ ok: boolean; data?: GoogleItem; error?: string }> {
    const creds = requireCredentials();
    const res = await transport(`${edgeFunctionBase}${path}`, {
      method: 'POST',
      headers: { 'X-Secret-Ref': creds.secretRef },
      body,
    });
    const json = (await res.json()) as { ok?: boolean; item?: GoogleItem; error?: string };
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: json.item };
  }

  return {
    /** Drive API. */
    async createFolder(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult> {
      const res = await call('/google/drive/folders', { name: input.name, parentId: input.parentId ?? null });
      return res.ok
        ? { ok: true, item: res.data }
        : { ok: false, error: res.error };
    },
    /** Sheets API — creates the spreadsheet and its tabs. */
    async createSheet(input: {
      name: string;
      parentId?: string | null;
      tabs?: string[];
    }): Promise<GoogleOpResult> {
      const res = await call('/google/sheets', {
        name: input.name,
        parentId: input.parentId ?? null,
        tabs: input.tabs ?? [],
      });
      return res.ok ? { ok: true, item: res.data } : { ok: false, error: res.error };
    },
    /** Docs API. */
    async createDoc(input: {
      name: string;
      parentId?: string | null;
      body?: string;
    }): Promise<GoogleOpResult> {
      const res = await call('/google/docs', {
        name: input.name,
        parentId: input.parentId ?? null,
        body: input.body ?? '',
      });
      return res.ok ? { ok: true, item: res.data } : { ok: false, error: res.error };
    },
    /** Slides API. */
    async createSlides(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult> {
      const res = await call('/google/slides', { name: input.name, parentId: input.parentId ?? null });
      return res.ok ? { ok: true, item: res.data } : { ok: false, error: res.error };
    },
    /** Calendar API — capability test event only. */
    async createCalendarEvent(input: {
      name: string;
      date?: string;
    }): Promise<GoogleOpResult> {
      const res = await call('/google/calendar/events', { name: input.name, date: input.date ?? null });
      return res.ok ? { ok: true, item: res.data } : { ok: false, error: res.error };
    },
    /** Drive API listing (used to re-check what already exists). */
    async listDrive(query: { name: string }): Promise<GoogleSearchResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/google/drive/search?name=${encodeURIComponent(query.name)}`, {
        method: 'GET',
        headers: { 'X-Secret-Ref': creds.secretRef },
      });
      const json = (await res.json()) as { items?: GoogleItem[]; error?: string };
      if (!res.ok) return { ok: false, items: [], error: json.error ?? `HTTP ${res.status}` };
      return { ok: true, items: json.items ?? [] };
    },
  };
}

export type GoogleClient = ReturnType<typeof createGoogleClient>;
