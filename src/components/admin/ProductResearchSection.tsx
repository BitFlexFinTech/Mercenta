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
          <Beaker className="w-4 h-4 text-accent-400" />
          <span className="text-sm font-semibold text-strong">Product Research Agent</span>
          <Badge className="text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">Super Admin</Badge>
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

      <p className="text-ds-label text-muted mb-3">
        Cross-references UK marketplace data (via Keepa) against Mercenta&apos;s current catalog
        to surface product opportunities. The acceptance-probability score is an <strong>internal
        heuristic</strong> defined by Mercenta, not a real prediction. Data source:{' '}
        {report ? report.sourceLabel : 'Keepa (Mock) - add API key in Integrations to go live'}
      </p>

      {error && <div className="bg-state-danger/10 border border-state-danger/20 rounded-ds-md p-3 text-xs text-state-danger mb-3">{error}</div>}

      {!report && !loading && (
        <div className="text-center py-8">
          <Beaker className="w-10 h-10 text-faint mx-auto mb-3" />
          <p className="text-xs text-muted">Run product research to discover marketplace opportunities</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="animate-pulse text-xs text-muted">Scanning marketplace data, cross-referencing catalog...</div>
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
              <p className="text-ds-micro text-muted">Gaps</p>
              <p className="text-sm font-semibold text-strong">{report.gaps.length}</p>
            </div>
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Top Opportunities</p>
              <p className="text-sm font-semibold text-accent-400">{report.topGaps.length}</p>
            </div>
            <div className="bg-surface rounded-ds-md p-2">
              <p className="text-ds-micro text-muted">Source</p>
              <p className="text-sm font-semibold text-strong">{report.sourceLabel}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {report.topGaps.length === 0 && (
              <p className="text-xs text-faint text-center py-4">No unlisted opportunities found.</p>
            )}
            {report.topGaps.map((gap) => {
              const isSelected = selectedGap === gap.asin;
              const scoreColor = gap.acceptanceScore >= 80 ? 'text-state-success' : gap.acceptanceScore >= 60 ? 'text-state-warning' : 'text-muted';
              return (
                <div key={gap.asin}
                  className={cn('rounded-ds-md border p-2.5 cursor-pointer transition-all',
                    isSelected ? 'bg-accent-500/10 border-accent-500/30' : 'bg-surface border-hairline hover:border-hairline-strong'
                  )}
                  onClick={() => setSelectedGap(isSelected ? null : gap.asin)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-strong truncate">{gap.productTitle}</span>
                        <Badge className={cn('text-ds-micro', gap.categoryApproved ? 'bg-state-success/10 text-state-success' : 'bg-state-danger/10 text-state-danger')}>{gap.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-ds-micro text-muted mt-0.5">
                        <span>{String.fromCharCode(163)}{gap.currentPrice.toFixed(2)}</span>
                        <span>BSR {gap.salesRank}</span>
                        <span>~{gap.estimatedMonthlySales}/mo</span>
                        {gap.alreadyListed ? (
                          <Badge className="text-ds-micro bg-state-warning/10 text-state-warning">Listed by {gap.listedByBrand}</Badge>
                        ) : (
                          <Badge className="text-ds-micro bg-state-success/10 text-state-success">Gap</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-bold font-mono', scoreColor)}>{gap.acceptanceScore}</div>
                      <p className="text-ds-micro text-faint">/100</p>
                    </div>
                  </div>
{isSelected && (
                    <div className="mt-2 pt-2 border-t border-hairline space-y-1.5">
                      <p className="text-ds-micro text-muted leading-relaxed">{gap.reasoning}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-muted">Category</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.categoryFit >= 20 ? 'text-state-success' : 'text-state-danger')}>{gap.acceptanceFactors.categoryFit}/25</p>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-muted">Compliance</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.complianceFit >= 20 ? 'text-state-success' : 'text-state-danger')}>{gap.acceptanceFactors.complianceFit}/25</p>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-muted">Margin</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.marginFit >= 20 ? 'text-state-success' : 'text-state-danger')}>{gap.acceptanceFactors.marginFit}/25</p>
                        </div>
                        <div className="bg-surface-overlay rounded-ds-sm p-1.5 text-center">
                          <p className="text-ds-micro text-muted">IP</p>
                          <p className={cn('text-ds-micro font-mono font-bold', gap.acceptanceFactors.ipConflictFree >= 20 ? 'text-state-success' : 'text-state-danger')}>{gap.acceptanceFactors.ipConflictFree}/25</p>
                        </div>
                      </div>
                      {gap.candidateBrands.length > 0 && (
                        <div className="pt-1">
                          <p className="text-ds-micro text-muted mb-1">Candidate brands:</p>
                          <div className="flex flex-wrap gap-1">
                            {gap.candidateBrands.map((cb) => (
                              <Badge key={cb.name} className="text-ds-micro bg-blue-500/10 text-state-info border-state-info/20">
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
