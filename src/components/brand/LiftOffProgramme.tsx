/**
 * §LIFT OFF — THE BRAND WORKSPACE SECTION.
 *
 * The programme gets its OWN section in the brand portal (it used to be a toggle
 * button buried in the Sales Estimator card on Market Intel). Everything shown is
 * read from the ONE owner (`src/config/liftOff.ts`) — no rule is re-typed here — and
 * the eligibility block is a REAL, deterministic check against the brand's own
 * records (`evaluateLiftOffEligibility`), never a decorative checklist.
 */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { isComplianceGateCleared } from '@/data/api';
import { Badge, Card, LoadingState } from '@/components/ui';
import {
  ContextPanel,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';
import {
  LIFT_OFF_ENDORSEMENT,
  LIFT_OFF_INTEREST_LABELS,
  LIFT_OFF_NAME,
  LIFT_OFF_SUMMARY,
  LIFT_OFF_TERMS,
  LIFT_OFF_TERMS_VERIFIED,
  LIFT_OFF_TESTIDS,
  LIFT_OFF_VERIFICATION_NOTE,
  LIFT_OFF_VS_DISTRIBUTION,
} from '@/config/liftOff';
import { evaluateLiftOffEligibility } from '@/lib/liftOff/eligibility';
import { CheckCircle2, Circle, Zap } from 'lucide-react';

export function LiftOffProgramme() {
  const { brandProfile, session, products } = useApp();
  const tenantId = session?.tenantId ?? '';
  const [complianceCleared, setComplianceCleared] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setComplianceCleared(false);
      return () => { active = false; };
    }
    setComplianceCleared(null);
    isComplianceGateCleared(tenantId)
      .then((v) => { if (active) setComplianceCleared(v); })
      .catch(() => { if (active) setComplianceCleared(false); });
    return () => { active = false; };
  }, [tenantId]);

  const eligibility = useMemo(
    () =>
      evaluateLiftOffEligibility({
        category: brandProfile?.category,
        productCount: products.length,
        complianceCleared: complianceCleared === true,
        commercialModel: brandProfile?.commercialModel,
      }),
    [brandProfile?.category, brandProfile?.commercialModel, products.length, complianceCleared]
  );

  const loading = complianceCleared === null;
  const wordmark = `${LIFT_OFF_NAME} | ${LIFT_OFF_ENDORSEMENT}`;

  return (
    <div data-testid={LIFT_OFF_TESTIDS.brandSection}>
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="Brand Portal · Launch Programme"
          title={wordmark}
          description={LIFT_OFF_SUMMARY}
          status={
            <Badge className="text-ds-micro bg-accent/15 text-accent-300">
              <Zap className="w-3 h-3" /> {LIFT_OFF_INTEREST_LABELS.not_registered}
            </Badge>
          }
        />

        <WorkspaceSection title="How the programme works" domain="compliance">
          <Card className="p-4">
            <ul className="divide-y divide-hairline-06">
              {LIFT_OFF_TERMS.map((t) => (
                <li key={t.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-strong">{t.label}</span>
                    {t.basis === 'requires_verification' && (
                      <Badge className="text-ds-micro bg-state-warning/10 text-state-warning">
                        checked per launch
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-ds-label text-muted">{t.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-faint">{LIFT_OFF_VERIFICATION_NOTE}</p>
          </Card>
        </WorkspaceSection>

        <WorkspaceSection title="Are you eligible?" domain="intelligence">
          <div data-testid={LIFT_OFF_TESTIDS.brandEligibility}>
            <Card className="p-4">
              {loading ? (
                <LoadingState rows={3} label="Checking your brand against the Lift Off criteria…" />
              ) : (
                <>
                  <p className="mb-3 text-xs text-muted">
                    {eligibility.met} of {eligibility.total} criteria met.{' '}
                    {eligibility.eligible
                      ? 'Your brand satisfies every criterion Mercenta can check here.'
                      : 'The criteria below are not all met yet.'}
                  </p>
                  <ul className="space-y-2">
                    {eligibility.outcomes.map(({ rule, state }) => (
                      <li key={rule.id} className="flex items-start gap-2">
                        {state === 'met' ? (
                          <CheckCircle2 className="mt-0.5 w-4 h-4 flex-shrink-0 text-state-success" />
                        ) : (
                          <Circle className="mt-0.5 w-4 h-4 flex-shrink-0 text-faint" />
                        )}
                        <div>
                          <span className={state === 'met' ? 'text-xs text-strong' : 'text-xs text-muted'}>
                            {rule.label}
                          </span>
                          <p className="text-ds-micro text-faint">{rule.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Lift Off, or managed distribution?" domain="orders">
          <div className="grid gap-3 md:grid-cols-2">
            {[LIFT_OFF_VS_DISTRIBUTION.programme, LIFT_OFF_VS_DISTRIBUTION.distribution].map((p) => (
              <Card key={p.label} className="p-4">
                <p className="font-mono uppercase text-ds-micro tracking-[0.14em] text-accent">{p.label}</p>
                <p className="mt-1 text-xs text-strong">{p.for}</p>
                <p className="mt-2 text-ds-label text-muted">{p.gets}</p>
              </Card>
            ))}
          </div>
        </WorkspaceSection>

        <ContextPanel title="How to read this">
          <RecordFieldList
            fields={[
              { label: 'Programme', value: wordmark },
              {
                label: 'Terms checked against the live channel terms',
                value: LIFT_OFF_TERMS_VERIFIED ? 'Yes' : 'Not yet — checked per launch',
              },
              { label: 'Your status', value: LIFT_OFF_INTEREST_LABELS.not_registered },
              { label: 'Next step', value: 'Open a case in Support & Cases to begin a Lift Off launch.' },
            ]}
          />
        </ContextPanel>

      </WorkspaceFrame>
    </div>
  );
}

export default LiftOffProgramme;
