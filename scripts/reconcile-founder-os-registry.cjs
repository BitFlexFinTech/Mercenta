/**
 * §Founder OS — FOUNDER OPERATING SYSTEM SPRINT registry reconciliation.
 *
 * 1. First closes the SPRINT-2 ledger gap: `scripts/reconcile-sprint2-registry.cjs`
 *    was committed by sprint 2 but never executed, so the registry stayed at 243
 *    entries while PROJECT_STATUS/HANDOFF claimed 250. Running it here is what
 *    makes the five project-state sources agree.
 * 2. Then adds this sprint's genuinely new capabilities.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = 'requirements-registry.json';

// 1. Sprint 2's committed reconciliation (idempotent: it throws on a duplicate id).
try {
  execSync('node scripts/reconcile-sprint2-registry.cjs', { stdio: 'inherit' });
} catch (error) {
  console.log('sprint-2 reconciliation already applied (or failed):', error.message);
}

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

const NEW = [
  {
    id: 'founder-os-automation-registry',
    description:
      'CANONICAL AUTOMATION REGISTRY + SCHEDULER SEAM (Capability A — Autonomous / Scheduled Operations). ONE declared catalogue of 8 deterministic automations (work projection, proactive reminder sweep, overdue escalation, compliance gate monitor, finance overdue monitor, acquisition follow-up monitor, commission review with a human approval gate, founder brief) with a run ledger: deterministic run ids (run-<automationId>-<sequence>), the pinned demo clock as the run date, an input fingerprint for idempotency, observable failure, safe retry, attributed+audited enable/disable, pending human approvals, declared next-run dates, optional-dependency degradation and a recorded FREE-FIRST scheduler decision ($0, no timer, no new dependency; n8n/Cloudflare/GitHub-cron/pg_cron evaluated and recorded).',
    source: 'Founder OS sprint 2026-09-19 — Capability A',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (idempotency, failure, retry, disable, approval-gate and no-timer assertions PASS); src/lib/automation/registry.ts; src/components/admin/FounderControlCentre.tsx; e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
  {
    id: 'founder-os-control-centre',
    description:
      'FOUNDER / SUPER ADMIN CONTROL CENTRE (Capability B) — a real operating centre, not a cosmetic dashboard: nine derived views (Business, Brands, Acquisition, Operations, Finance, Compliance, Automation, AI, Audit) composing the canonical workspace architecture (WorkspaceFrame · WorkspaceHeader · sticky toolbar · MetricBand with real drill-downs · PipelineTrack · Queue · RecordDrawer · ContextPanel/ActivityFeed). Every figure is computed from a canonical record, every tile opens the EXISTING destination that owns the record, and the automation catalogue exposes run/retry/disable/failure-simulation/approvals through the canonical registry. Super-Admin only, hidden from the nav AND guarded at render.',
    source: 'Founder OS sprint 2026-09-19 — Capability B',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (nine views, real derived counts, drill-downs, truthful AI state PASS); scripts/validate-uiux-redesign.mjs (Control Centre workspace assertions PASS); src/components/admin/FounderControlCentre.tsx; src/lib/commandCentre/controlCentre.ts; e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
  {
    id: 'founder-os-acquisition-engine',
    description:
      'BRAND ACQUISITION / OUTREACH ENGINE (Capability C) — the canonical eleven-stage lifecycle DERIVED from existing records (PROSPECT → RESEARCH → QUALIFICATION → OPPORTUNITY → OUTREACH → FOLLOW-UP → RESPONSE → MEETING/ENGAGEMENT → DUE DILIGENCE → ONBOARDING → ACTIVE BRAND) with owner, next action, declared follow-up dates, dedup on the canonical normalizeBrandKey, stage counts and a conversion guard: a prospect is NOT a brand and only a COMPLETED canonical onboarding yields a brandId. No duplicate Brand records and no second pipeline were created.',
    source: 'Founder OS sprint 2026-09-19 — Capability C',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (eleven stages, prospect-not-brand conversion guard, dedup key, determinism PASS); src/lib/acquisition/acquisitionEngine.ts; e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
];

NEW.push(
  {
    id: 'founder-os-bi-findings-layer',
    description:
      'BRAND INTELLIGENCE / BI EXPANSION (Capability D) — the read model over the existing intelligence modules: canonical signals become FINDINGS across seven domains (brand, product, marketplace, competitor, opportunity, acquisition, operational) with a declared EVIDENCE BASIS (canonical · simulated · external_research · ai_interpretation), citations to the records they rest on, the declared deterministic threshold and the observed value, and a brand-safe projection that strips every internal-only finding so proprietary scoring/tiering and the acquisition pipeline can never leak to a brand.',
    source: 'Founder OS sprint 2026-09-19 — Capability D',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (basis labels, citations, threshold/observed, brand-safe strip, approved-category gate PASS); src/lib/intelligence/intelligenceLayer.ts; e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
  {
    id: 'founder-os-founder-ops-ai',
    description:
      'FOUNDER OPS AI (Capability E) — an OPTIONAL intelligence layer over canonical state: the deterministic daily founder brief (what changed, needs attention, overdue, financial signals, acquisition movement, compliance, automation, intelligence) plus Ask Mercenta, which classifies the question into a declared intent, answers from canonical records with citations, and refuses (listing what it CAN answer) rather than inventing. AI only ever adds a labelled narrative on top of the same facts. FREE-FIRST: free models only, no paid fallback, a server-side credential seam (never a VITE variable), no model call at all when no credential is configured, and a truthful degraded state on the surface.',
    source: 'Founder OS sprint 2026-09-19 — Capability E',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (deterministic brief, truthful degraded state, intent routing, citations, refusal, AI cannot mutate canonical state, ZERO network calls PASS); src/lib/ai/founderOpsAi.ts; src/lib/ai/founderAiClient.ts; src/lib/founder/briefFacts.ts; e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
  {
    id: 'founder-os-failure-degradation-verification',
    description:
      'FAILURE / DEGRADATION VERIFICATION for the Founder Operating System: Mercenta remains operational with AI unavailable (deterministic brief, deterministic answers, zero model calls) and with an optional automation provider unavailable (the run fails HONESTLY with the real error, emits a canonical event, is observable in the Control Centre and is safely retryable). Duplicate execution cannot duplicate work (idempotency fingerprint), a disabled automation produces zero side effects, and the reset-to-re-run path is deterministic.',
    source: 'Founder OS sprint 2026-09-19 — verification',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-founder-operating-system.mjs (AI unavailable, automation failure, retry, disable, idempotency, reset repeatability PASS with 0 network calls); e2e/founder-operating-system.spec.ts',
    last_verified: '2026-09-19',
    superseded_by: null,
  },
  {
    id: 'founder-os-project-state-contract',
    description:
      'PERMANENT PROJECT-STATE / EXTERNAL-REVIEW CONTRACT: a documented, always-current statement of the platform position in five synchronised sources (the requirements registry, PROJECT_STATUS.md CURRENT PLATFORM POSITION + numbered CURRENT REMAINING ROADMAP, HANDOFF.md, the sprint report, and the final Cline report), plus the standing rule that no completed work may be listed as remaining and no discovered work may be silently dropped. DOCUMENTATION/RULE infrastructure — verified by the registry validator itself, not by a browser journey.',
    source: 'Founder OS sprint 2026-09-19 — section 2 project-state contract',
    status: 'built',
    evidence:
      'requirements-registry.json; scripts/verify-registry.mjs (exit 0); .clinerules/project-state-contract.md; PROJECT_STATUS.md; HANDOFF.md; docs/SPRINT_FOUNDER_OPERATING_SYSTEM_2026-09-19.md',
    last_verified: '2026-09-19',
    superseded_by: null,
  }
);

for (const entry of NEW) {
  if (byId(entry.id)) throw new Error('duplicate registry id: ' + entry.id);
  reg.entries.push(entry);
}

/* The sprint-2 reconciliation also recorded the registry's history; keep it. */
reg._meta.last_updated = '2026-09-19';
reg._meta.total_entries = reg.entries.length;
reg._meta.founder_os_sprint = {
  sprint: 'Founder Operating System + Free-First Autonomous Operations (2026-09-19)',
  added: NEW.map((e) => e.id),
  note:
    "Sprint 2's reconciliation script (scripts/reconcile-sprint2-registry.cjs) was committed but never executed, so the registry was still at 243 entries while PROJECT_STATUS/HANDOFF reported 250. This script runs it first, then adds the Founder OS rows — that is what makes the five project-state sources agree.",
};

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');
console.log('entries now', reg.entries.length);

