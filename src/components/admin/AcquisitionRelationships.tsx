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
import { useCanonicalStoreVersion } from '@/data/queries';
import { AcquisitionWorkflow } from './AcquisitionWorkflow';
import { Trophy, ChevronRight } from 'lucide-react';

const STAGE_STYLES: Record<string, string> = {
  qualified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  responded: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  won: 'bg-brass/15 text-brass border-brass/30',
  lost: 'bg-zinc-500/15 text-zinc-400 border-white/[0.08]',
  new: 'bg-white/[0.05] text-zinc-300 border-white/[0.08]',
  contacted: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

export function AcquisitionRelationships() {
  const [openId, setOpenId] = useState<string | null>(null);
  const version = useCanonicalStoreVersion();
  const rows = listAcquisitionProspects().filter((r) => r.opportunity);
  const summary = getAcquisitionSummary();
  void version; // canonical store change signal → re-read the derived rows
  const open = rows.find((r) => r.prospect.id === openId) ?? null;

  return (
    <Card title="Acquisition Relationships (pre-onboarding)">
      <div className="px-1 pb-1 space-y-3">
        <p className="text-[11px] text-zinc-500">
          Prospect-backed opportunities created from the Brand Intelligence acquisition workflow. Each
          row opens the canonical relationship context — outreach history, responses, the opportunity and
          the ONE message thread also shown in Admin → Messages.
        </p>
        <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
          <span>In acquisition: <span className="text-white font-mono">{summary.enrolled}</span></span>
          <span>Responses: <span className="text-white font-mono">{summary.responded}</span></span>
          <span>Opportunities: <span className="text-white font-mono">{summary.opportunities}</span></span>
        </div>

        {rows.length === 0 ? (
          <p className="text-[11px] text-zinc-600">
            No acquisition opportunities yet. Run the workflow on a Brand Intelligence prospect
            (Brand Intelligence → brand → Outreach) to create one.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {rows.map((r) => (
              <button
                key={r.prospect.id}
                onClick={() => setOpenId(openId === r.prospect.id ? null : r.prospect.id)}
                className="w-full flex items-center justify-between gap-2 px-1 py-2 text-left hover:bg-white/[0.02]"
              >
                <span className="min-w-0">
                  <span className="text-xs font-medium text-white inline-flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-brass-400" />
                    {r.prospect.brand}
                  </span>
                  <span className="block text-[10px] text-zinc-500 font-mono">
                    {r.opportunity?.id} · BI {r.opportunity?.biScore}/100 · owner {r.opportunity?.ownerStaffId} · {r.responseCount} response(s)
                  </span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn('text-[9px] border capitalize', STAGE_STYLES[r.opportunity?.stage ?? 'new'])}>
                    {r.opportunity?.stage}
                  </Badge>
                  <ChevronRight className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform', openId === r.prospect.id && 'rotate-90')} />
                </span>
              </button>
            ))}
          </div>
        )}

        {open && (
          <div className="border border-white/[0.06] rounded-lg p-3" data-section="crm-acquisition-relationship">
            <div className="flex items-center justify-between pb-2">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase">
                Relationship — {open.prospect.brand}
              </p>
              <span className="text-[9px] text-zinc-600">live — reads the canonical store</span>
            </div>
            <AcquisitionWorkflow prospectId={open.prospect.id} />
          </div>
        )}
      </div>
    </Card>
  );
}
