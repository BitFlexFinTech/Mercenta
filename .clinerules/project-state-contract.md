# PERMANENT PROJECT-STATE / EXTERNAL-REVIEW CONTRACT

Standing rule for the Mercenta Partners project. It exists so that an external
reviewer — or a future session with no memory of any conversation — can
understand the platform's CURRENT position from the repository alone.

## The five synchronised sources

These must always agree. The Master Matrix is the granular source of truth; the
others are its human-readable projections.

| Source | Role |
|---|---|
| `requirements-registry.json` (the Master Matrix) | Granular, per-capability status + evidence |
| `PROJECT_STATUS.md` | Human-readable current platform position |
| `HANDOFF.md` | Continuation/context document for the next session |
| `docs/SPRINT_*_<date>.md` | Historical record of a sprint |
| the final session report | Summary of the same state |

They must agree on: what is complete · what is incomplete · what is deferred ·
what is blocked · what is next · the current checkpoint · verification status ·
known exceptions.

## Mandatory CURRENT RESUME STATE block in PROJECT_STATUS.md (added 2026-09-23)

**`PROJECT_STATUS.md` must ALWAYS begin with a `## CURRENT RESUME STATE` block** (immediately after
the `# PROJECT_STATUS.md` title), and every one of the five sources must agree with it. It exists so
that a brand-new Cline chat can resume with **no reference to any previous conversation** — see
`.clinerules/operating-model.md` §12 (CHAT IS NOT PROJECT MEMORY).

The block is a compact FIELD LIST, never prose. It must always contain exactly these fields:

| Field | Content |
|---|---|
| `LAST COMPLETED TASK` | One line: what was finished last (product or governance) |
| `CURRENT VERIFIED STATE` | The §11.1 status phrase that is TRUE right now |
| `CURRENT BRANCH` | The branch the work is on |
| `LAST VERIFIED COMMIT` | Hash + subject of the last verified commit |
| `GITHUB PUSH` | Where it is pushed (`origin/<branch>` @ hash) or `NOT PUSHED — <reason>` |
| `DEMO DEPLOYMENT` | `deployed @ <commit>` · `NOT APPLICABLE (docs-only)` · `NOT DEPLOYED — <reason>` |
| `LIVE VERIFICATION` | What was verified on `https://demo.mercenta.co.uk`, or `NOT VERIFIED — <reason>` |
| `OUTSTANDING BLOCKER` | `none`, or the exact blocker and the exact next action |
| `NEXT TASK` | One line: the task the next session must start |
| `EXACT NEXT STARTING POINT` | The file(s)/command to open first |

Obligations:

- The block is updated **before** a task is closed (it is step 5 + step 12 of the §12.2 close
  sequence), in the SAME commit as the task's state updates where possible.
- `HANDOFF.md` mirrors the same field VALUES in a shorter form; a contradiction between the two is a
  contract violation, exactly like a dirty checkpoint.
- A session that cannot fill a field must write the honest negative (`NOT PUSHED — …`,
  `LIVE VERIFICATION: NOT VERIFIED — …`) rather than omit it.
- **A new session reads this block and nothing else from this file** before starting the recorded
  `NEXT TASK` (minimum-context rule, §12.5). The long history below it is for the external reviewer,
  not for resuming work.
- Never create a competing resume/memory document. This block, `HANDOFF.md` and
  `requirements-registry.json` are the whole memory.

## Mandatory current-state block in PROJECT_STATUS.md

`PROJECT_STATUS.md` must always contain a clearly identifiable **CURRENT PLATFORM
POSITION** block with these numbered headings:

1. COMPLETED / VERIFIED
2. IN PROGRESS
3. REMAINING — CURRENT ROADMAP
4. DEFERRED / PARKED
5. BLOCKED / DEPENDENCIES
6. KNOWN EXCEPTIONS
7. CURRENT CHECKPOINT
8. VERIFICATION STATUS
9. NEXT EXECUTION SCOPE

## Mandatory numbered remaining roadmap

There must always be a NUMBERED list of the remaining current roadmap, derived
from the Master Matrix and the actual project state (never copied from a template
and never vague).

- Completing an item → move it to completed history, remove it from the CURRENT
  list, preserve its historical record, and update the Matrix, PROJECT_STATUS and
  HANDOFF.
- Discovering work → classify it, add it to the Matrix, and place it in current
  scope / future roadmap / deferred / blocked. **Never silently drop discovered
  work. Never leave completed work falsely listed as remaining.**
- Never declare a sprint COMPLETE while a current-scope item is unfinished.

## Reconciliation before completion

Before declaring COMPLETE, verify the five sources agree (see the table above).
If they disagree, reconcile them first. This is product infrastructure, not
documentation polish.

## Completion status vocabulary — MANDATORY in all five sources (added 2026-09-22)

The authoritative completion semantics live in `.clinerules/operating-model.md`
**§5** (COMMIT / DEPLOY definitions), **§10** (the three-way completion contract:
local runtime = GitHub committed state = `https://demo.mercenta.co.uk`) and
**§11** (the status vocabulary and forbidden claims). This section does not
restate them — it makes them a PROJECT-STATE obligation:

- Every one of the five sources must state the **three-way synchronization
  status** for the current checkpoint, using ONLY these phrases:
  **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE** ·
  **DEPLOYMENT EXECUTED — LIVE VERIFICATION PENDING — NOT COMPLETE** ·
  **DEPLOYMENT DIVERGENCE — NOT COMPLETE** ·
  **COMPLETE — LOCAL/GITHUB/DEMO SYNCHRONIZED** ·
  **VERIFIED COMMITTED CHECKPOINT — THREE-WAY NOT APPLICABLE (no application
  runtime change)** (governance/documentation-only increments).
- **The current checkpoint's commit hash must be recorded** (it is part of the
  GITHUB leg of §10, not optional bookkeeping).
- A source that says "complete", "deployed", "live" or "production ready" while
  the demo leg is unverified is a **contract violation**, exactly like a source
  that describes a dirty tree as a checkpoint.
- The demo leg is **not** satisfied by a deploy command succeeding, files being
  uploaded, an HTTP 200 or a reachable URL. It is satisfied only by opening
  `https://demo.mercenta.co.uk`, exercising the changed functionality there, and
  confirming the live implementation matches the recorded verified commit.
- A governance-only or documentation-only increment (such as a rule correction)
  may be recorded as a **VERIFIED COMMITTED CHECKPOINT** with three-way status
  **NOT APPLICABLE (no application runtime change)** — this exception exists only
  for increments that change no application runtime behaviour, and never for
  product work.

## Evidence discipline (unchanged, restated here)

A claim of "done" requires evidence produced in the SAME session: a validator
that prints PASS/FAIL, a fresh grep count, real command output, a diff. A stated
path or a remembered result is never sufficient.

## The clean-tree invariant (added 2026-09-21)

**A CLEAN CANONICAL REPOSITORY IS A NON-NEGOTIABLE PROJECT INVARIANT.** See
`.clinerules/operating-model.md` §6 for the full contract.

- `git status --porcelain` must be EMPTY at every checkpoint, delivery, handoff
  and end of session. A dirty tree is permitted only while work is actively in
  progress inside a session.
- A workstream is NOT complete, and may NOT be reported complete, while the tree
  is dirty or while required source exists only as an untracked file.
- Inherited dirtiness is never acceptable: it must be inspected, classified
  (KEEP + COMMIT · FIX + COMMIT · CONSOLIDATE + COMMIT · REMOVE · RECREATE
  CORRECTLY) and resolved before the next canonical checkpoint. There is no
  "leave it dirty for later" outcome.
- **Generated artefacts are never tracked.** `test-screenshots/`,
  `forensic-captures/`, `playwright-report/`, `test-results/`, `e2e-report/` and
  `Review Zip/*.zip` are reproducible outputs and are gitignored. Tracking them
  dirtied the tree after every Playwright run and made a clean checkpoint
  impossible.
- Each of the five sources must therefore describe the HEAD that exists AND the
  tree that is empty; a project-state document that says "289 dirty paths remain"
  is itself a contract violation.
