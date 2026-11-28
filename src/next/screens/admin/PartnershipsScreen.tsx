import { useMemo, useState } from 'react';
import {
  FOUNDER_PARTNER_TARGETS,
  FUNDRAISING_PLAN,
  partnerTargetStatusLabel,
  type PartnerTarget,
} from '@/config/partnerships';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  generatePartnerOutreach,
  sendPartnerOutreach,
  type PartnerOutreachDraft,
} from '@/lib/founder/partnerOutreach';
import {
  TRADE_PARTNERSHIP_DISCLAIMER,
  TRADE_PROGRAMMES,
} from '@/lib/intelligence/acquisitionStrategy';
import { PartnershipsView, type PartnerTargetRow } from './PartnershipsView';

function pipelineStage(
  status: string
): 'discovered' | 'contacted' | 'qualified' | 'onboarded' {
  if (status === 'won' || status === 'pilot') return 'onboarded';
  if (['replied', 'interested', 'meeting_scheduled', 'negotiating'].includes(status)) {
    return 'qualified';
  }
  if (['contacted', 'opened', 'ready_to_contact'].includes(status)) return 'contacted';
  return 'discovered';
}

export function PartnershipsScreen() {
  const storeVersion = useCanonicalStoreVersion();
  const [selected, setSelected] = useState<PartnerTarget>(FOUNDER_PARTNER_TARGETS[0]);
  const [recipient, setRecipient] = useState('partner-introductions@example.org');
  const [draft, setDraft] = useState<PartnerOutreachDraft | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const prospects = useMemo(() => {
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
        byProgramme.get(key) ?? {
          label,
          discovered: 0,
          contacted: 0,
          qualified: 0,
          onboarded: 0,
        };
      bucket[stage] += 1;
      byProgramme.set(key, bucket);
    }
    return {
      stages,
      byProgramme: [...byProgramme.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [prospects]);

  const targets: PartnerTargetRow[] = useMemo(
    () =>
      FOUNDER_PARTNER_TARGETS.map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        market: t.market,
        programmeLabel: t.programme ? TRADE_PROGRAMMES[t.programme].label : '—',
        objective: t.objective,
        statusLabel: partnerTargetStatusLabel(t),
        raw: t,
      })),
    []
  );

  return (
    <PartnershipsView
      disclaimer={TRADE_PARTNERSHIP_DISCLAIMER}
      targets={targets}
      selectedTarget={selected}
      onSelectTarget={(t) => {
        setSelected(t);
        setSendResult(null);
      }}
      stages={pipeline.stages}
      byProgramme={pipeline.byProgramme}
      recipient={recipient}
      onRecipientChange={setRecipient}
      draft={draft}
      onGenerateDraft={() => {
        setDraft(generatePartnerOutreach(selected, recipient));
        setSendResult(null);
      }}
      onSendDraft={async (confirmed) => {
        if (!draft) return;
        const r = await sendPartnerOutreach(draft, {
          confirmed,
          getConnection: () => null,
        });
        setSendResult(
          r.ok
            ? `Sent${r.simulated ? ' (SIMULATED)' : ''} — id ${r.messageId} · network calls ${r.networkCalls}`
            : `Refused: ${r.error}`
        );
      }}
      sendResult={sendResult}
      fundraisingPlan={FUNDRAISING_PLAN}
    />
  );
}
