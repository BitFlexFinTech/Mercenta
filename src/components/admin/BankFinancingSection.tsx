/**
 * §Batch-18 — Bank financing partner pitch section (Super Admin).
 * Generates a pitch deck for approaching PO-financing banks/fintechs per
 * sourcing region. Incorporates UK import TAM/SAM data from Batch 17.
 */
import { useMemo } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { getFinancingPartnerForRegion } from '@/types';
import { getTamSamReport } from '@/lib/market-data/tamSamPipeline';
import type { BrandRegion, FinancingPartner } from '@/types';
import { Download, Landmark, AlertTriangle } from 'lucide-react';

const REGION_LABELS: Record<BrandRegion, string> = {
  north_america: 'North America', europe: 'Europe', africa: 'Africa',
};

function formatPitchDeck(): string {
  const report = getTamSamReport();
  let out = '# Mercenta Partners — Bank Financing Partner Deck\n\n';
  out += '## UK Import Market Context\n';
  out += 'Total TAM: GBP ' + report.totalTamGbp.toFixed(0) + 'B across ' + report.categories.length + ' categories\n';
  out += 'Serviceable SAM: GBP ' + report.totalSamGbp.toFixed(1) + 'B\nSource: ' + report.source + '\n\n';
  out += '## Mercenta Positioning\n"B2B wholesale distribution platform" — revenue from wholesale/logistics margin and commission, with SaaS-like platform layer.\n\n';
  out += '## Regional Financing Partners\nOne relationship per major sourcing region:\n\n';

  for (const region of ['north_america', 'europe', 'africa'] as BrandRegion[]) {
    const partners = getFinancingPartnerForRegion(region);
    out += '### ' + REGION_LABELS[region] + '\n';
    for (const p of partners) {
      out += '- ' + p.name + ' (' + p.type.replace(/_/g, ' ') + ')\n  Advance: ' + (p.advanceRate * 100).toFixed(0) + '% | Fee: ' + p.feeRange + ' | Turnaround: ' + p.turnaroundDays + ' | Deal size: ' + p.minDealSize + ' - ' + p.maxDealSize + '\n  ' + p.description + '\n';
    }
    out += '\n';
  }
  out += '## Why One Per Region\nMercenta sources from US, Europe, and Africa but distributes only into the UK. One relationship per region matches expertise to each trade corridor.\n';
  return out;
}

export function BankFinancingSection() {
  const report = useMemo(() => getTamSamReport(), []);

  function handleDownload() {
    const text = formatPitchDeck();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mercenta-bank-financing-pitch-deck.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-white">Bank Financing Partners</span>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <Button className="text-ds-micro" onClick={handleDownload}>
          <Download className="w-3 h-3 mr-1" /> Export Pitch Deck
        </Button>
      </div>

      <p className="text-ds-label text-zinc-500 mb-3">
        PO-financing bank/fintech partnerships per sourcing region. UK import TAM/SAM data
        incorporated. One relationship per major trade corridor — US, Europe, Africa.
      </p>

      <div className="grid grid-cols-3 gap-2 text-ds-micro mb-4">
        <div className="bg-ink-900 rounded-ds-sm p-2 border border-white/[0.06]">
          <p className="text-zinc-500">Total UK Import TAM</p>
          <p className="font-semibold text-white">GBP {report.totalTamGbp.toFixed(0)}B</p>
        </div>
        <div className="bg-ink-900 rounded-ds-sm p-2 border border-white/[0.06]">
          <p className="text-zinc-500">Serviceable SAM</p>
          <p className="font-semibold text-brass-400">GBP {report.totalSamGbp.toFixed(1)}B</p>
        </div>
        <div className="bg-ink-900 rounded-ds-sm p-2 border border-white/[0.06]">
          <p className="text-zinc-500">Categories</p>
          <p className="font-semibold text-white">{report.categories.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {(['north_america', 'europe', 'africa'] as BrandRegion[]).map(function(region) { return (
          <div key={region}>
            <p className="text-ds-label font-medium text-white mb-1.5">{REGION_LABELS[region]}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getFinancingPartnerForRegion(region).map(function(p: FinancingPartner) { return (
                <div key={p.id} className="bg-ink-900 rounded-ds-md border border-white/[0.06] p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ds-label font-medium text-white">{p.name}</span>
                    {p.isMock && <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">(Mock)</Badge>}
                  </div>
                  <p className="text-ds-micro text-zinc-500 mb-1.5">{p.description}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-ds-micro">
                    <span className="text-zinc-500">Advance:</span>
                    <span className="text-zinc-300 font-mono text-right">{(p.advanceRate * 100).toFixed(0)}%</span>
                    <span className="text-zinc-500">Fees:</span>
                    <span className="text-zinc-300 font-mono text-right">{p.feeRange}</span>
                    <span className="text-zinc-500">Turnaround:</span>
                    <span className="text-zinc-300 font-mono text-right">{p.turnaroundDays}</span>
                    <span className="text-zinc-500">Deal size:</span>
                    <span className="text-zinc-300 font-mono text-right">{p.minDealSize} – {p.maxDealSize}</span>
                  </div>
                </div>
              );})}
            </div>
          </div>
        );})}
      </div>

      <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-ds-md p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3 h-3 text-emerald-400" />
          <span className="text-ds-micro font-medium text-emerald-300">Notable Partner — Africa</span>
        </div>
        <p className="text-ds-micro text-zinc-400 leading-relaxed">
          British International Investment (BII) is the UK government's own development finance institution,
          mandated to finance UK-Africa trade. Given Mercenta's DCTS-tariff sourcing
          from Zimbabwe and other African markets, BII is the most strategically-aligned
          financing partner for the Africa corridor.
        </p>
      </div>
    </Card>
  );
}