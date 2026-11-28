import {
  InlineStatus,
  MetricStrip,
  PageHeader,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';

export interface HealthCheckItem {
  id: string;
  timestamp: string;
  healthy: boolean;
  summary: string;
  severity: 'critical' | 'high' | 'info';
  triageSummary?: string;
}

export interface AdminMonitoringViewProps {
  environmentLabel: string;
  running: boolean;
  entries: HealthCheckItem[];
  onRunHealthCheck: () => Promise<void>;
}

export function AdminMonitoringView({
  environmentLabel,
  running,
  entries,
  onRunHealthCheck,
}: AdminMonitoringViewProps) {
  const latest = entries[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        description="Readiness checks evaluated from local integration configuration, dependency advisories, and triage summaries."
        meta={<span>Environment: {environmentLabel}</span>}
        actions={
          <button
            type="button"
            disabled={running}
            onClick={() => void onRunHealthCheck()}
            className="px-3.5 py-2 rounded-md bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40 whitespace-nowrap"
          >
            {running ? 'Running check…' : 'Run Health Check'}
          </button>
        }
      />

      <MetricStrip
        columns={3}
        items={[
          {
            id: 'mon-latest',
            label: 'Latest Readiness',
            value: latest ? (latest.healthy ? 'Healthy' : 'Degraded') : 'Not run',
            context: latest ? new Date(latest.timestamp).toLocaleTimeString() : 'Run a check above',
          },
          {
            id: 'mon-checks',
            label: 'Session Checks',
            value: String(entries.length),
            context: 'Evaluated against real local integration modes',
          },
          {
            id: 'mon-deps',
            label: 'Dependency Scanner',
            value: 'Configured',
            context: '.github/dependabot.yml (weekly scans)',
          },
        ]}
      />

      <SectionCard
        title="Dependency Monitoring"
        description="Automated repository security advisory scanning."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-zinc-700">
          <p className="max-w-2xl">
            Dependabot is configured in <code className="font-mono text-zinc-950">.github/dependabot.yml</code> to scan npm and GitHub Actions dependencies weekly.
          </p>
          <InlineStatus label="Configured" tone="success" />
        </div>
      </SectionCard>

      <SectionCard
        title="Health Check History"
        description="Checks start empty each session and read local provider readiness via computeReadiness()."
      >
        {entries.length === 0 ? (
          <p className="text-[13px] text-zinc-600">
            No health checks have been run in this session. Press &ldquo;Run Health Check&rdquo; to evaluate current platform readiness.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 -m-4">
            {entries.map((e) => (
              <div key={e.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-zinc-950">{e.summary}</div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {new Date(e.timestamp).toLocaleString()} · severity: {e.severity}
                  </div>
                  {e.triageSummary && (
                    <div className="text-[12px] text-amber-800 mt-1">Triage: {e.triageSummary}</div>
                  )}
                </div>
                <InlineStatus
                  label={e.healthy ? 'Healthy' : 'Degraded'}
                  tone={e.healthy ? 'success' : 'warning'}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
