import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { advanceShipmentViaDhl, recordDhlWaybill } from '@/lib/dhl/domain';
import { resolveProviderMode } from '@/integrations/types';
import { Card, Button, DataTable, StatusBadge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import type { ShipmentStatus, CarrierId } from '@/types';
import { Terminal, Activity, Code2, Truck, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const CARRIER_THEMES: Record<
  CarrierId,
  { label: string; color: string; bg: string; accent: string }
> = {
  dhl: {
    label: 'DHL Express Operations',
    color: '#F5C518',
    bg: 'bg-amber-500/10',
    accent: 'text-amber-400',
  },
  fedex: {
    label: 'FedEx Global Trade Terminal',
    color: '#7B2FF7',
    bg: 'bg-purple-500/10',
    accent: 'text-purple-400',
  },
  bak: {
    label: 'BAK Logistics Supply Chain Center',
    color: '#3B82F6',
    bg: 'bg-blue-500/10',
    accent: 'text-blue-400',
  },
  palletline: {
    label: 'Palletline Palletised Freight',
    color: '#10B981',
    bg: 'bg-emerald-500/10',
    accent: 'text-emerald-400',
  },
};

const STATUS_OPTIONS: ShipmentStatus[] = [
  'factory_intake',
  'bak_depot',
  'sea_transit',
  'air_transit',
  'uk_customs_cleared',
  /** §P5 — the pre-live arrival state (was `mercenta_hub`). */
  'destination_fc',
  'live_amazon',
];

export function CarrierDashboard({
  /**
   * §RUNTIME PARITY — the carrier navigation declares THREE destinations
   * (Manifest Management, BAK Logistics Hub, API Request Auditor) but the
   * auditor had no render branch of its own: selecting it rendered the manifest
   * terminal, i.e. a control whose outcome did not match its label. The auditor
   * section lives inside this terminal, so the declared destination is honoured
   * by opening the terminal AT the auditor instead of pretending to navigate.
   */
  focusSection,
}: { focusSection?: 'auditor' } = {}) {
  const { shipments, updateShipmentStatus, addApiLog, apiLogs, carrierContext, setCarrierContext } =
    useApp();
  const { modes } = useIntegrations();
  const [busyShipmentId, setBusyShipmentId] = useState<string | null>(null);
  const [lastDhlResult, setLastDhlResult] = useState<Record<string, string>>({});
  /** The declared destination the terminal must open on, when one was named. */
  const auditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusSection !== 'auditor') return;
    auditorRef.current?.scrollIntoView({ block: 'start' });
  }, [focusSection]);

  /**
   * USER ACTION → DOMAIN WORKFLOW → PROVIDER CONTRACT → SIMULATION ADAPTER →
   * SIMULATED MILESTONE → DOMAIN STATE → AUDIT → EVENT → UI UPDATE.
   * The button is the carrier's "request DHL status update" — the provider
   * body (mock today, live later) decides the next milestone.
   */
  async function requestDhlUpdate(id: string) {
    if (busyShipmentId) return;
    const row = shipments.find((s) => s.id === id);
    if (!row) return;
    setBusyShipmentId(id);
    try {
      const res = await advanceShipmentViaDhl({
        shipmentId: id,
        brandId: 'brand-astonish',
        manifest: {
          reference: row.reference,
          customer: row.customer,
          origin: row.origin,
          destination: row.destination,
          value: row.value,
        },
        getMode: (pid) => resolveProviderMode(modes, pid),
        actorId: 'carrier-terminal',
      });
      if (res.ok && res.to) {
        // Apply the provider-derived milestone to the visible terminal state.
        updateShipmentStatus(id, res.to);
        if (res.waybill) {
          addApiLog({
            id: `api-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            method: 'GET',
            endpoint: `/v1/dhl/shipments/${res.waybill}`,
            payload: { milestone: res.milestone, exception: res.exception, delayed: res.delayed },
            status: 200,
          });
        }
        setLastDhlResult((prev) => ({
          ...prev,
          [id]: res.exception
            ? `exception: ${res.milestone ?? 'hold'} (retry recovers)`
            : `${res.from ?? ''} → ${res.to} · ${res.milestone ?? ''}`,
        }));
      } else if (res.status === 'safety_refused') {
        setLastDhlResult((prev) => ({ ...prev, [id]: `refused: ${res.safetyReason ?? 'not simulation-safe'}` }));
      } else {
        setLastDhlResult((prev) => ({ ...prev, [id]: `${res.error ?? 'provider error'} — retry` }));
      }
    } finally {
      setBusyShipmentId(null);
    }
  }

  const theme = CARRIER_THEMES[carrierContext];
  const carrierShipments = shipments.filter((s) => s.carrier === carrierContext);

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="CARRIER TERMINAL"
        title={theme.label}
        description="Operational control desk — carrier terminal simulation."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Carrier
            </span>
            <div
              className="flex gap-1.5 rounded-ds-md border border-white/[0.06] bg-ink-850 p-1"
              role="group"
              aria-label="Carrier context"
            >
              {(Object.keys(CARRIER_THEMES) as CarrierId[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCarrierContext(c)}
                  aria-pressed={carrierContext === c}
                  data-state={carrierContext === c ? 'active' : 'idle'}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-ds duration-ds-fast',
                    carrierContext === c
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                  style={
                    carrierContext === c
                      ? { backgroundColor: CARRIER_THEMES[c].color, color: '#000' }
                      : {}
                  }
                >
                  {CARRIER_THEMES[c].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn('p-4', theme.bg)}>
          <div className="text-xs text-zinc-500 font-medium">Total Manifests</div>
          <div className="text-xl font-bold text-white mt-1">{carrierShipments.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-zinc-500 font-medium">In Transit</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {carrierShipments.filter((s) => s.status === 'sea_transit' || s.status === 'air_transit').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-zinc-500 font-medium">At Depot</div>
          <div className="text-xl font-bold text-blue-400 mt-1">
            {carrierShipments.filter((s) => s.status === 'bak_depot' || s.status === 'factory_intake').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-zinc-500 font-medium">Delivered</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {carrierShipments.filter((s) => s.status === 'live_amazon' || s.status === 'destination_fc').length}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Manifest Management Table */}
        <Card
          title="Bi-Directional Manifest Management"
          subtitle="Change status to push updates across all environments"
          className="lg:col-span-2"
          action={
            <Terminal className={cn('w-4 h-4', theme.accent)} />
          }
        >
          {/* §Phase D — canonical DataTable: the milestone <select> and the DHL
              simulation control stay fully interactive at every width (labelled
              cards below md, table at md+), never reduced to a static label. */}
          <DataTable
            dataTable="carrier-manifest"
            caption="Carrier manifest"
            rows={carrierShipments}
            rowKey={(s) => s.id}
            emptyMessage="No manifests are assigned to this carrier terminal."
            columns={[
              {
                key: 'reference',
                label: 'Reference',
                primary: true,
                render: (s) => (
                  <div>
                    <div className="text-xs font-mono text-zinc-400">{s.reference}</div>
                    <div className="text-ds-micro font-mono text-zinc-600 mt-0.5">
                      {s.trackingNumber}
                    </div>
                  </div>
                ),
              },
              {
                key: 'shipment',
                label: 'Shipment',
                render: (s) => (
                  <div>
                    <div className="text-sm font-medium text-white">{s.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.customer}</div>
                  </div>
                ),
              },
              {
                key: 'value',
                label: 'Value',
                align: 'right',
                hideBelow: 'lg',
                render: (s) => (
                  <span className="text-sm font-semibold text-white">
                    £{Math.round(s.value / 1000)}k
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Current Status',
                align: 'center',
                render: (s) => (
                  <StatusBadge
                    dataStatus={shipmentStatusPresentation(s.status).dataStatus}
                    tone={shipmentStatusPresentation(s.status).tone}
                  >
                    {shipmentStatusPresentation(s.status).label}
                  </StatusBadge>
                ),
              },
              {
                key: 'milestone',
                label: 'Update Milestone',
                render: (s) => (
                  <>
                    <select
                      value={s.status}
                      aria-label={`Update milestone for ${s.reference}`}
                      onChange={(e) =>
                        updateShipmentStatus(s.id, e.target.value as ShipmentStatus)
                      }
                      className={cn(
                        'w-full bg-ink-900 border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer transition-colors md:w-auto',
                        carrierContext === 'dhl'
                          ? 'border-amber-500/30 focus:border-amber-500/60'
                          : carrierContext === 'fedex'
                          ? 'border-purple-500/30 focus:border-purple-500/60'
                          : 'border-blue-500/30 focus:border-blue-500/60'
                      )}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-ink-900">
                          {shipmentStatusPresentation(opt).label}
                        </option>
                      ))}
                    </select>
                    {carrierContext === 'dhl' && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ds-micro"
                          loading={busyShipmentId === s.id}
                          onClick={() => void requestDhlUpdate(s.id)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          DHL status → next milestone (sim)
                        </Button>
                        {lastDhlResult[s.id] && (
                          <div className="text-ds-micro font-mono text-zinc-500 mt-1 leading-tight">
                            {lastDhlResult[s.id]}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />
        </Card>

        {/* API Request Auditor */}
        <div ref={auditorRef} data-testid="carrier-auditor-section" data-focus={focusSection === 'auditor' ? 'auditor' : undefined}>
        <Card
          title="API Request Auditor"
          subtitle="Live transaction logs"
          action={<Code2 className="w-4 h-4 text-zinc-500" />}
        >
          <div className="h-[500px] overflow-y-auto p-3 space-y-2">
            {apiLogs.map((log) => (
              <div
                key={log.id}
                className="bg-ink-900 border border-white/[0.04] rounded-lg p-2.5 font-mono text-ds-label"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-ds-micro font-bold',
                      log.method === 'GET'
                        ? 'bg-blue-500/20 text-blue-300'
                        : log.method === 'POST'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    )}
                  >
                    {log.method}
                  </span>
                  <span className="text-zinc-500 flex-1 truncate">{log.endpoint}</span>
                  <span className="text-emerald-400">{log.status}</span>
                </div>
                <div className="text-zinc-600 text-ds-micro mb-1">{log.timestamp}</div>
                <div className="text-zinc-400 text-ds-micro overflow-x-auto">
                  {JSON.stringify(log.payload)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        </div>
      </div>

      {/* Info banner */}
      <Card className={cn('p-4', theme.bg)}>
        <div className="flex items-center gap-3">
          <Activity className={cn('w-5 h-5', theme.accent)} />
          <div>
            <div className="text-sm font-medium text-white">
              Live state synchronization active
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Status changes here instantly update metrics, sparklines, funnel tracks, and
              activity logs across the Brand Portal and Admin Hub environments.
            </div>
          </div>
        </div>
      </Card>
    </WorkspaceFrame>
  );
}
