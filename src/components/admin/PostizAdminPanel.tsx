/**
 * Postiz Admin Panel — social media scheduling management.
 *
 * Surface inside the admin Marketing section. Schedule posts, view queued
 * content, and verify the Postiz connection. The actual scheduling API lives
 * in src/lib/postiz/postizClient.ts.
 */

import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { getPostizClient, getSocialEngineStatus, socialFindingCounts } from '@/lib/postiz/postizClient';
import { listSocialWorkspaces, getSocialPersistenceStatus } from '@/lib/social/workspace';
import { SOCIAL_BRAND_MODULES, SOCIAL_PROVIDERS } from '@/config/mercentaSocial';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { Calendar, CheckCircle2, Loader2, Send, Instagram, Linkedin, Twitter, Youtube, ShieldAlert } from 'lucide-react';

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
];

export function PostizAdminPanel() {
  const { integrations } = useIntegrations();
  const postizState = integrations.postiz;
  const connected = postizState?.status === 'connected';
  const apiUrl = postizState?.metadata?.api_url ?? 'http://localhost:8100';

  /* §Phase E7 — the integration control centre reads ONE truthful status
     object plus the real provisioning state. Nothing is upgraded to "live". */
  const engineMeta = postizState?.metadata as Record<string, string> | undefined;
  const engine = getSocialEngineStatus(engineMeta);
  const findingCounts = socialFindingCounts(engine.findings);
  const workspaces = listSocialWorkspaces();
  const persistence = getSocialPersistenceStatus();

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSchedule() {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSending(true);
    setResult(null);
    const client = getPostizClient(connected ? { apiUrl, apiKey: '' } : undefined);
    try {
      const r = await client.schedulePost({ content: content.trim(), platforms: selectedPlatforms });
      setResult(r.ok ? `Scheduled (ID: ${r.post?.id ?? 'mock'})` : `Failed: ${r.error}`);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    }
    setSending(false);
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {engine.productName} — engine scheduling
            </h3>
            <p className="text-ds-label text-zinc-500 mt-1">
              {engine.productName} is the customer-facing product; the underlying engine is{' '}
              {engine.engineName} {engine.engineVersion} ({engine.engineLicence}), self-hosted for
              Mercenta. Schedule posts across Instagram, TikTok, LinkedIn, X, Facebook, YouTube and {' '}
              {engine.verified.providerCount - 6} more supported channels.
            </p>
          </div>
          <span
            className={`text-ds-micro px-2 py-1 rounded-full ${engine.configured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'}`}
            data-testid="admin-engine-mode"
          >
            {(engine.configured ? 'Connected' : 'Simulation') + (postizState?.sandbox ? ' (Sandbox)' : '')}
          </span>
        </div>

        {!connected && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-ds-label text-amber-200 mb-3">
            <strong>Self-hosted service unavailable.</strong> Postiz requires a Docker-capable VPS.
            See <span className="text-brass-300">scripts/deploy-docker.sh</span> to provision and deploy.
            Until deployed, mock mode is active — scheduled posts use simulated data.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-ds-micro text-zinc-500 mb-1 block">Post Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="w-full min-h-[80px] text-xs"
            />
          </div>

          <div>
            <label className="text-ds-micro text-zinc-500 mb-1 block">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-ds-micro border transition-colors ${
                      active
                        ? 'bg-brass/20 text-brass border-brass/30'
                        : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="text-xs" disabled={sending || !content.trim() || selectedPlatforms.length === 0} onClick={handleSchedule}>
            {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
            {sending ? 'Scheduling...' : 'Schedule Post'}
          </Button>

          {result && (
            <div className={`text-ds-micro ${result.startsWith('Scheduled') ? 'text-emerald-400' : 'text-red-400'}`}>
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              {result}
            </div>
          )}
        </div>

        <div className="mt-3 border border-white/[0.06] rounded-lg p-2 text-ds-micro text-zinc-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Posts are scheduled through the engine API. Admin-only engine URL:{' '}
          <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="text-brass underline">
            {apiUrl}
          </a>
        </div>
      </Card>

      {/* ── §Phase E7 — engine & deployment (verified facts, no secrets) ── */}
      <Card
        className="p-5"
        title={`${engine.productName} — engine & deployment`}
        subtitle="Verified from the live deployment. No credentials are shown."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Engine</div>
            <div className="text-white" data-testid="admin-engine-identity">
              {engine.engineName} {engine.engineVersion}
            </div>
            <div className="text-ds-micro text-zinc-600">{engine.engineLicence}</div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Container</div>
            <div className="text-white font-mono text-ds-label">{engine.verified.container}</div>
            <div className="text-ds-micro text-zinc-600">{engine.verified.image}</div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Developer API</div>
            <div className="text-white font-mono text-ds-label">{engine.developerApiPath}</div>
            <div className="text-ds-micro text-amber-300">
              {engine.legacyEndpointsVerified ? 'verified' : 'legacy client endpoints unverified'}
            </div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Instance usage</div>
            <div className="text-white" data-testid="admin-engine-usage">
              {engine.verified.instanceEmpty ? 'Unused (clean slate)' : 'In use'}
            </div>
            <div className="text-ds-micro text-zinc-600">
              {engine.verified.counts.users} users · {engine.verified.counts.organizations} orgs ·{' '}
              {engine.verified.counts.posts} posts
            </div>
          </div>
        </div>
        <p className="text-ds-micro text-zinc-500 mt-3">
          Runtime: {engine.verified.runtime}. Verified {engine.verified.verifiedAt}.
        </p>
      </Card>

      {/* ── §Phase E7 — brand entitlement & provisioning ── */}
      <Card
        className="p-5"
        title="Brand entitlement & provisioning"
        subtitle="Mercenta remains the authority for brand approval, tenancy and entitlement."
      >
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs">
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">
              Workspaces provisioned
            </div>
            <div className="text-white" data-testid="admin-workspace-count">
              {workspaces.length}
            </div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Brand modules</div>
            <div className="text-white">{SOCIAL_BRAND_MODULES.length}</div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">
              Supported channels
            </div>
            <div className="text-white">{SOCIAL_PROVIDERS.length}</div>
          </div>
          <div>
            <div className="text-ds-micro uppercase tracking-wider text-zinc-500">Persistence</div>
            <div className="text-white">
              {persistence.backend} · durable: {String(persistence.durable)}
            </div>
          </div>
        </div>
        {workspaces.length > 0 && (
          <div className="mt-3 border border-white/[0.06] rounded-lg divide-y divide-white/[0.04]">
            {workspaces.map((w) => (
              <div
                key={w.workspaceId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-ds-label"
              >
                <span className="font-mono text-zinc-300">{w.workspaceId}</span>
                <span className="text-zinc-500">{w.brandName}</span>
                <span className="text-zinc-600">tenant {w.tenantId}</span>
                <span className="text-zinc-600">requests {w.provisionInvocationCount}</span>
                <span className={w.engineLinked ? 'text-emerald-300' : 'text-amber-300'}>
                  {w.engineLinked ? 'engine linked' : 'engine not linked (simulation)'}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-ds-micro text-zinc-500 mt-3">
          Automatic and idempotent: an approved brand is provisioned on first use and every later
          request reuses the same workspace. Unapproved brands are refused before any workspace is
          created.
        </p>
      </Card>

      {/* ── §Phase E7 — commercial boundary ── */}
      <Card
        className="p-5"
        title="Commercial boundary"
        subtitle={`${engine.productName} is included with a Mercenta partnership.`}
      >
        <ul className="text-ds-label text-zinc-400 space-y-1">
          <li>Brands are never sent to the engine's sign-up, plan, pricing or checkout.</li>
          <li>No subscription, upgrade or billing surface is exposed to a brand.</li>
          <li>
            Engine registration must be disabled on the deployment before brands are embedded
            {engine.verified.registrationOpen ? ' — currently it is still OPEN.' : '.'}
          </li>
        </ul>
      </Card>

      {/* ── §Phase E7 — deployment findings ── */}
      <Card
        className="p-5"
        title="Deployment findings"
        subtitle={`${findingCounts.blocking} blocking · ${findingCounts.warning} warning · ${findingCounts.info} info`}
      >
        <div className="space-y-3">
          {engine.findings.map((f) => (
            <div key={f.id} className="flex items-start gap-3" data-testid={`admin-finding-${f.id}`}>
              <ShieldAlert
                className={
                  'w-3.5 h-3.5 mt-0.5 shrink-0 ' +
                  (f.severity === 'blocking'
                    ? 'text-red-400'
                    : f.severity === 'warning'
                      ? 'text-amber-300'
                      : 'text-zinc-500')
                }
              />
              <div>
                <div className="text-xs text-white">
                  {f.title}{' '}
                  <Badge className="text-ds-micro bg-white/[0.05] text-zinc-400 border-white/[0.06] ml-1">
                    {f.severity}
                  </Badge>
                </div>
                <p className="text-ds-label text-zinc-500 mt-0.5">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}