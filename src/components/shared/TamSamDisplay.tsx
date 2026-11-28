/**
 * §Batch-17 — Reusable TAM/SAM display components.
 * Three surface contexts: homepage aggregate, admin/investor breakdown,
 * per-category card for outreach.
 */
import { useState, useMemo } from 'react';
import { Card, Badge, Button, DataTable } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { ApprovedCategory } from '@/types';
import { getTamSamReport, getCategoryTamSam, formatTamSamReport } from '@/lib/market-data/tamSamPipeline';
import { BarChart3, TrendingUp, Download, ChevronDown, ChevronRight, Info } from 'lucide-react';

/* ── Aggregate display (homepage / pitch overview) ───────────────── */

export function TamSamAggregate({ compact = false }: { compact?: boolean }) {
  const report = useMemo(() => getTamSamReport(), []);

  if (compact) {
    return (
      <p className="text-xs text-muted">
        UK import market: <strong className="text-strong">GBP {report.totalTamGbp.toFixed(0)}B</strong> total ·{' '}
        Addressable: <strong className="text-accent-400">GBP {report.totalSamGbp.toFixed(1)}B</strong> ·{' '}
        <span className="text-faint">ONS {report.categories[0].dataYear}</span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent-400" />
        <span className="text-xs font-medium text-strong">UK Import Market — TAM / SAM</span>
        <Badge className="text-ds-micro bg-accent-500/15 text-accent-400">{report.categories[0].dataYear} Data</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-ds-md p-3 border border-hairline">
          <p className="text-ds-micro text-muted">Total Addressable Market</p>
          <p className="text-2xl font-bold font-mono text-strong mt-1">GBP {report.totalTamGbp.toFixed(0)}B</p>
          <p className="text-ds-micro text-faint mt-1">All UK import value across {report.categories.length} categories</p>
        </div>
        <div className="bg-surface rounded-ds-md p-3 border border-accent-500/20">
          <p className="text-ds-micro text-muted">Serviceable Addressable Market</p>
          <p className="text-2xl font-bold font-mono text-accent-400 mt-1">GBP {report.totalSamGbp.toFixed(1)}B</p>
          <p className="text-ds-micro text-faint mt-1">Realistic reach given wholesale model and sourcing regions</p>
        </div>
      </div>
      <p className="text-ds-micro text-faint flex items-start gap-1">
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
          <TrendingUp className="w-4 h-4 text-accent-400" />
          <span className="text-xs font-medium text-strong">Category Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <Button className="text-ds-micro" onClick={handleDownload}><Download className="w-3 h-3 mr-1" /> Report</Button>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse category breakdown' : 'Expand category breakdown'}
            className="text-muted hover:text-strong"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-ds-micro">
        <div className="bg-surface rounded-ds-sm p-2 border border-hairline">
          <p className="text-muted">{report.categories.length} Categories</p>
          <p className="font-semibold text-strong">GBP {report.totalTamGbp.toFixed(0)}B TAM</p>
        </div>
        <div className="bg-surface rounded-ds-sm p-2 border border-hairline">
          <p className="text-muted">Addressable</p>
          <p className="font-semibold text-accent-400">GBP {report.totalSamGbp.toFixed(1)}B SAM</p>
        </div>
        <div className="bg-surface rounded-ds-sm p-2 border border-hairline">
          <p className="text-muted">Avg. Penetration</p>
          <p className="font-semibold text-strong">{Math.round(report.totalSamGbp / report.totalTamGbp * 100)}%</p>
        </div>
      </div>

      {expanded && (
        /* §PHASE D — REPOINTED to the ONE canonical table primitive. This was a hand-rolled
           `text-ds-micro` table, so the same breakdown rendered at 11px here and 14px on every
           screen that used the canonical table — the exact two-sizes defect registry row
           `discovered-hand-rolled-tables-outside-the-canonical-primitive` records. Every column,
           alignment and value is unchanged; the table now also carries `scope="col"` headers, a
           caption, the `data-table` hook and `mobile="scroll"` (this is genuinely columnar
           comparison data, so the labelled-card list would lose the side-by-side reading). */
        <DataTable
          rows={report.categories}
          rowKey={(c) => c.category}
          caption="Category TAM and SAM breakdown"
          dataTable="tam-sam-categories"
          mobile="scroll"
          columns={[
            {
              key: 'category',
              label: 'Category',
              primary: true,
              render: (c) => <span className="font-medium text-strong">{c.category}</span>,
            },
            {
              key: 'tam',
              label: 'TAM (GBP B)',
              align: 'right',
              render: (c) => <span className="font-mono text-strong">{c.tamGbpBillions.toFixed(1)}</span>,
            },
            {
              key: 'sam',
              label: 'SAM (GBP B)',
              align: 'right',
              render: (c) => <span className="font-mono text-accent-400">{c.samGbpBillions.toFixed(2)}</span>,
            },
            {
              key: 'samPercentage',
              label: 'SAM %',
              align: 'right',
              render: (c) => <span className="font-mono text-muted">{c.samPercentage}%</span>,
            },
            {
              key: 'hsCodes',
              label: 'HS Codes',
              render: (c) => <span className="font-mono text-muted">{c.hsCodeRanges.join(', ')}</span>,
            },
          ]}
        />
      )}

      <p className="text-ds-micro text-faint flex items-start gap-1">
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
    return <p className="text-xs text-faint">No market data for {category}.</p>;
  }

  return (
    <div className="bg-surface rounded-ds-md border border-hairline p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-3 h-3 text-accent-400" />
        <span className="text-ds-micro font-medium text-strong">{data.category}</span>
        <Badge className="text-ds-micro bg-tint text-muted ml-auto">{data.dataYear}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-ds-micro">
        <div>
          <p className="text-muted">UK Import TAM</p>
          <p className="font-mono font-semibold text-strong">GBP {data.tamGbpBillions.toFixed(1)}B</p>
        </div>
        <div>
          <p className="text-muted">Addressable SAM</p>
          <p className="font-mono font-semibold text-accent-400">GBP {data.samGbpBillions.toFixed(2)}B</p>
        </div>
      </div>
      <p className="text-ds-micro text-muted mt-1.5 leading-relaxed">{data.description}</p>
      <p className="text-ds-micro text-faint mt-1">{data.source}</p>
    </div>
  );
}