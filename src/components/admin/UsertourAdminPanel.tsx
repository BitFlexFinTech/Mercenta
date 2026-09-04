/**
 * §Batch 33 — Usertour admin management panel.
 *
 * Shows Usertour connection status, available tours, and fallback info.
 * When connected, admin can open the Usertour dashboard to manage tours visually.
 * When not connected, the fallback TourEngine is used instead.
 */
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { ExternalLink, CheckCircle2, AlertTriangle, MapPin, Layers, Users, Play } from 'lucide-react';
import { ALL_TOURS } from '@/lib/usertour/tourDefinitions';

export function UsertourAdminPanel() {
  const { integrations } = useIntegrations();
  const utState = integrations.usertour;
  const connected = utState?.status === 'connected';
  const apiUrl = utState?.metadata?.api_url ?? 'http://localhost:8091';

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Onboarding Tours</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Self-hosted Usertour platform — create product tours, checklists, and hotspots.
              {!connected && ' When not connected, the built-in fallback tour engine is used.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-[9px]', connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
              {connected ? 'Usertour Active' : 'Fallback Mode'}
            </Badge>
            <Button className="text-xs" disabled={!connected}>
              <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="text-white no-underline flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Usertour Dashboard
              </a>
            </Button>
          </div>
        </div>

        {!connected && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200">
            <strong>Self-hosted service unavailable.</strong> Usertour requires a Docker-capable VPS.
            See <span className="text-brass-300">scripts/deploy-docker.sh</span> to provision and deploy.
            Until deployed, the built-in TourEngine fallback is active.
          </div>
        )}

        {connected && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-200 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            Usertour is active. SDK is loaded in the brand portal — tours target by brand team role.
          </div>
        )}

        {/* Available Tours */}
        <div className="border border-white/[0.06] rounded-lg p-3 mb-3">
          <h4 className="text-[11px] font-medium text-zinc-300 mb-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Available Tours ({ALL_TOURS.length})
          </h4>
          <div className="space-y-2">
            {ALL_TOURS.map((tour) => (
              <div key={tour.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs font-medium text-white">{tour.name}</div>
                  <div className="text-[10px] text-zinc-500">{tour.description} &middot; {tour.steps.length} steps</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-[9px]', tour.autoStart ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400')}>
                    {tour.autoStart ? 'Auto-start' : 'Manual'}
                  </Badge>
                  {tour.targetRoles && tour.targetRoles.length > 0 && (
                    <Badge className="text-[9px] bg-blue-500/15 text-blue-300">{tour.targetRoles.length} role(s)</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-brass-400" />
              <h4 className="font-medium text-zinc-300">Product Tours</h4>
            </div>
            <p className="text-[10px] text-zinc-500">Step-by-step brand onboarding guides with visual anchoring</p>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Layers className="w-3.5 h-3.5 text-brass-400" />
              <h4 className="font-medium text-zinc-300">Resource Center</h4>
            </div>
            <p className="text-[10px] text-zinc-500">MOQ, pricing, packaging, and PO-rejection guidance</p>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Play className="w-3.5 h-3.5 text-brass-400" />
              <h4 className="font-medium text-zinc-300">Hotspots & Tooltips</h4>
            </div>
            <p className="text-[10px] text-zinc-500">Point to specific UI elements on any page</p>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-brass-400" />
              <h4 className="font-medium text-zinc-300">Segmentation</h4>
            </div>
            <p className="text-[10px] text-zinc-500">Target tours by brand team role (Owner/Shipping/Accounts/Compliance)</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
