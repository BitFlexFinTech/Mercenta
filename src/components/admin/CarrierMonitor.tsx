import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Activity, Wifi, WifiOff } from 'lucide-react';

/**
 * §Stage-6 — CARRIER INTEGRATION MONITOR (technical connection-health view).
 * Per-carrier API status, uptime, last successful sync, error log. This is
 * the integration team's view; shipment operations live in Logistics Control.
 */
interface CarrierHealth {
  id: string;
  name: string;
  apiStatus: 'operational' | 'degraded' | 'offline';
  uptime30d: string;
  lastSync: string;
  latencyMs: number;
  errors24h: { time: string; message: string }[];
}

const HEALTH: CarrierHealth[] = [
  {
    id: 'dhl', name: 'DHL API', apiStatus: 'operational', uptime30d: '99.98%',
    lastSync: '2 min ago', latencyMs: 240,
    errors24h: [{ time: '04:12', message: 'Rate-limit retry (429) — succeeded on attempt 2' }],
  },
  {
    id: 'fedex', name: 'FedEx Ship API', apiStatus: 'operational', uptime30d: '99.91%',
    lastSync: '6 min ago', latencyMs: 380, errors24h: [],
  },
  {
    id: 'bak', name: 'BAK Logistics (internal)', apiStatus: 'degraded', uptime30d: '97.40%',
    lastSync: '38 min ago', latencyMs: 1150,
    errors24h: [
      { time: '09:47', message: 'Tracking webhook delayed >15 min for BAK-ZW-7741' },
      { time: '08:03', message: 'Timeout on /manifests sync — retried OK' },
    ],
  },
{
    id: 'palletline', name: 'Palletline IPCP API', apiStatus: 'operational',
    uptime30d: '98.80%', lastSync: '12 min ago', latencyMs: 520,
    errors24h: [{ time: '22:15', message: 'Manifest submission delayed — queue backlog cleared' }],
  },
  {
    id: 'amazon_partner', name: 'Amazon-partnered carrier feed', apiStatus: 'operational',
    uptime30d: '99.99%', lastSync: '1 min ago', latencyMs: 180, errors24h: [],
  },
];

export function CarrierIntegrationMonitor() {
  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Carrier Integration Monitor</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Technical view — per-carrier API connection health, sync state and error logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HEALTH.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{c.name}</span>
              <Badge
                className={cn(
                  'text-[10px]',
                  c.apiStatus === 'operational'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                    : c.apiStatus === 'degraded'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      : 'bg-red-500/15 text-red-300 border-red-500/20'
                )}
              >
                {c.apiStatus === 'offline' ? <WifiOff className="w-3 h-3 mr-1" /> : <Wifi className="w-3 h-3 mr-1" />}
                {c.apiStatus}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><div className="text-[10px] text-zinc-600">Uptime 30d</div><div className="font-mono text-xs text-white">{c.uptime30d}</div></div>
              <div><div className="text-[10px] text-zinc-600">Last Sync</div><div className="font-mono text-xs text-white">{c.lastSync}</div></div>
              <div><div className="text-[10px] text-zinc-600">Latency</div><div className="font-mono text-xs text-white">{c.latencyMs} ms</div></div>
            </div>
            <div className="border-t border-white/[0.05] pt-2">
              <div className="text-[10px] text-zinc-600 font-medium mb-1">Errors (24h): {c.errors24h.length}</div>
              {c.errors24h.length === 0 ? (
                <p className="text-[11px] text-emerald-400">No errors in the last 24 hours.</p>
              ) : (
                c.errors24h.map((e) => (
                  <p key={e.time} className="text-[11px] text-red-300 font-mono">
                    {e.time} — {e.message}
                  </p>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
