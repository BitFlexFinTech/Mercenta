import { useState, useCallback } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  Instagram, Linkedin, Twitter, Youtube,
  CheckCircle2, Loader2, AlertTriangle,
  Globe, Unlink
} from 'lucide-react';

interface SocialPlatform {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter },
  { id: 'facebook', label: 'Facebook', icon: Twitter },
  { id: 'tiktok', label: 'TikTok', icon: Twitter },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
];

const brandConnections = new Map<string, Record<string, { connectedAt: string; profileName: string }>>();

export function BrandSocialConnect() {
  const { session, brandProfile } = useApp();
  const brandId = session?.tenantId ?? '';
  const brandName = brandProfile?.businessName ?? 'Your Brand';
  const [connecting, setConnecting] = useState<string | null>(null);
  const [_refresh, setRefresh] = useState(0);

  const connections = brandConnections.get(brandId) ?? {};
  const connectedPlatforms = Object.keys(connections);

  const handleConnect = useCallback(async (platformId: string) => {
    setConnecting(platformId);
    await new Promise((r) => setTimeout(r, 1200));
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    const mockName = brandName + "'s " + (platform?.label ?? platformId);
    const current = brandConnections.get(brandId) ?? {};
    current[platformId] = { connectedAt: new Date().toISOString(), profileName: mockName };
    brandConnections.set(brandId, current);
    setConnecting(null);
    setRefresh(k => k + 1);
  }, [brandId, brandName]);

  const handleDisconnect = useCallback((platformId: string) => {
    const current = brandConnections.get(brandId) ?? {};
    delete current[platformId];
    brandConnections.set(brandId, current);
    setRefresh(k => k + 1);
  }, [brandId]);

  if (!brandId) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />No active brand session.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-brass-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Social Accounts</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Connect your brand&apos;s social accounts.
            {connectedPlatforms.length > 0 && ' ' + connectedPlatforms.length + ' platform(s) connected.'}
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200 mb-2">
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        Postiz requires a Docker-capable VPS for real OAuth. Until deployed, mock mode is active.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isConnected = platform.id in connections;
          const connInfo = connections[platform.id];
          return (
            <Card key={platform.id} className={'p-5 transition-all ' + (isConnected ? 'border-emerald-500/30' : 'hover:border-white/[0.12]')}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-brass-500/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brass-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{platform.label}</div>
                    {isConnected && connInfo ? (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />{connInfo.profileName}
                      </div>
                    ) : <div className="text-[10px] text-zinc-500">Not connected</div>}
                  </div>
                </div>
                {isConnected && <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300">Live</Badge>}
              </div>

              <button onClick={isConnected ? () => handleDisconnect(platform.id) : () => handleConnect(platform.id)}
                disabled={!isConnected && connecting === platform.id}
                className={'w-full py-2 rounded-lg text-xs font-medium transition-colors ' + (isConnected
                  ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300'
                  : 'bg-brass-500 hover:bg-brass-400 disabled:bg-zinc-700 text-white')}>
                {!isConnected && connecting === platform.id ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" />Connecting...</>
                ) : isConnected ? (
                  <><Unlink className="w-3 h-3 inline mr-1" />Disconnect</>
                ) : 'Connect Account'}
              </button>

              {isConnected && connInfo && (
                <div className="mt-2 text-[9px] text-zinc-600">Connected {new Date(connInfo.connectedAt).toLocaleDateString()}</div>
              )}
            </Card>
          );
        })}
      </div>

      {connectedPlatforms.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-400">
            {connectedPlatforms.length} of {SOCIAL_PLATFORMS.length} platforms connected
          </div>
        </div>
      )}
    </div>
  );
}