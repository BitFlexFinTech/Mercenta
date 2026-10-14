/** §Batch-6 — Product Research Agent (Super Admin only). */
import { useState } from 'react';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import { runProductResearch, formatReportAsText } from '@/lib/research/productResearchEngine';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { ProductResearchReport } from '@/types';
import { Download, Beaker } from 'lucide-react';

export function ProductResearchSection() {
  const [report, setReport] = useState<ProductResearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGap, setSelectedGap] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const brandNames = ALL_DEMO_BRANDS.map((b) => b.name);
      const result = await runProductResearch({ keepaApiKey: null, knownBrandNames: brandNames });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally { setLoading(false); }
  }

  function handleDownloadText() {
    if (!report) return;
    const text = formatReportAsText(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-research-report-' + report.generatedAt.slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-white">Product Research Agent</span>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <Button className="text-ds-micro" onClick={handleDownloadText}>
              <Download className="w-3 h-3 mr-1" /> Download Report
            </Button>
          )}
          <Button className="text-xs" onClick={handleRun} disabled={loading}>
            {loading ? 'Scanning...' : report ? 'Re-run Research' : 'Run Product Research'}
          </Button>
        </div>
      </div>

      <p className="text-ds-label text-zinc-500 mb-3">
        Cross-references UK marketplace data (via Keepa) against Mercenta&apos;s current catalog
        to surface product opportunities. The acceptance-probability score is an <strong>internal
        heuristic</strong> defined by Mercenta, not a real prediction. Data source:{' '}
        {report ? report.sourceLabel : 'Keepa (Mock) - add API key in Integrations to go live'}
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-ds-md p-3 text-xs text-red-300 mb-3">{error}</div>}

      {!report && !loading && (
        <div className="text-center py-8">
          <Beaker className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Run product research to discover marketplace opportunities</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="animate-pulse text-xs text-zinc-400">Scanning marketplace data, cross-referencing catalog...</div>
        </div>
      )}

      {report && (

<>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Scanned</p>
              <p className="text-sm font-semibold text-white">{report.scannedCount}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Gaps</p>
              <p className="text-sm font-semibold text-white">{report.gaps.length}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Top Opportunities</p>
              <p className="text-sm font-semibold text-brass-400">{report.topGaps.length}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2">
              <p className="text-ds-micro text-zinc-500">Source</p>
              <p className="text-sm font-semibold text-white">{report.sourceLabel}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {report.topGaps.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-4">No unlisted opportunities found.</p>
            )}
            {report.topGaps.map((gap) => {
              const isSelected = selectedGap === gap.asin;
              const scoreColor = gap.acceptanceScore >= 80 ? 'text-emerald-400' : gap.acceptanceScore >= 60 ? 'text-amber-400' : 'text-zinc-400';
              return (
                <div key={gap.asin}
                  className={cn('rounded-ds-md border p-2.5 cursor-pointer transition-all',
                    isSelected ? 'bg-brass-500/10 border-brass-500/30' : 'bg-ink-900 border-white/[0.06] hover:border-white/[0.12]'
                  )}
                  onClick={() => setSelectedGap(isSelected ? null : gap.asin)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">{gap.productTitle}</span>
                        <Badge className={cn('text-ds-micro', gap.categoryApproved ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300')}>{gap.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-ds-micro text-zinc-500 mt-0.5">
                        <span>{String.fromCharCode(163)}{gap.currentPrice.toFixed(2)}</span>
                        <span>BSR {gap.salesRank}</span>
                        <span>~{gap.estimatedMonthlySales}/mo</span>
                        {gap.alreadyListed ? (
                          <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">Listed by {gap.listedByBrand}</Badge>
                        ) : (
                          <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Gap</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-bold font-mono', scoreColor)}>{gap.acceptanceScore}</div>
                      <p className="text-ds-micro text-zinc-600">/100</p>
                    </div>
                  </div>
{isSelected && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                      <p className="text-ds-micro text-zinc-400 leading-relaxed">{gap.reasoning}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="bg-ink-800 rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-zinc-500">Category</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.categoryFit >= 20 ? 'text-emerald-400' : 'text-red-400')}>{gap.acceptanceFactors.categoryFit}/25</p>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-zinc-500">Compliance</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.complianceFit >= 20 ? 'text-emerald-400' : 'text-red-400')}>{gap.acceptanceFactors.complianceFit}/25</p>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-zinc-500">Margin</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.marginFit >= 20 ? 'text-emerald-400' : 'text-red-400')}>{gap.acceptanceFactors.marginFit}/25</p>
                        </div>
                        <div className="bg-ink-800 rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-zinc-500">IP</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.ipConflictFree >= 20 ? 'text-emerald-400' : 'text-red-400')}>{gap.acceptanceFactors.ipConflictFree}/25</p>
                        </div>
                      </div>
                      {gap.candidateBrands.length > 0 && (
                        <div className="pt-1">
                          <p className="text-ds-micro text-zinc-500 mb-1">Candidate brands:</p>
                          <div className="flex flex-wrap gap-1">
                            {gap.candidateBrands.map((cb) => (
                              <Badge key={cb.name} className="text-ds-micro bg-blue-500/10 text-blue-300 border-blue-500/20">
                                {cb.name} ({cb.country}) - fit {cb.fitScore}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
