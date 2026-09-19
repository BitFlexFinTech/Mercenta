// §12 — validates the homepage content model + editor pipeline:
//   Home renders FROM the content model (edited heading appears in output)
//   wording lint blocks banned-term edits · draft/publish flow works
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/*
 * §UI/UX Wave 2 — REPOINTED. This validator renders Home through SSR using only
 * `AppProvider`. Since Wave 1, Home (and the chart/theme seams it renders)
 * consumes `useTheme()`, which throws outside a ThemeProvider — so the harness
 * no longer matched the current composition and the validator failed for a
 * reason unrelated to the homepage content contract it exists to protect.
 * The fix is to supply the SAME provider composition the real app uses
 * (src/main.tsx: QueryClientProvider → ThemeProvider → App), not to weaken any
 * assertion. Every original check below is unchanged.
 */
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const theme = await server.ssrLoadModule('/src/context/ThemeContext.tsx');
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const home = await server.ssrLoadModule('/src/components/marketing/Home.tsx');
  const cfg = await server.ssrLoadModule('/src/config/homepageContent.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const w = await server.ssrLoadModule('/src/lib/discovery/wordingSafety.ts');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = (content) =>
    renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          theme.ThemeProvider,
          null,
          createElement(g.AppProvider, null, createElement(home.Home, content ? { content } : {}))
        )
      )
    );

  // Default render contains the default hero heading + brand name.
  // §Phase M10 — REPOINTED. The hardcoded 'UK retail shelf.' literal was the
  // marketing copy at the time; the copy has since changed. The invariant is
  // unchanged and is now asserted against the canonical content model (SSOT):
  // the default render must show the DEFAULT_HOMEPAGE_CONTENT hero heading.
  const htmlDefault = render();
  test('default render shows the canonical default hero heading',
    htmlDefault.includes(cfg.DEFAULT_HOMEPAGE_CONTENT.hero.headingStart));
  test('default render is brand-name driven', htmlDefault.includes('Mercenta'));

  // Edited content renders through the same component.
  const edited = structuredClone(cfg.DEFAULT_HOMEPAGE_CONTENT);
  edited.hero.headingStart = 'From our workshops to';
  edited.about.heading = 'Partner with Mercenta';
  const htmlEdited = render(edited);
  test('edited heading renders instead of hardcoded text', htmlEdited.includes('From our workshops to'));
  test('edited about heading renders', htmlEdited.includes('Partner with Mercenta'));
  test('unedited sections still render from defaults (services heading)',
    htmlEdited.includes(cfg.DEFAULT_HOMEPAGE_CONTENT.services.heading));

  // Wording lint catches a banned-term edit before it can go live.
  const unsafeEdit = structuredClone(cfg.DEFAULT_HOMEPAGE_CONTENT);
  unsafeEdit.hero.headingStart = 'Sell on Amazon today';
  const lint = w.lintOutwardWording(unsafeEdit.hero.headingStart);
  test('editor lint flags banned-term edits', !lint.safe);

  // Draft/publish flow via api.
  const before = await apiMod.fetchHomepageContent();
  await apiMod.saveHomepageDraft(edited);
  const during = await apiMod.fetchHomepageContent();
  test('draft held separately from live', during.draft !== null && during.live !== null);
  const published = await apiMod.publishHomepageContent();
  test('publish promotes the draft', published.hero.headingStart === 'From our workshops to');
  void before;

  console.log(failures === 0 ? 'HOMEPAGE_EDITOR_VALIDATION_PASS' : `HOMEPAGE_EDITOR_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
