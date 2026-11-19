/**
 * §Phase C — Acquisition pipeline (ICP consumption of canonical BI prospects).
 *
 * The acquisition universe is DERIVED from the canonical Brand Intelligence
 * prospect store (the ten real brands), so every row carries its canonical
 * `prospectId`. Nothing on this screen is a fabricated lead: preparing a
 * recommendation here starts the same workflow the BI prospect's Outreach tab
 * operates, and the review/approval/send/response steps are performed there.
 */
import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  getAcquisitionSummary,
  listAcquisitionProspects,
  prepareOutreach,
  type AcquisitionProspectRow,
} from '@/lib/acquisition/outreachLifecycle';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { Target, Sparkles } from 'lucide-react';

const STAGE_STYLES: Record<string, string> = {
  'awaiting approval': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/20',
  sent: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  responded: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  qualified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  won: 'bg-brass/15 text-brass border-brass/30',
  lost: 'bg-zinc-500/15 text-zinc-400 border-hairline',
  enrolled: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'not enrolled': 'bg-tint text-zinc-400 border-hairline',
};

export function AcquisitionPipeline() {
  const { actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } = useApp();
  const version = useCanonicalStoreVersion();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** §Stage-18 interactivity — every metric tile drills the table down. */
  const [metricFilter, setMetricFilter] = useState<string | null>(null);

  const allRows: AcquisitionProspectRow[] = listAcquisitionProspects();
  const summary = getAcquisitionSummary();
  void version; // canonical store change signal → re-read the derived rows

  /** Metric predicates — each tile opens the rows it counts. */
  const METRICS: { key: string; label: string; value: number; match: (r: AcquisitionProspectRow) => boolean }[] = [
    { key: 'all', label: 'Canonical prospects', value: allRows.length, match: () => true },
    { key: 'enrolled', label: 'In acquisition', value: summary.enrolled, match: (r) => r.stage !== 'not enrolled' },
    { key: 'awaiting', label: 'Awaiting approval', value: summary.awaitingApproval, match: (r) => r.stage === 'awaiting approval' },
    { key: 'approved', label: 'Approved', value: summary.approved, match: (r) => r.stage === 'approved' },
    { key: 'sent', label: 'Sent', value: summary.sent, match: (r) => r.stage === 'sent' },
    { key: 'responded', label: 'Responses', value: summary.responded, match: (r) => r.responseCount > 0 },
    { key: 'opportunities', label: 'Opportunities', value: summary.opportunities, match: (r) => !!r.opportunity },
  ];

  const active = METRICS.find((m) => m.key === metricFilter) ?? null;
  const rows = active ? allRows.filter(active.match) : allRows;

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  function prepare(row: AcquisitionProspectRow) {
    const result = prepareOutreach(row.prospect.id, actor, 'email');
    if (!result.ok) {
      setError(result.error);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(`Recommendation prepared for ${row.prospect.brand} — review it in Brand Intelligence → ${row.prospect.brand} → Outreach.`);
    void refreshLeadsFromProspects();
  }

  return (
    <Card title="Acquisition Pipeline (BI-derived)">
      <div className="px-1 pb-1 space-y-3">
        <p className="text-ds-label text-zinc-500">
          The acquisition universe IS the canonical Brand Intelligence prospect store — the real brands
          below carry their existing prospect identity into ICP targeting. No separate mock acquisition
          list exists.
        </p>

        {/* §Stage-18 interactivity — every metric tile drills the table down. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetricFilter(metricFilter === m.key ? null : m.key)}
              aria-pressed={metricFilter === m.key}
              title={`Show the ${m.label.toLowerCase()}`}
              className={cn(
                'bg-ink-850 border rounded-ds-md px-2 py-1.5 text-left transition-colors',
                metricFilter === m.key ? 'border-brass-500/50 bg-brass-500/10' : 'border-hairline hover:border-hairline-strong'
              )}
            >
              <p className="text-ds-micro text-zinc-500 uppercase">{m.label}</p>
              <p className="text-sm font-semibold text-strong font-mono">{m.value}</p>
            </button>
          ))}
        </div>
        {active && (
          <p className="text-ds-micro text-brass-300">
            Filtered: {active.label} ({rows.length} shown) ·{' '}
            <button type="button" className="underline" onClick={() => setMetricFilter(null)}>clear</button>
          </p>
        )}

        {notice && <p className="text-ds-label text-emerald-400">{notice}</p>}
        {error && <p className="text-ds-label text-red-300">{error}</p>}

        {/* §Phase D — canonical DataTable (the `data-table` hook is preserved
            for the acceptance test's real row-count assertions). */}
        <DataTable
          dataTable="acquisition-pipeline"
          caption="Acquisition pipeline"
          rows={rows}
          rowKey={(r) => r.prospect.id}
          emptyMessage="No prospects match this filter."
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              primary: true,
              render: (r) => (
                <span>
                  <span className="inline-flex items-center gap-1.5 text-strong font-medium">
                    <Target className="w-3 h-3 text-brass-400" />
                    {r.prospect.brand}
                  </span>
                  <span className="block text-ds-micro text-zinc-500">{r.prospect.category}</span>
                </span>
              ),
            },
            {
              key: 'score',
              label: 'BI score',
              render: (r) => (
                <span>
                  <span
                    className={cn(
                      'font-mono',
                      r.prospect.score.total >= 80 ? 'text-emerald-400' : 'text-zinc-300'
                    )}
                  >
                    {r.prospect.score.total}
                  </span>
                  <span className="text-ds-micro text-zinc-500"> {r.prospect.score.tier}</span>
                </span>
              ),
            },
            {
              key: 'leadId',
              label: 'ICP identity',
              hideBelow: 'lg',
              render: (r) => (
                <span className="font-mono text-ds-micro text-zinc-400">
                  {r.lead?.id ?? '(no region)'}
                </span>
              ),
            },
            {
              key: 'region',
              label: 'Region',
              render: (r) => <span className="text-zinc-300">{r.region ?? '—'}</span>,
            },
            {
              key: 'stage',
              label: 'Stage',
              render: (r) => (
                <Badge className={cn('text-ds-micro border capitalize', STAGE_STYLES[r.stage] ?? 'text-zinc-400')}>
                  {r.stage}
                </Badge>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              align: 'right',
              render: (r) => (
                <Button
                  size="sm"
                  variant="tertiary"
                  className="text-ds-micro"
                  disabled={
                    !canCurrentUserMutate ||
                    r.stage === 'sent' ||
                    r.stage === 'responded' ||
                    !!r.opportunity
                  }
                  onClick={() => prepare(r)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {r.current ? 'New revision' : 'Prepare outreach'}
                </Button>
              ),
            },
          ]}
        />
        <p className="text-ds-micro text-zinc-600">
          Review, modify, approve/reject, send and record the response on the prospect's own record:
          Brand Intelligence → brand row → Outreach tab.
        </p>
      </div>
    </Card>
  );
}
