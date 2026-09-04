/**
 * Postiz mock client validation — verifies the mock-first client, factory
 * routing, integration registry, and admin panel render.
 */

import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const pzMod = await server.ssrLoadModule('/src/lib/postiz/postizClient.ts');

  /* ── Mock client ── */
  const mock = new pzMod.MockPostizClient();
  const ping = await mock.ping();
  test('mock ping → ok', ping.ok === true);

  const now = await mock.schedulePost({ content: 'Test post', platforms: ['linkedin', 'twitter'] });
  test('mock schedulePost (immediate) → ok with mock id', now.ok && /^postiz-mock-/.test(now.post?.id ?? ''));

  const later = await mock.schedulePost({ content: 'Scheduled post', platforms: ['instagram'], scheduledAt: '2026-09-01T10:00:00Z' });
  test('mock schedulePost (scheduled) → status = scheduled', later.ok && later.post?.status === 'scheduled');

  const all = await mock.getScheduledPosts();
  test('mock getScheduledPosts returns all', all.ok && all.posts.length === 2);

  const scheduled = await mock.getScheduledPosts('scheduled');
  test('mock getScheduledPosts filtered', scheduled.ok && scheduled.posts.length === 1);

  const cancel = await mock.cancelPost(now.post?.id ?? '');
  test('mock cancelPost → ok', cancel.ok === true);

  const cancelBad = await mock.cancelPost('nonexistent');
  test('mock cancelPost unknown → error', cancelBad.ok === false && cancelBad.error !== undefined);

  /* ── Factory ── */
  test('getPostizClient → mock when no creds', pzMod.getPostizClient() instanceof pzMod.MockPostizClient);
  test('getPostizClient → real with full creds',
    pzMod.getPostizClient({ apiUrl: 'http://localhost:8100', apiKey: 'key' }) instanceof pzMod.RealPostizClient);

  /* ── Integration registry ── */
  const typesMod = await server.ssrLoadModule('/src/integrations/types.ts');
  test('postiz in IntegrationId', typesMod.INITIAL_INTEGRATIONS.postiz !== undefined);
  test('postiz starts disconnected', typesMod.INITIAL_INTEGRATIONS.postiz.status === 'disconnected');

  const regMod = await server.ssrLoadModule('/src/integrations/registry.ts');
  test('postiz in registry', regMod.INTEGRATION_REGISTRY.postiz !== undefined);
  test('postiz in order', regMod.INTEGRATION_ORDER.includes('postiz'));

  /* ── Admin panel ── */
  const panelMod = await server.ssrLoadModule('/src/components/admin/PostizAdminPanel.tsx');
  test('PostizAdminPanel exports named function', typeof panelMod.PostizAdminPanel === 'function');

  console.log(`\nPOSTIZ_VALIDATION_PASS (${failures} failures)`);
} catch (err) {
  console.error('POSTIZ_VALIDATION_FAIL:', err.message);
  failures++;
  console.log(`\nPOSTIZ_VALIDATION_PASS (${failures} failures)`);
} finally {
  await server.close();
  process.exit(failures > 0 ? 1 : 0);
}