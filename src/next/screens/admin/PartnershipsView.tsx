import { useState } from 'react';
import type { PartnerTarget } from '@/config/partnerships';
import type { PartnerOutreachDraft } from '@/lib/founder/partnerOutreach';
import {
  ConsoleTable,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export interface PartnerTargetRow {
  id: string;
  name: string;
  kind: string;
  market: string;
  programmeLabel: string;
  objective: string;
  statusLabel: string;
  raw: PartnerTarget;
}

export interface ProgrammePipelineRow {
  label: string;
  discovered: number;
  contacted: number;
  qualified: number;
  onboarded: number;
}

export interface FundraisingPlanData {
  targetGbp: number;
  committedGbp: number;
  commitmentsClaimed: boolean;
  instrument: string;
  note: string;
  useOfFunds: readonly { label: string; pct: number; note: string }[];
  milestones: readonly { label: string; detail: string }[];
}

export interface PartnershipsViewProps {
  disclaimer: string;
  targets: PartnerTargetRow[];
  selectedTarget: PartnerTarget;
  onSelectTarget: (target: PartnerTarget) => void;
  stages: {
    discovered: number;
    contacted: number;
    qualified: number;
    onboarded: number;
  };
  byProgramme: ProgrammePipelineRow[];
  recipient: string;
  onRecipientChange: (next: string) => void;
  draft: PartnerOutreachDraft | null;
  onGenerateDraft: () => void;
  onSendDraft: (confirmed: boolean) => Promise<void>;
  sendResult: string | null;
  fundraisingPlan: FundraisingPlanData;
}

export function PartnershipsView({
  disclaimer,
  targets,
  selectedTarget,
  onSelectTarget,
  stages,
  byProgramme,
  recipient,
  onRecipientChange,
  draft,
  onGenerateDraft,
  onSendDraft,
  sendResult,
  fundraisingPlan,
}: PartnershipsViewProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);

  const targetColumns: ConsoleColumn<PartnerTargetRow>[] = [
    {
      key: 'name',
      header: 'Route',
      mobilePrimary: true,
      render: (r) => <span className="font-medium text-zinc-950">{r.name}</span>,
    },
    {
      key: 'kind',
      header: 'Kind',
      render: (r) => <span className="text-zinc-600">{r.kind}</span>,
    },
    {
      key: 'market',
      header: 'Market',
      render: (r) => <span className="text-zinc-600">{r.market}</span>,
    },
    {
      key: 'programme',
      header: 'Programme',
      render: (r) => <span className="text-zinc-700">{r.programmeLabel}</span>,
    },
    {
      key: 'objective',
      header: 'Objective',
      render: (r) => <span className="text-[12px] text-zinc-600">{r.objective}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <span className="text-[12px] text-amber-800">{r.statusLabel}</span>,
    },
  ];

  const pipelineColumns: ConsoleColumn<ProgrammePipelineRow>[] = [
    {
      key: 'label',
      header: 'Route',
      mobilePrimary: true,
      render: (r) => <span className="font-medium text-zinc-950">{r.label}</span>,
    },
    {
      key: 'discovered',
      header: 'Discovered',
      align: 'right',
      render: (r) => <span className="font-mono">{r.discovered}</span>,
    },
    {
      key: 'contacted',
      header: 'Contacted',
      align: 'right',
      render: (r) => <span className="font-mono">{r.contacted}</span>,
    },
    {
      key: 'qualified',
      header: 'Qualified',
      align: 'right',
      render: (r) => <span className="font-mono">{r.qualified}</span>,
    },
    {
      key: 'onboarded',
      header: 'Onboarded',
      align: 'right',
      render: (r) => <span className="font-mono text-emerald-800">{r.onboarded}</span>,
    },
  ];

  return (
    <div className="space-y-6" data-testid="partnerships-centre">
      <PageHeader
        title="Partnerships & Fundraising"
        description="Prospective trade-programme routes, measured Brand Intelligence acquisition pipeline, and capital planning."
      />

      <NoticeBanner tone="warning" title="Prospective routes only" message={disclaimer} />

      <MetricStrip
        columns={4}
        items={[
          { id: 'pt-discovered', label: 'Discovered', value: String(stages.discovered) },
          { id: 'pt-contacted', label: 'Contacted', value: String(stages.contacted) },
          { id: 'pt-qualified', label: 'Qualified', value: String(stages.qualified) },
          { id: 'pt-onboarded', label: 'Onboarded', value: String(stages.onboarded) },
        ]}
      />

      <SectionCard
        title="Trade-Programme & Partner Routes (Prospective)"
        description="Select a route row to draft recipient-specific outreach below."
      >
        <ConsoleTable
          rows={targets}
          columns={targetColumns}
          rowKey={(r) => r.id}
          selectedKey={selectedTarget.id}
          onRowClick={(r) => {
            onSelectTarget(r.raw);
            setConfirmed(false);
          }}
          testId="partner-targets-table"
        />
      </SectionCard>

      <SectionCard
        title="Measured Pipeline by Route"
        description="Counts read directly from canonical prospect store and market-access tags."
      >
        <ConsoleTable
          rows={byProgramme}
          columns={pipelineColumns}
          rowKey={(r) => r.label}
          testId="partnership-pipeline-table"
        />
      </SectionCard>

      <SectionCard
        title="Recipient-Specific Outreach"
        description={`Selected route: ${selectedTarget.name} — ${selectedTarget.objective}`}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block flex-1 min-w-[240px] text-[12px]">
              <span className="text-zinc-600 font-medium block mb-1">Recipient address</span>
              <input
                type="email"
                value={recipient}
                onChange={(e) => onRecipientChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setConfirmed(false);
                onGenerateDraft();
              }}
              className="px-3.5 py-2 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Generate message
            </button>
          </div>

          {draft && (
            <div className="space-y-3 border-t border-zinc-200 pt-3">
              <div className="text-[12px] text-zinc-700">
                <strong>Subject:</strong> {draft.subject}
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[12px] text-zinc-900 font-mono">
                {draft.text}
              </pre>
              <div className="text-[11px] font-mono text-zinc-500">
                Basis: {draft.basis} · wording gate:{' '}
                {draft.lintPassed ? 'PASS' : `FAIL (${draft.lintReasons.join('; ')})`}
              </div>
              <label className="flex items-center gap-2 text-[12px] text-zinc-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I confirm I want to send this message explicitly (zero sends without confirmation)
              </label>
              <button
                type="button"
                disabled={sending || !confirmed}
                onClick={async () => {
                  setSending(true);
                  try {
                    await onSendDraft(confirmed);
                  } finally {
                    setSending(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-white text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
              >
                {sending ? 'Sending…' : 'Send now'}
              </button>
              {sendResult && <NoticeBanner tone="info" message={sendResult} />}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Fundraising Plan"
        description={`Target ${formatGbp(fundraisingPlan.targetGbp)} · Committed ${formatGbp(fundraisingPlan.committedGbp)} · Commitments claimed: ${String(fundraisingPlan.commitmentsClaimed)}`}
      >
        <div className="space-y-4">
          <div className="text-[12px] text-zinc-600">
            <div>{fundraisingPlan.instrument}</div>
            <div className="text-zinc-500 mt-0.5">{fundraisingPlan.note}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-zinc-500 mb-2">
                Use of funds
              </div>
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                {fundraisingPlan.useOfFunds.map((u) => (
                  <div key={u.label} className="p-3 text-[12px]">
                    <div className="flex justify-between font-medium text-zinc-950">
                      <span>{u.label}</span>
                      <span className="font-mono text-[var(--mr-accent)]">{u.pct}%</span>
                    </div>
                    <p className="text-zinc-600 mt-0.5">{u.note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-zinc-500 mb-2">
                Milestones
              </div>
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                {fundraisingPlan.milestones.map((m) => (
                  <div key={m.label} className="p-3 text-[12px]">
                    <div className="font-medium text-zinc-950">{m.label}</div>
                    <p className="text-zinc-600 mt-0.5">{m.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
