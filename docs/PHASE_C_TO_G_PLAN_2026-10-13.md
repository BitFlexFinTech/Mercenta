# PHASE C → G — THE APPROVED PLAN (2026-10-13)

> **Purpose of this file.** A new chat must be able to continue the remaining work from the
> REPOSITORY ALONE, with no reference to any previous conversation
> (`.clinerules/operating-model.md` §12 — CHAT IS NOT PROJECT MEMORY).
> **Read this together with `PROJECT_STATUS.md` → `CURRENT RESUME STATE` (the canonical resume
> block) and `HANDOFF.md` (its mirror).** If they ever disagree, the resume block wins and this
> plan is corrected.

---

## 1. WHERE THE WORK STANDS — the verified checkpoint

**`CURRENT VERIFIED STATE: VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE.`**
Local HEAD = `origin/redesign/foundation` = `abd8c69`. `git status --porcelain` is EMPTY.
**NOT deployed and NOT live-verified** — the Owner has withheld deployment approval and the
remaining phases are unfinished.

### Already DONE and verified — DO NOT REPEAT

| Increment | Commit | Evidence |
|---|---|---|
| **Phase B** — five real security defects fixed at source: the browser held provider keys; the browser half of auth was missing; three Edge Functions authenticated nobody; four live docs described a removed shell; the new Edge Function had no rate-limit policy | `1b691e0` | 4 new gates, each mutation-proved. `validate:all` 191→192/0 |
| **B-closure** — the protected-path exception recorded in `.clinerules/defect-remediation.md` with the Owner's authorisation, and the guard **re-proved able to fail** | `ae4982b` | an UNDECLARED protected file made F5b FAIL; removing it → PASS |
| **Phase C — themes** — five genuinely distinct themes; `bold` is the colourful one; a real 4.5:1 CTA-contrast defect found and fixed | `3fc8653` | new `validate-theme-distinctness.mjs` (33 checks); new `e2e/theme-visual.spec.ts` (11 passed) |
| **Phase C — primitives** — Card gained theme-driven elevation (`shadow-ds-subtle`) and a `ds-title` heading; `Button` `lg` gained real hierarchy | `e13ee9e` | 25 of 30 screenshots changed |
| **Phase C4 — `DataTable`** — canonical type scale, `py-3` rows, uppercase header treatment, 16px padding | `85e31d2` | 13 of 30 screenshots changed — exactly the `DataTable` screens |

**Baselines a new chat must REUSE, not recreate:**
- `test-screenshots/themes/<theme>/<screen>.png` — 30 rendered baselines (5 themes × 6 screens:
  admin overview · admin purchase orders · admin audit log · admin integrations · brand purchase
  orders · brand compliance). **gitignored** — regenerate in ~1 min with
  `npx playwright test e2e/theme-visual.spec.ts`.
- `scripts/validate-theme-distinctness.mjs` — the arithmetic theme gate (WCAG luminance, 33 checks).
- `e2e/theme-visual.spec.ts` — the rendered theme gate (asserts the COMPUTED `--mr-accent`).

---

## 2. THE OWNER'S TWO DECISIONS (2026-10-13) — SETTLED

### D-1 · Radix and CVA — **APPROVED, WITH CONDITIONS**
May be added **where they materially improve accessibility, component consistency or variant
management**. Conditions, all binding:
- **Verify compatibility with the existing project FIRST**, and select **only the packages genuinely
  required**. Record which package and why.
- **Do not replace the existing component system**; do not rewrite components unnecessarily.
- **Preserve every existing component API, prop, behaviour, business logic, permission, tenant rule,
  database interaction and workflow.** Refactoring must be **incremental**.
- **Existing tests must continue to pass.** Never weaken, delete or rewrite a test to get a pass.

### D-2 · Typography — **14px body APPROVED, SUBJECT TO VISUAL VALIDATION**
- Move the **default body size from 13px to 14px**.
- **Evaluate against REAL screens**: dense tables, forms, dashboards, mobile layouts.
- Establish a **coherent scale with clear visual hierarchy**.
- **Do NOT blindly increase every size.** The goal is a premium, readable interface with appropriate
  information density — **not a larger interface that wastes space**.
- **Validate with rendered screenshots AND accessibility checks.**
- **If 14px causes genuine layout or density problems, document the evidence and make the smallest
  justified adjustment.**
- The scale lives in `tailwind.config.js` → `fontSize`
  (`ds-micro` 11 · `ds-label` 12 · `ds-body` 14 · `ds-title` 16 · `ds-page` 20) and is guarded by
  `scripts/validate-typography-scale.mjs` (`npm run validate:typography`, 26 assertions).
  **Repoint that gate to the new scale — never delete or weaken it.**
  **§EXECUTED 2026-10-13 (§PHASE C4):** the body step is now 14px and the title step
  16px; the gate was repointed (17 → 26 assertions) and now fails if the body step
  drops below 14px, if the title step comes within 1px of the body step, if any
  arbitrary px size inside the 11–20px range reappears, or if a live describer of
  the scale states a size the scale does not declare.

### Standing answers already given
- **`bold` stays the colourful theme** (vivid violet `#7C3AED` on a violet-black canvas).
- **Do NOT deploy** to the live site without explicit approval.
- **D3 (shareable per-record URLs): in-app navigation only.** No public per-record URLs — emailed
  links would expose tenant-scoped records outside the session.

---

## 3. NON-NEGOTIABLE GUARDRAILS

- **Preserve the existing React / Vite / Supabase architecture.** No framework migration, no
  architecture replacement.
- **Do NOT alter business rules, calculations, permissions, tenant isolation, database semantics or
  established workflows** without raising the specific proposed change for approval.
- **Respect `.clinerules/defect-remediation.md` and every protected-path rule.** The Owner's
  authorisation covers **ONLY** `src/services/xero/tokenManager.ts` in commit `1b691e0` — it is **NOT**
  blanket permission. A PROTECTED path is still a hard stop: **raise it and record it BLOCKED first.**
  `PROTECTED_PREFIXES` (`scripts/validate-e6-brand-surfaces.mjs`):
  `src/lib/intelligence/` · `src/lib/postiz/` · `src/lib/spapi/client.ts` · `src/lib/dhl/client.ts` ·
  `src/services/xero/` · `src/lib/billing/invoice.ts` · `supabase/migrations/` · `scripts/deploy` ·
  `deploy/`.
- **Do NOT expose provider secrets in browser code.** Vite INLINES every `VITE_*` value into the
  published bundle. Provider keys live in Supabase Vault only; the browser may learn a NAME and a
  BOOLEAN, never a value (`scripts/validate-no-browser-secrets.mjs` fails on a regression).
- **Do NOT deploy or perform live production operations** without explicit approval.
- **Commit and push each completed, verified increment** to `redesign/foundation`; keep the tree
  clean; keep `PROJECT_STATUS.md` and `HANDOFF.md` accurate.
- **If a genuine blocker needs the Owner's decision, state the exact decision and its consequences.**
  Otherwise continue.
- **Do not treat a progress report as completion.**

---

## 4. DEFINITION OF DONE

The work is **NOT** complete merely because tests pass or the shared components look better. It is
complete when **all** of these hold, with evidence:

1. The **entire application** has a coherent, premium-quality interface — administration, brand
   workflows, integrations, tables, forms, navigation, dashboards, detail views, empty / loading /
   error states and responsive layouts.
2. **Existing functionality remains intact** — business logic, calculations, permissions, tenant
   isolation, database behaviour, workflows.
3. The **investor can repeatedly demonstrate the key workflows end to end** using safe, deterministic
   simulated data, with a reliable reset.
4. **All registered integrations have honest, usable setup experiences**, each labelled with its true
   state (never "connected" merely because a screen exists or a credential was typed).
5. The **acceptance suite provides the evidence** — validators, typecheck, lint, build, browser tests,
   theme checks, rendered screenshots.

---

## 5. THE REMAINING WORK, PHASE BY PHASE

### C4 — FINISH THE SHARED DESIGN SYSTEM
- **Typography**: apply D-2 (14px body) and rebuild the scale with clear hierarchy; **repoint**
  `scripts/validate-typography-scale.mjs`; validate on dense tables, forms, dashboards and mobile;
  capture before/after screenshots; check contrast and density. **Do not blindly scale everything up.**
- **Radix** (per D-1): assess and add **only what is genuinely required** for real keyboard/ARIA
  behaviour where the hand-rolled version is inadequate. The primitives still needing review are
  `Modal`, `Select` and `Tabs` in `src/components/ui.tsx`. **Record each package and why it is needed.**
- **CVA** (per D-1): introduce variants **behind the existing props** — no call site may need to change.
- **One documented radius/elevation scale** (containers `xl`, controls `lg` — currently implicit).
- **Gate**: `typecheck` 0 · `lint` 0 · `build` ok · the 19 primitives' **APIs unchanged** · the 102
  consuming files still compile and render · screenshots inspected · existing tests pass.

### D — DELIVER THE APPLICATION-WIDE PREMIUM REDESIGN
- **OpenShip is a VISUAL-QUALITY BENCHMARK ONLY** — not a source of code or architecture to copy.
  (Its licence is AGPL-3.0; shadcn UI itself is MIT — **nothing is copied either way.**)
- Apply the redesign **consistently across the whole application** — administration, brand workflows,
  integrations, tables, forms, navigation, dashboards, detail views, empty / loading / error states and
  responsive layouts. **Not the six reference screens, and not just tables/buttons/cards.**
- **Address the 3,137 hardcoded dark-theme classes** and remove the **underlying need** for the
  `src/index.css` force-patch block (~lines 295–371). **Do NOT merely delete the patch and leave the
  app broken.** The sequence is: *migrate the classes → prove every theme still renders → then delete
  the patch*, with an **absence guard** so it cannot return.
- Keep the five themes genuinely distinct, accessible and consistent. **`bold` stays the colourful one.**
- **Do NOT change business logic to make a screen easier to redesign.**
- **Gate**: `validate:all` stays green · the patch's absence guard **proved able to fail** ·
  screenshots across **all five themes** on the redesigned surfaces, inspected.

### E — COMPLETE THE DETERMINISTIC INVESTOR DEMONSTRATION
- **FIRST inventory the workflows that already exist. Complete them; invent no new business rules.**
- Target journey — **validate it against the application's ACTUAL model before building**:
  **purchase order → acknowledgement → shipment milestones → delivery → invoice → payout proposal →
  human approval → simulated settlement**, plus **compliance, catalogue and integration** demos.
- Requirements, all binding:
  - **deterministic, repeatable** simulated data;
  - a **reliable reset** so the demonstration can be replayed;
  - **unmistakable** labelling when an action or result is simulated rather than real;
  - **proof that demo-mode workflows make NO live provider call and cause NO real external side
    effect** (a network-assertion spec);
  - **no fake claim** that a real order, payment, shipment or integration occurred;
  - **never bypass authorisation or tenant isolation** to make the demo work.
- **Gate**: a browser spec per workflow **plus an end-to-end journey spec** (not only isolated
  workflows) **plus a network-assertion spec**; the reset **proven repeatable**.

### F — FINISH INTEGRATION SETUP AND READINESS
- For **every provider already registered** in `src/integrations/registry.ts`: the appropriate setup
  interface, credential-entry experience, a **connection/config test where supported**, meaningful
  status, and **actionable** error handling. One-click entry points where appropriate.
- **Clearly distinguish** these five states: simulated/demo · awaiting credentials or configuration ·
  configured but not yet verified · connected and successfully verified · blocked / requiring
  implementation, provider authorization or another documented prerequisite.
- **Never represent an integration as connected merely because its setup screen exists or credentials
  were entered.**
- **Build and test the interfaces NOW.** Live third-party activation, production authorisation and
  live-provider verification are the **FINAL operational steps**, not prerequisites for finishing the
  platform or the investor demo.
- **Gate**: a per-provider spec; `validate-integration-proxy` coverage extended.

### G — COMPLETE THE ACCEPTANCE AND REGRESSION PASS
- Run the applicable **validation suite, typecheck, lint, production build, browser tests, workflow
  tests, theme checks and integration safety checks**.
- Capture **rendered screenshots across the important surfaces and themes**.
- **Fix regressions introduced by this work.** **Do NOT weaken, remove or rewrite tests simply to get a
  passing result.** If a **pre-existing** failure remains, identify it separately with evidence.
- **Then** commit → push. **Deployment only with explicit approval.**

---

## 6. EXACT NEXT STARTING POINT

1. Read `PROJECT_STATUS.md` → `CURRENT RESUME STATE` (first screen only), `HANDOFF.md`, and this file.
2. `git --no-pager log --oneline -6` · `git status --porcelain` — expect HEAD `abd8c69` and an empty tree.
3. Confirm the recorded baseline before changing anything:
   `bash scripts/validate-all.sh` (expect **192 PASS / 0 FAIL**) and
   `npx playwright test e2e/theme-visual.spec.ts` (expect **11 passed**).
4. Begin at **C4 → typography (D-2)**: `tailwind.config.js` → `fontSize` ·
   `scripts/validate-typography-scale.mjs` (repoint) · `src/components/ui.tsx` · then re-render the 30
   baselines and compare before/after.
5. Work **C4 → D → E → F → G in order, without stopping at another partial checkpoint**, reporting each
   increment as **BUILT / TESTED / RESULT / NEXT**.

**Files this plan will touch:** `tailwind.config.js` · `scripts/validate-typography-scale.mjs` ·
`src/components/ui.tsx` · `src/index.css` · `src/config/themes.ts` · `package.json` (only if D-1
packages are added) · `src/integrations/registry.ts` · `src/components/admin/integrations/` ·
`src/data/` (demo resets) · `e2e/` (new specs) · `scripts/validate-*.mjs` (new gates) ·
`PROJECT_STATUS.md` · `HANDOFF.md` · `STATUS_CHECK.md` · `requirements-registry.json` ·
`PRODUCTION_READINESS.md`.

**Nothing in this plan requires a credential, a Founder decision or a protected-path change to
proceed.** The only external requirements are the already-documented ACTIVATION items in
`PRODUCTION_READINESS.md` §PHASE B (a Supabase project · users' `app_metadata` · Vault-held provider
keys · the two webhook secrets) — all of which are the **final operational step and block nothing**.
