# DEFECT REMEDIATION — FIX AT SOURCE, NEVER MIRROR, NEVER ONLY REPORT

**Authority:** the global rule `07-fix-defects-at-source.md` (identical in `~/.cline/rules/` and
`~/Documents/Cline/Rules/`, sha256 `d2272d1c144993e4f7ed9acf10f3352733ddc1ea6a3f7e334dca45da39f020f5`) states the
rule for every project. This file records that it applies here, **with full force**, and what it cost to learn.

## The failure this file exists for (2026-09-27, session 40)

While building the Batch 1a integration helpers I found a real defect in `src/lib/dhl/mockClient.ts`: the simulated
customs exception did not hold the milestone, so its "retry recovered" branch was **unreachable** — a simulated
customs hold could never be cleared. I **mirrored that defect** into the new helper (calling it "parity") and
**reported it as a known exception** instead of fixing it. The Founder rejected that, correctly: **parity is with the
INTENDED behaviour, and a known defect is fixed in both places.**

## The rule as it binds this project

1. **Fix every defect at its source in the same session.** Code, config, comment, doc, plan, citation, count, status
   line — whichever holds the defect.
2. **Never mirror a defect for parity.** Fix the reference AND the mirror, then prove the FIXED behaviour.
3. **Never park a fixable defect** in "known exceptions", "honest limits", "recorded for later" or a follow-up list.
4. **Every fix carries a gate that fails if the defect returns**, proved able to fail (mutate → observe failure →
   restore byte-identical → record the hashes).
5. **BLOCKED is the only alternative**, and it must name the exact missing input/authority + the exact next action,
   and must never describe the affected behaviour as working.
6. **A report may only mark a defect FIXED (with evidence) or BLOCKED (with the missing input).**
   "Recorded", "noted", "documented" are NOT dispositions.

## Scope guards are never a reason to leave a defect

- `scripts/validate-e6-brand-surfaces.mjs` F6 refuses a working-tree change outside the declared phase surface. The
  fix is to **declare the surface** (a documented, reviewable act) — never to skip the fix.
- The genuinely **PROTECTED** paths in that guard (`src/lib/spapi/client.ts`, `src/lib/dhl/client.ts`,
  `src/services/xero/`, `src/lib/billing/invoice.ts`, `supabase/migrations/`, `scripts/deploy`, `deploy/`) are a
  real hard stop: raise it with the Founder and record it as BLOCKED, with the exact change that is waiting.

## Fixed defects (this project, evidence in the gates)

| Defect | Disposition | Gate |
|---|---|---|
| `src/lib/dhl/mockClient.ts` — customs exception did not hold the milestone, so the retry branch was unreachable (mirrored into the new helper) | **FIXED at source** (mock + mirror) | `validate-integration-proxy` asserts the exception is CLEARED by the next poll in the EXECUTED helper, and pins the hold in the MOCK source; both proved able to fail (1 failure each), both files restored byte-identical |
| `docs/NEXT_BUILD_PLAN_2026-09-27.md` — Palletline described as 4 routes, `/cancel` omitted | **FIXED** (5 routes named; the gate derives them from the client source) | `validate-integration-proxy` coverage: 5 Palletline routes derived |
| `docs/NEXT_BUILD_PLAN_2026-09-27.md`, `PROJECT_STATUS.md`, `IntegrationsContext.tsx`, registry note — described `supabase/migrations/0002_integration_connections.sql` as existing | **FIXED** at every live citation (the historical session log in `STATUS_CHECK.md` is preserved verbatim by design) | the corrected text names the truth; the migration itself is Batch 1b work (BLOCKED-by-absence, not an exception) |
| My own report claimed `PRODUCTION_READINESS.md` cited that migration | **FIXED** (it never did) | corrected in `PROJECT_STATUS.md` and the registry |
