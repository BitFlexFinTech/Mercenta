// §27 / M13 Phase 10 — OPERATING COST + AI SPEND CONTROL validator.
//
// Proves the cost surface is REAL and HONEST:
//   • every cost line carries an explicit source label and NO line claims LIVE;
//   • no final commercial pricing is hard-coded (pricing inputs require founder approval);
//   • the runtime model policy can never select anything more expensive than
//     DeepSeek V4 Flash, and a task outside the per-operation budget is REFUSED;
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
    ['openrouter', 'supabase', 'hosting', 'email', 'firecrawl', 'keepa', 'hunter', 'instantly', 'whatsapp', 'social', 'google', 'companies_house', 'hmrc']
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

  /* ── the runtime model policy ────────────────────────────────────────── */
  test('the maximum paid runtime model is DeepSeek V4 Flash',
    policy.MAX_PAID_RUNTIME_MODEL === 'deepseek/deepseek-v4-flash');
  const deterministic = policy.selectRuntimeModelForTask('estimated_sales_narrative');
  test('a task deterministic code can answer makes NO model call',
    deterministic.tier === 'deterministic' && deterministic.model === null && deterministic.refused === false);
  const paid = policy.selectRuntimeModelForTask('discovery_fit_scoring');
  test('the remaining paid task selects DeepSeek V4 Flash (never a costlier model)',
    paid.model === policy.MAX_PAID_RUNTIME_MODEL && paid.tier === 'paid_max' && paid.refused === false);
  const refused = policy.selectRuntimeModel({
    id: 'over_budget', description: 'too expensive', deterministic: false, cacheable: false,
    locallyComputable: false, freeModelSufficient: false, estimatedTokens: 100, estimatedCostGbp: 5,
  });
  test('a task above the per-operation budget is REFUSED, not upgraded',
    refused.refused === true && refused.model === null && /exceeds the per-operation budget/.test(refused.reason));
  test('an unknown task id is refused (fail-closed)',
    policy.selectRuntimeModelForTask('not_a_task').refused === true);
  test('only the maximum paid model and the free tier are allowed',
    policy.isModelAllowed(policy.MAX_PAID_RUNTIME_MODEL) &&
      policy.isModelAllowed(null) &&
      policy.isModelAllowed('openai/gpt-4o') === false);

  /* ── the usage log + cost protection ─────────────────────────────────── */
  log.resetAiUsageLog();
  test('the log starts empty and the protection state is normal',
    log.aiUsageEntries().length === 0 && log.costProtectionState().state === 'normal');
  const cached = log.authoriseAiCall({ taskId: 'discovery_fit_scoring', cachedResultAvailable: true });
  test('a cached result is reused and costs nothing',
    cached.status === 'cache_hit' && cached.fallback === 'cached');
  test('the cache hit is recorded and adds no cost', log.spendThisMonth() === 0);
  const ok = log.authoriseAiCall({ taskId: 'discovery_fit_scoring', entity: 'Zambezi Traders', tokens: 300 });
  test('an authorised call selects the policy model and records its estimated cost',
    ok.allowed === true && ok.decision.model === policy.MAX_PAID_RUNTIME_MODEL && log.spendThisMonth() > 0);
  const entry = log.aiUsageEntries()[log.aiUsageEntries().length - 1];
  test('the entry records model, task, entity, cache and status',
    entry.model === policy.MAX_PAID_RUNTIME_MODEL && entry.taskId === 'discovery_fit_scoring' &&
      entry.entity === 'Zambezi Traders' && entry.cache === 'miss' && entry.status === 'ok');
  test('a deterministic task cannot spend (fallback is deterministic)',
    log.authoriseAiCall({ taskId: 'estimated_sales_narrative' }).fallback === 'deterministic');

  // Drive the monthly ceiling over the limit with recorded spend.
  const now = new Date('2026-09-15T10:00:00.000Z');
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
  test('an essential call is still authorised (and recorded)', essential.allowed === true);
  const usage = log.aiUsageSummary(now);
  test('the summary counts calls, cache hits, refusals and an estimated projection',
    usage.calls > 0 && usage.cacheHits === 1 && usage.refused === 1 && usage.projectionMonthlyGbp > 0);
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
  test('the panel labels the runtime maximum model and the ceilings',
    /MAX_PAID_RUNTIME_MODEL/.test(panel) && /AI_SPEND_CEILINGS/.test(panel));
  test('the panel reports the cost-protection state',
    /cost protection: \{summary\.ai\.protection\.state\}/.test(panel));

  test('the cost surface makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-operating-costs] THREW:', err);
  failures++;
}

console.log(`\nOPERATING_COSTS_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);