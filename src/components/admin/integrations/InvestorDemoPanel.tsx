/**
 * §Phase E2E — INVESTOR DEMO panel.
 *
 * The investor-facing entry point for the deterministic end-to-end lifecycle.
 * It is rendered INSIDE the existing Simulation Control Centre (one simulation
 * architecture, one scenario engine, no second demo dashboard) and it drives the
 * EXISTING `src/lib/simulation/investorDemo.ts` orchestration, which in turn
 * calls only the product's own canonical domain seams.
 *
 * What this panel guarantees to a viewer:
 *   - Simulation / Deterministic / No live integration / Demo data are stated.
 *   - Every stage shows the REAL canonical consequence it produced (stage
 *     status + entity ids + facts), not a decorative animation.
 *   - The replay digest is shown so a repeat run can be seen to be identical.
 *   - Status is never conveyed by colour alone: every stage prints its status
 *     word, and every control is a real labelled button.
 */
import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { resolveProviderMode } from '@/integrations/types';
import { Badge, Button, Card, NoPermissionState } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  INVESTOR_DEMO_STAGES,
  INVESTOR_DEMO_TENANT_ID,
  resetInvestorDemo,
  runInvestorDemo,
  type InvestorDemoRun,
  type InvestorDemoStage,
} from '@/lib/simulation/investorDemo';
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  FlaskConical,
  Play,
  RotateCcw,
  WifiOff,
} from 'lucide-react';

function StatusWord({ status }: { status: InvestorDemoStage['status'] }) {
  const icon =
    status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />;
  const word = status === 'ok' ? 'OK' : status === 'blocked' ? 'BLOCKED' : 'ERROR';
  const cls =
    status === 'ok'
      ? 'bg-state-success/10 text-state-success border-state-success/20'
      : status === 'blocked'
        ? 'bg-state-warning/10 text-state-warning border-state-warning/20'
        : 'bg-state-danger/10 text-state-danger border-state-danger/20';
  return (
    <Badge className={cn('text-ds-micro border', cls)}>
      {icon}
      <span className="ml-1">{word}</span>
    </Badge>
  );
}

export function InvestorDemoPanel() {
  const { session } = useApp();
  const { modes } = useIntegrations();

  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<InvestorDemoRun | null>(null);
  const [previousDigest, setPreviousDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);
  /** The last completed digest, remembered across a reset so a reset → replay
   *  can be SEEN to be identical (the point of the deterministic demo). */
  const lastDigestRef = useRef<string | null>(null);

  const isSuperAdmin = session?.tier === 'super_admin';

  /** Provider modes come from the Integration Hub — never guessed here. */
  const getMode = useMemo(
    () => (providerId: string) => resolveProviderMode(modes, providerId),
    [modes]
  );

  async function runDemo() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runInvestorDemo({ seed: 1, getMode });
      // Compare against the previous COMPLETED run (survives a reset), then remember it.
      setPreviousDigest(lastDigestRef.current);
      lastDigestRef.current = result.digest;
      setRun(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function resetAndReplay() {
    if (running) return;
    const reset = resetInvestorDemo();
    setLastResetAt(reset.resetAt);
    setRun(null);
    setError(null);
    // `previousDigest` is deliberately retained: the next run must be able to
    // prove that a reset → replay reproduces the SAME digest.
  }

  const replayIdentical = run && previousDigest ? run.digest === previousDigest : null;

  /* §OPENSHIP BATCH 8 — the refusal renders THROUGH the one owner. */
  if (!isSuperAdmin) {
    return (
      <NoPermissionState description="The investor demonstration is restricted to the Super Admin tier. This view is not authorized for your session." />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-strong flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-accent-300" /> Investor demo — deterministic
              end-to-end lifecycle
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
              Runs the whole platform lifecycle on the canonical domain: application → approval →
              onboarding → compliance → catalogue → purchase order → acknowledgement → fulfilment →
              shipment → delivery → returns → deductions → dispute → commission → payout → CRM →
              marketing → integrations → RBAC → audit → error/recovery. Every stage writes
              real canonical state; nothing is a decorative UI-only action.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="text-ds-micro bg-state-warning/10 text-state-warning border-state-warning/20 uppercase tracking-wide">
              Simulation
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline uppercase tracking-wide">
              Deterministic
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline uppercase tracking-wide">
              <WifiOff className="w-3 h-3 mr-1" /> No live integration
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline uppercase tracking-wide">
              Demo / test data
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            data-state="investor-demo-run"
            onClick={() => void runDemo()}
            disabled={running}
            className="text-xs"
          >
            {running ? (
              <>
                <FlaskConical className="w-3.5 h-3.5 animate-pulse mr-1" /> Running lifecycle…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Run investor demo
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            data-state="investor-demo-reset"
            onClick={resetAndReplay}
            disabled={running}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset demo environment
          </Button>
          <span className="text-ds-label text-muted">
            Tenant: <span className="font-mono text-muted">{INVESTOR_DEMO_TENANT_ID}</span>
          </span>
        </div>

        {lastResetAt && (
          <p className="text-ds-label text-state-success mt-2">
            Demo environment reset at {new Date(lastResetAt).toLocaleTimeString()} — seeded data
            restored, scenario-created records removed.
          </p>
        )}
        {error && (
          <p className="text-ds-label text-state-danger mt-2" role="alert">
            {error}
          </p>
        )}
      </Card>

      {run && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="text-ds-micro bg-state-success/10 text-state-success border-state-success/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />{' '}
              <span data-state="investor-demo-summary">
                {run.summary.ok}/{run.summary.total} stages OK
              </span>
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline">
              blocked: {run.summary.blocked}
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline">
              errors: {run.summary.error}
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline">
              <WifiOff className="w-3 h-3 mr-1" /> network calls: {run.networkCalls}
            </Badge>
            <Badge className="text-ds-micro bg-tint text-strong border-hairline">
              audit rows: {run.auditRows}
            </Badge>
          </div>

          <div className="text-ds-label text-muted space-y-0.5">
            <div>
              Run <span className="font-mono text-muted">{run.runId}</span> · brand{' '}
              <span className="text-strong">{run.brandName}</span> · onboarding{' '}
              <span className="font-mono text-muted">{run.onboardingId}</span>
            </div>
            <div>
              Replay digest:{' '}
              <span className="font-mono text-strong" data-state="investor-demo-digest">
                {run.digest}
              </span>
              {replayIdentical === true && (
                <span className="ml-2 text-state-success">
                  identical to the previous run — deterministic replay confirmed
                </span>
              )}
              {replayIdentical === false && (
                <span className="ml-2 text-state-warning">
                  differs from the previous run (the environment changed since that run)
                </span>
              )}
            </div>
          </div>

          <ol className="space-y-2" aria-label="Investor demo lifecycle stages">
            {run.stages.map((stage, index) => (
              <li
                key={stage.id}
                data-state={`investor-demo-stage-${stage.id}`}
                className="border border-hairline rounded-ds-md p-2.5 bg-tint"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className="font-mono text-ds-micro text-faint mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-strong">{stage.label}</span>
                      <p className="text-ds-label text-muted mt-0.5 break-words">{stage.detail}</p>
                    </div>
                  </div>
                  <StatusWord status={stage.status} />
                </div>
                {stage.entityIds.length > 0 && (
                  <p className="text-ds-micro text-faint mt-1 break-all">
                    <span className="text-muted">records:</span>{' '}
                    <span className="font-mono">{stage.entityIds.join(', ')}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>

          <p className="text-ds-label text-faint leading-relaxed">
            Every stage above wrote canonical state that the product's own screens read back — the
            brand portal, the operator console, the deductions ledger, the payout ledger, the CRM
            timeline and the audit log. No live provider, email, payment or accounting system was
            contacted ({run.networkCalls} network calls).
          </p>
        </Card>
      )}

      {!run && (
        <Card className="p-4">
          <p className="text-ds-label text-muted leading-relaxed">
            {INVESTOR_DEMO_STAGES.length} stages will run in order:{' '}
            <span className="text-muted">
              {INVESTOR_DEMO_STAGES.map((s) => s.label).join(' → ')}
            </span>
          </p>
        </Card>
      )}
    </div>
  );
}


