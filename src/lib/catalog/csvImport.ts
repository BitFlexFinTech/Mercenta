/**
 * §9 Stage-9 — Bulk catalog CSV import.
 *
 * Hardening rules implemented here:
 *   1. STREAM-PARSED: rows are produced lazily from an async iterable of raw
 *      chunks (File.stream(), fetch body, test fixture). The file is never
 *      loaded into memory whole; partial lines spanning chunk boundaries are
 *      carried over correctly.
 *   2. VALIDATE EVERY ROW BEFORE ANY WRITE: each row is fully validated as
 *      it streams; rows failing validation are reported with line numbers
 *      and reasons but nothing is written during streaming.
 *   3. ALL-OR-NOTHING COMMIT: validated rows go to the database in ONE
 *      atomic batch (Postgres transaction inside the Edge Function / RPC).
 *      Any server-side rejection rolls back cleanly — a bad file can never
 *      partially import.
 *
 * Mock-first: MockCatalogImportClient simulates the atomic transaction;
 * the real client POSTs to the import Edge Function. Same signatures.
 */

import type { FetchLike } from '@/lib/spapi/client';

export interface CatalogCsvRow {
  name: string;
  sku: string;
  barcode: string;
  exWorksPrice: number;
  ukRetailPrice: number;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

export type RowOutcome =
  | { type: 'row'; lineNumber: number; ok: true; row: CatalogCsvRow }
  | { type: 'row'; lineNumber: number; ok: false; errors: string[] };

export interface ImportSummary {
  totalRows: number;
  accepted: number;
  rejected: number;
  /** Present when commit was attempted. */
  commit?: { attempted: boolean; ok: boolean; imported?: number; error?: string };
}

const REQUIRED_NUMERIC = ['exWorksPrice', 'ukRetailPrice', 'length', 'width', 'height', 'weight'] as const;

/** Validates one parsed CSV record (array of fields). Returns errors, if any. */
export function validateCsvFields(fields: string[]): { ok: true; row: CatalogCsvRow } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const [name, sku, barcode, _exWorksPrice, _ukRetailPrice, commodityCode, vatStatus, hazmat, _length, _width, _height, _weight] =
    fields.map((f) => (f ?? '').trim());

  if (!name) errors.push('name is required');
  if (!sku) errors.push('sku is required');
  // Commodity code: 8–10 digits (HS/CN style), tolerant of spaces/dots.
  if (!/^[0-9][0-9 .]{5,12}[0-9]$/.test(commodityCode)) errors.push(`invalid commodity code "${commodityCode}"`);
  if (!vatStatus) errors.push('vatStatus is required');

  const nums: Record<string, number> = {};
  for (const f of REQUIRED_NUMERIC) {
    const idx = ['name', 'sku', 'barcode', 'exWorksPrice', 'ukRetailPrice', 'commodityCode', 'vatStatus', 'hazmat', 'length', 'width', 'height', 'weight'].indexOf(f);
    const v = Number(fields[idx]);
    if (!Number.isFinite(v) || v < 0) {
      errors.push(`${f} must be a non-negative number`);
    } else {
      nums[f] = v;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    row: {
      name,
      sku,
      barcode: barcode ?? '',
      exWorksPrice: nums.exWorksPrice,
      ukRetailPrice: nums.ukRetailPrice,
      commodityCode,
      vatStatus,
      hazmat: /^(true|yes|1)$/i.test(hazmat),
      lengthCm: nums.length,
      widthCm: nums.width,
      heightCm: nums.height,
      weightKg: nums.weight,
    },
  };
}

/* ── Streaming parser ───────────────────────────────────────────────── */

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Streams CSV text chunks → per-row outcomes, lazily. `chunks` may be any
 * async iterable of strings (File.stream() reader, fetch body, fixtures).
 * A header row is consumed if present. Nothing is buffered whole.
 */
export async function* streamValidateCsv(
  chunks: AsyncIterable<string> | Iterable<string>
): AsyncGenerator<RowOutcome, void, undefined> {
  let buffer = '';
  let lineNumber = 0;
  let headerSkipped = false;

  const processLine = function* (line: string): Generator<RowOutcome> {
    lineNumber += 1;
    if (!headerSkipped) {
      headerSkipped = true;
      if (/^name\s*,/i.test(line)) return; // header
    }
    if (!line.trim()) return; // skip blank lines entirely
    const fields = splitCsvLine(line);
    const res = validateCsvFields(fields);
    yield res.ok
      ? { type: 'row', lineNumber, ok: true, row: res.row }
      : { type: 'row', lineNumber, ok: false, errors: res.errors };
  };

  for await (const chunk of chunks) {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      yield* processLine(line);
    }
  }
  if (buffer.trim()) yield* processLine(buffer);
}

/* ── Commit seam (atomic, mock-first) ───────────────────────────────── */

export interface CatalogImportClient {
  readonly mode: 'mock' | 'real';
  /**
   * Atomically inserts a validated batch. EITHER every row lands OR none do
   * (single Postgres transaction). Returns the imported count on success.
   */
  commitBatch(brandId: string, rows: CatalogCsvRow[]): Promise<{
    ok: boolean;
    imported?: number;
    error?: string;
  }>;
}

const mockCommittedBatches: { brandId: string; skus: string[] }[] = [];

export function resetMockCatalogImports(): void {
  mockCommittedBatches.length = 0;
}

export class MockCatalogImportClient implements CatalogImportClient {
  readonly mode = 'mock' as const;

  async commitBatch(brandId: string, rows: CatalogCsvRow[]): Promise<{ ok: boolean; imported?: number; error?: string }> {
    await new Promise((r) => setTimeout(r, 40));
    // Simulate server-side constraints: duplicate SKU inside batch or vs
    // already-imported rows → transaction aborts, NOTHING is written.
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.sku)) {
        return { ok: false, error: `duplicate sku "${r.sku}" in batch — transaction rolled back` };
      }
      seen.add(r.sku);
      if (mockCommittedBatches.some((b) => b.brandId === brandId && b.skus.includes(r.sku))) {
        return { ok: false, error: `sku "${r.sku}" already imported — transaction rolled back` };
      }
    }
    mockCommittedBatches.push({ brandId, skus: rows.map((r) => r.sku) });
    return { ok: true, imported: rows.length };
  }

  static committedSkuCount(): number {
    return mockCommittedBatches.reduce((a, b) => a + b.skus.length, 0);
  }
}

export class RealCatalogImportClient implements CatalogImportClient {
  readonly mode = 'real' as const;
  constructor(
    private readonly secretRef: string,
    private readonly edgeFunctionBase: string,
    private readonly transport: FetchLike
  ) {}

  async commitBatch(brandId: string, rows: CatalogCsvRow[]): Promise<{ ok: boolean; imported?: number; error?: string }> {
    // §Stage-26 — the server derives the target brand from the VERIFIED JWT;
    // this header is mandatory in live mode. brandId stays in the body only
    // as a cross-check (mismatch → 403).
    const { supabase } = await import('@/lib/supabase');
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) {
      return { ok: false, error: 'Not signed in — catalog import requires a brand session' };
    }
    const res = await this.transport(`${this.edgeFunctionBase}/catalog-import`, {
      method: 'POST',
      headers: {
        'X-Secret-Ref': this.secretRef,
        Authorization: `Bearer ${token}`,
      },
      body: { brandId, rows },
    });
    const body = (await res.json()) as { imported?: number; error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    return { ok: true, imported: body.imported };
  }
}

export function createCatalogImportClient(
  creds: { secretRef: string; verified: boolean } | null
): CatalogImportClient {
  if (creds && creds.verified && !creds.secretRef.startsWith('mock:')) {
    const transport: FetchLike = async (url, init) => {
      const res = await fetch(url, {
        method: init?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      return { ok: res.ok, status: res.status, json: () => res.json() };
    };
    return new RealCatalogImportClient(creds.secretRef, '/functions/v1/catalog', transport);
  }
  return new MockCatalogImportClient();
}

/* ── Orchestrator: stream → validate → atomic commit ─────────────────── */

/**
 * Full pipeline. Streams and validates every row first (rule #1/#2); only if
 * the caller allows partial data is a batch with rejections sent — by default
 * ANY rejected row aborts the import before commit, so a bad file imports
 * nothing at all (rule #3).
 */
export async function importCatalogCsv(
  brandId: string,
  chunks: AsyncIterable<string> | Iterable<string>,
  opts?: {
    /** Default false: any invalid row aborts before the DB write. */
    allowPartial?: boolean;
    client?: CatalogImportClient;
    onRow?: (outcome: RowOutcome) => void;
  }
): Promise<ImportSummary & { abortedReason?: string }> {
  const client = opts?.client ?? createCatalogImportClient(null);
  let total = 0;
  let accepted = 0;
  let rejected = 0;
  const validRows: CatalogCsvRow[] = [];
  let firstAbort: string | undefined;

  for await (const outcome of streamValidateCsv(chunks)) {
    opts?.onRow?.(outcome);
    if (outcome.type !== 'row') continue;
    total += 1;
    if (outcome.ok) {
      accepted += 1;
      validRows.push(outcome.row);
    } else {
      rejected += 1;
      if (!opts?.allowPartial && !firstAbort) {
        firstAbort = `line ${outcome.lineNumber}: ${outcome.errors.join('; ')}`;
      }
    }
  }

  if (total === 0) return { totalRows: 0, accepted: 0, rejected: 0, abortedReason: 'no data rows found' };
  if (firstAbort) {
    // Nothing was written — validation happens entirely before commit.
    return { totalRows: total, accepted, rejected, commit: { attempted: false, ok: false }, abortedReason: firstAbort };
  }

  const commit = await client.commitBatch(brandId, validRows);
  return {
    totalRows: total,
    accepted,
    rejected,
    commit: { attempted: true, ok: commit.ok, imported: commit.imported, error: commit.error },
    ...(commit.ok ? {} : { abortedReason: commit.error }),
  };
}



