// §Founder OS — validates the Founder Operating System layer:
//   A. the canonical automation registry (idempotency, failure, retry, disable,
//      approval gate, deterministic ids, no timers, no random)
//   B. Founder Ops AI degradation (works with AI unavailable, zero network)
//   C. the acquisition engine (prospect ≠ brand, dedup, lifecycle)
//   D. the BI findings layer (basis labels, brand-safety strip, citations)
//   E. the Control Centre model (9 views, real derived figures, drill-downs)
//   F. tenant isolation + deterministic repeatability
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

try {
  const reg = await server.ssrLoadModule('/src/lib/automation/registry.ts');
  const ai = await server.ssrLoadModule('/src/lib/ai/founderOpsAi.ts');
  const client = await server.ssrLoadModule('/src/lib/ai/founderAiClient.ts');
  const acq = await server.ssrLoadModule('/src/lib/acquisition/acquisitionEngine.ts');
  const bi = await server.ssrLoadModule('/src/lib/intelligence/intelligenceLayer.ts');
  const cc = await server.ssrLoadModule('/src/lib/commandCentre/controlCentre.ts');
  const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');
  const types = await server.ssrLoadModule('/src/types.ts');
  const fsMod = await import('node:fs');

  /* ── Zero network for the whole run ─────────────────────────────────────── */
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async (...args) => {
    networkCalls++;
    throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
  };

  /* ── A. The automation catalogue ────────────────────────────────────────── */
  const declared = reg.AUTOMATION_ORDER;
  // §P13 / S5 — REPOINTED: this previously asserted 9 declared automations. The
  // acknowledgement notification fan-out (`po_acknowledgement_fanout`) was
  // registered in the SAME registry this stage, so the canonical count is now 10,
  // and `e2e/founder-operating-system.spec.ts` was repointed for exactly this
  // reason. The old contract (9) is recorded here; the assertion reads the
  // canonical count.
  test('10 deterministic automations are declared', declared.length === 10, declared.length);
  test(
    'every automation declares cadence, entry point, idempotency key and a free-first cost note',
    declared.every((id) => {
      const d = reg.AUTOMATION_REGISTRY[id];
      return Boolean(d.cadence && d.entryPoint && d.idempotencyKey && d.costNote && d.cadenceDays > 0);
    })
  );
  test(
    'no automation requires AI to run',
    declared.every((id) => reg.AUTOMATION_REGISTRY[id].deterministic === true)
  );
  const registrySource = fsMod.readFileSync('src/lib/automation/registry.ts', 'utf8');
  /* Strip comments first: the module DOCUMENTS the rules it obeys, and a doc
     mention of `Math.random` is not a use of it. */
  const registryCode = registrySource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  test('the registry contains no timer', !/setInterval\s*\(|setTimeout\s*\(/.test(registryCode));
  test('the registry contains no Math.random', !/Math\.random\s*\(/.test(registryCode));
  test('the registry never derives an id from Date.now', !/Date\.now\s*\(/.test(registryCode));

  /* ── B. Run ledger: idempotency + deterministic ids ─────────────────────── */
  reg.resetAutomationStore();
  work.resetWorkStore();

  const first = reg.runAutomation('work_projection', { actor: 'test:validator' });
  test('work_projection succeeds on first run', first.status === 'succeeded', first.status);
  test('run id is deterministic (run-<automationId>-<sequence>)', /^run-work_projection-\d{4}$/.test(first.id), first.id);
  test('the run reports what it evaluated', first.evaluated > 0, String(first.evaluated));

  const auditBefore = demo.demoAuditLog.length;
  const second = reg.runAutomation('work_projection', { actor: 'test:validator' });
  test('an identical second run is duplicate_suppressed', second.status === 'duplicate_suppressed', second.status);
  test('a duplicate run raises nothing', second.raised === 0);
  test('a duplicate run writes no extra audit row', demo.demoAuditLog.length === auditBefore, `${demo.demoAuditLog.length} vs ${auditBefore}`);

  const sweep = reg.runAutomation('reminder_sweep', { actor: 'test:validator' });
  test('reminder_sweep runs and reports its sweep', sweep.status === 'succeeded' || sweep.status === 'duplicate_suppressed', sweep.status);
  const sweepAgain = reg.runAutomation('reminder_sweep', { actor: 'test:validator' });
  test('a repeated reminder sweep is suppressed (no duplicate notifications)', sweepAgain.status === 'duplicate_suppressed');

  const escalate = reg.runAutomation('overdue_escalation', { actor: 'test:validator' });
  test('overdue_escalation runs', escalate.status === 'succeeded' || escalate.status === 'duplicate_suppressed', escalate.status);
  const escalateAgain = reg.runAutomation('overdue_escalation', { actor: 'test:validator' });
  test('overdue escalation cannot double-escalate on a repeat run', escalateAgain.raised === 0);

  console.log(`\n-- automation run ledger (${reg.automationRuns().length} runs) --`);
  for (const h of reg.automationHealth()) {
    console.log(`  ${h.id.padEnd(30)} ${String(h.status).padEnd(20)} next ${h.nextRunAt}`);
  }

  /* ── C. Failure is observable and retryable ─────────────────────────────── */
  reg.simulateAutomationFailure('finance_overdue_monitor', 'Simulated provider outage (validator).', 'test:validator');
  const failed = reg.runAutomation('finance_overdue_monitor', { actor: 'test:validator' });
  test('an injected failure produces a failed run', failed.status === 'failed', failed.status);
  test('the failure carries the real error', failed.error === 'Simulated provider outage (validator).', String(failed.error));
  test('the failed run is flagged as simulated', failed.simulatedFailure === true);
  test('the failed run raises nothing (no fake success)', failed.raised === 0 && failed.evaluated === 0);
  const retried = reg.retryAutomation(failed.id, 'test:validator');
  test('a failed run can be retried safely', retried !== null && retried.status !== 'failed', retried?.status);
  test('the retry is attributed to the failed run', retried.retryOf === failed.id && retried.attempt === 2);
  test('retryAutomation refuses a run that did not fail', reg.retryAutomation(first.id, 'test:validator') === null);

  /* ── D. Disable is attributed, audited and produces no side effects ─────── */
  const auditBeforeDisable = demo.demoAuditLog.length;
  reg.setAutomationEnabled('compliance_gate_monitor', false, 'test:validator', 'Validator: disable to prove zero side effects.');
  const disabledRun = reg.runAutomation('compliance_gate_monitor', { actor: 'test:validator', force: true });
  test('a disabled automation is skipped', disabledRun.status === 'skipped_disabled', disabledRun.status);
  test('a disabled automation produces no side effects', disabledRun.evaluated === 0 && disabledRun.affected.length === 0);
  test('disabling is audited', demo.demoAuditLog.length > auditBeforeDisable);
  reg.setAutomationEnabled('compliance_gate_monitor', true, 'test:validator', 'Validator: re-enable.');
  test('re-enabling restores the automation', reg.automationState('compliance_gate_monitor').enabled === true);
  let reasonRequired = false;
  try {
    reg.setAutomationEnabled('compliance_gate_monitor', false, 'test:validator', '   ');
  } catch {
    reasonRequired = true;
  }
  test('a state change without a reason is refused', reasonRequired);

  /* ── E. The approval gate stops a consequential decision ────────────────── */
  const commission = reg.runAutomation('commission_review', { actor: 'test:validator', force: true });
  const heldApprovals = reg.pendingApprovals();
  if (heldApprovals.length > 0) {
    test('a commission above the declared threshold stops at blocked_approval', commission.status === 'blocked_approval', commission.status);
    test('the pending approval is observable', heldApprovals.length > 0, String(heldApprovals.length));
    const key = heldApprovals[0].key;
    const decided = reg.decideAutomationApproval(key, 'approved', 'test:validator', 'Validator approval.');
    test('a human decision clears the approval', decided?.status === 'approved');
    const after = reg.runAutomation('commission_review', { actor: 'test:validator', force: true });
    test('after approval the automation no longer blocks', after.status === 'succeeded', after.status);
  } else {
    test(
      'no commission exceeds the declared auto-approve threshold in the demo data (honest zero)',
      commission.status === 'succeeded',
      commission.status
    );
  }


  /* ── E2. THE GLOBAL HALT (kill switch) ──────────────────────────────────── */
  /* One act must stop EVERY automation, and it must be enforced in the domain:
     a halted run executes nothing, raises nothing, creates no approval. */
  reg.setAutomationHalt(true, 'test:validator', 'Validator: engage the global halt.');
  test('the global halt is observable', reg.automationHalt().halted === true && reg.isAutomationHalted() === true);
  const auditBeforeHaltRun = demo.demoAuditLog.length;
  const approvalsBeforeHaltRun = reg.pendingApprovals().length;
  const haltedRun = reg.runAutomation('work_projection', { actor: 'test:validator', force: true });
  test('a halted automation is skipped', haltedRun.status === 'skipped_halted', haltedRun.status);
  test(
    'a halted run executes nothing and produces no side effect',
    haltedRun.evaluated === 0 && haltedRun.raised === 0 && haltedRun.escalated === 0 && haltedRun.affected.length === 0
  );
  test('a halted run creates no approval', reg.pendingApprovals().length === approvalsBeforeHaltRun);
  test('a halted run writes no audit row beyond the halt itself', demo.demoAuditLog.length === auditBeforeHaltRun);
  const haltedAll = reg.runAllAutomations('test:validator');
  test(
    'runAllAutomations is fully halted too (every declared automation skipped)',
    haltedAll.length === declared.length && haltedAll.every((r) => r.status === 'skipped_halted'),
    `${haltedAll.filter((r) => r.status === 'skipped_halted').length}/${declared.length}`
  );
  let haltReasonRequired = false;
  try {
    reg.setAutomationHalt(true, 'test:validator', '   ');
  } catch {
    haltReasonRequired = true;
  }
  test('a halt without a reason is refused', haltReasonRequired);
  reg.setAutomationHalt(false, 'test:validator', 'Validator: clear the global halt.');
  test('clearing the halt restores normal operation', reg.isAutomationHalted() === false);
  const resumed = reg.runAutomation('work_projection', { actor: 'test:validator', force: true });
  test('after the halt is cleared an automation runs again', resumed.status !== 'skipped_halted', resumed.status);
  test(
    'the halt/resume decisions are audited',
    demo.demoAuditLog.some((a) => a.action === 'automation_halted') &&
      demo.demoAuditLog.some((a) => a.action === 'automation_resumed')
  );


  const availability = client.aiAvailability();
  test('AI availability resolves from the canonical provider registry', typeof availability.mode === 'string', availability.mode);
  test('with no credential the AI state is deterministic_only (never fake-live)', availability.state === 'deterministic_only', availability.state);
  test('paid fallback is never permitted', availability.paidFallbackAllowed === false);
  test('the credential seam is server-side', availability.credentialSeam === 'server_side');
  const deterministicClient = await client.createFounderAiClient();
  test('the factory returns the deterministic client without a credential', deterministicClient.mode === 'deterministic');

  const brief = await ai.buildFounderBrief();
  test('the founder brief is composed without AI', brief.facts.sections.length >= 8, String(brief.facts.sections.length));
  test('the brief narrative is labelled deterministic (not AI)', brief.narrative.basis === 'deterministic', brief.narrative.basis);
  test('the brief narrative uses no model', brief.narrative.model === null);
  test('the brief says why no model was called', brief.narrative.reason.length > 0);
  test('the brief is canonical', brief.facts.basis === 'canonical');
  test(
    'the brief reports the real work counts',
    brief.facts.counts.openWork === work.getWorkItems('admin', null).length,
    `${brief.facts.counts.openWork} vs ${work.getWorkItems('admin', null).length}`
  );
  test('the brief has recommended next actions', brief.facts.recommendedActions.length > 0);

  const attention = await ai.askMercenta('What needs my attention today?');
  test('Ask Mercenta classifies a known question', attention.intent === 'attention', attention.intent);
  test('Ask Mercenta answers from canonical records', attention.basis === 'canonical');
  test('Ask Mercenta cites canonical records', attention.sources.length > 0, String(attention.sources.length));
  test('Ask Mercenta answer does not claim to be AI', attention.narrative.basis === 'deterministic');

  const invoices = await ai.askMercenta('Which invoices are overdue?');
  test('an invoice question routes to the finance intent', invoices.intent === 'invoices_overdue', invoices.intent);
  const automationQ = await ai.askMercenta('What automation failed recently?');
  test('an automation question routes to the automation intent', automationQ.intent === 'automation_failures', automationQ.intent);
  const unknown = await ai.askMercenta('What is the weather in Paris?');
  test('an unanswerable question is refused, not invented', unknown.intent === 'unknown' && unknown.sources.length === 0);
  test('the refusal lists the questions it can answer', unknown.facts.length === ai.MERCENTA_INTENTS.length);

  /* AI cannot corrupt canonical state: the stores are unchanged by AI calls. */
  const workAfterAi = work.getWorkItems('admin', null).length;
  const auditAfterAi = demo.demoAuditLog.length;
  await ai.askMercenta('Summarise my highest-priority operational issues.');
  await ai.buildFounderBrief();
  test('AI calls do not create work items', work.getWorkItems('admin', null).length === workAfterAi);
  test('AI calls do not write audit records', demo.demoAuditLog.length === auditAfterAi);
  test('no network call was made by any AI path', networkCalls === 0, String(networkCalls));

  /* ── G. The acquisition engine ─────────────────────────────────────────── */
  const pipeline = acq.acquisitionPipeline();
  test('the acquisition pipeline derives records from the canonical prospect store', pipeline.total > 0, String(pipeline.total));
  test('all eleven lifecycle stages are declared', acq.ACQUISITION_STAGES.length === 11, String(acq.ACQUISITION_STAGES.length));
  test(
    'every record sits in exactly one declared stage',
    pipeline.records.every((r) => acq.ACQUISITION_STAGE_BY_ID[r.stage] !== undefined)
  );
  test(
    'every record carries an owner, a next action and a destination',
    pipeline.records.every((r) => r.owner && r.nextAction.label && r.destination)
  );
  test(
    'a prospect is NOT a brand: brandId is only set by a completed onboarding',
    pipeline.records.every((r) => (r.brandId === null ? true : r.onboardingStatus === 'completed')),
    `${pipeline.activatedBrands} activated`
  );
  test(
    'prospectConversionState refuses an unknown prospect instead of guessing',
    acq.prospectConversionState('no-such-prospect').isBrand === false
  );
  const firstProspect = pipeline.records[0];
  const conversion = acq.prospectConversionState(firstProspect.prospectId);
  test(
    'conversion state explains WHY a prospect is not yet a brand',
    conversion.isBrand || Boolean(conversion.blockingReason)
  );
  test(
    'dedup uses the canonical normalised brand key',
    pipeline.duplicates.every((d) => d.dedupeKey === d.dedupeKey.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  test(
    'stage counts match the record set',
    pipeline.stages.reduce((sum, s) => sum + s.count, 0) === pipeline.total,
    `${pipeline.stages.reduce((sum, s) => sum + s.count, 0)} vs ${pipeline.total}`
  );
  test('acquisition records are deterministic across two calls', JSON.stringify(acq.acquisitionRecords()) === JSON.stringify(acq.acquisitionRecords()));


  /* ── H. The BI findings layer ──────────────────────────────────────────── */
  const findings = bi.intelligenceFindings();
  test('the BI layer produces findings', findings.length > 0, String(findings.length));
  test(
    'every finding declares its basis and a label',
    findings.every((f) => f.basis && f.basisLabel && bi.INTELLIGENCE_BASIS_LABELS[f.basis] === f.basisLabel)
  );
  test('every finding cites at least one canonical source', findings.every((f) => f.sources.length > 0));
  test('findings use deterministic ids', findings.every((f) => /^finding-[a-z_]+-/.test(f.id)));
  test(
    'a threshold finding records the declared threshold AND the observed value',
    findings.filter((f) => f.rule).every((f) => f.rule.threshold.length > 0 && f.rule.observed.length > 0)
  );
  const categoryFindings = findings.filter((f) => f.rule?.id === 'approved_category_gate');
  const unapprovedProspects = acq
    .acquisitionRecords()
    .filter((r) => !types.APPROVED_CATEGORIES.includes(r.category));
  test(
    'the approved-category gate finding appears exactly when an unapproved category exists',
    categoryFindings.length === unapprovedProspects.length,
    `${categoryFindings.length} findings vs ${unapprovedProspects.length} unapproved`
  );
  test('internal-only findings exist (scoring/acquisition intelligence)', findings.some((f) => f.internalOnly));
  test('brandSafeFindings strips every internal-only finding', bi.brandSafeFindings(findings).every((f) => !f.internalOnly));
  test('brandSafeFindings removes at least the internal findings', bi.brandSafeFindings(findings).length < findings.length);
  const summary = bi.intelligenceSummary();
  test('the intelligence summary counts every finding', summary.total === findings.length);
  test(
    'the intelligence summary reports the basis breakdown',
    summary.byBasis.canonical +
      summary.byBasis.simulated +
      summary.byBasis.external_research +
      summary.byBasis.ai_interpretation ===
      summary.total
  );


  /* ── I. The Control Centre model ───────────────────────────────────────── */
  const model = cc.buildControlCentre();
  // §Foundation increment — REPOINTED: this previously asserted 9 Control Centre
  // sections. The canonical section list now declares 10 (the Phase 2 routing /
  // commercial-readiness view was added). The old contract (9) is recorded here;
  // the assertion now reads the canonical section list.
  test('the Control Centre declares ten views', cc.CONTROL_CENTRE_SECTIONS.length === 10, String(cc.CONTROL_CENTRE_SECTIONS.length));
  test(
    'every view has metrics with a real drill-down destination',
    cc.CONTROL_CENTRE_SECTIONS.every(
      (s) => model.metrics[s.id].length > 0 && model.metrics[s.id].every((m) => Boolean(m.destination))
    )
  );
  test(
    'the Control Centre reports the real brand count',
    model.counts.brands === demo.demoBrands.length,
    `${model.counts.brands} vs ${demo.demoBrands.length}`
  );
  test(
    'the Control Centre reports the real open work count',
    model.counts.openWork === work.getWorkItems('admin', null).length
  );
  test(
    'the Control Centre automation figures come from the run ledger',
    model.automationSummary.declared === reg.AUTOMATION_ORDER.length &&
      model.automationSummary.totalRuns === reg.automationRuns().length
  );
  test('the Control Centre states the AI state truthfully', model.ai.state === client.aiAvailability().state);
  test(
    'attention items reference real canonical objects',
    // §Foundation increment — REPOINTED: the allowed source list omitted
    // `commercial_readiness`, which the Phase 2 routing/commercial-readiness view
    // genuinely contributes. The assertion now reads the canonical sources the
    // Control Centre actually derives (verified: work_item, commercial_readiness,
    // automation_approval, automation_run).
    model.attention.every((a) =>
      ['work_item', 'automation_approval', 'automation_run', 'commercial_readiness'].includes(a.source)
    )
  );
  test(
    'the automation catalogue exposes the declared scheduler seam',
    model.scheduler.usesTimer === false &&
      model.scheduler.costUsd === 0 &&
      model.scheduler.newDependencies.length === 0
  );
  test(
    'every optional dependency is declared NOT required for core operations',
    model.dependencies.every((d) => d.requiredForCoreOperations === false && d.degradation.length > 0)
  );
  test(
    'an unregistered/unsafe provider is never reported simulation-safe',
    model.dependencies.every((d) => (d.simulationSafe ? d.mode === 'simulation' : true))
  );

  /* ── J. Tenant isolation ───────────────────────────────────────────────── */
  const brandA = work.getWorkItems('brand', 'brand-a');
  const brandB = work.getWorkItems('brand', 'brand-b');
  test('brand work is tenant-filtered', brandA.every((w) => w.tenantId === 'brand-a'));
  test('Brand B sees none of Brand A', brandB.every((w) => w.tenantId === 'brand-b'));
  test(
    'the Control Centre module contains no brand-scope accessor',
    !/getWorkItems\(\s*'brand'/.test(fsMod.readFileSync('src/lib/commandCentre/controlCentre.ts', 'utf8'))
  );
  test(
    'the Control Centre is guarded Super-Admin-only in the shell',
    fsMod
      .readFileSync('src/components/layout/AdminShell.tsx', 'utf8')
      .includes("adminView === 'control_centre' && (isSuper ?")
  );

  /* ── K. Deterministic repeatability (reset → identical result) ─────────── */
  const runOnce = () => {
    reg.resetAutomationStore();
    work.resetWorkStore();
    const runs = reg.runAllAutomations('test:validator');
    return runs.map((r) => `${r.automationId}:${r.status}:${r.evaluated}:${r.escalated}`).join('|');
  };
  const pass1 = runOnce();
  const pass2 = runOnce();
  test('a reset + re-run produces an identical automation result', pass1 === pass2);
  const cc1 = cc.buildControlCentre();
  test(
    'the Control Centre re-derives identically after a reset',
    cc1.counts.openWork === work.getWorkItems('admin', null).length && cc1.counts.brands === demo.demoBrands.length
  );
  test(
    'a second execution does not duplicate idempotent actions',
    (() => {
      const a = reg.runAutomation('reminder_sweep', { actor: 'test:validator' });
      const b = reg.runAutomation('reminder_sweep', { actor: 'test:validator' });
      return a.status !== 'failed' && b.status === 'duplicate_suppressed';
    })()
  );

  console.log('\n-- automation summary --');
  console.log(JSON.stringify(reg.automationSummary(), null, 2));
  console.log('-- acquisition --');
  console.log(
    `  total ${pipeline.total} · active ${pipeline.active} · activated brands ${pipeline.activatedBrands} · follow-ups overdue ${pipeline.followUpsOverdue} · awaiting approval ${pipeline.awaitingApproval} · duplicates ${pipeline.duplicates.length}`
  );
  console.log('-- intelligence --');
  console.log(`  findings ${summary.total} (critical ${summary.critical}, important ${summary.important}) · canonical ${summary.byBasis.canonical}`);
  console.log('-- control centre --');
  console.log(`  ${cc.CONTROL_CENTRE_SECTIONS.map((s) => `${s.label}:${model.metrics[s.id].length}`).join(' · ')}`);
  console.log(`-- network calls during validation: ${networkCalls} --`);

  globalThis.fetch = originalFetch;
  console.log(
    failures === 0 ? 'FOUNDER_OPERATING_SYSTEM_VALIDATION_PASS' : `FOUNDER_OPERATING_SYSTEM_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);

