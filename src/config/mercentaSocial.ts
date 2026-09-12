/**
 * §Phase E7 — MERCENTA SOCIAL: single source of truth.
 *
 * Mercenta Social is the CUSTOMER-FACING product identity for the complete
 * Postiz application made available to every approved Mercenta brand. Postiz is
 * the ENGINE — an external, already-deployed, mature social platform
 * (AGPL-3.0) that Mercenta exposes. It is never rebuilt inside Mercenta, never
 * reduced to a mock scheduler, and never presented to a brand as "Postiz".
 *
 * Everything brand-facing reads its wording, module list and configuration from
 * HERE. No other file may hardcode the product name, the module inventory, the
 * provider list or the engine version.
 *
 * ── ENGINE FACTS — VERIFIED, NOT ASSUMED ────────────────────────────────────
 * Read directly from the live deployment on 2026-09-12 (droplet
 * `mercenta-services`, 46.101.75.185), never from memory of Postiz:
 *
 *   container   root-postiz-1  ← ghcr.io/gitroomhq/postiz-app:latest
 *   imageId     sha256:785f97312f66a347fb96cdccc4ded5a33ced69a672c89a9adc8054e7d6a21dc5
 *               (image built 2026-09-05T06:59:51Z)
 *   version     v1.47.0        ← container /app/version.txt
 *   runtime     nginx:5000 → backend:3000 (NestJS) + frontend:4200 (Next.js),
 *               PM2-managed (`backend`, `frontend`, `orchestrator` on :3002)
 *   database    postgres16 `postiz-db`, database `postiz-db-local`
 *   tenancy     Organization ← UserOrganization → User; Post.organizationId
 *               and Integration.organizationId scope every entity
 *   usage       EMPTY — 0 users, 0 organizations, 0 memberships,
 *               0 integrations, 0 posts, 0 media
 *   post states QUEUE | PUBLISHED | ERROR | DRAFT
 *   providers   35 verified provider adapters (SOCIAL_PROVIDERS below)
 *   registration DISABLE_REGISTRATION=false → the engine's own self-signup is
 *               OPEN; it must never be reachable from a brand surface
 *   storage     STORAGE_PROVIDER=local, UPLOAD_DIRECTORY=/uploads
 *   external URL MAIN_URL / FRONTEND_URL are http://localhost:5000 → wrong for
 *               external use (breaks OAuth callbacks + absolute links)
 *   BLOCKING    the NestJS backend cannot start without Temporal (:7233):
 *               `connect ECONNREFUSED ::1:7233` from `pm2 logs backend` → nginx
 *               `/api/*` answers 502. No Temporal container exists in the
 *               stack. This is a DEPLOYMENT defect and is reported truthfully;
 *               Mercenta code must never fake around it.
 */

/**
 * §E7 — the identities. `productName` is the ONLY customer-facing name.
 * `engineName` exists for internal/technical usage and admin diagnostics.
 */
export const MERCENTA_SOCIAL = {
  productName: 'Mercenta Social',
  navLabel: 'Mercenta Social',
  tagline: "Your brand's complete social workspace — included with Mercenta.",
  engineName: 'Postiz',
  engineLicence: 'AGPL-3.0',
  /** Entitlement model: an included platform capability — never sold separately. */
  entitlement: 'included_with_mercenta_partnership',
  noSeparateSignup: 'No separate account, no sign-up and no subscription.',
} as const;

/* ── Verified deployment facts (evidence, not configuration) ────────────── */

export interface SocialEngineVerified {
  version: string;
  frontendBuildVersion: string;
  image: string;
  imageId: string;
  imageBuiltAt: string;
  container: string;
  host: string;
  apiBaseUrl: string;
  runtime: string;
  database: string;
  verifiedAt: string;
  instanceEmpty: boolean;
  counts: {
    users: number;
    organizations: number;
    memberships: number;
    integrations: number;
    posts: number;
    media: number;
  };
  postStates: readonly string[];
  providerCount: number;
  registrationOpen: boolean;
  externalUrlMisconfigured: boolean;
  localStorage: boolean;
  backendApiStatus: 'down_502_temporal_missing' | 'up';
}

/** Verified on 2026-09-12 against the running container and its database. */
export const SOCIAL_ENGINE_VERIFIED: SocialEngineVerified = {
  version: 'v1.47.0',
  frontendBuildVersion: 'v2.23.0',
  image: 'ghcr.io/gitroomhq/postiz-app:latest',
  imageId: 'sha256:785f97312f66a347fb96cdccc4ded5a33ced69a672c89a9adc8054e7d6a21dc5',
  imageBuiltAt: '2026-09-05T06:59:51Z',
  container: 'root-postiz-1',
  host: 'http://46.101.75.185:8100',
  apiBaseUrl: '/api',
  runtime: 'nginx:5000 → backend:3000 (NestJS) + frontend:4200 (Next.js), PM2-managed',
  database: 'postgres16 (postiz-db) — database postiz-db-local',
  verifiedAt: '2026-09-12',
  instanceEmpty: true,
  counts: { users: 0, organizations: 0, memberships: 0, integrations: 0, posts: 0, media: 0 },
  postStates: ['QUEUE', 'PUBLISHED', 'ERROR', 'DRAFT'],
  providerCount: 35,
  registrationOpen: true,
  externalUrlMisconfigured: true,
  localStorage: true,
  backendApiStatus: 'down_502_temporal_missing',
};

/**
 * §E7 — the engine's versioned developer API (the programmatic posting seam).
 * Verified present in v1.47.0 at
 * `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts`.
 */
export const SOCIAL_ENGINE_API = {
  versionedPublicApi: '/public/v1',
  /** Endpoints the engine exposes for the extension / share surfaces. */
  publicShareApi: '/public',
  /** Tenant-scoped engine entities, read from the live schema. */
  tenantScopedEntities: [
    'Organization',
    'UserOrganization',
    'Post',
    'Integration',
    'Media',
    'Tags',
    'AutoPost',
  ] as const,
} as const;

/* ── Module inventory — derived from the VERIFIED v1.47.0 application ───── */

export type SocialModuleCategory =
  | 'publish'
  | 'measure'
  | 'organise'
  | 'account'
  | 'operations';

export interface SocialModule {
  id: string;
  /** Customer-facing label (Mercenta Social terminology). */
  label: string;
  /** The verified engine route this module is served from. */
  engineRoute: string;
  category: SocialModuleCategory;
  summary: string;
  /** Capabilities verified to exist (a controller or table in the engine). */
  capabilities: string[];
  /** False = engine-operations surface; must never be exposed to a brand. */
  brandFacing: boolean;
}

/**
 * The complete module surface of the deployed engine. Every `engineRoute` is a
 * route file that exists in the running container (verified with
 * `find .next/server/app -name page.js`); every capability corresponds to a
 * verified API controller or database table. Nothing here is aspirational.
 */
export const SOCIAL_MODULES: SocialModule[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    engineRoute: '/',
    category: 'publish',
    summary: 'Compose, schedule and track everything you publish.',
    capabilities: [
      'Create and edit posts in the composer',
      'Schedule to a date and time, or publish immediately',
      'Draft, queued, published and failed post states (QUEUE · PUBLISHED · ERROR · DRAFT)',
      'Post preview and per-channel content variations',
      'Comments on a post (post-comments endpoint verified)',
    ],
    brandFacing: true,
  },
  {
    id: 'agents',
    label: 'Agents',
    engineRoute: '/agents',
    category: 'publish',
    summary: 'AI-assisted content agents that draft and prepare posts for you.',
    capabilities: [
      'Create and edit AI agents',
      'Per-agent conversation threads and runs',
      'Agent-produced media attachments',
    ],
    brandFacing: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    engineRoute: '/analytics',
    category: 'measure',
    summary: 'Performance across every connected channel.',
    capabilities: ['Per-channel analytics', 'Post-level results', 'Engagement trend data'],
    brandFacing: true,
  },
  {
    id: 'media',
    label: 'Media',
    engineRoute: '/media',
    category: 'organise',
    summary: 'Your brand media library.',
    capabilities: [
      'Upload and store media',
      'Browse and reuse media in the composer',
      'Media attached to posts and generated by agents',
    ],
    brandFacing: true,
  },
  {
    id: 'plugs',
    label: 'Integrations',
    engineRoute: '/plugs',
    category: 'organise',
    summary: 'Connect additional services and content sources.',
    capabilities: [
      'Browse the available integrator plugs',
      'Install a plug against your workspace',
      'Plug data stored against your workspace',
    ],
    brandFacing: true,
  },
  {
    id: 'third-party',
    label: 'Connected apps',
    engineRoute: '/third-party',
    category: 'organise',
    summary: 'Third-party applications connected to your workspace.',
    capabilities: ['Browse third-party apps', 'Per-workspace app records'],
    brandFacing: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    engineRoute: '/settings',
    category: 'account',
    summary: 'Workspace, team and channel configuration.',
    capabilities: [
      'Workspace settings',
      'Team members and organization switching',
      'Workspace API keys and OAuth apps',
      'Notification preferences',
    ],
    brandFacing: true,
  },
  {
    id: 'launches',
    label: 'Launches',
    engineRoute: '/launches',
    category: 'measure',
    summary: 'Launch tracking (the non-general engine mode alternate to Calendar).',
    capabilities: ['Launch listing', 'Launch detail'],
    brandFacing: true,
  },
  {
    id: 'operations',
    label: 'Engine operations',
    engineRoute: '/admin/stats',
    category: 'operations',
    summary: 'Engine statistics and error log. ENGINE OPERATIONS ONLY — never brand-facing.',
    capabilities: ['Platform statistics', 'Error log review'],
    brandFacing: false,
  },
];

/** The brand-facing module surface (dataset completeness is asserted in the validator). */
export const SOCIAL_BRAND_MODULES: SocialModule[] = SOCIAL_MODULES.filter((m) => m.brandFacing);

/* ── Social providers — the 35 adapters verified in the container ───────── */

export interface SocialProvider {
  id: string;
  label: string;
}

/**
 * Every provider adapter found in the deployed engine
 * (`libraries/nestjs-libraries/src/integrations/social/*.provider.ts`) on
 * 2026-09-12. A provider is only *available*, never "connected": a channel can
 * be connected only from inside the engine by the brand, and Mercenta never
 * claims a connection it has not observed.
 */
export const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'instagram.standalone', label: 'Instagram (standalone)' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'linkedin.page', label: 'LinkedIn Page' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'threads', label: 'Threads' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'mastodon', label: 'Mastodon' },
  { id: 'mastodon.custom', label: 'Mastodon (custom instance)' },
  { id: 'farcaster', label: 'Farcaster' },
  { id: 'nostr', label: 'Nostr' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'discord', label: 'Discord' },
  { id: 'slack', label: 'Slack' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'tumblr', label: 'Tumblr' },
  { id: 'vk', label: 'VK' },
  { id: 'mewe', label: 'MeWe' },
  { id: 'medium', label: 'Medium' },
  { id: 'dev.to', label: 'Dev.to' },
  { id: 'hashnode', label: 'Hashnode' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'dribbble', label: 'Dribbble' },
  { id: 'gmb', label: 'Google Business Profile' },
  { id: 'lemmy', label: 'Lemmy' },
  { id: 'listmonk', label: 'Listmonk' },
  { id: 'skool', label: 'Skool' },
  { id: 'whop', label: 'Whop' },
  { id: 'moltbook', label: 'Moltbook' },
];

/* ── Commercial boundary — where a brand must never be sent ─────────────── */

/**
 * Engine paths belonging to the ENGINE'S OWN commercial / self-signup
 * relationship. Mercenta Social is an included capability: no brand may ever be
 * routed to a plan, price, checkout, upgrade or engine account creation.
 */
export const SOCIAL_BLOCKED_ENGINE_PATHS = [
  '/billing',
  '/billing/lifetime',
  '/auth',
  '/auth/register',
  '/oauth/authorize',
  'https://affiliate.postiz.com',
] as const;

/** Strings that must never appear on a brand-facing Mercenta Social surface. */
export const SOCIAL_FORBIDDEN_BRAND_STRINGS = [
  'sign up for postiz',
  'create postiz account',
  'postiz pricing',
  'buy postiz',
  'affiliate.postiz.com',
] as const;

/* ── Configuration resolution (uses the EXISTING integration metadata) ─── */

export interface SocialEngineConfig {
  /** The engine application URL when the integration is configured. */
  appUrl: string | null;
  /** True ONLY when an engine URL is configured AND the engine API is serving. */
  configured: boolean;
  mode: 'simulation' | 'configured';
  /** Why the engine is not embedded — shown verbatim, never hidden. */
  blockedReasons: string[];
}

/**
 * Resolve the engine configuration from the EXISTING integration metadata
 * (`postiz` integration → `api_url` field) with an optional build-time override.
 * Unconfigured is the default and the only state reachable in this environment:
 * the engine's backend API is down (502, Temporal missing) and its
 * self-registration is open, so embedding it would neither work nor be safe.
 */
export function resolveSocialEngineConfig(
  meta?: Record<string, string> | undefined
): SocialEngineConfig {
  const fromMeta = (meta?.api_url ?? '').trim();
  const fromEnv = String(import.meta.env?.VITE_POSTIZ_APP_URL ?? '').trim();
  const appUrl = fromMeta || fromEnv || null;

  const blockedReasons: string[] = [];
  if (!appUrl) {
    blockedReasons.push('The social engine is not configured for this environment.');
  }
  if (SOCIAL_ENGINE_VERIFIED.backendApiStatus !== 'up') {
    blockedReasons.push(
      'The deployed engine API is not serving (backend 502 — Temporal missing), so a workspace cannot be provisioned into it yet.'
    );
  }
  if (SOCIAL_ENGINE_VERIFIED.registrationOpen) {
    blockedReasons.push(
      'The engine still permits self-registration, which must be disabled before brands are embedded.'
    );
  }

  const configured = !!appUrl && SOCIAL_ENGINE_VERIFIED.backendApiStatus === 'up';
  return { appUrl, configured, mode: configured ? 'configured' : 'simulation', blockedReasons };
}

/* ── Verified deployment findings (admin diagnostics + documentation) ──── */

export interface SocialDeploymentFinding {
  id: string;
  severity: 'blocking' | 'warning' | 'info';
  title: string;
  detail: string;
}

/**
 * Findings observed on the live deployment on 2026-09-12. Reported to the admin
 * control centre and recorded in the phase documentation. They are NOT Mercenta
 * product defects and Mercenta code does not work around them.
 *
 * A retired product's leftover containers were also observed on the droplet;
 * that operational note is deliberately kept OUT of this runtime list (Phase D1
 * removed the product from the platform and no executable product path may name
 * it) and is recorded in the E7 report and PRODUCTION_READINESS.md instead.
 */
export const SOCIAL_DEPLOYMENT_FINDINGS: SocialDeploymentFinding[] = [
  {
    id: 'backend-api-down',
    severity: 'blocking',
    title: 'Engine backend API is down (502) — Temporal is missing',
    detail:
      'The NestJS backend exits during startup with `connect ECONNREFUSED ::1:7233` (TemporalRegister) so it never binds :3000, and nginx `/api/*` returns 502. No Temporal container exists in the stack. Fix on the server (re-add Temporal) before API-based provisioning or publishing can work.',
  },
  {
    id: 'registration-open',
    severity: 'blocking',
    title: 'Engine self-registration is OPEN',
    detail:
      'DISABLE_REGISTRATION=false. Anyone reaching the engine can create an account. Set DISABLE_REGISTRATION=true so brands can never sign up outside Mercenta.',
  },
  {
    id: 'external-url-misconfigured',
    severity: 'warning',
    title: 'Engine external URL is localhost',
    detail:
      'MAIN_URL and FRONTEND_URL are http://localhost:5000, so OAuth callbacks, absolute links and embed origins are wrong for external access.',
  },
  {
    id: 'local-storage',
    severity: 'warning',
    title: 'Engine media storage is container-local',
    detail:
      'STORAGE_PROVIDER=local with UPLOAD_DIRECTORY=/uploads. Media does not survive a container rebuild — move to object storage before brands are onboarded.',
  },
  {
    id: 'droplet-memory',
    severity: 'warning',
    title: 'Droplet memory headroom is low',
    detail:
      'mercenta-services (s-2vcpu-4gb) reported 73.7% RAM usage with the engine, its database, Redis and the orchestrator running. Re-adding Temporal and serving brands needs more headroom (8GB was the documented plan).',
  },
  {
    id: 'engine-instance-empty',
    severity: 'info',
    title: 'Engine instance is unused (clean slate)',
    detail:
      '0 users, 0 organizations, 0 memberships, 0 integrations, 0 posts, 0 media. There is no existing engine account to reuse or migrate and no duplicate-relationship risk when automatic provisioning is enabled.',
  },
];
