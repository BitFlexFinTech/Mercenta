/**
 * §Phase C — Acquisition relationships (CRM context for PRE-onboarding brands).
 *
 * The Brand CRM is the canonical relationship + communication context. A
 * prospect that is being worked through outreach has a relationship record
 * before it ever becomes an onboarded brand, so it is surfaced here rather than
 * in a separate system:
 *
 *   Opportunity (BI-qualified) → relationship record → the SAME Acquisition
 *   timeline + the SAME canonical message thread the acquisition workflow uses.
 *
 * No duplicate conversation history: this renders the one relationship context
 * built by `getRelationshipContext` from the acquisition store + BI store +
 * the canonical message store.
 */
import { useMemo, useState } from 'react';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { getAcquisitionSummary, listAcquisitionProspects } from '@/lib/acquisition/outreachLifecycle';
import { getOnboardingForProspect } from '@/lib/onboarding/onboardingLifecycle';
import { useCanonicalStoreVersion } from '@/data/queries';
import { getPersistenceStatus } from '@/data/acquisitionStore';
import { AcquisitionWorkflow } from './AcquisitionWorkflow';
import { Trophy, ChevronRight } from 'lucide-react';

const STAGE_STYLES: Record<string, string> = {
  qualified: 'bg-state-success/10 text-state-success border-state-success/20',
  responded: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  won: 'bg-accent/15 text-accent border-accent/30',
  lost: 'bg-tint text-muted border-hairline',
  new: 'bg-tint text-strong border-hairline',
  contacted: 'bg-state-info/10 text-state-info border-state-info/20',
};

export function AcquisitionRelationships() {
  const [openId, setOpenId] = useState<string | null>(null);
  const version = useCanonicalStoreVersion();
  const rows = listAcquisitionProspects().filter((r) => r.opportunity);
  const summary = getAcquisitionSummary();
  const persistence = getPersistenceStatus();
  void version; // canonical store change signal → re-read the derived rows
  /** §Phase E1 — each row with its canonical onboarding record (null before hand-off). */
  const rowViews = rows.map((r) => ({ row: r, onboarding: getOnboardingForProspect(r.prospect.id) }));
  const onboardedCount = rowViews.filter((v) => v.onboarding).length;
  const operationalCount = rowViews.filter((v) => v.onboarding?.status === 'completed').length;
  const open = rows.find((r) => r.prospect.id === openId) ?? null;

  return (
    <Card title="Acquisition Relationships (pre-onboarding)">
      <div className="px-1 pb-1 space-y-3">
        <p className="text-ds-label text-muted">
          Prospect-backed opportunities created from the Brand Intelligence acquisition workflow. Each
          row opens the canonical relationship context — outreach history, responses, the opportunity and
          the ONE message thread also shown in Admin → Messages.
        </p>
        <div className="flex flex-wrap gap-2 text-ds-micro text-muted">
          <span>In acquisition: <span className="text-strong font-mono">{summary.enrolled}</span></span>
          <span>Responses: <span className="text-strong font-mono">{summary.responded}</span></span>
          <span>Opportunities: <span className="text-strong font-mono">{summary.opportunities}</span></span>
          <span>In onboarding: <span className="text-strong font-mono">{onboardedCount}</span></span>
          <span>Operational: <span className="text-strong font-mono">{operationalCount}</span></span>
        </div>

        {/* §Phase D4 — honest persistence status (never claims storage it lacks). */}
        <div className="text-ds-micro text-muted" data-section="persistence-status">
          Persistence:{' '}
          <span
            className={cn(
              'font-mono',
              persistence.state === 'failed'
                ? 'text-state-danger'
                : persistence.state === 'durable'
                  ? 'text-state-success'
                  : 'text-muted'
            )}
          >
            {persistence.state}
          </span>
          {persistence.state === 'memory-only' &&
            ' — no Supabase connection in this environment: acquisition state is session-only, not durable.'}
          {persistence.state === 'failed' && ` — write failed: ${persistence.error ?? 'unknown error'}`}
        </div>

        {rows.length === 0 ? (
          <p className="text-ds-label text-faint">
            No acquisition opportunities yet. Run the workflow on a Brand Intelligence prospect
            (Brand Intelligence → brand → Outreach) to create one.
          </p>
        ) : (
          <div className="divide-y divide-hairline-06">
            {rowViews.map(({ row: r, onboarding }) => (
              <button
                key={r.prospect.id}
                onClick={() => setOpenId(openId === r.prospect.id ? null : r.prospect.id)}
                className="w-full flex items-center justify-between gap-2 px-1 py-2 text-left hover:bg-tint"
              >
                <span className="min-w-0">
                  <span className="text-xs font-medium text-strong inline-flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-accent-400" />
                    {r.prospect.brand}
                  </span>
                  <span className="block text-ds-micro text-muted font-mono">
                    {r.opportunity?.id} · BI {r.opportunity?.biScore}/100 · owner {r.opportunity?.ownerStaffId} · {r.responseCount} response(s)
                  </span>
                  {/* §Phase E1 — the hand-off status once onboarding has begun. */}
                  {onboarding && (
                    <span className="block text-ds-micro text-muted" data-onboarding-row={onboarding.status}>
                      Onboarding {onboarding.status.replace('_', ' ')} · tenant {onboarding.brandId}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn('text-ds-micro border capitalize', STAGE_STYLES[r.opportunity?.stage ?? 'new'])}>
                    {r.opportunity?.stage}
                  </Badge>
                  <ChevronRight className={cn('w-3.5 h-3.5 text-muted transition-transform', openId === r.prospect.id && 'rotate-90')} />
                </span>
              </button>
            ))}
          </div>
        )}

        {open && (
          <div className="border border-hairline rounded-ds-md p-3" data-section="crm-acquisition-relationship">
            <div className="flex items-center justify-between pb-2">
              <p className="text-ds-micro font-semibold text-muted uppercase">
                Relationship — {open.prospect.brand}
              </p>
              <span className="text-ds-micro text-faint">live — reads the canonical store</span>
            </div>
            <AcquisitionWorkflow prospectId={open.prospect.id} />
          </div>
        )}
      </div>
    </Card>
  );
}
