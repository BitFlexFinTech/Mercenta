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
          <Factory className="w-4 h-4 text-accent-400" />
          <span className="text-sm font-semibold text-strong">Manufacturer Sourcing</span>
          <Badge className="text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">Super Admin</Badge>
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

      <p className="text-ds-label text-muted mb-3">
        Searches Alibaba public verified suppliers across all approved categories.
        Shows Trade Assurance badges, verified-supplier status, and UK export capability.
        Uses only public, non-authenticated page data.
      </p>

      {error && <div className="bg-state-danger/10 border border-state-danger/20 rounded-ds-md p-3 text-xs text-state-danger mb-3">{error}</div>}

      {!report && !loading && (
        <div className="text-center py-8">
          <Factory className="w-10 h-10 text-faint mx-auto mb-3" />
          <p className="text-xs text-muted">Run supplier search to discover verified Alibaba manufacturers</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="animate-pulse text-xs text-muted">Searching supplier directories...</div>
        </div>
      )}

      {report && (
<>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Scanned</p>
              <p className="text-sm font-semibold text-strong">{report.scannedCount}</p>
            </div>
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Qualified</p>
              <p className="text-sm font-semibold text-strong">{report.suppliers.length}</p>
            </div>
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Top Suppliers</p>
              <p className="text-sm font-semibold text-accent-400">{report.topSuppliers.length}</p>
            </div>
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Source</p>
              <p className="text-sm font-semibold text-strong">{report.sourceLabel}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {report.topSuppliers.length === 0 && (
              <p className="text-xs text-faint text-center py-4">No qualified suppliers found.</p>
            )}
            {report.topSuppliers.map((s) => {
              const isSelected = selectedSupplier === s.id;
              const score = scoreSupplierForDisplay(s);
              return (
                <div key={s.id}
                  className={cn('rounded-ds-md border p-2.5 cursor-pointer transition-all',
                    isSelected ? 'bg-accent-500/10 border-accent-500/30' : 'bg-surface border-hairline hover:border-hairline-strong'
                  )}
                  onClick={() => setSelectedSupplier(isSelected ? null : s.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-strong truncate">{s.companyName}</span>
                        <Badge className="text-ds-micro bg-tint text-muted">{s.country}</Badge>
                        {s.tradeAssurance && <Badge className="text-ds-micro bg-state-success/10 text-state-success">Trade Assurance</Badge>}
                        {s.verifiedSupplier && <Badge className="text-ds-micro bg-state-info/10 text-state-info">Verified</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-ds-micro text-muted mt-0.5">
                        <span>{s.category}</span>
                        <span>{s.yearsInBusiness}yrs</span>
                        <span>{s.productCount} products</span>
                        {s.exportsToUk && <Badge className="text-ds-micro bg-state-success/10 text-state-success">Exports to UK</Badge>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold font-mono text-state-success">{score}</div>
                      <p className="text-ds-micro text-faint">/100</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-hairline space-y-1.5">
                      <div className="grid grid-cols-2 gap-2 text-ds-micro">
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5">
                          <span className="text-muted">Capacity: </span>
                          <span className="text-strong">{s.capacity ?? 'N/A'}</span>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5">
                          <span className="text-muted">MOQ: </span>
                          <span className="text-strong">{s.moq ?? 'N/A'}</span>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5">
                          <span className="text-muted">Response: </span>
                          <span className="text-strong">{s.responseRate ?? 'N/A'}%</span>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5">
                          <span className="text-muted">Rating: </span>
                          <span className="text-strong">{s.rating ?? 'N/A'}/5</span>
                        </div>
                      </div>
                      <div className="text-ds-micro text-muted">
                        <span className="text-muted">Specializations: </span>
                        {s.specializations.join(', ')}
                      </div>
                      <div className="text-ds-micro text-muted">
                        <span className="text-muted">Price range: </span>
                        {s.priceRange ?? 'N/A'}
                      </div>
                      <div className="text-ds-micro text-faint truncate">
                        <span className="text-muted">Source: </span>
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
