import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { requestAdminNav } from '@/data/adminNav';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { askMercenta, buildFounderBrief, type FounderBrief, type MercentaAnswer } from '@/lib/ai/founderOpsAi';
import {
  automationHalt,
  automationVersion,
  clearSimulatedFailure,
  decideAutomationApproval,
  retryAutomation,
  runAllAutomations,
  runAutomation,
  setAutomationEnabled,
  setAutomationHalt,
  simulateAutomationFailure,
  subscribeAutomations,
  type AutomationId,
  type AutomationRun,
} from '@/lib/automation/registry';
import {
  buildControlCentre,
  CONTROL_CENTRE_SECTIONS,
  type CommercialReadinessQueueRow,
  type ControlCentreSectionId,
  type PreAuditQueueRow,
} from '@/lib/commandCentre/controlCentre';
import { useCommercialReadinessVersion } from '@/lib/commercial/useCommercialReadiness';
import { feedAssessmentToAcquisition } from '@/lib/preaudit/preAuditAcquisitionBridge';
import { useWorkVersion } from '@/lib/work/useWork';
import { ControlCentreView } from './ControlCentreView';

export function ControlCentreScreen({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, actingStaffId, role } = useApp();
  const workVersion = useWorkVersion();
  const commercialVersion = useCommercialReadinessVersion();
  const automationStamp = automationVersion();
  const halt = automationHalt();
  const [, setHaltPulse] = useState(0);
  const [section, setSection] = useState<ControlCentreSectionId>('business');
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerRun, setDrawerRun] = useState<AutomationRun | null>(null);
  const [drawerPreAudit, setDrawerPreAudit] = useState<PreAuditQueueRow | null>(null);
  const [drawerCommercial, setDrawerCommercial] = useState<CommercialReadinessQueueRow | null>(null);
  const [preAuditNotice, setPreAuditNotice] = useState<string | null>(null);
  const [preAuditStamp, setPreAuditStamp] = useState(0);
  const [brief, setBrief] = useState<FounderBrief | null>(null);
  const [question, setQuestion] = useState('What needs my attention today?');
  const [answer, setAnswer] = useState<MercentaAnswer | null>(null);
  const [asking, setAsking] = useState(false);

  const actor = actingStaffId ?? (role ? `staff:${role}` : 'staff:founder');

  const model = useMemo(
    () => buildControlCentre(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workVersion, automationStamp, session?.tenantId, preAuditStamp, commercialVersion]
  );

  useEffect(() => subscribeAutomations(() => setNotice((n) => n)), []);

  useEffect(() => {
    let cancelled = false;
    void buildFounderBrief().then((b) => {
      if (!cancelled) setBrief(b);
    });
    return () => {
      cancelled = true;
    };
  }, [automationStamp]);

  const { integrations, modes } = useIntegrations();
  const integrationIssues = useMemo(
    () =>
      Object.entries(integrations)
        .filter(([, state]) => Boolean(state?.error) && !state?.disabled)
        .map(([id, state]) => ({
          id,
          mode: String(modes[id as keyof typeof modes] ?? 'unknown'),
          error: String(state?.error ?? 'Error'),
        })),
    [integrations, modes]
  );

  const navigate = useCallback(
    (destination: string) => {
      requestAdminNav({ view: destination, source: 'control-centre' });
      onNavigate?.(destination);
    },
    [onNavigate]
  );

  return (
    <ControlCentreView
      model={model}
      sections={CONTROL_CENTRE_SECTIONS}
      section={section}
      onSectionChange={setSection}
      halt={halt}
      onToggleHalt={() => {
        setAutomationHalt(
          !halt.halted,
          actor,
          halt.halted
            ? 'Halt cleared by founder from Control Centre.'
            : 'Emergency halt engaged by founder from Control Centre.'
        );
        setHaltPulse((p) => p + 1);
      }}
      onRunAllAutomations={() => {
        const runs = runAllAutomations(actor);
        setNotice(
          `Ran ${runs.length} automation(s): ${runs.filter((r) => r.status === 'succeeded').length} succeeded, ${runs.filter((r) => r.status === 'failed').length} failed.`
        );
      }}
      onRunAutomation={(id) => setDrawerRun(runAutomation(id, { actor }))}
      onRetryAutomation={(runId) => {
        const r = retryAutomation(runId, actor);
        if (r) setDrawerRun(r);
      }}
      onToggleAutomationEnabled={(id, enabled) =>
        setAutomationEnabled(
          id,
          !enabled,
          actor,
          enabled ? 'Disabled from Control Centre.' : 'Re-enabled from Control Centre.'
        )
      }
      onSimulateAutomationFailure={(id) => {
        simulateAutomationFailure(id, 'Simulated provider outage (deterministic test).', actor);
        setDrawerRun(runAutomation(id, { actor, force: true }));
      }}
      onClearAutomationFailure={(id) => clearSimulatedFailure(id, actor)}
      onApproveAutomation={(key) => {
        decideAutomationApproval(key, 'approved', actor, 'Approved from Control Centre.');
      }}
      onFeedPreAudit={(assessmentId) => {
        const outcome = feedAssessmentToAcquisition(assessmentId, actor);
        setPreAuditNotice(outcome.reason);
        setPreAuditStamp((s) => s + 1);
      }}
      notice={notice}
      preAuditNotice={preAuditNotice}
      integrationIssues={integrationIssues}
      brief={brief}
      question={question}
      onQuestionChange={setQuestion}
      onAsk={() => {
        setAsking(true);
        void askMercenta(question).then((a) => {
          setAnswer(a);
          setAsking(false);
        });
      }}
      asking={asking}
      answer={answer}
      drawerRun={drawerRun}
      onOpenRunDrawer={setDrawerRun}
      drawerPreAudit={drawerPreAudit}
      onOpenPreAuditDrawer={setDrawerPreAudit}
      drawerCommercial={drawerCommercial}
      onOpenCommercialDrawer={setDrawerCommercial}
      onNavigate={navigate}
    />
  );
}
