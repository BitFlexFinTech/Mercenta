import { useState } from 'react';
import { environmentMode } from '@/config/environment';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { triageAlert } from '@/lib/monitoring/alertTriage';
import { computeReadiness } from '@/lib/monitoring/health';
import { AdminMonitoringView, type HealthCheckItem } from './AdminMonitoringView';

export function AdminMonitoringScreen() {
  const { modes } = useIntegrations();
  const [entries, setEntries] = useState<HealthCheckItem[]>([]);
  const [running, setRunning] = useState(false);

  async function handleRunHealthCheck() {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 300));
    const result = computeReadiness(
      environmentMode(),
      Object.entries(modes).map(([id, mode]) => ({ id, mode }))
    );
    const id = `hc-${Date.now()}`;
    let triageSummary: string | undefined;
    if (!result.healthy) {
      const triage = await triageAlert({
        alertTitle: 'Health check: integrations need attention',
        description: result.summary,
      });
      triageSummary = triage.summary;
    }
    const item: HealthCheckItem = {
      id,
      timestamp: new Date().toISOString(),
      healthy: result.healthy,
      summary: result.summary,
      severity: result.severity,
      triageSummary,
    };
    setEntries((prev) => [item, ...prev]);
    setRunning(false);
  }

  return (
    <AdminMonitoringView
      environmentLabel={environmentMode()}
      running={running}
      entries={entries}
      onRunHealthCheck={handleRunHealthCheck}
    />
  );
}
