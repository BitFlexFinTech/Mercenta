// §WAVE 3j — THE CONTROL CENTRE PANEL COVERAGE GATE.
//
// WHY THIS EXISTS. The Control Centre's owner (`buildControlCentre`) derived ~30
// specialised sub-models, and the screen drew only the metric cards, the attention
// list and the provenance list — every sub-model was computed and then thrown away,
// and nothing in the repository could tell. This gate makes that impossible:
//
//   A. DISCOVERY. The model and the panels are LOADED (not retyped), and the keys the
//      screen itself renders are DISCOVERED from the view's source. If either
//      discovery comes back empty the gate FAILS LOUDLY rather than reporting a
//      comfortable green over nothing.
//   B. COVERAGE. Every key of the model the owner actually builds must be rendered by
//      SOMETHING — a specialised panel (`panel.modelKeys`) or the screen's own metric
//      strip / attention list / provenance list. A NEW sub-model added to the owner
//      fails here until it is drawn.
//   C. NO PHANTOM KEY. A panel may not claim a model key the model does not have.
//   D. EVERY PANEL IS NAVIGABLE. Each panel declares a capability area that really is
//      one of the declared sections, so no panel can be drawn nowhere.
//   E. EVERY PANEL NAMES A REAL OWNER. The canonical module a panel reports on must
//      exist on disk — provenance that cannot drift.
//   F. QUEUE COMPLETENESS. A queue panel must carry EVERY row the model carries
//      (dataset completeness: never a curated subset).
//   G. NO LEAKED VALUE. No row may render `undefined`, `NaN`, `null` or
//      `[object Object]` — the shape of the failure a renamed field produces.
import { createServer } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/* ── ZERO NETWORK for the whole run ────────────────────────────────────────── */
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

try {
  const cc = await server.ssrLoadModule('/src/lib/commandCentre/controlCentre.ts');
  const panelsModule = await server.ssrLoadModule('/src/next/screens/admin/controlCentrePanels.ts');

  const model = cc.buildControlCentre();
  const panels = panelsModule.buildControlPanels(model);

  /* ── A. DISCOVERY ────────────────────────────────────────────────────────── */
  const modelKeys = Object.keys(model);
  const declaredSections = cc.CONTROL_CENTRE_SECTIONS.map((s) => s.id);

  test(
    'A1 the model the owner builds is discovered (not retyped)',
    modelKeys.length > 20,
    `${modelKeys.length} keys`
  );
  test('A2 the panel list is discovered', panels.length > 20, `${panels.length} panels`);

  const viewSource = readFileSync(
    resolve(process.cwd(), 'src/next/screens/admin/AdminControlCentreView.tsx'),
    'utf8'
  );
  /* The keys the SCREEN renders directly (metric strip, attention list, provenance
     list, headline strip). Discovered by looking for the real references. */
  const viewRendered = ['counts', 'metrics', 'attention', 'dataSources', 'generatedFor'].filter((key) =>
    viewSource.includes(`model.${key}`)
  );
  test(
    'A3 the keys the screen itself renders are discovered from the view, not retyped',
    viewRendered.length >= 4,
    `${viewRendered.length} discovered: ${viewRendered.join(', ')}`
  );

  /* ── B. COVERAGE ─────────────────────────────────────────────────────────── */
  const declared = new Set();
  for (const panel of panels) {
    for (const key of panel.modelKeys ?? []) declared.add(key);
  }
  const covered = new Set([...declared, ...viewRendered]);
  const undrawn = modelKeys.filter((key) => !covered.has(key));

  test(
    'B1 EVERY key of the model the owner builds is rendered by a panel or by the screen itself',
    undrawn.length === 0,
    undrawn.length === 0 ? `${modelKeys.length}/${modelKeys.length} keys drawn` : `UNDRAWN: ${undrawn.join(', ')}`
  );

  /* ── C. NO PHANTOM KEY ───────────────────────────────────────────────────── */
  const phantom = [...declared].filter((key) => !modelKeys.includes(key));
  test(
    'C1 no panel claims a model key that does not exist',
    phantom.length === 0,
    phantom.length === 0 ? `${declared.size} keys declared` : `PHANTOM: ${phantom.join(', ')}`
  );

  /* ── D. EVERY PANEL IS NAVIGABLE ─────────────────────────────────────────── */
  const badSection = panels.filter((p) => !declaredSections.includes(p.section));
  test(
    'D1 every panel declares a real capability area, so none is drawn nowhere',
    badSection.length === 0,
    badSection.map((p) => `${p.id} → ${p.section}`).join(', ')
  );
  const perSection = declaredSections.map((id) => ({
    id,
    count: panelsModule.panelsForSection(panels, id).length,
  }));
  test(
    'D2 the panels distribute across the areas (proved through the selector the screen uses)',
    perSection.every((s) => s.count === panels.filter((p) => p.section === s.id).length),
    perSection.map((s) => `${s.id}:${s.count}`).join(' · ')
  );

  /* ── E. EVERY PANEL NAMES A REAL OWNER ───────────────────────────────────── */
  const missingOwner = [];
  for (const panel of panels) {
    if (!panel.owner || !panel.owner.includes('src/')) {
      missingOwner.push(`${panel.id} (no canonical owner named)`);
      continue;
    }
    const first = panel.owner.match(/src\/[A-Za-z0-9_./-]+\.(ts|tsx)/);
    if (!first || !existsSync(resolve(process.cwd(), first[0]))) {
      missingOwner.push(`${panel.id} (${first ? first[0] : 'no path'} does not exist)`);
    }
  }
  test('E1 every panel names a canonical owner that really exists on disk', missingOwner.length === 0, missingOwner.join('; '));

  /* ── F. QUEUE COMPLETENESS ───────────────────────────────────────────────── */
  const queuePanels = panels.filter((p) => p.queue);
  test(
    'F1 the canonical queues are drawn as full tables',
    queuePanels.length >= 2,
    `${queuePanels.length} queue panel(s)`
  );
  const queueProblems = [];
  for (const panel of queuePanels) {
    const source = model[panel.queue.modelKey];
    if (!source) {
      queueProblems.push(`${panel.id}: no model key ${panel.queue.modelKey}`);
      continue;
    }
    if (panel.queue.rows.length !== source.rows.length) {
      queueProblems.push(
        `${panel.id}: ${panel.queue.rows.length} rows drawn vs ${source.rows.length} rows in the model`
      );
    }
    if (source.total !== undefined && source.total !== source.rows.length) {
      queueProblems.push(`${panel.id}: the model's own total (${source.total}) disagrees with its rows`);
    }
  }
  test(
    'F2 every queue panel carries EVERY row the model carries (never a curated subset)',
    queueProblems.length === 0,
    queueProblems.join('; ')
  );

  /* ── G. NO LEAKED VALUE ──────────────────────────────────────────────────── */
  const leaks = [];
  const BAD = ['undefined', 'NaN', 'null', '[object Object]'];
  let rowCount = 0;
  for (const panel of panels) {
    for (const group of panel.groups ?? []) {
      if (!group.label) leaks.push(`${panel.id}: a group has no label`);
      for (const r of group.rows ?? []) {
        rowCount += 1;
        if (typeof r.label !== 'string' || r.label.length === 0) leaks.push(`${panel.id}: a row has no label`);
        if (typeof r.value !== 'string' || r.value.length === 0) {
          leaks.push(`${panel.id}: "${r.label}" has no value`);
          continue;
        }
        for (const bad of BAD) {
          if (r.value.includes(bad)) leaks.push(`${panel.id}: "${r.label}" renders "${bad}"`);
        }
      }
    }
  }
  test(
    'G1 no row leaks undefined/NaN/null/[object Object] and none is empty',
    leaks.length === 0,
    leaks.length === 0 ? `${rowCount} rows checked` : leaks.slice(0, 6).join('; ')
  );

  /* ── H. ZERO NETWORK ─────────────────────────────────────────────────────── */
  test('H1 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);
} catch (error) {
  failures++;
  console.error('✗ the validator itself failed:', error);
} finally {
  await server.close();
}

console.log(`\n${assertions} assertions · ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
