import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { advanceShipmentViaDhl, recordDhlWaybill } from '@/lib/dhl/domain';
import { resolveProviderMode } from '@/integrations/types';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { StatusBadge } from '@/components/ui';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import type { ShipmentStatus, CarrierId } from '@/types';
import { Terminal, Activity, Code2, Truck, RefreshCw } from 'lucide-react';
import { useState } from 'react';

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
  'mercenta_hub',
  'live_amazon',
];

export function CarrierDashboard() {
  const { shipments, updateShipmentStatus, addApiLog, apiLogs, carrierContext, setCarrierContext } =
    useApp();
  const { modes } = useIntegrations();
  const [busyShipmentId, setBusyShipmentId] = useState<string | null>(null);
  const [lastDhlResult, setLastDhlResult] = useState<Record<string, string>>({});

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
        brandId: 'brand-zambezi',
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
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header with carrier toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{theme.label}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Operational control desk — carrier terminal simulation
          </p>
        </div>
        <div className="flex gap-1.5 bg-ink-850 border border-white/[0.06] rounded-lg p-1">
          {(Object.keys(CARRIER_THEMES) as CarrierId[]).map((c) => (
            <button
              key={c}
              onClick={() => setCarrierContext(c)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
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
            {carrierShipments.filter((s) => s.status === 'live_amazon' || s.status === 'mercenta_hub').length}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                  <th className="text-left font-medium px-4 py-3">Reference</th>
                  <th className="text-left font-medium px-4 py-3">Shipment</th>
                  <th className="text-right font-medium px-4 py-3">Value</th>
                  <th className="text-center font-medium px-4 py-3">Current Status</th>
                  <th className="text-left font-medium px-4 py-3">Update Milestone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {carrierShipments.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-zinc-400">{s.reference}</div>
                      <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                        {s.trackingNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{s.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{s.customer}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      £{Math.round(s.value / 1000)}k
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        dataStatus={shipmentStatusPresentation(s.status).dataStatus}
                        tone={shipmentStatusPresentation(s.status).tone}
                      >
                        {shipmentStatusPresentation(s.status).label}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.status}
                        onChange={(e) =>
                          updateShipmentStatus(
                            s.id,
                            e.target.value as ShipmentStatus
                          )
                        }
                        className={cn(
                          'bg-ink-900 border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer transition-colors',
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
                            className="text-[10px]"
                            loading={busyShipmentId === s.id}
                            onClick={() => void requestDhlUpdate(s.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            DHL status → next milestone (sim)
                          </Button>
                          {lastDhlResult[s.id] && (
                            <div className="text-[9px] font-mono text-zinc-500 mt-1 leading-tight">
                              {lastDhlResult[s.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* API Request Auditor */}
        <Card
          title="API Request Auditor"
          subtitle="Live transaction logs"
          action={<Code2 className="w-4 h-4 text-zinc-500" />}
        >
          <div className="h-[500px] overflow-y-auto p-3 space-y-2">
            {apiLogs.map((log) => (
              <div
                key={log.id}
                className="bg-ink-900 border border-white/[0.04] rounded-lg p-2.5 font-mono text-[11px]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold',
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
                <div className="text-zinc-600 text-[10px] mb-1">{log.timestamp}</div>
                <div className="text-zinc-400 text-[10px] overflow-x-auto">
                  {JSON.stringify(log.payload)}
                </div>
              </div>
            ))}
          </div>
        </Card>
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
    </div>
  );
}
