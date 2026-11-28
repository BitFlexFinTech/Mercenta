/**
 * §Batch 34 — CSV catalog import UI component.
 * Drag-and-drop upload, stream-parse & validate, preview table, atomic commit.
 */
import { useState, useRef, useCallback } from 'react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { importCatalogCsv, createCatalogImportClient, type RowOutcome, type ImportSummary, type CatalogCsvRow } from '@/lib/catalog/csvImport';
import { Upload, CheckCircle2, XCircle, AlertTriangle, Loader2, Database } from 'lucide-react';

type Phase = 'idle' | 'parsing' | 'preview' | 'committing' | 'done';
interface PRow { lineNumber: number; valid: boolean; row?: CatalogCsvRow; errors?: string[]; }

type ImportResult = ImportSummary & { abortedReason?: string };
export function CsvCatalogImport({ brandId, onComplete }: { brandId: string; onComplete?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<PRow[]>([]);
  const [summary, setSummary] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

async function* readFileAsChunks(file: File): AsyncIterable<string> {
  const text = await file.text();
  const chunkSize = 65536;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
}

const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Select a CSV file'); return; }
    setFileName(file.name); setPhase('parsing'); setError(null);
    const parsed: PRow[] = [];
    try {
      const result = await importCatalogCsv(brandId, readFileAsChunks(file), {
        client: createCatalogImportClient(null),
        onRow: (o: RowOutcome) => {
          if (o.type === 'row') parsed.push({ lineNumber: o.lineNumber, valid: o.ok, row: o.ok ? o.row : undefined, errors: o.ok ? undefined : o.errors });
        },
      });
      setRows(parsed); setSummary(result); setPhase('preview');
    } catch (err) { setError(String(err)); setPhase('idle'); }
  }, [brandId]);

  async function handleCommit() {
    if (!summary) return;
    setPhase('committing');
    try {
      const client = createCatalogImportClient(null);
      const valid = rows.filter((r) => r.valid && r.row).map((r) => r.row!);
      const commit = await client.commitBatch(brandId, valid);
      setSummary((p) => p ? { ...p, commit: { attempted: true, ok: commit.ok, imported: commit.imported, error: commit.error } } : p);
      setPhase('done');
      onComplete?.();
    } catch (err) { setError(String(err)); setPhase('preview'); }
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-accent-400" />
        <h3 className="text-sm font-medium text-strong">Bulk CSV Import</h3>
      </div>

      {phase === 'idle' && (
        <div>
          <div className={cn('border-2 border-dashed rounded-ds-md p-8 text-center cursor-pointer transition-colors', dragOver ? 'border-accent-500/60 bg-accent-500/5' : 'border-hairline-strong hover:border-hairline-strong')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) void handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}>
            <Upload className="w-8 h-8 text-faint mx-auto mb-2" />
            <p className="text-sm text-muted">Drop a CSV file here, or click to browse</p>
            <p className="text-xs text-faint mt-1">Required: name, SKU, barcode, exWorksPrice, ukRetailPrice, commodityCode, vatStatus, hazmat, length, width, height, weight</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          </div>
          {error && <p className="text-xs text-state-danger mt-2">{error}</p>}
        </div>
      )}

      {phase === 'parsing' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent-400 mr-2" />
          <span className="text-sm text-muted">Parsing and validating {fileName}...</span>
        </div>
      )}

      {(phase === 'preview' || phase === 'done') && summary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted">{fileName} &mdash; {summary.totalRows} rows</span>
              <span className="text-state-success">{validCount} valid</span>
              {invalidCount > 0 && <span className="text-state-danger">{invalidCount} invalid</span>}
            </div>
            {summary.abortedReason && (
              <div className="flex items-center gap-1 text-ds-micro text-state-warning">
                <AlertTriangle className="w-3 h-3" /> {summary.abortedReason}
              </div>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto border border-hairline rounded-ds-md">
            {/* §PHASE D — this preview KEEPS its own markup because two behaviours the primitive
               cannot express are functional here: the sticky header inside a fixed-height
               scroller, and the red tint on invalid rows. It has therefore ADOPTED the canonical
               CONTRACT instead (the row's documented minimum): the `data-table` hook, a real
               `<caption>`, `scope` on every header, and a canonical `text-ds-*` step — so it is
               measurable, addressable by tests, and announced properly by a screen reader. */}
            <table className="w-full text-ds-micro" data-table="csv-import-preview">
              <caption className="sr-only">Parsed catalogue rows and their validation status</caption>
              <thead className="sticky top-0 bg-surface-raised">
                <tr className="border-b border-hairline text-muted">
                  <th scope="col" className="px-2 py-1 text-left">#</th>
                  <th scope="col" className="px-2 py-1 text-left">SKU</th>
                  <th scope="col" className="px-2 py-1 text-left">Name</th>
                  <th scope="col" className="px-2 py-1 text-right">Price</th>
                  <th scope="col" className="px-2 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-06">
                {rows.map((r) => (
                  <tr key={r.lineNumber} className={r.valid ? '' : 'bg-red-500/5'}>
                    <td className="px-2 py-1 text-faint">{r.lineNumber}</td>
                    <td className="px-2 py-1 font-mono text-strong">{r.row?.sku ?? '\u2014'}</td>
                    <td className="px-2 py-1 text-strong truncate max-w-[200px]">{r.row?.name ?? '\u2014'}</td>
                    <td className="px-2 py-1 text-right text-strong">{r.row ? '\u00a3' + r.row.exWorksPrice.toFixed(2) : '\u2014'}</td>
                    <td className="px-2 py-1 text-center">
                      {r.valid ? <CheckCircle2 className="w-3 h-3 text-state-success inline" /> : <span className="text-state-danger inline-flex items-center gap-1 cursor-help" title={r.errors?.join('; ')}><XCircle className="w-3 h-3" /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.filter((r) => !r.valid).length > 0 && (
            <div className="text-ds-micro text-state-danger space-y-0.5 max-h-20 overflow-y-auto">
              {rows.filter((r) => !r.valid).slice(0, 5).map((r) => (
                <p key={r.lineNumber}>Line {r.lineNumber}: {r.errors?.join('; ')}</p>
              ))}
              {rows.filter((r) => !r.valid).length > 5 && <p className="text-muted">...and {rows.filter((r) => !r.valid).length - 5} more</p>}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-hairline">
            {phase === 'preview' && validCount > 0 && !summary.commit?.attempted && (
              <Button variant="accent" className="text-xs" onClick={handleCommit}>
                <Database className="w-3.5 h-3.5 mr-1" /> Import {validCount} product(s)
              </Button>
            )}
            {phase === 'preview' && summary.commit?.attempted && !summary.commit?.ok && (
              <p className="text-xs text-state-danger">{summary.commit.error}</p>
            )}
            <Button variant="ghost" className="text-xs" onClick={() => { setPhase('idle'); setRows([]); setSummary(null); setError(null); }}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {phase === 'done' && summary?.commit?.ok && (
        <div className="bg-state-success/10 border border-state-success/20 rounded-ds-md p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-state-success" />
          <span className="text-xs text-state-success">Successfully imported {summary.commit.imported} product(s) into the catalog.</span>
        </div>
      )}

      {error && <p className="text-xs text-state-danger mt-2">{error}</p>}
    </Card>
  );
}