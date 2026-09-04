/**
 * §Batch-17 — Reusable TAM/SAM display components.
 * Three surface contexts: homepage aggregate, admin/investor breakdown,
 * per-category card for outreach.
 */
import { useState, useMemo } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { ApprovedCategory } from '@/types';
import { getTamSamReport, getCategoryTamSam, formatTamSamReport } from '@/lib/market-data/tamSamPipeline';
import { BarChart3, TrendingUp, Download, ChevronDown, ChevronRight, Info } from 'lucide-react';

/* ── Aggregate display (homepage / pitch overview) ───────────────── */

export function TamSamAggregate({ compact = false }: { compact?: boolean }) {
  const report = useMemo(() => getTamSamReport(), []);

  if (compact) {
    return (
      <p className="text-xs text-zinc-400">
        UK import market: <strong className="text-white">GBP {report.totalTamGbp.toFixed(0)}B</strong> total ·{' '}
        Addressable: <strong className="text-brass-400">GBP {report.totalSamGbp.toFixed(1)}B</strong> ·{' '}
        <span className="text-zinc-600">ONS {report.categories[0].dataYear}</span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-brass-400" />
        <span className="text-xs font-medium text-white">UK Import Market — TAM / SAM</span>
        <Badge className="text-[8px] bg-brass-500/15 text-brass-400">{report.categories[0].dataYear} Data</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ink-900 rounded-lg p-3 border border-white/[0.06]">
          <p className="text-[10px] text-zinc-500">Total Addressable Market</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">GBP {report.totalTamGbp.toFixed(0)}B</p>
          <p className="text-[9px] text-zinc-600 mt-1">All UK import value across {report.categories.length} categories</p>
        </div>
        <div className="bg-ink-900 rounded-lg p-3 border border-brass-500/20">
          <p className="text-[10px] text-zinc-500">Serviceable Addressable Market</p>
          <p className="text-2xl font-bold font-mono text-brass-400 mt-1">GBP {report.totalSamGbp.toFixed(1)}B</p>
          <p className="text-[9px] text-zinc-600 mt-1">Realistic reach given wholesale model and sourcing regions</p>
        </div>
      </div>
      <p className="text-[9px] text-zinc-600 flex items-start gap-1">
        <Info className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
        Source: {report.source}. SAM is directional — see full report for methodology.
      </p>
    </div>
  );
}
/* ── Full breakdown table (investor pitch / admin) ───────────────── */

export function TamSamBreakdown() {
  const [expanded, setExpanded] = useState(false);
  const report = useMemo(() => getTamSamReport(), []);

  function handleDownload() {
    const text = formatTamSamReport(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tam-sam-report-' + report.generatedAt.slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brass-400" />
          <span className="text-xs font-medium text-white">Category Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <Button className="text-[9px]" onClick={handleDownload}><Download className="w-3 h-3 mr-1" /> Report</Button>
          <button onClick={() => setExpanded(!expanded)} className="text-zinc-500 hover:text-white">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="bg-ink-900 rounded p-2 border border-white/[0.06]">
          <p className="text-zinc-500">{report.categories.length} Categories</p>
          <p className="font-semibold text-white">GBP {report.totalTamGbp.toFixed(0)}B TAM</p>
        </div>
        <div className="bg-ink-900 rounded p-2 border border-white/[0.06]">
          <p className="text-zinc-500">Addressable</p>
          <p className="font-semibold text-brass-400">GBP {report.totalSamGbp.toFixed(1)}B SAM</p>
        </div>
        <div className="bg-ink-900 rounded p-2 border border-white/[0.06]">
          <p className="text-zinc-500">Avg. Penetration</p>
          <p className="font-semibold text-white">{Math.round(report.totalSamGbp / report.totalTamGbp * 100)}%</p>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-zinc-600">
                <th className="text-left py-1.5 font-medium">Category</th>
                <th className="text-right py-1.5 font-medium">TAM (GBP B)</th>
                <th className="text-right py-1.5 font-medium">SAM (GBP B)</th>
                <th className="text-right py-1.5 font-medium">SAM %</th>
                <th className="text-left py-1.5 font-medium">HS Codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {report.categories.map(function(cat) { return (
                <tr key={cat.category} className="hover:bg-white/[0.02]">
                  <td className="py-1.5 text-white font-medium">{cat.category}</td>
                  <td className="py-1.5 text-right font-mono text-zinc-300">{cat.tamGbpBillions.toFixed(1)}</td>
                  <td className="py-1.5 text-right font-mono text-brass-400">{cat.samGbpBillions.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono text-zinc-400">{cat.samPercentage}%</td>
                  <td className="py-1.5 text-zinc-500 font-mono">{cat.hsCodeRanges.join(', ')}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[9px] text-zinc-600 flex items-start gap-1">
        <Info className="w-2.5 h-2.5 mt-px flex-shrink-0" />
        {report.methodology}
      </p>
    </div>
  );
}

/* ── Single-category card (outreach) ─────────────────────────────── */

export function TamSamCategoryCard({ category }: { category: ApprovedCategory }) {
  const data = useMemo(function() { return getCategoryTamSam(category); }, [category]);

  if (!data) {
    return <p className="text-xs text-zinc-600">No market data for {category}.</p>;
  }

  return (
    <div className="bg-ink-900 rounded-lg border border-white/[0.06] p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-3 h-3 text-brass-400" />
        <span className="text-[10px] font-medium text-white">{data.category}</span>
        <Badge className="text-[8px] bg-zinc-500/15 text-zinc-400 ml-auto">{data.dataYear}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p className="text-zinc-500">UK Import TAM</p>
          <p className="font-mono font-semibold text-white">GBP {data.tamGbpBillions.toFixed(1)}B</p>
        </div>
        <div>
          <p className="text-zinc-500">Addressable SAM</p>
          <p className="font-mono font-semibold text-brass-400">GBP {data.samGbpBillions.toFixed(2)}B</p>
        </div>
      </div>
      <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed">{data.description}</p>
      <p className="text-[8px] text-zinc-600 mt-1">{data.source}</p>
    </div>
  );
}