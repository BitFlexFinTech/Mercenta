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
