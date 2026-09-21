# MERCENTA OPERATING MODEL — CANONICAL (2026-09-21 rule migration)

> **Status: ACTIVE — the canonical operating model for Mercenta development.**
> Established 2026-09-21 by explicit Founder decision, replacing stale historical workflow gates.
> Where this file conflicts with any other rule file, sprint document, handoff, transcript or archive (including
> `Mercenta Build 1.rtf`, `MASTER_CHATGPT_HANDOFF.md`, `MERCENTA_MASTER_CONTEXT.md`, the `STATUS_CHECK.md` history log
> and any `docs/` sprint record), **the current Founder directive and this file win.**
> Genuine safety, security, legal, credential and destructive-data hard stops are NOT relaxed by this file (§7).

## 1. Authority order

1. The CURRENT Founder execution directive for this session.
2. This file — the canonical operating model.
3. `.clinerules/protection-rules.md` — its ACTIVE SAFETY RULES only (its retired clauses have no authority).
4. `.clinerules/project-state-contract.md` — the five synchronised project-state sources.
5. `.clinerules/mercenta-business-model.md` — business invariants; a workflow-rule migration NEVER alters these.
6. Historical documents (sprint records, handoffs, transcripts, archives) — context only, never active policy.

## 2. Rule-migration record — RETIRED gates (no authority, must never gate work again)

- **Design Freeze** — "the visual design is frozen", "must match demo.mercenta.co.uk exactly", "do not change
  CSS/Tailwind/layout/spacing/colours/fonts", "ask before making visual changes".
- **"uncommitted changes → STOP and ask whether to commit"**.
- **">3 files → STOP and wait for approval"** and **">5 files → STOP and wait for approval"**.
- **"never change architecture, add new systems, refactor or improve"**.
- **"do not commit unless explicitly told"** — superseded by §5: you commit your own VERIFIED work.
- **"a dirty worktree is not a stop — preserve Founder changes uncommitted and leave them for later"** — superseded by
  §6: a dirty tree is a state to RECONCILE AND COMMIT, never an acceptable checkpoint. This clause (not the Design
  Freeze) is what allowed 289 dirty paths to accumulate across five sessions.
- **"completion may be reported with a dirty tree / untracked required source"** — superseded by §6: completion requires
  `git status --porcelain` to be EMPTY.

Retained unchanged, because they are genuine safety rules and not workflow restrictions: see §7.

## 3. Scope authority

- A Founder directive authorises the **full scope it describes**. **File count, surface count, module count, sprint
  size and test runtime are NEVER approval gates and NEVER hard stops.**
- Multi-file, multi-system, architectural, shell/navigation/IA, component-primitive and migration work is authorised
  when the directive requires it. Where primitives are needed, build them once and migrate the surfaces to them.
- **No per-phase Founder approval.** Sequence the work internally (foundation → shell → surfaces → workflows →
  integrations → security → tests → docs) inside ONE sprint and continue through it; do not return after each phase.
- Implementation must be real: no placeholders, TODOs, no-op controls, decorative-only charts, fixture-only states or
  hidden broken functionality. A component that renders but does not perform the action it implies is a placeholder.
  Mock-first adapters remain correct ONLY for genuinely external third-party services Mercenta does not control.

## 4. UI/UX authority

- **The existing UI is NOT the visual baseline.** An authorised completion/redesign directive may replace the
  presentation layer: layout, information architecture, navigation, component structure, shell, spacing, typography,
  hierarchy, density, tables, forms, cards, drawers, empty/loading/error states, responsive behaviour and interaction
  patterns — across admin, brand, Brain and Logistics surfaces.
- Preserved regardless of presentation: business logic, domain logic, security, RBAC, tenant boundaries, data
  contracts, workflow semantics, integrations, persistence and business rules.
- The existing ink/brass system and `docs/DESIGN_SYSTEM.md` MAY be reused where appropriate — they are NOT a freeze,
  and they are never a reason to keep an obsolete composition.
- Governing quality bar: a mature enterprise B2B platform (clear hierarchy, appropriate density, meaningful status
  systems, keyboard/ARIA accessibility, honest empty/loading/error states) — not merely new colours or gradients.

## 5. COMMIT and DEPLOY — the canonical definitions

**COMMIT = VERIFIED RUNTIME CHECKPOINT.** Not merely a successful `git commit`. A commit counts only when:
1. the implementation is complete; 2. it is integrated into the actual application; 3. relevant tests pass;
4. browser/runtime verification passes where applicable; 5. the committed state contains the implemented change;
6. `npm run dev` from the resulting state starts the version containing it; 7. the Founder can open the local
application and see/use the change. A commit holding incomplete, unverified or disconnected code is NOT a delivery.

**DEPLOY = VERIFIED LIVE RUNTIME DELIVERY.** Not merely a successful upload, script run, CI job or HTTP 200. A
deployment counts only when: 1. the verified committed build was deployed; 2. the live application contains it;
3. the live application was opened and tested after deployment; 4. the changed workflows were verified on the live
host; 5. the live site reflects the same implementation that was verified locally; 6. no stale previous build is
presented as the new one.

**MANDATORY DELIVERY CHAIN** (for work the Founder has required to be delivered):
`IMPLEMENT → TEST → FIX → VERIFY LOCALLY → COMMIT → VERIFY THE LOCAL COMMITTED VERSION → DEPLOY → OPEN THE LIVE SITE
→ VERIFY THE LIVE VERSION → REPORT COMPLETE.`
Never report "complete" at the commit stage when deployment was required; never report "deployed" before the live site
has been verified.

## 6. Worktree policy — **CLEAN CANONICAL REPOSITORY IS A NON-NEGOTIABLE PROJECT INVARIANT**

> Added 2026-09-21 by Founder directive (clean-slate reconciliation), superseding the earlier "a dirty worktree is not
> a stop, preserve Founder changes and leave them uncommitted" clause. That clause was the wrong behaviour: it let
> FIVE sessions of completed, verified work (operational type scale, SEO route-metadata foundation, UK Market Fit /
> pre-audit, Founder operating system, commercial readiness) sit uncommitted for days while **289 dirty paths**
> accumulated, so no clean checkpoint ever existed.

**`git status --porcelain` MUST BE EMPTY** at every checkpoint, delivery, handoff and end of session. Not "mostly
clean", not "known dirty paths", not "we can clean it later".

```
DIRTY TREE
→ RECONCILE → FIX → REMOVE OBSOLETE MATERIAL → TEST → VERIFY
→ COMMIT → VERIFY THE COMMITTED HEAD → CLEAN TREE
```

- A dirty tree is permitted **only while work is actively in progress inside a session**. It is **never** an acceptable
  checkpoint, baseline, completion state or handoff state.
- **A workstream is NOT complete until `git status --porcelain` prints nothing.**
- For EVERY workstream: 1. begin from the latest clean canonical HEAD; 2. make the changes; 3. test; 4. reconcile ALL
  changes; 5. remove obsolete/unneeded material; 6. commit; 7. verify the committed HEAD independently; 8. confirm the
  tree is empty; 9. only then call the workstream complete.
- **If a task discovers PRE-EXISTING dirtiness, that is NOT acceptable.** It must be RECONCILED before the next
  canonical checkpoint: inspect every path, classify it (KEEP + COMMIT · FIX + COMMIT · CONSOLIDATE + COMMIT · REMOVE ·
  RECREATE CORRECTLY) and resolve it. **There is no sixth outcome called "leave dirty for later".**
- Preserve work because **repository evidence** shows it is required, intentional, current and part of the canonical
  product — **not merely because it is Founder work**. Unneeded material is removed whoever created it; required work
  is reconciled into Git. The objective is preservation of valid product work inside ONE CLEAN CANONICAL REPOSITORY,
  not preservation of dirtiness.
- **Generated artefacts are NEVER tracked.** Screenshots (`test-screenshots/`, `forensic-captures/`), test reports
  (`playwright-report/`, `test-results/`, `e2e-report/`) and the review ZIP (`Review Zip/*.zip`) are reproducible
  outputs and are gitignored — see the "GENERATED ARTEFACTS" block in `.gitignore`. Tracking them made the tree dirty
  after every Playwright run.
- **Authorised at reconciliation (no separate approval step needed):** ordinary cleanup decisions — modifying required
  source, deleting obsolete/abandoned files, consolidating duplicates, repairing imports/tests/config, removing unused
  dependencies, updating docs/rules, and committing the reconciled state. File count is never a gate (§3).
- **Safety, unchanged:** no `git reset --hard`, no `git clean -fd/-fdx`, no stash-and-forget, no force push, no blanket
  wipe. Deletion must be evidence-based, never a shortcut to a clean tree, and never a way to remove working
  functionality so a validator passes. Pre-existing Founder changes are never DESTROYED — they are either REQUIRED
  (reconciled and committed) or UNNEEDED (removed, with the reason recorded in the report).
- Commit your own VERIFIED work as the checkpoint; **push only when the Founder instructs it**.
- The five synchronised project-state sources must be updated in the SAME commit
  (`.clinerules/project-state-contract.md`); never declare completion while the tree is dirty.

## 7. Genuine hard stops (the ONLY ones)

Scope size is not a hard stop. The genuine ones are:
- a credential or protected production access only the Founder can supply;
- an irreversible or destructive production action requiring explicit approval;
- a destructive Git operation required to proceed;
- a legal/business policy decision not already defined;
- activation of an external paid service requiring Founder approval that is not available to the agent;
- an external dependency that cannot be implemented safely without Founder input.

Standing safety rules that remain unchanged: never read, print, log, bundle or screenshot secrets (`/.env*` is never
read and never included in the review ZIP); never invent credentials; never claim simulated provider data is live and
never treat an UNKNOWN provider mode as simulation; never weaken, disable or delete a validator or test to make a gate
pass; never destroy history or audit records.

## 8. Evidence discipline

- Never report a task done/complete/passing unless verified in the SAME session (re-read the file, re-run the
  build/typecheck/tests, or run a validator whose PASS/FAIL output is shown).
- Report each stage as BUILT · TESTED · RESULT · NEXT. Partial work is reported as partial, naming exactly what is
  missing; anything unverifiable is stated as unverified rather than implied to work.
- Never mark a test fixme/skip to hide a failure, and never edit a test merely to match broken behaviour.
- Show the exact files changed (`git diff --stat`) and the real command output relied on.

## 9. Delivery and review artefacts (unchanged)

- After every session: `bash scripts/export-review-zip.sh` → `<project root>/Review Zip/mercenta-review.zip`.
  No other zips, ever; nothing written to `~/Desktop/` directly; no numbered zips.
  The ZIP itself is a GENERATED ARTEFACT and is **gitignored** (`Review Zip/*.zip`) — never track it.
- **Before reporting the session complete, assert the invariant:** `git status --porcelain` must print NOTHING.
  If it prints anything, reconcile it — do not report completion.
- Deployment only via `scripts/deploy-demo.sh`, only to `demo.mercenta.co.uk`, never to `mercenta.co.uk` before the
  `GO_LIVE.md` playbook is executed.