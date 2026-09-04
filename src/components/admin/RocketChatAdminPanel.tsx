/**
 * Batch C — Rocket.Chat admin management panel.
 * Manages brand groups, user provisioning, and links to the Rocket.Chat admin.
 */
import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { useBrands } from '@/data/queries';
import { getRocketChatClient } from '@/lib/rocketchat/rocketChatClient';
import { ensureBrandGroup, provisionRocketChatUser } from '@/lib/rocketchat/rocketChatSSO';
import { Card, Button } from '@/components/ui';
import { MessageSquare, Users, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';

export function RocketChatAdminPanel() {
  const { integrations } = useIntegrations();
  const rcState = integrations.rocketchat;
  const connected = rcState?.status === 'connected';
  const apiUrl = rcState?.metadata?.api_url ?? 'http://localhost:3000';
  const brandsQuery = useBrands();
  const brands = brandsQuery.data?.data ?? [];
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResults, setProvisionResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleProvisionAll() {
    setProvisioning(true);
    setError(null);
    setProvisionResults({});
    const client = getRocketChatClient(
      connected ? { apiUrl, adminUsername: '', adminPassword: '' } : undefined
    );
    const results: Record<string, string> = {};
    for (const brand of brands) {
      const brandId = brand.id;
      try {
        const name = brand.profile?.businessName ?? brandId;
        const email = (brand as any).email ?? 'brand@example.com';
        const user = await provisionRocketChatUser(email, name, brandId, client);
        const group = await ensureBrandGroup(brandId, name, [user.userId], client);
        results[brandId] = 'Group: ' + group.groupId + ' | User: ' + user.userId;
      } catch (err) {
        results[brandId] = 'FAILED: ' + String(err);
      }
    }
    setProvisionResults(results);
    setProvisioning(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Rocket.Chat Support</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Self-hosted messaging engine behind the CRM Support Inbox.
            </p>
          </div>
          <Button className="text-xs" disabled={!connected}>
            <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="text-white no-underline flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Rocket.Chat Admin
            </a>
          </Button>
        </div>

        {!connected && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200 mb-3">
            <strong>Self-hosted service unavailable.</strong> Rocket.Chat requires a Docker-capable VPS.
            See <span className="text-brass-300">scripts/deploy-docker.sh</span> to provision and deploy.
            Until deployed, mock mode is active — brand groups and user provisioning use simulated data.
          </div>
        )}

        <div className="border border-white/[0.06] rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-medium text-zinc-300">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              Brand Groups ({brands.length})
            </h4>
            <Button className="text-xs" disabled={provisioning} onClick={handleProvisionAll}>
              {provisioning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {provisioning ? 'Provisioning...' : 'Provision All Groups'}
            </Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center justify-between py-1">
                <span className="text-[10px] text-zinc-400">{brand.profile?.businessName ?? brand.id}</span>
                <span className="text-[9px] text-zinc-600">
                  {provisionResults[brand.id] ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {provisionResults[brand.id].slice(0, 30)}
                    </span>
                  ) : 'Not provisioned'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 border border-white/[0.06] rounded-lg p-2 text-[10px] text-zinc-500">
          <MessageSquare className="w-3 h-3 inline mr-1" />
          Mobile app: fork Rocket.Chat.ReactNative with Mercenta branding.
        </div>
      </Card>
    </div>
  );
}
