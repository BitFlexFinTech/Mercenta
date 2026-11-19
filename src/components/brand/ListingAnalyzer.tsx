/**
 * §Functional-completion (2026-09-17) — Automated Listing Analyzer (§8).
 *
 * Brand-facing catalogue analysis inside Market Intel:
 *   • Mercenta-Prepared analysis of each catalogue product (deterministic);
 *   • listing health, dimension scores, estimated market position and
 *     opportunity indicators — every figure explicitly labelled simulated;
 *   • suggested improvements with the brand's Approve / Edit / Reject
 *     decision flow (one-shot, audited, store-layered).
 *
 * Tenant scope: products come from useApp().products which is already
 * pinned to the current brand session — another tenant's SKUs can never
 * appear here.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { getProspects } from '@/data/prospectStore';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { applyListingReviewOverrides, reviewListingRecommendation } from '@/data/api';
import { Badge, Button, Card, Select } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import type {
  ListingRecommendation,
  ProductListingAnalysis,
} from '@/types';
import { Check, X, Pencil, Save, TrendingUp, Info, ScanSearch } from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const HEALTH_BADGE: Record<string, string> = {
  strong: 'bg-emerald-500/15 text-emerald-300',
  good: 'bg-blue-500/15 text-blue-300',
  fair: 'bg-amber-500/15 text-amber-300',
  poor: 'bg-rose-500/15 text-rose-300',
};

const STATUS_LABEL: Record<string, string> = {
  suggested: 'Suggested by Mercenta',
  approved: 'Approved by you',
  edited: 'Edited by you',
  rejected: 'Rejected by you',
};

const STATUS_BADGE: Record<string, string> = {
  suggested: 'bg-blue-500/15 text-blue-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  edited: 'bg-amber-500/15 text-amber-300',
  rejected: 'bg-rose-500/15 text-rose-300',
};

export function ListingAnalyzer() {
  const { session, brandProfile, products } = useApp();
  const tenantId = session?.tenantId;
  const brandCategory = brandProfile?.category ?? 'Home';
  const [selectedSku, setSelectedSku] = useState<string>(products[0]?.sku ?? '');
  const [editingRec, setEditingRec] = useState<string | null>(null);
  const [editCopy, setEditCopy] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Forces the analysis memo to recompute after a store-layered decision. */
  const [mutationStamp, setMutationStamp] = useState(0);

  const competitorBrandCount = useMemo(
    () => getProspects().filter((p) => !p.disqualified && p.category === brandCategory).length,
    [brandCategory]
  );

  const selectedProduct = products.find((p) => p.sku === selectedSku) ?? null;

  const analysis = useMemo<ProductListingAnalysis | null>(() => {
    void mutationStamp;
    if (!selectedProduct || !tenantId) return null;
    const raw = analyzeProductListing(selectedProduct as unknown as Record<string, unknown>, {
      category: brandCategory,
      brandId: tenantId,
      competitorBrandCount,
    });
    return applyListingReviewOverrides(raw, tenantId);
  }, [selectedProduct, brandCategory, tenantId, competitorBrandCount, mutationStamp]);

  async function decide(rec: ListingRecommendation, action: 'approved' | 'edited' | 'rejected') {
    if (!tenantId || busyId) return;
    setBusyId(rec.id);
    setError(null);
    setNotice(null);
    const result = await reviewListingRecommendation(tenantId, rec.id, action, {
      editedCopy: action === 'edited' ? editCopy : undefined,
      actorId: `brand:${tenantId}`,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? 'Decision refused.');
    } else {
      setNotice(`Your decision is recorded — improvement "${rec.title}" is now ${action}.`);
    }
    setEditingRec(null);
    setEditCopy('');
    setMutationStamp((s) => s + 1);
  }

  if (!tenantId) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · CATALOGUE"
          title="Listing Analyzer"
          description="Automated listing health analysis for your catalogue products."
        />
        <Card title="Listing Analyzer">
          <p className="text-xs text-zinc-600">No listing analyzer without a tenant session.</p>
        </Card>
      </WorkspaceFrame>
    );
  }

  if (products.length === 0) {
    return (
      <WorkspaceFrame testId="listing-analyzer-empty" className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · CATALOGUE"
          title="Listing Analyzer"
          description="Automated listing health analysis for your catalogue products."
        />
        <Card title="Listing Analyzer">
          <p className="text-xs text-zinc-600">Add products to your catalogue to analyse their listings.</p>
        </Card>
      </WorkspaceFrame>
    );
  }
return (
    <div className="space-y-4" data-testid="listing-analyzer">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-ds-lg bg-brass-500/15 flex items-center justify-center">
          <ScanSearch className="w-5 h-5 text-brass-400" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-sm font-semibold text-strong">Listing Analyzer</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Mercenta prepares an automated listing health analysis for each catalogue product. You review,
            approve, edit or reject each suggested improvement.
          </p>
        </div>
        <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20">
          <Info className="w-3 h-3 mr-1" /> Deterministic simulation
        </Badge>
      </div>

      {notice && <p className="text-ds-label text-emerald-400" data-testid="la-notice">{notice}</p>}
      {error && <p className="text-ds-label text-rose-400" data-testid="la-error">{error}</p>}

      <Card className="p-4">
        <Select
          label="Catalogue product"
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          options={products.map((p) => ({ value: p.sku, label: `${p.name} (${p.sku})` }))}
        />
        {analysis && (
          <div className="flex flex-wrap items-center gap-2 mt-3" data-testid="la-health">
            <span className="text-xs text-zinc-300">Listing health</span>
            <Badge className={cn('text-ds-micro', HEALTH_BADGE[analysis.healthLevel])}>
              {analysis.healthLevel} · {analysis.healthScore}/100
            </Badge>
            <span className="text-ds-micro text-zinc-500">Prepared by {analysis.preparedBy} · {analysis.simulationLabel}</span>
          </div>
        )}
        {analysis && (
          <div className="mt-2 h-2 rounded-full bg-ink-900 border border-hairline overflow-hidden">
            <div
              className={cn(
                'h-full',
                analysis.healthLevel === 'strong' ? 'bg-emerald-400' :
                analysis.healthLevel === 'good' ? 'bg-blue-400' :
                analysis.healthLevel === 'fair' ? 'bg-amber-400' : 'bg-rose-400'
              )}
              style={{ width: `${Math.max(2, analysis.healthScore)}%` }}
            />
          </div>
        )}
      </Card>

      {analysis && (
        <Card title="Health dimensions" subtitle="Where the listing is strong and where it loses ground." className="p-0">
          {analysis.dimensions.map((d) => (
            <div key={d.key} className="flex flex-wrap items-center justify-between gap-x-3 px-4 py-2.5 border-b border-hairline last:border-0" data-testid={`la-dim-${d.key}`}>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-strong">{d.label}</span>
                <span className="block text-ds-micro text-zinc-500 truncate">{d.note}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-ink-900 overflow-hidden">
                  <div className={cn('h-full', d.score >= 70 ? 'bg-emerald-400' : d.score >= 45 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${Math.max(2, d.score)}%` }} />
                </div>
                <span className="w-8 text-right text-ds-label font-mono text-zinc-300">{d.score}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {analysis && (
        <Card title="Estimated market position" subtitle="Deterministic simulation over the planning dataset — never live data." className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-4 py-3">
            {[
              ['Est. units / month', `${analysis.estimates.monthlyUnitsLow}–${analysis.estimates.monthlyUnitsHigh}`],
              ['Est. revenue / month', gbp(analysis.estimates.monthlyRevenueMidGbp)],
              ['Est. revenue / year', gbp(analysis.estimates.annualRevenueMidGbp)],
              ['Retail price', `£${analysis.estimates.priceGbp.toFixed(2)}`],
              ['Est. BSR band', analysis.estimates.bsrBand],
              ['Velocity / month', String(analysis.estimates.velocityPerMonth)],
              ['Demand signal', analysis.estimates.demandSignal],
              ['Category position', analysis.estimates.categoryPosition],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-ds-md border border-hairline bg-ink-850 px-3 py-2">
                <div className="text-ds-micro uppercase tracking-wide text-zinc-500">{k}</div>
                <div className="mt-1 text-ds-label font-medium text-strong">{v}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 text-ds-micro text-zinc-600">
            Competitive position: {analysis.estimates.competitivePosition} · Opportunities: {analysis.estimates.opportunityIndicators.join(' · ') || 'none flagged'}
          </div>
        </Card>
      )}

      {analysis && (
        <Card title="Suggested improvements" subtitle="Mercenta-prepared recommendations — approve, edit or reject each one.">
          {analysis.recommendations.length === 0 ? (
            <p className="text-xs text-zinc-500 px-4 py-3" data-testid="la-no-recs">No suggestions for this listing right now.</p>
          ) : (
            <div className="space-y-3 px-4 py-3" data-testid="la-recommendations">
              {analysis.recommendations.map((rec) => (
                <div key={rec.id} className="rounded-ds-md border border-hairline bg-ink-850 px-3 py-3" data-testid={`la-rec-${rec.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-strong flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-brass-400" /> {rec.title}
                      </span>
                      <span className="text-ds-label text-zinc-500 mt-0.5 block">{rec.detail}</span>
                      <span className="text-ds-micro text-zinc-600 block mt-0.5">Impact: {rec.impact}</span>
                    </div>
                    <Badge className={cn('text-ds-micro', STATUS_BADGE[rec.status])}>{STATUS_LABEL[rec.status]}</Badge>
                  </div>
                  {rec.suggestedCopy && (
                    <p className="text-ds-label text-zinc-300 mt-2 block" data-testid={`la-suggested-${rec.id}`}>
                      <span className="text-ds-micro text-zinc-500 uppercase">Mercenta suggestion: </span>{rec.suggestedCopy}
                    </p>
                  )}
                  {rec.editedCopy && (
                    <p className="text-ds-label text-zinc-300 mt-1 block">
                      <span className="text-ds-micro text-zinc-500 uppercase">Your edited version: </span>{rec.editedCopy}
                    </p>
                  )}
                  {rec.reviewedAt && (
                    <p className="text-ds-micro text-zinc-600 mt-1">Reviewed {rec.reviewedAt.slice(0, 16).replace('T', ' ')}</p>
                  )}
                  {rec.status === 'suggested' && editingRec !== rec.id && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button variant="primary" size="sm" disabled={busyId === rec.id} onClick={() => void decide(rec, 'approved')}>
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button variant="secondary" size="sm" disabled={busyId === rec.id} onClick={() => { setEditingRec(rec.id); setEditCopy(rec.suggestedCopy ?? ''); }}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button variant="tertiary" size="sm" disabled={busyId === rec.id} onClick={() => void decide(rec, 'rejected')}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                  {rec.status === 'suggested' && editingRec === rec.id && (
                    <div className="flex flex-col gap-2 mt-2">
                      <textarea
                        value={editCopy}
                        onChange={(e) => setEditCopy(e.target.value)}
                        rows={3}
                        aria-label="Your edited improvement"
                        data-testid={`la-edit-input-${rec.id}`}
                        className="w-full bg-ink-900 border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-zinc-600 focus:border-brass-500/50"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="primary" size="sm" disabled={busyId === rec.id} onClick={() => void decide(rec, 'edited')}>
                          <Save className="w-3.5 h-3.5" /> Confirm edit
                        </Button>
                        <Button variant="tertiary" size="sm" onClick={() => setEditingRec(null)}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}