/**
 * §Batch-17 — Investor pitch section (TAM/SAM).
 * Full category-level breakdown with ONS methodology, ready for export
 * into pitch materials.
 */
import { useMemo } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { formatTamSamReport, getTamSamReport } from '@/lib/market-data/tamSamPipeline';
import { TamSamBreakdown, TamSamAggregate } from '@/components/shared/TamSamDisplay';
import { Download, ChartPie, TrendingUp } from 'lucide-react';

export function InvestorPitchSection() {
  const report = useMemo(() => getTamSamReport(), []);

  function handleDownload() {
    const text = formatTamSamReport(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mercenta-investor-market-report-' + report.generatedAt.slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartPie className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-white">UK Import Market — Investor Data</span>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <Button className="text-ds-micro" onClick={handleDownload}>
          <Download className="w-3 h-3 mr-1" /> Export Report
        </Button>
      </div>

      <p className="text-ds-label text-zinc-500 mb-4">
        Full TAM/SAM breakdown by category for investor pitch materials. Sources cited:
        ONS UK Trade in Goods (SITC/HS classification). Includes methodology so the figures
        hold up to investor scrutiny.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TamSamAggregate />
        <TamSamBreakdown />
      </div>

      <div className="mt-4 bg-ink-900 border border-white/[0.06] rounded-ds-md p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-brass-400" />
          <span className="text-ds-label font-medium text-white">Positioning Frame</span>
        </div>
        <p className="text-ds-micro text-zinc-400 leading-relaxed">
          <em>&quot;We aren't a needle in a haystack — we are the haystack.&quot;</em> The UK imports over
          GBP {report.totalTamGbp.toFixed(0)}B annually in the {report.categories.length} wholesale categories
          Mercenta covers, of which GBP {report.totalSamGbp.toFixed(1)}B is addressable through its
          direct-to-wholesale model with UK distribution and invite-only brand access.
        </p>
      </div>
    </Card>
  );
}