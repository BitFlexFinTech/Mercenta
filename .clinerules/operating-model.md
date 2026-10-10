# MERCENTA OPERATING MODEL — CANONICAL (2026-09-21 rule migration)

> ## ⚠ PLAIN ENGLISH IS A HARD STOP IN THIS PROJECT (installed 2026-09-29)
> **Every message to the Founder — answer, report, plan, question or set of options — must obey
> `.clinerules/plain-english-responses.md`:** lead with the plain answer, explain every technical word
> in the same sentence, and state what each choice changes in money, time or risk (and what happens if
> nothing is done) **before** offering it. **An unexplained technical word is a FAILED task, not a
> style slip**, and it outranks every brevity or budget instruction in any other file — including
> mid-task, on deeply technical work. `npm run validate:plain-english` fails the build if the rule is
> missing from any location the assistant reads or the copies drift apart.

> **Status: ACTIVE — the canonical operating model for Mercenta development.**
> Established 2026-09-21 by explicit Founder decision, replacing stale historical workflow gates.
> **§10 is the ONE COMPLETION CONTRACT (three-way synchronization: local runtime = GitHub committed state =
> `https://demo.mercenta.co.uk`) and §11 is the mandatory status vocabulary. Both were added 2026-09-22 by Founder
> directive and are permanent; no session may reinterpret them, and no other file may weaken them.**
> **§12 (added 2026-09-23 by Founder directive) is the CHAT-IS-NOT-PROJECT-MEMORY rule: the mandatory task-close
> sequence (implement → test → fix → verify → update state → commit → push → deploy → verify live → record resume
> point) and the canonical `CURRENT RESUME STATE` block in `PROJECT_STATUS.md` that lets a brand-new chat resume with
> no transcript. It is permanent, and the push is now part of closing a task rather than a separate instruction.**
> Where this file conflicts with any other rule file, sprint document, handoff, transcript or archive (including
> `Mercenta Build 1.rtf`, `MASTER_CHATGPT_HANDOFF.md`, `MERCENTA_MASTER_CONTEXT.md`, the `STATUS_CHECK.md` history log
> and any `docs/` sprint record), **the current Founder directive and this file win.**
> Genuine safety, security, legal, credential and destructive-data hard stops are NOT relaxed by this file (§7).

## 1. Authority order

1. The CURRENT Founder execution directive for this session.
2. This file — the canonical operating model. **Its §5 (COMMIT/DEPLOY), §10 (the completion contract) and §11 (the
   status vocabulary) are the single authoritative completion semantics for this project.**
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
- **"push only when the Founder instructs it"** — RETIRED 2026-09-23 by Founder directive. Replaced by §12: the
  mandatory task-close sequence PUSHES the verified checkpoint to GitHub as part of closing the task. The Founder no
  longer has to ask for a push. Still forbidden: `git push --force`, and pushing an unverified tree (§5).
- **"the previous chat is where the project's memory lives" / "ask the user what happened last time"** — RETIRED
  2026-09-23 by Founder directive. Replaced by §12: **CHAT IS NOT PROJECT MEMORY.** The repository is the memory; a new
  session resumes from `PROJECT_STATUS.md → CURRENT RESUME STATE` without the transcript.
- **"deployment is only ever a separate, later, manual step"** — SUPERSEDED 2026-09-23 for PRODUCT work by §12: the
  task-close sequence deploys to `https://demo.mercenta.co.uk` and verifies it live. Deployment remains NOT APPLICABLE
  for governance/documentation-only increments (§10.4), and the live domain `mercenta.co.uk` remains forbidden until
  the `GO_LIVE.md` playbook is executed.

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
  patterns — across admin, brand and Logistics surfaces (§BATCH 4, 2026-10-10: the Brain surface was removed, so it is
  no longer named here).
- Preserved regardless of presentation: business logic, domain logic, security, RBAC, tenant boundaries, data
  contracts, workflow semantics, integrations, persistence and business rules.
- The existing ink/brass system and `docs/DESIGN_SYSTEM.md` MAY be reused where appropriate — they are NOT a freeze,
  and they are never a reason to keep an obsolete composition.
- Governing quality bar: a mature enterprise B2B platform (clear hierarchy, appropriate density, meaningful status
  systems, keyboard/ARIA accessibility, honest empty/loading/error states) — not merely new colours or gradients.

## 5. COMMIT and DEPLOY — the canonical definitions

**COMMIT = VERIFIED RUNTIME CHECKPOINT.** Not merely a successful `git commit`. A commit counts as a VERIFIED
COMMITTED CHECKPOINT only when ALL of the following are true:
1. the implementation is complete for the scoped increment (**implementation-complete ≠ COMPLETE — see §10**);
2. it is integrated into the actual application (not a detached module, not a fixture, not a stub);
3. relevant automated tests pass;
4. relevant browser/runtime verification passes;
5. the committed state CONTAINS the implemented change;
6. the committed tree is re-run/re-verified locally after the commit;
7. `npm run dev` from that committed state presents the completed implementation;
8. the relevant user-facing functionality works from that committed state; and
9. **the commit hash is recorded** in the project-state sources.
A commit holding incomplete, unverified or disconnected code is NOT a delivery. Never call a plain Git commit
"complete" — see §10 for what COMPLETE actually requires.

**DEPLOY = VERIFIED LIVE RUNTIME DELIVERY.** Not merely a successful upload, script run, CI job, HTTP 200 or a
reachable URL. A deployment counts only when:
1. the VERIFIED COMMITTED implementation is what was deployed;
2. the deployment corresponds to the recorded verified commit (no uncommitted edits shipped);
3. `https://demo.mercenta.co.uk` is opened;
4. the changed implementation is visibly/functionally verified ON the live site;
5. relevant live browser/runtime checks are performed;
6. the live implementation is confirmed to correspond to the verified committed implementation; and
7. no stale build/version is being mistaken for the current implementation.

**MANDATORY DELIVERY CHAIN** (for product work — §10 governs when it may be called COMPLETE):

```
IMPLEMENT → INTEGRATE → TEST → FIX → VERIFY LOCAL → COMMIT
→ PUSH TO GITHUB → VERIFY COMMITTED LOCAL VERSION → DEPLOY → OPEN LIVE DEMO
→ VERIFY LIVE IMPLEMENTATION → CONFIRM LOCAL/GITHUB/DEMO SYNCHRONIZATION
→ UPDATE PROJECT STATE → RECORD NEXT STARTING POINT → COMPLETE
```

§12 defines this same chain as the **mandatory task-close procedure** and adds the
project-state + resume-state steps; it is executed automatically at the end of every
task without the Founder asking.

**PUSH = THE GITHUB LEG, PART OF CLOSING A TASK.** Since 2026-09-23 a push is not a
separate favour the Founder must request: closing a verified task means pushing its
verified commit to the branch in `origin`. It does NOT relax §5's rule that only a
VERIFIED commit is pushed, and it never means `--force`.

Never report "complete" at the commit stage when deployment was required; never report "deployed" before the live
site has been verified; **never skip the live-verification stage when declaring product work complete** (§10).

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
- Commit your own VERIFIED work as the checkpoint, then **PUSH it** — since the 2026-09-23 directive the push is part of
  closing a task, not a separate instruction the Founder must give (§5, §12). A push that cannot happen (no remote
  access, credential refusal) is recorded as a blocker in the resume state; it is never silently skipped.
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
- **Before reporting the session finished, assert the invariant:** `git status --porcelain` must print NOTHING.
  A session may legitimately END at a **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE** (§11.1) when
  deployment is not authorised; what it may never do is call product work COMPLETE without the §10 demo leg.
  If it prints anything, reconcile it — do not report completion.
- Deployment only via `scripts/deploy-demo.sh`, only to `demo.mercenta.co.uk`, never to `mercenta.co.uk` before the
  `GO_LIVE.md` playbook is executed.

## 10. THE COMPLETION CONTRACT — THREE-WAY SYNCHRONIZATION (added 2026-09-22 by Founder directive)

> **This section is the ONE completion contract for Mercenta product/application work. It is permanent and
> non-negotiable, and a new session MUST NOT reinterpret it.** It is placed here, in the canonical rule file
> (authority #2 in §1), deliberately — not in a handoff, a sprint document or a chat prompt.

### 10.1 The primary rule

**For Mercenta application/product work, COMPLETE means the verified implementation is synchronized across
local runtime, the verified GitHub committed state, and `https://demo.mercenta.co.uk`; if any one is not verified,
the work is NOT COMPLETE.**

The required state is exactly:

```
LOCAL RUNTIME  =  GITHUB COMMITTED STATE  =  DEMO.MERCENTA.CO.UK
```

All three must represent the SAME verified implementation. This applies to every task, feature, phase, wave,
workstream, redesign, bug fix, integration and milestone. If any one of the three is incomplete, stale, divergent,
unavailable or unverified:

**THE PRODUCT WORK IS NOT COMPLETE.**

### 10.2 What COMPLETE requires — all three, verified

**LOCAL**
- the implementation works locally;
- relevant automated tests pass;
- browser/runtime verification passes;
- the committed state itself has been re-verified locally (`npm run dev` from that state).

**GITHUB (the verified committed repository)**
- the implementation is committed;
- **the commit hash is recorded** in the project-state sources;
- the committed state is re-verified after the commit;
- `git status --porcelain` is EMPTY.

**DEMO (`https://demo.mercenta.co.uk`)**
- the verified commit is deployed through `scripts/deploy-demo.sh` (the only deploy path);
- the live site is OPENED;
- the changed functionality is verified live;
- the live implementation is confirmed to MATCH the verified commit.

Only when all three hold may the work be reported as:

**COMPLETE — LOCAL/GITHUB/DEMO SYNCHRONIZED** (equivalently: **COMPLETE — THREE-WAY SYNCHRONIZATION VERIFIED**).

### 10.3 Local-only, GitHub-only or live-only work is never complete

- **Local-only** (code works, tests pass, nothing committed, nothing deployed) → NOT COMPLETE.
- **GitHub-only** (committed and pushed, never deployed, never opened live) → NOT COMPLETE.
- **Live-only** (something is live but the verified commit is unknown, divergent, or the local/committed state does
  not contain it) → NOT COMPLETE.
- **"Deployed" by command alone** (script ran, files uploaded, URL returns HTTP 200, site reachable) → NOT DEPLOYED
  under §5, and therefore NOT COMPLETE.

### 10.4 Scope of this gate

This gate governs **application/product work** (anything that changes what a user can see or do, or that changes
product behaviour, data, permissions, integrations, security or infrastructure).

It does **not** require deploying internal Cline governance files (`.clinerules/**`) or project-state documentation
(`PROJECT_STATUS.md`, `HANDOFF.md`, `requirements-registry.json`, `docs/**`) to the demo host — those are not
application runtime artefacts. A governance-only or documentation-only increment may therefore be reported as a
**VERIFIED COMMITTED CHECKPOINT** with the three-way status recorded as **NOT APPLICABLE (no application runtime
change)**.

**This distinction must never be used to weaken the three-way rule for actual product work.** If an increment
changes application runtime behaviour, the three-way gate applies in full.

## 11. COMPLETION STATUS VOCABULARY, FORBIDDEN CLAIMS, AND DEPLOYMENT AUTHORITY

### 11.1 The standard status phrases (use these — never collapse them into "complete")

| Situation | The ONLY permitted status phrase |
|---|---|
| Local + committed verification done, demo deployment NOT done | **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE** |
| Deploy command succeeded, live verification NOT done | **DEPLOYMENT EXECUTED — LIVE VERIFICATION PENDING — NOT COMPLETE** |
| Live verification shows the deployed build differs from the verified commit | **DEPLOYMENT DIVERGENCE — NOT COMPLETE** |
| All three environments match and are verified | **COMPLETE — LOCAL/GITHUB/DEMO SYNCHRONIZED** |
| Governance/documentation-only increment (no application runtime change) | **VERIFIED COMMITTED CHECKPOINT — THREE-WAY NOT APPLICABLE (no application runtime change)** |

### 11.2 Forbidden claims

Do NOT report a product task as **COMPLETE · DONE · FINISHED · FULLY IMPLEMENTED · DEPLOYED · LIVE · PRODUCTION
READY** when any of these is the only thing that is true: local implementation exists; tests pass; a Git commit
exists; GitHub contains the commit; a deploy command succeeded; files were uploaded; the live URL returns HTTP 200;
the live site is merely reachable.

If the changed functionality has not been verified live, the work is **NOT COMPLETE** and must be reported with the
§11.1 phrase that matches reality.

### 11.3 Deployment authority vs completion status — the reconciliation

Two separate questions. Never conflate them:

1. **May a deployment action be executed?** — governed by the project's protection rules: deploy only when the
   current Founder directive authorises it, only via `scripts/deploy-demo.sh`, only to `demo.mercenta.co.uk`, never
   to `mercenta.co.uk` before the `GO_LIVE.md` playbook is executed. This gate is unchanged and must not be bypassed.
2. **May the work be called COMPLETE?** — governed by §10, independently of (1).

Therefore:

- **Deployment authorised** → execute the established deploy process, OPEN the live demo, VERIFY the changed
  functionality live, CONFIRM local/GitHub/demo synchronization, then — and only then — report
  **COMPLETE — LOCAL/GITHUB/DEMO SYNCHRONIZED**.
- **Deployment NOT authorised (or no credential available)** → report
  **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE**, state plainly that demo deployment and live verification
  have not happened, and DO NOT claim completion or deployment.

"Deployment requires Founder instruction" is **never** permission to call an implementation complete before
deployment and live verification. It only means the completion contract's third leg is **pending**, and the status
language in §11.1 must say so.

### 11.4 Where this contract is mirrored (so it cannot be missed)

- `.clinerules/protection-rules.md` — the deployment/authority rules carry the completion cross-reference.
- `.clinerules/project-state-contract.md` — the five project-state sources must use the §11.1 vocabulary and must
  record the three-way status.
- `PROJECT_STATUS.md` / `HANDOFF.md` — every session's report must state the three-way status explicitly.

Any of those files, or any sprint document, handoff, transcript or archive that states something weaker or

---

## 12. CHAT IS NOT PROJECT MEMORY — THE MANDATORY TASK-CLOSE SEQUENCE AND THE CANONICAL RESUME STATE (added 2026-09-23 by Founder directive)

> **Status: ACTIVE, permanent, and binding on every session.** This section exists because Cline was
> relying on long chat history as if it were the project's memory, which consumed context and
> credits and made resumption depend on a transcript. **A conversation is disposable.**

### 12.1 The rule

**The repository is the project's memory. A chat transcript is never required to continue work.**

- Cline MUST NEVER need the previous conversation to continue. Everything required to resume lives
  in the repository (§12.3).
- Cline MUST NOT ask the Founder to re-explain a previous conversation when the repository state
  contains the information.
- Cline MUST NOT read or reconstruct the full project history to answer "where were we" — it reads
  the minimum (§12.5).

### 12.2 The mandatory task-close procedure (automatic, every task, product or governance)

At the end of EVERY task, without the Founder asking, Cline executes:

```
IMPLEMENT → TEST → FIX → VERIFY LOCAL → UPDATE PROJECT STATE → COMMIT
→ PUSH TO GITHUB → DEPLOY TO DEMO → OPEN LIVE DEMO → VERIFY LIVE IMPLEMENTATION
→ VERIFY LOCAL = GITHUB = DEMO → RECORD NEXT STARTING POINT → COMPLETE
```

- Steps 8–11 (deploy, open, verify live, confirm synchronisation) apply to **application/product
  work** only. For a **governance/documentation-only increment** they are **NOT APPLICABLE
  (no application runtime change)** (§10.4) — and the final report must say so explicitly. Do not
  invent a deployment requirement for a docs-only change.
- Steps 5 and 12 (`UPDATE PROJECT STATE`, `RECORD NEXT STARTING POINT`) are never optional: they are
  what make the next chat possible (§12.3).
- If any step genuinely cannot be completed (see §12.6), the task is **BLOCKED**, not complete: stop,
  record the exact blocker and the exact next action, and leave a clean resumable tree.

### 12.3 The canonical resume state (the ONLY thing a new session needs)

The canonical project-state source is **`PROJECT_STATUS.md`**, whose **first section** must always be
the machine-readable block below, kept CONCISE (values, not narrative). The five synchronised sources
must agree with it (`.clinerules/project-state-contract.md`).

```
## CURRENT RESUME STATE
LAST COMPLETED TASK:      <one line>
CURRENT VERIFIED STATE:   <the §11.1 status phrase>
CURRENT BRANCH:           <branch>
LAST VERIFIED COMMIT:     <hash + subject>
GITHUB PUSH:              <pushed to origin/<branch> at <hash> | NOT PUSHED — <reason>>
DEMO DEPLOYMENT:          <deployed at <commit> | NOT APPLICABLE (docs-only) | NOT DEPLOYED — <reason>>
LIVE VERIFICATION:        <verified what, where | NOT VERIFIED — <reason>>
OUTSTANDING BLOCKER:      <none | exact blocker>
NEXT TASK:                <one line>
EXACT NEXT STARTING POINT:<file(s)/command to start from>
```

- `HANDOFF.md` mirrors the same block (same values, short) and must not contradict it.
- A session may NOT close a task while this block is stale, missing a field, or describes a dirty
  tree. `STATUS_CHECK.md` and `requirements-registry.json` follow the same state.
- This block replaces the need for a narrative handoff. **Never create a second, competing
  memory/resume system** (no new "CONTINUE_HERE.md", no copied transcripts, no duplicated history).

### 12.4 Why this exists (the behaviour it forbids)

- Do not use the chat transcript as the project's memory.
- Do not duplicate project history across documents.
- Do not copy previous reports into new documents to "preserve context".
- Do not repeatedly rewrite unchanged documentation.
- Do not perform broad repository audits when the current task is already known.

### 12.5 Resume procedure — the Founder says "continue, where you left off"

Cline MUST, in this order and with NO reference to the previous chat:

1. Read the permanent rules (`.clinerules/operating-model.md`, `protection-rules.md`,
   `project-state-contract.md`, `mercenta-business-model.md`).
2. Read **`PROJECT_STATUS.md` → `CURRENT RESUME STATE`** only (the first screen of the file — do not
   read the 8,000-line history).
3. `git --no-pager log --oneline -5`, `git status --porcelain`, `git remote -v`.
4. Take `NEXT TASK` + `EXACT NEXT STARTING POINT` as the task, and open ONLY the files that starting
   point names.
5. Continue from there. If the resume state and the repository disagree, the repository wins and the
   resume state is corrected first (that discrepancy is itself the finding to report).

### 12.6 Blocked tasks (the only way a close-out step may be skipped)

If a step cannot be completed — missing authorisation, deployment restriction, failing test,
environment problem, credential requirement, security restriction, or any other legitimate blocker —
Cline MUST: (1) stop rather than claim completion; (2) record the exact blocker; (3) record what has
already been verified; (4) record the exact next action; (5) leave the repository clean and resumable
(tree empty, commit made, resume state updated).

**No previous chat is ever required to continue from that blocker.**

different is **superseded by this section**.