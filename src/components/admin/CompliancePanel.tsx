/**
 * §Priority-1 — Compliance panel (Super Admin): Companies House company
 * verification + HMRC VAT status/filing, driven entirely through the
 * simulation-first adapters behind the SAME contracts live providers will
 * use. Every action is boundary-checked: it refuses unless the involved
 * provider positively resolves SIMULATION (UNKNOWN is never simulated).
 *
 * RBAC: mounted only inside SuperAdminPanel tabs (super_admin tier); the
 * component additionally enforces the tier at its own boundary.
 */

import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { isProviderSimulationSafe, resolveProviderMode } from '@/integrations/types';
import type { IntegrationId } from '@/integrations/types';
import { Badge, Button, Card, DataTable, NoPermissionState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { demoCompanyVerifications, demoHmrcFilings } from '@/data/demoStore';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import {
  verifyBrandCompany,
  checkHmrcStatus,
  fileHmrcReturn,
  getLatestVatFiling,
} from '@/lib/compliance/complianceSync';
import { ShieldCheck, FileText, RefreshCw } from 'lucide-react';

const COMPLIANCE_PROVIDERS: IntegrationId[] = ['companies_house', 'hmrc'];

function modeOf(modes: ReturnType<typeof useIntegrations>['modes'], id: IntegrationId) {
  return resolveProviderMode(modes, id);
}

export function CompliancePanel() {
  const { session } = useApp();
  const { modes } = useIntegrations();
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Record<string, string>>({});

  const isSuperAdmin = session?.tier === 'super_admin';
  if (!isSuperAdmin) {
    return (
      <NoPermissionState description="Compliance controls are restricted to the Super Admin tier." />
    );
  }

  const chSafe = isProviderSimulationSafe(modeOf(modes, 'companies_house'));
  const hmrcSafe = isProviderSimulationSafe(modeOf(modes, 'hmrc'));

  async function run(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string; safetyReason?: string; [k: string]: unknown }>
  ) {
    if (busy) return;
    setBusy(key);
    try {
      const res = await fn();
      setOutcome((prev) => ({
        ...prev,
        [key]: res.safetyReason
          ? `REFUSED: ${res.safetyReason}`
          : res.ok
            ? 'Succeeded — audit + event recorded'
            : `Failed (retryable): ${res.error ?? 'error'}`,
      }));
    } finally {
      setBusy(null);
    }
  }

  const verifications = demoCompanyVerifications;
  const filings = [...demoHmrcFilings].reverse();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-ds-md bg-brand-500/15 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-strong" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-strong">Compliance — Companies House &amp; HMRC</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Simulated government-provider workflows: brand company verification at the registrar and
              VAT status/filing with HMRC. Every action runs through the SAME adapter contracts a live
              connection will use — today the deterministic mock bodies execute (no real government
              endpoint is contacted). Actions are refused unless the provider mode is positively{' '}
              <span className="text-amber-300">SIMULATION</span>.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn('text-ds-micro border', chSafe ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-red-500/15 text-red-300 border-red-500/20')}>
              Companies House: {String(modeOf(modes, 'companies_house'))}
            </Badge>
            <Badge className={cn('text-ds-micro border', hmrcSafe ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-red-500/15 text-red-300 border-red-500/20')}>
              HMRC: {String(modeOf(modes, 'hmrc'))}
            </Badge>
          </div>
        </div>
        {(!chSafe || !hmrcSafe) && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-2.5 text-ds-label text-state-warning">
            One or more compliance providers is not resolved as SIMULATION. Actions for that provider are
            refused at the boundary and by the engine. Open Integrations to set the provider to simulation
            (or connect real credentials there later — no code change).
          </div>
        )}
      </Card>

      {/* ── Companies House ── */}
      <Card
        className="p-5"
        title="Companies House — company verification"
        subtitle="Simulated registrar lookup: brand company → status → verified"
      >
        {/* §Phase D — canonical DataTable: the simulated registrar state and the
            Verify action stay reachable at every width (cards below md). */}
        <DataTable
          dataTable="companies-house"
          caption="Companies House verification"
          rows={ALL_DEMO_BRANDS}
          rowKey={(b) => b.id}
          columns={[
            {
              key: 'name',
              label: 'Brand',
              primary: true,
              render: (b) => <span className="text-xs text-strong">{b.name}</span>,
            },
            {
              key: 'companyNumber',
              label: 'Company no.',
              render: (b) => {
                const v = verifications.find((x) => x.brandId === b.id);
                return <span className="font-mono text-ds-label text-zinc-400">{v?.companyNumber ?? '—'}</span>;
              },
            },
            {
              key: 'verification',
              label: 'Verification',
              render: (b) => {
                const v = verifications.find((x) => x.brandId === b.id);
                return (
                  <Badge
                    className={cn(
                      'text-ds-micro',
                      !v
                        ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                        : v.status === 'verified'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-red-500/15 text-red-300 border-red-500/20'
                    )}
                  >
                    {v ? v.status.replace(/_/g, ' ') : 'unverified'}
                  </Badge>
                );
              },
            },
            {
              key: 'source',
              label: 'Source',
              hideBelow: 'lg',
              render: (b) => {
                const v = verifications.find((x) => x.brandId === b.id);
                return <span className="text-ds-micro text-zinc-500">{v?.source ?? '—'}</span>;
              },
            },
          ]}
          rowActions={(b) => (
            <Button
              variant="ghost"
              size="sm"
              className="text-ds-micro"
              loading={busy === `ch-${b.id}`}
              disabled={!chSafe}
              onClick={() =>
                void run(`ch-${b.id}`, () =>
                  verifyBrandCompany(b.id, {
                    getMode: (pid) => resolveProviderMode(modes, pid),
                    actorId: session?.tier ?? 'system',
                  })
                )
              }
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Verify (simulated)
            </Button>
          )}
        />
        <div className="mt-2 space-y-1">
          {Object.entries(outcome)
            .filter(([k]) => k.startsWith('ch-'))
            .map(([k, v]) => (
              <div key={k} className="text-ds-micro font-mono text-zinc-500">{k}: {v}</div>
            ))}
        </div>
      </Card>
      {/* ── HMRC ── */}
      <Card
        className="p-5"
        title="HMRC — VAT status &amp; filing (Making Tax Digital)"
        subtitle="Simulated VAT registration status, next-return deadline and return filing (accepted / rejected → retry)"
      >
        {/* §Phase D — canonical DataTable: VAT registration state + last filing,
            with the Sync + File action reachable at every width. */}
        <DataTable
          dataTable="hmrc-vat"
          caption="HMRC VAT status and filing"
          rows={ALL_DEMO_BRANDS.slice(0, 4)}
          rowKey={(b) => b.id}
          columns={[
            {
              key: 'name',
              label: 'Brand',
              primary: true,
              render: (b) => <span className="text-xs text-strong">{b.name}</span>,
            },
            {
              key: 'vrn',
              label: 'VRN (sim)',
              render: (b) => (
                <span className="font-mono text-ds-label text-zinc-400">
                  MOCK-VRN-{b.id.slice(-6)}
                </span>
              ),
            },
            {
              key: 'lastFiling',
              label: 'Last filing',
              render: (b) => {
                const latest = getLatestVatFiling(b.id);
                return (
                  <span className="text-ds-label">
                    {latest ? `${latest.status} · ${latest.period}` : 'no filing yet'}
                  </span>
                );
              },
            },
          ]}
          rowActions={(b) => (
            <Button
              variant="ghost"
              size="sm"
              className="text-ds-micro"
              loading={busy === `hmrc-${b.id}`}
              disabled={!hmrcSafe}
              onClick={() =>
                void run(`hmrc-${b.id}`, async () => {
                  const status = await checkHmrcStatus(b.id, {
                    getMode: (pid) => resolveProviderMode(modes, pid),
                    actorId: session?.tier ?? 'system',
                  });
                  if (!status.ok) return status;
                  return await fileHmrcReturn(
                    b.id,
                    { period: 'Q3 2026', totalSalesGbp: 48250, vatDueGbp: 9650 },
                    { getMode: (pid) => resolveProviderMode(modes, pid), actorId: session?.tier ?? 'system' }
                  );
                })
              }
            >
              <FileText className="w-3 h-3 mr-1" /> Sync + File VAT (simulated)
            </Button>
          )}
        />

        <div className="mt-3">
          <div className="text-ds-micro font-semibold text-zinc-500 uppercase tracking-wide">Filing history</div>
          <div className="mt-1 space-y-1 max-h-[180px] overflow-y-auto">
            {filings.length === 0 ? (
              <div className="text-ds-label text-zinc-600">No simulated filings yet — run Sync + File above.</div>
            ) : (
              filings.slice(0, 8).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-ds-micro font-mono text-zinc-500">
                  <span>{f.brandId.slice(0, -4)}</span>
                  <Badge className={cn('text-ds-micro border', f.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20')}>
                    {f.status}
                  </Badge>
                  <span className="text-zinc-600 truncate">{f.period} · {f.submissionId ?? (f.rejectionReason ?? '')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {Object.entries(outcome)
            .filter(([k]) => k.startsWith('hmrc-'))
            .map(([k, v]) => (
              <div key={k} className="text-ds-micro font-mono text-zinc-500">{k}: {v}</div>
            ))}
        </div>

        <p className="mt-3 text-ds-micro text-zinc-600 leading-relaxed">
          Safe mock configuration (simulation): Companies House key{' '}
          <span className="font-mono text-zinc-400">mock:ch-demo-key</span> · HMRC client{' '}
          <span className="font-mono text-zinc-400">mock:hmrc-demo-client</span>. Live credentials, when
          entered in Integrations, activate the same workflows with zero code change.
        </p>
      </Card>
    </div>
  );
}