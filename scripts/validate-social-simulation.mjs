#!/usr/bin/env node
/**
 * §Phase S — SOCIAL ENGINE ADAPTER validator.
 *
 * The deployed social engine is capacity-limited (a paid resize is required), so
 * the deterministic investor demo must be able to run the SAME social workflow
 * without it — truthfully. This validator pins the contract:
 *
 *   1. FAIL-CLOSED: only a positively identified `simulation` mode may execute;
 *      configured/live/degraded/error/disabled/unknown/missing are all REFUSED.
 *   2. The engine's OWN vocabulary and shape are used (providers, channels,
 *      DRAFT/QUEUE/PUBLISHED/ERROR, release ids, analytics).
 *   3. Determinism: the same actions produce the same state, twice over.
 *   4. Failure + recovery: a degraded provider fails once, retry publishes, and
 *      a published post cannot be cancelled.
 *   5. Truthfulness: every record is `simulated: true` and every release id is
 *      unmistakably fake — a simulated publish can never look like a real one.
 *
 * Usage: node scripts/validate-social-simulation.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

/** The same deterministic scenario, run twice, must land in the same state. */
function runScenario(engine, nowIso) {
  engine.connectChannel('x');
  engine.connectChannel('instagram');
  engine.createPost({ channelId: 'sim-ch-x', body: 'Autumn range launch' });
  engine.createPost({ channelId: 'sim-ch-instagram', body: 'Behind the scenes' });
  engine.createPost({ channelId: 'sim-ch-tiktok', body: 'Degraded channel post' });
  engine.connectChannel('tiktok');
  engine.runQueue(nowIso);
  const failed = engine.listPosts().find((p) => p.state === 'ERROR');
  if (failed) engine.retryPost(failed.id);
  return engine.listPosts().map((p) => `${p.id}:${p.state}:${p.releaseId ?? '-'}:${p.attempts}`).join('|');
}

try {
  const mod = await server.ssrLoadModule('/src/lib/social/engineAdapter.ts');

  // 1. FAIL-CLOSED.
  for (const modeId of ['configured', 'live', 'degraded', 'error', 'disabled', 'unknown', null, undefined, '']) {
    const res = mod.createSocialEngineClient(modeId);
    test(`mode ${JSON.stringify(modeId)} is REFUSED (never silently simulated)`, res.ok === false);
  }
  const sim = mod.createSocialEngineClient('simulation');
  test('mode "simulation" is accepted', sim.ok === true);

  // 2. Engine vocabulary / shape, from the canonical provider catalogue.
  const engine = mod.createIsolatedSimulatedSocialClient();
  const providers = engine.listProviders();
  test('provider catalogue is the canonical SOCIAL_PROVIDERS list', providers.length >= 30);
  test('an unknown provider is refused', engine.connectChannel('not-a-provider').ok === false);
  const connected = engine.connectChannel('x');
  test('connecting a real provider id yields a simulated channel',
    connected.ok === true && connected.value.simulated === true && connected.value.id === 'sim-ch-x');
  test('connecting twice is idempotent (one channel)',
    engine.connectChannel('x').ok === true && engine.listChannels().length === 1);
  test('a post without a channel is refused',
    engine.createPost({ channelId: 'sim-ch-missing', body: 'x' }).ok === false);
  test('an empty post is refused',
    engine.createPost({ channelId: 'sim-ch-x', body: '   ' }).ok === false);

  // 3. Lifecycle: QUEUE → PUBLISHED with a clearly-fake release id.
  const created = engine.createPost({ channelId: 'sim-ch-x', body: 'Autumn range launch' });
  test('a composed post enters the engine QUEUE state',
    created.ok === true && created.value.state === 'QUEUE');
  engine.runQueue('2026-09-13T09:00:00.000Z');
  const published = engine.listPosts().find((p) => p.id === created.value.id);
  test('the queue publishes it with a fake release id',
    published.state === 'PUBLISHED' && String(published.releaseId).startsWith('sim-rel-'));
  test('every simulated record is marked simulated',
    engine.listPosts().every((p) => p.simulated === true) &&
      engine.listChannels().every((c) => c.simulated === true));

  // 4. Scheduling: a future post stays QUEUE until its time arrives.
  const scheduled = engine.createPost({
    channelId: 'sim-ch-x',
    body: 'Scheduled campaign',
    scheduledFor: '2026-09-20T09:00:00.000Z',
  });
  engine.runQueue('2026-09-13T09:00:00.000Z');
  test('a future post is NOT published early',
    engine.listPosts().find((p) => p.id === scheduled.value.id).state === 'QUEUE');
  engine.runQueue('2026-09-21T09:00:00.000Z');
  test('it publishes once its time has arrived',
    engine.listPosts().find((p) => p.id === scheduled.value.id).state === 'PUBLISHED');

  // 5. Failure + recovery, then the cancel rules.
  const degraded = engine.connectChannel('tiktok');
  test('a degraded provider still connects (connect ≠ publish)', degraded.ok === true);
  const failing = engine.createPost({ channelId: 'sim-ch-tiktok', body: 'Degraded path' });
  engine.runQueue('2026-09-21T09:05:00.000Z');
  const errored = engine.listPosts().find((p) => p.id === failing.value.id);
  test('a degraded provider fails the first attempt with an honest reason',
    errored.state === 'ERROR' && /no live call was made/.test(String(errored.error)));
  const retried = engine.retryPost(failing.value.id);
  test('retry recovers deterministically to PUBLISHED',
    retried.ok === true && retried.value.state === 'PUBLISHED' && retried.value.attempts === 2);
  test('retrying a published post is refused', engine.retryPost(failing.value.id).ok === false);
  test('a published post cannot be cancelled', engine.cancelPost(failing.value.id).ok === false);
  const draftable = engine.createPost({ channelId: 'sim-ch-x', body: 'Cancel me' });
  const cancelled = engine.cancelPost(draftable.value.id);
  test('a queued post cancels back to DRAFT',
    cancelled.ok === true && cancelled.value.state === 'DRAFT' && cancelled.value.scheduledFor === null);

  // 6. Analytics reflect the same state.
  const analytics = engine.analytics();
  test('analytics counts channels and the published/queued/failed split',
    analytics.channels === engine.listChannels().length &&
      analytics.published === engine.listPosts().filter((p) => p.state === 'PUBLISHED').length &&
      analytics.failed === engine.listPosts().filter((p) => p.state === 'ERROR').length);
  test('analytics breaks down by provider',
    analytics.byProvider.some((r) => r.providerId === 'x' && r.posts > 0));

  // 7. Determinism + reset.
  const first = runScenario(mod.createIsolatedSimulatedSocialClient(), '2026-09-13T09:00:00.000Z');
  const second = runScenario(mod.createIsolatedSimulatedSocialClient(), '2026-09-13T09:00:00.000Z');
  test('the same actions produce the same state (deterministic)', first === second, first);
  engine.reset();
  test('reset returns the simulation to its baseline',
    engine.listPosts().length === 0 && engine.listChannels().length === 0 && engine.analytics().posts === 0);

  console.log(failures === 0 ? 'SOCIAL_SIMULATION_PASS' : `SOCIAL_SIMULATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
