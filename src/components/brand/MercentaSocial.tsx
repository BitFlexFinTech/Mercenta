/**
 * §Phase E7 — MERCENTA SOCIAL (brand surface).
 *
 * The brand-facing entry point to the COMPLETE social application Mercenta
 * exposes. This component is the integration host: it resolves the brand's
 * Mercenta Social workspace automatically, states entitlement truthfully, hosts
 * the engine application when it is configured, and shows the complete module
 * surface when it is not.
 *
 * What it deliberately is NOT:
 *   - not a second scheduler / calendar / media library / analytics engine;
 *   - not an engine-branded product, and never a route to an engine account,
 *     plan, price or checkout;
 *   - not silently "Live": when the engine is not configured the surface says so
 *     and every capability is reported with its real availability.
 *
 * Provisioning is idempotent by construction (src/lib/social/workspace.ts), so
 * mounting, refreshing or re-entering this view can only ever resolve the one
 * workspace the tenant already owns.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import { socialPostStatePresentation } from '@/lib/statusPresentation';
import { createSocialEngineClient } from '@/lib/social/engineAdapter';
import { cn } from '@/utils/cn';
import {
  MERCENTA_SOCIAL,
  SOCIAL_BRAND_MODULES,
  SOCIAL_ENGINE_VERIFIED,
  SOCIAL_PROVIDERS,
  resolveSocialEngineConfig,
  type SocialModule,
} from '@/config/mercentaSocial';
import {
  ensureSocialWorkspaceForBrand,
  linkSocialWorkspaceToEngine,
  socialAccessForBrand,
  type SocialWorkspaceRecord,
} from '@/lib/social/workspace';
import { resolveBrandLifecycleStatus } from '@/lib/social/brandStatus';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface Brandish {
  id: string;
  contractStatus?: string;
}

export function MercentaSocial() {
  const { session, brandProfile } = useApp();
  const { integrations } = useIntegrations();
  const tenantId = String(session?.tenantId ?? '');
  const brandName = brandProfile?.businessName ?? 'Your Brand';

  const [lifecycle, setLifecycle] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<SocialWorkspaceRecord | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<SocialModule | null>(null);

  /* Resolve the canonical brand status for this tenant: the canonical onboarding
     record when the tenant came through onboarding, otherwise the brand row's
     contract status. Both are existing single sources of truth. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await import('@/data/acquisitionStore');
        const record = store.getOnboardingForBrand(tenantId);
        if (record) {
          if (!cancelled) {
            setLifecycle(resolveBrandLifecycleStatus({ onboardingStatus: record.status }));
          }
          return;
        }
      } catch {
        /* the canonical store is loaded lazily; absence is handled below */
      }
      try {
        const demo = await import('@/data/demoData');
        const row = (demo.ALL_DEMO_BRANDS as Brandish[]).find((b) => b.id === tenantId);
        if (!cancelled) {
          setLifecycle(resolveBrandLifecycleStatus({ contractStatus: row?.contractStatus }));
        }
      } catch {
        if (!cancelled) setLifecycle(resolveBrandLifecycleStatus({}));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const access = useMemo(
    () =>
      socialAccessForBrand({
        tenantId,
        brandStatus: lifecycle,
        onboarded: brandProfile?.onboarded,
      }),
    [tenantId, lifecycle, brandProfile?.onboarded]
  );

  const engineMeta = integrations.postiz?.metadata as Record<string, string> | undefined;
  const engine = useMemo(() => resolveSocialEngineConfig(engineMeta), [engineMeta]);

  /* AUTOMATIC PROVISIONING — runs whenever the brand is entitled. Idempotent:
     repeated mounts, refreshes and re-logins reuse the same workspace. */
  useEffect(() => {
    if (!tenantId || !access.allowed) return;
    const result = ensureSocialWorkspaceForBrand(
      { tenantId, brandStatus: lifecycle, onboarded: brandProfile?.onboarded, brandName },
      { actorId: `brand:${tenantId}` }
    );
    if (result.ok) {
      setWorkspace(result.value);
      setProvisionError(null);
    } else {
      setProvisionError(result.error);
    }
  }, [tenantId, access.allowed, lifecycle, brandProfile?.onboarded, brandName]);

  const toggleModule = useCallback((m: SocialModule) => {
    setSelectedModule((cur) => (cur?.id === m.id ? null : m));
  }, []);

  /* §Phase E8 — LAUNCH THE REAL APPLICATION.
     The handoff URL is minted SERVER-SIDE (the social-session edge function holds
     the engine's SSO secret; nothing privileged ever reaches the browser). Opening
     the URL provisions the brand's engine organization on first use, signs the
     brand in server-side, and lands in the full application. */
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const openWorkspace = useCallback(async () => {
    if (!tenantId || launching) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) {
        throw new Error(
          'Mercenta Social could not reach its session service (Supabase is not configured in this environment).'
        );
      }
      const { data, error } = await supabase.functions.invoke('social-session', {
        body: { tenantId },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok || !data?.url) throw new Error(String(data?.error ?? 'session bridge unavailable'));

      setLaunchUrl(String(data.url));
      const linked = linkSocialWorkspaceToEngine(tenantId, {
        email: String(data.email ?? ''),
        organizationId: String(data.organizationId ?? ''),
      });
      if (linked.ok) setWorkspace(linked.value);
      window.open(String(data.url), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLaunchError(String((err as Error)?.message ?? err));
    } finally {
      setLaunching(false);
    }
  }, [tenantId, launching]);

  if (!tenantId) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          No active brand session.
        </div>
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-4" data-testid="mercenta-social">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-white">{MERCENTA_SOCIAL.productName}</h2>
              <p className="text-sm text-zinc-400 mt-2" data-testid="ms-access-denied">
                {access.reason}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                {MERCENTA_SOCIAL.productName} is included with an approved Mercenta partnership. No
                existing content is deleted while access is unavailable.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6" data-testid="mercenta-social">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-brass-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">{MERCENTA_SOCIAL.productName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {MERCENTA_SOCIAL.tagline} {MERCENTA_SOCIAL.noSeparateSignup}
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            'text-[10px]',
            engine.configured
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
              : 'bg-amber-500/15 text-amber-200 border-amber-500/20'
          )}
        >
          <span data-testid="ms-engine-state">
            {engine.configured ? 'Connected' : 'Simulation — not configured'}
          </span>
        </Badge>
      </header>

      {!engine.configured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200">
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          <strong>Simulation.</strong> {engine.blockedReasons.join(' ')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="text-xs font-medium text-zinc-400 mb-3">Your workspace</div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Workspace</div>
              <div className="font-mono text-xs" data-testid="ms-workspace-id">
                {workspace?.workspaceId ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Brand</div>
              <div className="text-xs">{workspace?.brandName ?? brandName}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Provisioning</div>
              <div className="text-xs" data-testid="ms-provision-state">
                {workspace
                  ? workspace.provisionInvocationCount > 1
                    ? `Reused (${workspace.provisionInvocationCount} identical requests)`
                    : 'Provisioned automatically on approval'
                  : 'Resolving…'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Isolation</div>
              <div className="text-xs">Private to this brand tenant</div>
            </div>
          </div>
          {provisionError && <div className="mt-3 text-[11px] text-red-300">{provisionError}</div>}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-zinc-400 mb-3">Application</div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Modules</dt>
              <dd className="text-white" data-testid="ms-module-count">
                {SOCIAL_BRAND_MODULES.length}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Channels supported</dt>
              <dd className="text-white">{SOCIAL_PROVIDERS.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Engine version</dt>
              <dd className="text-white">{SOCIAL_ENGINE_VERIFIED.version}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Engine link</dt>
              <dd className="text-white" data-testid="ms-engine-link">
                {workspace?.engineLinked ? 'Linked' : 'Not linked yet'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3" data-testid="ms-launch">
          <div>
            <div className="text-sm font-medium text-white">Your {MERCENTA_SOCIAL.productName} workspace</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {workspace?.engineLinked
                ? 'Provisioned and linked for this brand. Opening it signs you in — no separate account, no password, no plan.'
                : 'Provisioned automatically for this brand. Opening it creates your workspace on first use — no separate account, no password, no plan.'}
            </p>
          </div>
          <Button onClick={openWorkspace} disabled={launching || !engine.configured} className="text-xs">
            {launching ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <ExternalLink className="w-3 h-3 mr-1" />
            )}
            {launching ? 'Opening…' : `Open ${MERCENTA_SOCIAL.productName}`}
          </Button>
        </div>

        {launchError && (
          <div
            className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200"
            data-testid="ms-launch-error"
          >
            {launchError}
          </div>
        )}

        {launchUrl && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              {MERCENTA_SOCIAL.productName} application
            </div>
            <iframe
              title={`${MERCENTA_SOCIAL.productName} application`}
              src={launchUrl}
              className="w-full h-[720px] rounded-lg border border-white/[0.06] bg-ink-900"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              data-testid="ms-engine-frame"
            />
            <p className="text-[10px] text-zinc-500 mt-2">
              Browsers that block cookies inside third-party frames will not keep the session here —
              use the button above, which opens your workspace where the session is established same-site.
            </p>
          </div>
        )}
      </Card>

      {/* §Phase S — the deterministic simulation studio. Rendered ONLY when the
          canonical engine mode is positively `simulation`: the engine's own
          workflow (channel → compose → QUEUE → PUBLISHED/ERROR → retry →
          analytics) exercised locally, with no live provider call and `(sim)`
          provenance on every record. When the real engine is configured this is
          absent by design — a live mode may never execute simulated operations. */}
      {!engine.configured && <SocialSimulationStudio />}

      <ModuleSurface
        selected={selectedModule}
        onToggle={toggleModule}
        engineConfigured={engine.configured}
      />
      <ProviderSurface />
      <InclusionStatement />
    </div>
  );
}

/* ── §Phase S — the deterministic simulation studio ───────────────────── */

/**
 * Exercises the engine's real workflow locally when (and only when) the engine
 * is not configured. Every action goes through the SAME seam the live path will
 * use (`createSocialEngineClient`), which is fail-closed: it refuses any mode
 * that is not positively `simulation`. Nothing here can claim a live publish —
 * release ids are `sim-rel-…` and every row is marked `(sim)`.
 */
function SocialSimulationStudio() {
  const [client] = useState(() => {
    const res = createSocialEngineClient('simulation');
    return res.ok ? res.value : null;
  });
  const [version, setVersion] = useState(0);
  const [channelId, setChannelId] = useState('');
  const [providerId, setProviderId] = useState(SOCIAL_PROVIDERS[0]?.id ?? '');
  const [body, setBody] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  void version;

  if (!client) {
    return (
      <Card className="p-5">
        <p className="text-[11px] text-red-300" data-testid="ms-simulation-studio">
          The simulation engine refused to start: its mode was not positively identified as
          simulation. No simulated operation was executed.
        </p>
      </Card>
    );
  }

  const channels = client.listChannels();
  const posts = client.listPosts();
  const analytics = client.analytics();

  const run = (fn: () => void) => {
    setError(null);
    setNotice(null);
    fn();
    setVersion((v) => v + 1);
  };

  const connect = () =>
    run(() => {
      const res = client.connectChannel(providerId);
      if (!res.ok) setError(res.error);
      else {
        setChannelId(res.value.id);
        setNotice(`${res.value.label} channel connected (simulation).`);
      }
    });

  const create = () =>
    run(() => {
      const res = client.createPost({
        channelId,
        body,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      if (!res.ok) setError(res.error);
      else {
        setBody('');
        setScheduledFor('');
        setNotice(`Post ${res.value.id} queued (simulation).`);
      }
    });

  const publishQueue = () =>
    run(() => {
      const touched = client.runQueue(new Date().toISOString());
      setNotice(
        touched.length === 0
          ? 'Nothing to publish yet — queue a post, or wait for a scheduled post’s time.'
          : `${touched.length} post(s) processed (simulation): ${touched
              .map((p) => `${p.id} → ${p.state}`)
              .join(', ')}`
      );
    });

  const retry = (id: string) =>
    run(() => {
      const res = client.retryPost(id);
      if (!res.ok) setError(res.error);
      else setNotice(`${id} published on retry (simulation) — release ${res.value.releaseId}.`);
    });

  const cancel = (id: string) =>
    run(() => {
      const res = client.cancelPost(id);
      if (!res.ok) setError(res.error);
      else setNotice(`${id} cancelled back to draft.`);
    });

  return (
    <Card className="p-5">
      <div data-testid="ms-simulation-studio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-white">
          Studio <span className="text-[11px] text-amber-300">(simulation)</span>
        </div>
        <span className="text-[11px] text-zinc-400" data-testid="ms-sim-analytics">
          {analytics.channels} channel(s) · {analytics.posts} post(s) · {analytics.published} published ·{' '}
          {analytics.queued} queued · {analytics.failed} failed
        </span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        The deployed engine is capacity-limited on today's infrastructure, so this studio runs the
        SAME workflow locally instead: connect a channel, compose, queue, publish, fail, retry and
        cancel — deterministically and without any live provider call. Nothing here is presented as a
        real publication.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-zinc-500">
          Channel
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="ml-2 rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-white"
            data-testid="ms-sim-provider"
          >
            {client.listProviders().map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="secondary" onClick={connect} className="text-[11px]">
          Connect (simulated)
        </Button>
        {channels.length > 0 && (
          <span className="text-[11px] text-zinc-400" data-testid="ms-sim-channels">
            Connected: {channels.map((c) => c.label).join(', ')}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <label className="text-[11px] text-zinc-500">
          Post to
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-white"
            data-testid="ms-sim-channel"
          >
            <option value="">Select a channel…</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-zinc-500 md:col-span-2">
          Content
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="What do you want to publish?"
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-white"
            data-testid="ms-sim-body"
          />
        </label>
        <label className="text-[11px] text-zinc-500">
          Schedule (optional)
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-white"
            data-testid="ms-sim-schedule"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={create}
          disabled={!channelId || !body.trim()}
          className="text-[11px]"
        >
          Queue post
        </Button>
        <Button size="sm" variant="secondary" onClick={publishQueue} className="text-[11px]">
          Run queue (publish now)
        </Button>
      </div>

      {notice && (
        <p className="mt-3 text-[11px] text-emerald-300" data-testid="ms-sim-notice">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 text-[11px] text-red-300" data-testid="ms-sim-error">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Queue</div>
        {posts.length === 0 ? (
          <p className="text-[11px] text-zinc-600">No posts yet.</p>
        ) : (
          posts.map((p) => {
            const state = socialPostStatePresentation(p.state);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] py-1.5"
                data-testid={`ms-sim-post-${p.id}`}
              >
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-zinc-500">{p.id}</span>{' '}
                  <span className="text-xs text-zinc-300">{p.body}</span>
                  <span className="ml-2 text-[10px] text-zinc-600">
                    {p.providerId} · attempt {p.attempts}
                    {p.releaseId ? ` · release ${p.releaseId}` : ''}
                    {p.scheduledFor
                      ? ` · scheduled ${p.scheduledFor.slice(0, 16).replace('T', ' ')}`
                      : ''}
                  </span>
                  {p.error && <span className="ml-2 text-[10px] text-red-300">{p.error}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge dataStatus={state.dataStatus} tone={state.tone}>
                    {state.label}
                  </StatusBadge>
                  {p.state === 'ERROR' && (
                    <Button size="sm" variant="ghost" className="text-[10px]" onClick={() => retry(p.id)}>
                      Retry
                    </Button>
                  )}
                  {(p.state === 'QUEUE' || p.state === 'ERROR') && (
                    <Button size="sm" variant="ghost" className="text-[10px]" onClick={() => cancel(p.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {analytics.byProvider.length > 0 && (
        <p className="mt-3 text-[10px] text-zinc-500" data-testid="ms-sim-by-provider">
          {analytics.byProvider.map((r) => `${r.label}: ${r.published}/${r.posts} published`).join(' · ')}
        </p>
      )}
      </div>
    </Card>
  );
}

/* ── The complete module surface (every module is reachable and expands) ── */

function ModuleSurface({
  selected,
  onToggle,
  engineConfigured,
}: {
  selected: SocialModule | null;
  onToggle: (m: SocialModule) => void;
  engineConfigured: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-brass-400" />
        <h3 className="text-sm font-medium text-white">Everything included in your workspace</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SOCIAL_BRAND_MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => onToggle(m)}
            data-testid={`ms-module-${m.id}`}
            aria-expanded={selected?.id === m.id}
            className={cn(
              'text-left bg-ink-850 border rounded-xl p-4 transition-colors',
              selected?.id === m.id
                ? 'border-brass-500/40'
                : 'border-white/[0.06] hover:border-white/[0.14]'
            )}
          >
            <div className="text-sm font-medium text-white">{m.label}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{m.summary}</div>
            <div className="text-[10px] text-zinc-600 mt-2">
              {engineConfigured ? 'Open in your workspace ›' : 'Available when connected ›'}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <Card className="p-5 mt-3">
          <div data-testid="ms-module-detail">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{selected.label}</h4>
                <p className="text-[11px] text-zinc-500 mt-1">{selected.summary}</p>
              </div>
              <Badge className="text-[10px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                Workspace route {selected.engineRoute}
              </Badge>
            </div>
            <ul className="mt-3 space-y-1">
              {selected.capabilities.map((c) => (
                <li key={c} className="text-xs text-zinc-400 flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </section>
  );
}

/* ── Channel availability (never a fabricated "connected") ─────────────── */

function ProviderSurface() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Channels</h3>
        <span className="text-[10px] text-zinc-500">
          {SOCIAL_PROVIDERS.length} supported · connect from inside your workspace
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SOCIAL_PROVIDERS.map((p) => (
          <span
            key={p.id}
            className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400"
          >
            {p.label}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500 mt-3">
        No channel is shown as connected until you connect it yourself. Mercenta never contacts a
        social network on your behalf while your workspace is in simulation.
      </p>
    </Card>
  );
}

/* ── Entitlement statement ─────────────────────────────────────────────── */

function InclusionStatement() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
      <Sparkles className="w-4 h-4 text-brass-400 mt-0.5" />
      <p className="text-xs text-zinc-400">
        {MERCENTA_SOCIAL.productName} is included with your Mercenta partnership. There is no
        separate account, no separate sign-up and no additional subscription — approve a brand and
        the workspace is there.
      </p>
    </div>
  );
}
