/**
 * §21 (M13 Phase 8) — MOCK Google client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in `googleClient.ts`, with ZERO network calls. Every id and URL is
 * unmistakably fake (`MOCK-GD-…`, `https://mock.google.local/…`) so a simulated
 * workspace can never be mistaken for a real one, and every result carries
 * `simulated: true`.
 *
 * Deterministic behaviour:
 *  - duplicate names return the EXISTING item (idempotent, like Drive);
 *  - every 5th write fails once with a retryable provider error, so the failure
 *    path is exercised truthfully;
 *  - listings return only what this session created.
 */
import type {
  GoogleItem,
  GoogleOpResult,
  GoogleSearchResult,
} from './googleClient';

let seq = 0;
let writeCount = 0;
const created: GoogleItem[] = [];

export function resetMockGoogleState(): void {
  seq = 0;
  writeCount = 0;
  created.length = 0;
}

function mockId(prefix: string): string {
  seq += 1;
  return `MOCK-GD-${prefix}-${String(1000 + seq)}`;
}

function mockUrl(kind: GoogleItem['kind'], id: string): string {
  const path =
    kind === 'folder'
      ? 'drive/folders'
      : kind === 'sheet'
        ? 'spreadsheets/d'
        : kind === 'doc'
          ? 'document/d'
          : kind === 'slides'
            ? 'presentation/d'
            : 'calendar/events';
  return `https://mock.google.local/${path}/${id}`;
}

function register(
  kind: GoogleItem['kind'],
  api: GoogleItem['api'],
  name: string
): GoogleOpResult {
  writeCount += 1;
  if (writeCount % 5 === 0) {
    return {
      ok: false,
      error: 'Simulated Google API error (rate limit) — retry',
      simulated: true,
    };
  }
  const existing = created.find((i) => i.kind === kind && i.name === name);
  if (existing) return { ok: true, item: { ...existing }, simulated: true };
  const item: GoogleItem = {
    id: mockId(api.toUpperCase()),
    name,
    kind,
    url: mockUrl(kind, mockId('URL')),
    api,
  };
  created.push(item);
  return { ok: true, item: { ...item }, simulated: true };
}

export function createMockGoogleClient(): {
  createFolder(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult>;
  createSheet(input: { name: string; parentId?: string | null; tabs?: string[] }): Promise<GoogleOpResult>;
  createDoc(input: { name: string; parentId?: string | null; body?: string }): Promise<GoogleOpResult>;
  createSlides(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult>;
  createCalendarEvent(input: { name: string; date?: string }): Promise<GoogleOpResult>;
  listDrive(query: { name: string }): Promise<GoogleSearchResult>;
} {
  return {
    async createFolder(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult> {
      return register('folder', 'drive', input.name);
    },
    async createSheet(input: { name: string; parentId?: string | null; tabs?: string[] }): Promise<GoogleOpResult> {
      return register('sheet', 'sheets', input.name);
    },
    async createDoc(input: { name: string; parentId?: string | null; body?: string }): Promise<GoogleOpResult> {
      return register('doc', 'docs', input.name);
    },
    async createSlides(input: { name: string; parentId?: string | null }): Promise<GoogleOpResult> {
      return register('slides', 'slides', input.name);
    },
    async createCalendarEvent(input: { name: string; date?: string }): Promise<GoogleOpResult> {
      return register('calendar_event', 'calendar', input.name);
    },
    async listDrive(query: { name: string }): Promise<GoogleSearchResult> {
      return {
        ok: true,
        simulated: true,
        items: created.filter((i) => i.name.includes(query.name)).map((i) => ({ ...i })),
      };
    },
  };
}

/** Test seam: what the simulated Drive holds right now. */
export function mockGoogleDriveContents(): GoogleItem[] {
  return created.map((i) => ({ ...i }));
}
