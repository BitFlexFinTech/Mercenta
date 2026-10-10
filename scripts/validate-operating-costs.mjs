// §27 / M13 Phase 10 — OPERATING COST + AI SPEND CONTROL validator.
//
// Proves the cost surface is REAL and HONEST:
//   • every cost line carries an explicit source label and NO line claims LIVE;
//   • no final commercial pricing is hard-coded (pricing inputs require founder approval);
//   • the runtime model policy is FREE-ONLY (no paid fallback, no silent paid
//     upgrade) and a task outside the per-operation budget is REFUSED;
//   • the usage log records model/task/tokens/cost/cache/status and REFUSES calls
//     once a ceiling is exceeded (the cost-protection state);
//   • derived figures come from the canonical stores and the log (no invention);
//   • no runtime call site still hardcodes a non-policy model;
//   • the surface makes ZERO network calls.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-operating-costs] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/operatingCosts.ts');
  const policy = await server.ssrLoadModule('/src/lib/costs/modelPolicy.ts');
  const log = await server.ssrLoadModule('/src/lib/costs/usageLog.ts');
  const summaryMod = await server.ssrLoadModule('/src/lib/costs/costSummary.ts');

  /* ── every cost line is labelled; nothing claims live billing ─────────── */
  const lines = cfg.OPERATING_COST_LINES;
  test('every provider cost line exists (AI, infra, data, comms, marketing, compliance)',
    ['openrouter', 'supabase', 'hosting', 'email', 'firecrawl', 'keepa', 'hunter', 'instantly', 'whatsapp', 'google', 'companies_house', 'hmrc']
      .every((id) => lines.some((l) => l.id === id)), lines.map((l) => l.id).join(', '));
  test('every cost line carries an explicit source label',
    lines.every((l) => ['MANUAL', 'ESTIMATED', 'SIMULATED', 'NOT CONNECTED', 'LIVE'].includes(l.source)));
  test('NO cost line claims a LIVE billing integration', lines.every((l) => l.source !== 'LIVE'));
  test('an unconnected provider claims no figure at all',
    lines.filter((l) => ['email', 'keepa', 'whatsapp', 'hmrc'].includes(l.id))
      .every((l) => l.source === 'NOT CONNECTED' && l.fixedMonthlyGbp === 0 && l.usageBudgetGbp === 0));
  test('the AI line reuses the existing discovery budget ceiling (no second cap)',
    lines.find((l) => l.id === 'openrouter').usageBudgetGbp === 25);
  test('every line explains itself in plain language',
    lines.every((l) => l.note.length > 20 && l.plan.length > 3));
  test('the disclaimer states that no live billing API is connected',
    /No live billing API is connected/i.test(cfg.OPERATING_COSTS_DISCLAIMER));

  /* ── pricing is never hard-coded ─────────────────────────────────────── */
  const inputs = cfg.COST_MODEL_INPUTS;
  test('every pricing input requires founder approval',
    inputs.length >= 4 && inputs.every((i) => i.requiresFounderApproval === true));
  test('the subscription price is deliberately UNSET (not invented)',
    inputs.find((i) => i.id === 'brand_subscription_gbp').value === 0);
  test('the revenue model separates the §25 streams',
    Object.keys(cfg.REVENUE_STREAM_LABELS).length === 7 &&
      cfg.REVENUE_STREAM_LABELS.advertising_commission.length > 10);

  /* ── the runtime model policy (PHASE 1: FREE-only, no paid fallback) ─── */
  test('the runtime policy is FREE-only (no maximum paid model constant)',
    !('MAX_PAID_RUNTIME_MODEL' in policy) && policy.FREE_RUNTIME_MODELS.length >= 1);
  const deterministic = policy.selectRuntimeModelForTask('estimated_sales_narrative');
  test('a task deterministic code can answer makes NO model call',
    deterministic.tier === 'deterministic' && deterministic.model === null && deterministic.refused === false);
  // discovery_fit_scoring is declared NOT free-sufficient in the task spec, so
  // under the FREE-only policy it must be REFUSED — never silently upgraded.
  const nonFree = policy.selectRuntimeModelForTask('discovery_fit_scoring');
  test('a non-free-sufficient task is REFUSED, not upgraded to a paid model',
    nonFree.refused === true && nonFree.model === null && nonFree.tier !== 'paid_max');
  const refused = policy.selectRuntimeModel({
    id: 'over_budget', description: 'too expensive', deterministic: false, cacheable: false,
    locallyComputable: false, freeModelSufficient: false, estimatedTokens: 100, estimatedCostGbp: 5,
  });
  test('a task above the per-operation budget is REFUSED, not upgraded',
    refused.refused === true && refused.model === null && /exceeds the per-operation budget/.test(refused.reason));
  test('an unknown task id is refused (fail-closed)',
    policy.selectRuntimeModelForTask('not_a_task').refused === true);
  test('only FREE models (or no model) are allowed — a paid model is refused',
    policy.isModelAllowed(null) &&
      policy.FREE_RUNTIME_MODELS.every((m) => policy.isModelAllowed(m)) &&
      policy.isModelAllowed('deepseek/deepseek-v4-flash') === false &&
      policy.isModelAllowed('openai/gpt-4o') === false);

  /* ── the usage log + cost protection ─────────────────────────────────── */
  /**
   * §REPOINTED (2026-10-01) — ONE CLOCK FOR THE WHOLE SCENARIO (old contract, for the
   * record): this block used to record its entries with the REAL clock while the summary
   * further down was taken with a PINNED instant (`2026-09-15T10:00:00.000Z`).
   * `aiUsageSummary(now)` filters the log by `now`'s month, so the pinned summary found
   * NONE of the real-clock entries: the assertion "the summary counts calls, cache hits,
   * refusals and an estimated projection" therefore passed only while the machine's date
   * happened to sit inside that one month, and failed on 2026-10-01 — with no product
   * change — because the month rolled over. A gate that depends on the calendar is a
   * defect, not a gate. Every writer and the summary now take THIS one instant, so the
   * check is about the LOG; the ceiling is still driven by real values (£3 × 12 > the
   * declared monthly ceiling), so the assertion can still genuinely fail.
   */
  const now = new Date();
  log.resetAiUsageLog();
  test('the log starts empty and the protection state is normal',
    log.aiUsageEntries().length === 0 && log.costProtectionState(now).state === 'normal');
  const cached = log.authoriseAiCall({ taskId: 'discovery_fit_scoring', cachedResultAvailable: true, now });
  test('a cached result is reused and costs nothing',
    cached.status === 'cache_hit' && cached.fallback === 'cached');
  test('the cache hit is recorded and adds no cost', log.spendThisMonth(now) === 0);
  // FREE-only: discovery_fit_scoring is not free-sufficient → refused, zero cost.
  const refusedAi = log.authoriseAiCall({ taskId: 'discovery_fit_scoring', entity: 'Astonish Traders', tokens: 300, now });
  test('a non-free AI task is REFUSED under the FREE-only policy and costs nothing',
    refusedAi.allowed === false && refusedAi.status === 'refused_budget' && log.spendThisMonth(now) === 0);
  const entry = log.aiUsageEntries()[log.aiUsageEntries().length - 1];
  test('the refused entry records the task and a zero-cost refusal (no paid model)',
    entry.taskId === 'discovery_fit_scoring' && entry.status === 'refused_budget' &&
      entry.estimatedCostGbp === 0 && entry.tier !== 'paid_max');
  test('a deterministic task cannot spend (fallback is deterministic)',
    log.authoriseAiCall({ taskId: 'estimated_sales_narrative', now }).fallback === 'deterministic');
  // Free tier: a task an approved FREE model CAN handle is authorised at zero cost.
  const freeDecision = policy.selectRuntimeModel({
    id: 'free_eligible', description: 'free task', deterministic: false, cacheable: true,
    locallyComputable: false, freeModelSufficient: true, estimatedTokens: 100, estimatedCostGbp: 0.0001,
  });
  test('an approved free-model task selects the FREE model at zero cost',
    freeDecision.tier === 'free_model' && freeDecision.model === policy.FREE_RUNTIME_MODELS[0] &&
      freeDecision.estimatedCostGbp === 0 && freeDecision.refused === false);

  // Drive the monthly ceiling over the limit with recorded spend — ON THE SCENARIO'S
  // OWN CLOCK (`now`, declared above), so these entries sit in the same month the
  // summary below reads. The old pinned `2026-09-15T10:00:00.000Z` is REMOVED: it made
  // the summary's month filter disagree with the entries' real month (see the
  // §REPOINTED note above).
  for (let i = 0; i < 12; i++) {
    log.aiUsageEntries().push({
      id: `synthetic-${i}`, at: now.toISOString(), taskId: 'x', model: null, tier: 'paid_max',
      tokens: 0, estimatedCostGbp: 3, cache: 'miss', status: 'ok',
    });
  }
  const exceeded = log.costProtectionState(now);
  test('exceeding the monthly ceiling flips cost protection to EXCEEDED',
    exceeded.state === 'exceeded' && exceeded.monthlyRemainingGbp === 0);
  const blocked = log.authoriseAiCall({ taskId: 'alert_triage_summary', now });
  test('a non-essential call is REFUSED while the ceiling is exceeded',
    blocked.allowed === false && blocked.status === 'refused_budget' && blocked.fallback === 'none');
  const essential = log.authoriseAiCall({ taskId: 'alert_triage_summary', now, essential: true });
  test('an essential call to a non-free task is still REFUSED by the FREE-only policy',
    essential.allowed === false && essential.status === 'refused_budget');
  const usage = log.aiUsageSummary(now);
  test('the summary counts calls, cache hits, refusals and an estimated projection',
    usage.calls > 0 && usage.cacheHits === 1 && usage.refused >= 1 && usage.projectionMonthlyGbp > 0);
  test('the summary lists per-task usage',
    usage.byTask.length >= 1 && usage.byTask.every((t) => typeof t.calls === 'number'));

  /* ── derived figures come from real sources ──────────────────────────── */
  const summary = summaryMod.operatingCostSummary(now);
  test('the summary totals fixed + AI usage (not invented numbers)',
    summary.monthlyTotalGbp === Math.round((summary.monthlyFixedGbp + summary.ai.estimatedCostGbp) * 100) / 100);
  test('per-unit costs divide by the canonical counts',
    summary.units.brands > 0 && summary.perUnit.perBrandGbp >= 0 &&
      summary.perUnit.perLeadGbp >= 0 && summary.perUnit.perAiOperationGbp >= 0);
  test('revenue is reported per §25 stream and the subscription stream is 0',
    summary.revenue.streams.length === 7 &&
      summary.revenue.streams.find((s) => s.id === 'subscription').gbp === 0);
  test('the commission figure comes from the canonical PO store',
    summary.revenue.streams.find((s) => s.id === 'distribution_commission').source.includes('canonical PO store'));
  test('contribution is marked PROVISIONAL while pricing awaits founder approval',
    summary.contribution.provisional === true);
  test('the break-even subscription is derived, not presented as a price',
    summary.derived.minSubscriptionGbp !== null &&
      /not a recommended price|Derived from/.test(summary.derived.minSubscriptionNote));
  test('every provider row carries a source label and a variance',
    summary.providers.every((p) => typeof p.varianceGbp === 'number'));
  log.resetAiUsageLog();
  test('reset clears the log and restores the normal protection state',
    log.aiUsageEntries().length === 0 && log.costProtectionState().state === 'normal');

  /* ── the runtime call sites obey the policy ──────────────────────────── */
const engine = read('src/lib/discovery/engine.ts');
  const triage = read('src/lib/monitoring/alertTriage.ts');
  test('the discovery research client no longer hardcodes a non-policy model',
    !/openai\/gpt-4o-mini/.test(engine) && /decision\.decision\.model/.test(engine));
  test('the alert triage client no longer hardcodes a non-policy model',
    !/openai\/gpt-4o-mini/.test(triage) && /decision\.decision\.model/.test(triage));
  test('no hardcoded expensive model id remains in the runtime call sites',
    !/gpt-4|gpt-3|claude|gemini/i.test(engine + triage));

  /* ── the surface ─────────────────────────────────────────────────────── */
  const panel = read('src/components/admin/OperatingCostsPanel.tsx');
  const superPanel = read('src/components/admin/SuperAdminPanel.tsx');
  test('the Operating Costs panel is a Super Admin tab',
    /\{activeTab === 'costs' && <OperatingCostsPanel \/>\}/.test(superPanel));
  test('the panel re-enforces the Super Admin tier at its own boundary',
    /isSuperAdmin/.test(panel) && /super_admin/.test(panel));
  test('the panel labels the runtime FREE-only policy and the ceilings',
    /FREE models only/.test(panel) && /AI_SPEND_CEILINGS/.test(panel));
  test('the panel reports the cost-protection state',
    /cost protection: \{summary\.ai\.protection\.state\}/.test(panel));

  test('the cost surface makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-operating-costs] THREW:', err);
  failures++;
}

console.log(`\nOPERATING_COSTS_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);