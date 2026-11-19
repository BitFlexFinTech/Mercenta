/**
 * §Batch-7 — Manufacturer Sourcing UI (Super Admin only).
 */
import { useState } from 'react';
import { runManufacturerSourcing, formatSourcingReportAsText } from '@/lib/research/manufacturerSourcingEngine';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { ManufacturerSourcingReport } from '@/types';
import { Download, Factory } from 'lucide-react';

export function ManufacturerSourcingSection() {
  const [report, setReport] = useState<ManufacturerSourcingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const result = await runManufacturerSourcing({ requireTradeAssurance: true });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sourcing failed');
    } finally { setLoading(false); }
  }

  function handleDownload() {
    if (!report) return;
    const text = formatSourcingReportAsText(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manufacturer-sourcing-report-' + report.generatedAt.slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-strong">Manufacturer Sourcing</span>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <Button className="text-ds-micro" onClick={handleDownload}>
              <Download className="w-3 h-3 mr-1" /> Download Report
            </Button>
          )}
          <Button className="text-xs" onClick={handleRun} disabled={loading}>
            {loading ? 'Searching...' : report ? 'Re-run Search' : 'Run Supplier Search'}
          </Button>
        </div>
      </div>

      <p className="text-ds-label text-zinc-500 mb-3">
        Searches Alibaba public verified suppliers across all approved categories.
        Shows Trade Assurance badges, verified-supplier status, and UK export capability.
        Uses only public, non-authenticated page data.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-ds-md p-3 text-xs text-red-300 mb-3">{error}</div>}

      {!report && !loading && (
        <div className="text-center py-8">
          <Factory className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Run supplier search to discover verified Alibaba manufacturers</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="animate-pulse text-xs text-zinc-400">Searching supplier directories...</div>
        </div>
      )}

      {report && (
<>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Scanned</p>
              <p className="text-sm font-semibold text-strong">{report.scannedCount}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Qualified</p>
              <p className="text-sm font-semibold text-strong">{report.suppliers.length}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Top Suppliers</p>
              <p className="text-sm font-semibold text-brass-400">{report.topSuppliers.length}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Source</p>
              <p className="text-sm font-semibold text-strong">{report.sourceLabel}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {report.topSuppliers.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-4">No qualified suppliers found.</p>
            )}
            {report.topSuppliers.map((s) => {
              const isSelected = selectedSupplier === s.id;
              const score = scoreSupplierForDisplay(s);
              return (
                <div key={s.id}
                  className={cn('rounded-ds-md border p-2.5 cursor-pointer transition-all',
                    isSelected ? 'bg-brass-500/10 border-brass-500/30' : 'bg-ink-900 border-hairline hover:border-hairline-strong'
                  )}
                  onClick={() => setSelectedSupplier(isSelected ? null : s.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-strong truncate">{s.companyName}</span>
                        <Badge className="text-ds-micro bg-zinc-500/15 text-zinc-400">{s.country}</Badge>
                        {s.tradeAssurance && <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Trade Assurance</Badge>}
                        {s.verifiedSupplier && <Badge className="text-ds-micro bg-blue-500/15 text-blue-300">Verified</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-ds-micro text-zinc-500 mt-0.5">
                        <span>{s.category}</span>
                        <span>{s.yearsInBusiness}yrs</span>
                        <span>{s.productCount} products</span>
                        {s.exportsToUk && <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Exports to UK</Badge>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold font-mono text-emerald-400">{score}</div>
                      <p className="text-ds-micro text-zinc-600">/100</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-hairline space-y-1.5">
                      <div className="grid grid-cols-2 gap-2 text-ds-micro">
                        <div className="bg-ink-800 rounded-ds-sm p-1.5">
                          <span className="text-zinc-500">Capacity: </span>
                          <span className="text-zinc-300">{s.capacity ?? 'N/A'}</span>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5">
                          <span className="text-zinc-500">MOQ: </span>
                          <span className="text-zinc-300">{s.moq ?? 'N/A'}</span>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5">
                          <span className="text-zinc-500">Response: </span>
                          <span className="text-zinc-300">{s.responseRate ?? 'N/A'}%</span>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5">
                          <span className="text-zinc-500">Rating: </span>
                          <span className="text-zinc-300">{s.rating ?? 'N/A'}/5</span>
                        </div>
                      </div>
                      <div className="text-ds-micro text-zinc-500">
                        <span className="text-zinc-400">Specializations: </span>
                        {s.specializations.join(', ')}
                      </div>
                      <div className="text-ds-micro text-zinc-500">
                        <span className="text-zinc-400">Price range: </span>
                        {s.priceRange ?? 'N/A'}
                      </div>
                      <div className="text-ds-micro text-zinc-600 truncate">
                        <span className="text-zinc-500">Source: </span>
                        {s.sourceUrl}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function scoreSupplierForDisplay(s: { tradeAssurance: boolean; verifiedSupplier: boolean; exportsToUk: boolean; yearsInBusiness: number; productCount: number }): number {
  let score = 0;
  if (s.tradeAssurance) score += 30;
  if (s.verifiedSupplier) score += 25;
  if (s.exportsToUk) score += 20;
  score += Math.min(s.yearsInBusiness * 2, 15);
  score += Math.min(s.productCount / 10, 10);
  return score;
}
