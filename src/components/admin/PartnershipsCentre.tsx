/**
 * §41.13/M12 — PARTNERSHIPS / FUNDRAISING CENTRE (Super Admin only).
 *
 * Three real capabilities, all simulation-safe and zero-network:
 *   1. the PROSPECTIVE trade-programme registry, with the no-partnership
 *      disclaimer always visible;
 *   2. measured pipeline per route, from the canonical market-access tags on
 *      prospects (discovered → contacted → qualified → onboarded);
 *   3. recipient-specific outreach generation and an EXPLICIT send through the
 *      existing mail seam (mock when unconfigured ⇒ zero network calls).
 *
 * Plus the fundraising PLAN (target, use of funds, milestones) which claims no
 * commitments whatsoever.
 */
import { useMemo, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import {
  FOUNDER_PARTNER_TARGETS,
  FUNDRAISING_PLAN,
  partnerTargetStatusLabel,
  type PartnerTarget,
} from '@/config/partnerships';
import {
  TRADE_PROGRAMMES,
  TRADE_PARTNERSHIP_DISCLAIMER,
} from '@/lib/intelligence/acquisitionStrategy';
import {
  generatePartnerOutreach,
  sendPartnerOutreach,
  type PartnerOutreachDraft,
} from '@/lib/founder/partnerOutreach';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import { Send, PiggyBank, ShieldAlert } from 'lucide-react';

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

/** Prospect outreach status → the pipeline stage the founder measures. */
function pipelineStage(status: string): 'discovered' | 'contacted' | 'qualified' | 'onboarded' {
  if (status === 'won' || status === 'pilot') return 'onboarded';
  if (['replied', 'interested', 'meeting_scheduled', 'negotiating'].includes(status)) {
    return 'qualified';
  }
  if (['contacted', 'opened', 'ready_to_contact'].includes(status)) return 'contacted';
  return 'discovered';
}

export function PartnershipsCentre() {
  const storeVersion = useCanonicalStoreVersion();
  const [selected, setSelected] = useState<PartnerTarget>(FOUNDER_PARTNER_TARGETS[0]);
  const [recipient, setRecipient] = useState('partner-introductions@example.org');
  const [draft, setDraft] = useState<PartnerOutreachDraft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [sending, setSending] = useState(false);

  const prospects = useMemo(() => {
    // Re-read the canonical store whenever it changes (storeVersion is bumped on
    // every canonical write), so the pipeline view can never show stale counts.
    void storeVersion;
    ensureProspectStore();
    return getProspects();
  }, [storeVersion]);

  const pipeline = useMemo(() => {
    const stages = { discovered: 0, contacted: 0, qualified: 0, onboarded: 0 };
    const byProgramme = new Map<
      string,
      { label: string; discovered: number; contacted: number; qualified: number; onboarded: number }
    >();
    for (const p of prospects) {
      if (p.disqualified) continue;
      const stage = pipelineStage(p.outreachStatus);
      stages[stage] += 1;
      const key = p.marketAccess?.programme ?? 'direct';
      const label = p.marketAccess?.programme
        ? TRADE_PROGRAMMES[p.marketAccess.programme].label
        : 'Direct sourcing';
      const bucket =
        byProgramme.get(key) ?? { label, discovered: 0, contacted: 0, qualified: 0, onboarded: 0 };
      bucket[stage] += 1;
      byProgramme.set(key, bucket);
    }
    return {
      stages,
      byProgramme: [...byProgramme.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [prospects]);

  const generate = () => {
    const d = generatePartnerOutreach(selected, recipient);
    setDraft(d);
    setConfirmed(false);
    setSendResult('');
  };

  const send = async () => {
    if (!draft || sending) return;
    setSending(true);
    try {
      const r = await sendPartnerOutreach(draft, { confirmed, getConnection: () => null });
      setSendResult(
        r.ok
          ? `Sent${r.simulated ? ' (SIMULATED)' : ''} — id ${r.messageId} · network calls ${r.networkCalls}`
          : `Refused: ${r.error}`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="partnerships-centre">
      <Card title="Trade-programme & partner routes (prospective)">
        <p className="text-ds-micro text-amber-300/90 flex items-start gap-1.5 mb-3">
          <ShieldAlert className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {TRADE_PARTNERSHIP_DISCLAIMER}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="partner-targets-table">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                <th className="px-2 py-1.5">Route</th>
                <th className="px-2 py-1.5">Kind</th>
                <th className="px-2 py-1.5">Market</th>
                <th className="px-2 py-1.5">Programme</th>
                <th className="px-2 py-1.5">Objective</th>
                <th className="px-2 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {FOUNDER_PARTNER_TARGETS.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03]"
                  data-testid={`partner-target-${t.id}`}
                  onClick={() => setSelected(t)}
                >
                  <td className="px-2 py-1.5 text-white">{t.name}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{t.kind}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{t.market}</td>
                  <td className="px-2 py-1.5 text-zinc-400">
                    {t.programme ? TRADE_PROGRAMMES[t.programme].label : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-500 text-ds-micro">{t.objective}</td>
                  <td className="px-2 py-1.5 text-ds-micro text-amber-300/80">
                    {partnerTargetStatusLabel(t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Measured pipeline — brands discovered to onboarded">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-ds-label font-mono">
          <p className="text-zinc-400">
            Discovered: <span className="text-zinc-200">{pipeline.stages.discovered}</span>
          </p>
          <p className="text-zinc-400">
            Contacted: <span className="text-zinc-200">{pipeline.stages.contacted}</span>
          </p>
          <p className="text-zinc-400">
            Qualified: <span className="text-zinc-200">{pipeline.stages.qualified}</span>
          </p>
          <p className="text-zinc-400">
            Onboarded: <span className="text-emerald-300">{pipeline.stages.onboarded}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="partnership-pipeline-table">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                <th className="px-2 py-1.5">Route</th>
                <th className="px-2 py-1.5">Discovered</th>
                <th className="px-2 py-1.5">Contacted</th>
                <th className="px-2 py-1.5">Qualified</th>
                <th className="px-2 py-1.5">Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.byProgramme.map((b) => (
                <tr key={b.label} className="border-b border-white/[0.04]">
                  <td className="px-2 py-1.5 text-zinc-300">{b.label}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{b.discovered}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{b.contacted}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{b.qualified}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{b.onboarded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-ds-micro text-zinc-600 mt-2">
          Counts come from the canonical prospect store and the market-access tags recorded in Brand
          Intelligence — the same records, not a separate CRM.
        </p>
      </Card>

      <Card title="Recipient-specific outreach — generate, then SEND explicitly">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-white">{selected.name}</p>
            <p className="text-ds-micro text-zinc-500">{selected.objective}</p>
          </div>
          <Input
            label="Recipient address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <div className="flex items-end gap-2">
            <Button variant="tertiary" className="text-xs" onClick={generate}>
              Generate message
            </Button>
          </div>
        </div>

        {draft && (
          <div className="mt-3 space-y-2" data-testid="partner-outreach-draft">
            <p className="text-ds-label text-zinc-400">
              <span className="text-zinc-500">Subject:</span> {draft.subject}
            </p>
            <pre className="whitespace-pre-wrap text-ds-label text-zinc-300 bg-ink-900 border border-white/[0.06] rounded-ds-md p-3">
              {draft.text}
            </pre>
            <p className="text-ds-micro text-zinc-500">
              Basis: {draft.basis} · wording gate: {draft.lintPassed ? 'PASS' : `FAIL (${draft.lintReasons.join('; ')})`}
            </p>
            <label className="flex items-center gap-2 text-ds-label text-zinc-400">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                data-testid="partner-send-confirm"
              />
              I confirm I want to send this message (nothing is sent without this)
            </label>
            <Button variant="tertiary" className="text-xs" onClick={send} disabled={sending || !confirmed}>
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending…' : 'Send now'}
            </Button>
            {sendResult && (
              <p className="text-ds-label text-brass-300" data-testid="partner-send-result">
                {sendResult}
              </p>
            )}
            <p className="text-ds-micro text-zinc-600">
              With no verified email connection the canonical mail seam returns the mock client, so a
              send produces a <code>mock:msg-…</code> id and makes zero network calls.
            </p>
          </div>
        )}
      </Card>

      <Card title="Fundraising plan">
        <div className="flex items-start gap-2 mb-2">
          <PiggyBank className="w-4 h-4 text-brass-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-zinc-300">
              Target {gbp(FUNDRAISING_PLAN.targetGbp)} · committed{' '}
              <span className="text-amber-300">{gbp(FUNDRAISING_PLAN.committedGbp)}</span> ·
              commitments claimed: {String(FUNDRAISING_PLAN.commitmentsClaimed)}
            </p>
            <p className="text-ds-micro text-zinc-500 mt-0.5">{FUNDRAISING_PLAN.instrument}</p>
            <p className="text-ds-micro text-zinc-600 mt-1">{FUNDRAISING_PLAN.note}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-ds-micro uppercase tracking-wider text-zinc-500 mb-1">Use of funds</p>
            {FUNDRAISING_PLAN.useOfFunds.map((u) => (
              <div key={u.label} className="border-b border-white/[0.04] py-1.5">
                <p className="text-ds-label text-zinc-300">
                  {u.label} — <span className="text-brass-300">{u.pct}%</span>
                </p>
                <p className="text-ds-micro text-zinc-600">{u.note}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-ds-micro uppercase tracking-wider text-zinc-500 mb-1">Milestones</p>
            {FUNDRAISING_PLAN.milestones.map((m) => (
              <div key={m.label} className="border-b border-white/[0.04] py-1.5">
                <p className="text-ds-label text-zinc-300">{m.label}</p>
                <p className="text-ds-micro text-zinc-600">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PartnershipsCentre;