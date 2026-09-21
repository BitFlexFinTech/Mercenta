import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import type { ShipmentStatus } from '@/types';
import { Ship, Warehouse, CheckCircle2, Circle, MapPin } from 'lucide-react';

const BAK_MILESTONES = [
  { label: 'Harare Willowvale Depot', detail: 'Inland collection & export packing' },
  { label: 'Bulawayo Hub', detail: 'Consolidation & border documentation' },
  { label: 'Beira Corridor (MZ)', detail: 'Mozambique sea port hand-off' },
  { label: 'Durban Corridor (ZA)', detail: 'South African sea port hand-off' },
  { label: 'Ocean / Surface Transit', detail: 'En route to the United Kingdom' },
  { label: 'UK Port / HMRC Clearance', detail: 'Customs entry & duty processing' },
  { label: 'Mercenta UK Distribution Hub', detail: 'Received into the UK network' },
];

function currentMilestone(status: ShipmentStatus): number {
  switch (status) {
    case 'factory_intake':
      return 0;
    case 'bak_depot':
      return 1;
    case 'sea_transit':
      return 3;
    case 'air_transit':
      return 4;
    case 'uk_customs_cleared':
      return 5;
    case 'mercenta_hub':
      return 6;
    case 'live_amazon':
      return 6;
    default:
      return 0;
  }
}

export function BakLogistics() {
  const { shipments, carrierTokens } = useApp();
  const bakShipments = shipments.filter((s) => s.carrier === 'bak');
  const inTransit = bakShipments.filter(
    (s) => s.status === 'sea_transit' || s.status === 'air_transit'
  ).length;
  const cleared = bakShipments.filter((s) => s.status === 'uk_customs_cleared').length;

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="CARRIER TERMINAL"
        title="BAK Logistics Hub — Zimbabwe Corridor"
        description="Cross-border container tracking from inland depots through the Beira and Durban freight corridors into the UK."
        status={
          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/20">
            <Warehouse className="w-3 h-3" />
            Active BAK Token: {carrierTokens.bak || 'BAK-ZW-UNPROVISIONED'}
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Active Containers" value={bakShipments.length} />
        <Metric label="Inland Depot Nodes" value={4} />
        <Metric label="In Corridor Transit" value={inTransit} />
        <Metric label="HMRC Cleared" value={cleared} />
      </div>

      {/* Corridor legend */}
      <Card title="Regional Milestone Map" subtitle="Harare → Bulawayo → Beira / Durban → UK">
        <div className="p-5 flex flex-wrap gap-2">
          {BAK_MILESTONES.map((m, i) => (
            <div
              key={m.label}
              className="flex items-center gap-2 bg-ink-900 border border-white/[0.06] rounded-lg px-3 py-2"
            >
              <span className="text-ds-micro font-bold text-blue-400">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-xs text-zinc-300">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Shipment milestone steppers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bakShipments.map((s) => {
          const idx = currentMilestone(s.status);
          return (
            <Card key={s.id} title={s.reference} subtitle={s.title}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {s.origin} → {s.destination}
                  </span>
                  <span className="font-mono">{s.trackingNumber}</span>
                </div>
                <div className="space-y-0 relative">
                  {BAK_MILESTONES.map((m, i) => {
                    const done = i <= idx;
                    const current = i === idx;
                    return (
                      <div key={m.label} className="flex gap-3 pb-3 last:pb-0 relative">
                        {i < BAK_MILESTONES.length - 1 && (
                          <div
                            className={cn(
                              'absolute left-[7px] top-5 bottom-0 w-px',
                              done ? 'bg-blue-500/50' : 'bg-white/[0.08]'
                            )}
                          />
                        )}
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 border flex items-center justify-center',
                            current
                              ? 'bg-blue-500 border-blue-500'
                              : done
                              ? 'bg-blue-500/40 border-blue-500/40'
                              : 'border-white/[0.2]'
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          ) : (
                            <Circle className="w-2 h-2 text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'text-xs font-medium',
                              current ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-600'
                            )}
                          >
                            {m.label}
                          </div>
                          <div className="text-ds-micro text-zinc-600 mt-0.5">{m.detail}</div>
                        </div>
                        {current && (
                          <Badge className="text-ds-micro bg-blue-500/15 text-blue-300 border-blue-500/20 ml-auto h-fit">
                            Current
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
        {bakShipments.length === 0 && (
          <Card className="p-8 text-center col-span-full">
            <Ship className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              No BAK heavy-freight shipments are currently active. Open the Africa Region Profile
              to seed the Zimbabwe corridor dataset.
            </p>
          </Card>
        )}
      </div>
    </WorkspaceFrame>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-zinc-500 font-medium">{label}</div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
    </Card>
  );
}