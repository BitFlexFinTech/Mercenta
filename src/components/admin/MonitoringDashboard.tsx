/**
 * §Batch-10 — Monitoring dashboard (admin).
 *
 * Lightweight health-check viewer with alert triage summaries.
 * Reads the same event stream as the daily digest.
 */
import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { triageAlert } from '@/lib/monitoring/alertTriage';
import { computeReadiness } from '@/lib/monitoring/health';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { environmentMode } from '@/config/environment';
import { Shield, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface HealthCheckEntry {
  id: string;
  timestamp: string;
  healthy: boolean;
  summary: string;
  severity: 'critical' | 'high' | 'info';
}

/* §PHASE 15 (2026-10-05) — the fabricated `MOCK_HEALTH_CHECKS` history was REMOVED.
   It presented invented "Database: ok … Response: 240ms" lines as real probe
   results. The check now reads REAL local signals via `computeReadiness`
   (`src/lib/monitoring/health.ts`) and the history starts empty until a check is
   actually run. Guarded by `scripts/validate-health-readiness.mjs`. */

export function MonitoringDashboard() {
  const { modes } = useIntegrations();
  const [entries, setEntries] = useState<HealthCheckEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [triageResults, setTriageResults] = useState<Record<string, string>>({});

  async function handleRunCheck() {
    setRunning(true);
    // A brief, honest UI settle — the check itself reads LOCAL state only.
    await new Promise((r) => setTimeout(r, 400));
    const result = computeReadiness(
      environmentMode(),
      Object.entries(modes).map(([id, mode]) => ({ id, mode }))
    );
    const entry: HealthCheckEntry = {
      id: 'hc-' + Date.now(),
      timestamp: new Date().toISOString(),
      healthy: result.healthy,
      summary: result.summary,
      severity: result.severity,
    };
    setEntries(function(prev) { return [entry, ...prev]; });
    setRunning(false);

    // Triage only a genuinely unhealthy result.
    if (!result.healthy) {
      const triage = await triageAlert({
        alertTitle: 'Health check: integrations need attention',
        description: result.summary,
      });
      setTriageResults(function(prev) { return { ...prev, [entry.id]: triage.summary }; });
    }
  }

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · MONITORING"
        title="System Monitoring"
        description="Health checks, dependency alerts and automated triage summaries."
        actions={
          <Button className="text-xs" onClick={handleRunCheck} disabled={running}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', running && 'animate-spin')} />
            {running ? 'Running...' : 'Run Health Check'}
          </Button>
        }
      />

      {/* Dependabot section */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-accent-400" />
          <span className="text-xs font-medium text-strong">Dependency Monitoring</span>
          <Badge className="text-ds-micro bg-state-success/10 text-state-success">Configured</Badge>
        </div>
        <p className="text-ds-micro text-muted leading-relaxed">
          Dependabot is configured in <code className="text-accent-400">.github/dependabot.yml</code>.
          Scans npm and GitHub Actions dependencies weekly. Alerts appear as GitHub Security
          Advisories and are also triaged through the alert system below.
        </p>
      </Card>

      {/* Health check history */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-hairline">
          <span className="text-xs font-medium text-strong">Health Check History</span>
        </div>
        <div className="divide-y divide-hairline-06">
          {entries.length === 0 && (
            <div className="px-4 py-3 text-ds-label text-muted">
              No health checks have been run in this session. Press &ldquo;Run Health Check&rdquo; to read
              the platform&rsquo;s current readiness.
            </div>
          )}
          {entries.map(function(e) {
            return (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {e.healthy
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <div>
                    <p className="text-ds-label text-strong">{e.summary}</p>
                    <p className="text-ds-micro text-faint font-mono">{new Date(e.timestamp).toLocaleString()}</p>
                    {triageResults[e.id] && (
                      <p className="text-ds-micro text-state-warning mt-0.5">Triage: {triageResults[e.id]}</p>
                    )}
                  </div>
                </div>
                <Badge className={cn('text-ds-micro', e.healthy ? 'bg-state-success/10 text-state-success' : 'bg-state-warning/10 text-state-warning')}>
                  {e.healthy ? 'Healthy' : 'Degraded'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </WorkspaceFrame>
  );
}