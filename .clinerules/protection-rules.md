> ## ⚠ AUTHORITY ORDER (2026-09-21 rule migration)
> 1. The CURRENT Founder execution directive for this session.
> 2. **`.clinerules/operating-model.md`** — the canonical operating model (scope authority, COMMIT/DEPLOY
>    definitions, the mandatory delivery chain, the genuine hard stops).
> 3. This file — its **ACTIVE SAFETY RULES** only.
> 4. Historical documents (sprint docs, handoffs, transcripts, `Mercenta Build 1.rtf`) — context only, NEVER active policy.
>
> **RETIRED 2026-09-21 — no authority (retained only so an old transcript cannot resurrect them):**
> the Design Freeze · "uncommitted changes → STOP" · ">3 files → STOP / wait for approval" ·
> ">5 files → STOP / wait for approval" · "never change architecture / add new systems / refactor" ·
> "do not commit unless explicitly told". Each retired clause is marked inline below and listed in
> `operating-model.md` §2.

---
## ~~Design Freeze — CRITICAL~~ RETIRED 2026-09-21 — NO LONGER ACTIVE

> **RETIRED. This clause has NO authority and MUST NOT gate any work.** It is superseded by the Founder decision
> recorded in `.clinerules/operating-model.md` §4: **the existing UI is NOT the visual baseline**, and an authorised
> completion/redesign directive MAY change layout, IA, navigation, component structure, shell, spacing, typography,
> hierarchy, density, responsive behaviour and interaction patterns — including admin and brand surfaces and the
> Brain/Logistics presentation — while preserving the underlying business/domain contracts. The original text is kept
> verbatim below as history only.

<!-- HISTORY ONLY — the following is the retired clause, quoted for the record.
The visual design of the site is FROZEN. It must match
https://demo.mercenta.co.uk exactly.

- Do NOT change any CSS, Tailwind classes, layout, spacing, colors,
  fonts, or visual styling.
- Do NOT change any text content visible to users (headings, buttons,
  labels, copy) unless explicitly told to in the current task.
- Do NOT change the structure of any component's rendered output
  (no adding/removing/moving visual elements).
- Backend logic, API calls, database queries, config, security,
  and infrastructure changes are allowed.
- If a task requires a visual change, it is authorised by the operating model — no separate permission step.
-->

---
# Protection Rules — ACTIVE SAFETY RULES

Authority: the CURRENT Founder directive and `.clinerules/operating-model.md` govern. These rules are the ACTIVE
SAFETY set (secrets · non-destruction of Founder work · deploy safeguards · no fake passes · evidence). Violating a
safety rule is a critical failure. The retired clauses above and below have **no** authority.

## Before any work:
- Run: `git status --porcelain` — **this is a reconciliation input, not merely awareness.** Know exactly what is already
  on disk before you touch it, because inherited dirtiness must be resolved (§6), not carried forward.
- ~~If there are uncommitted changes, STOP and tell the user.~~ **RETIRED 2026-09-21** — a dirty worktree is NOT a stop.
- ~~Ask: "Should I commit the current state before I start?" / Do NOT proceed until the user says yes.~~ **RETIRED 2026-09-21.**
- ACTIVE instead: pre-existing worktree changes are **never DESTROYED** (no reset/clean/stash/force-push) and are
  **RECONCILED**: a change that repository evidence shows is required, current and part of the product is FIXED and
  COMMITTED; a change that evidence shows is obsolete, duplicated, generated or unnecessary is REMOVED with the reason
  recorded (`operating-model.md` §6). "Founder work" is not itself a reason to keep something uncommitted.

## During work:
- Prefer the smallest change that achieves the requirement — but when a Founder directive requires replacing a
  surface, a shell or a file, that replacement **is** the smallest change that accomplishes it
  (`operating-model.md` §3–§4).
- Prefer targeted line edits over whole-file rewrites; a full rewrite of a file being replaced by the directive is
  authorised — silently dropping protected functionality is not.
- NEVER delete a file unless the directive authorises the removal (report every deletion); never silently remove
  working functionality to make a gate pass.
- NEVER rename a file or folder (no benefit; high breakage risk) unless the directive explicitly requires it.
- ~~NEVER change architecture, add new systems, refactor, or "improve".~~ **RETIRED 2026-09-21** — architectural,
  multi-system and multi-file implementation is authorised inside a Founder directive (`operating-model.md` §3).
- ~~If a change would affect more than 3 files, STOP and list them. Wait for approval.~~ **RETIRED 2026-09-21** —
  file count is never a gate (`operating-model.md` §3).
- ACTIVE: if a requirement is genuinely ambiguous and the repository / canonical docs cannot resolve it, ask — but
  never use ambiguity as a reason to avoid authorised work.

## After work:
- Show exactly which files were changed and what changed; run: `git diff --stat`.
- ~~Do NOT commit unless the user explicitly says "commit."~~ **RETIRED 2026-09-21** — commit your own **verified** work
  as the checkpoint (`operating-model.md` §5). The reconciliation of inherited dirtiness described in §6 is part of that
  same checkpoint: required inherited work is committed, unneeded inherited material is removed — never left behind.
- ACTIVE: push only when the Founder instructs it.
- **ACTIVE — THE CLEAN-TREE INVARIANT:** run `git status --porcelain` and confirm it prints NOTHING before reporting
  completion. If it prints anything (modified, deleted-but-uncommitted, staged, untracked, generated artefacts, or
  documentation/rule changes), RECONCILE IT and commit again. Do not report completion with a dirty tree
  (`operating-model.md` §6/§9).

## Absolute prohibitions:
- Do NOT create numbered zip files.
- Do NOT save zips inside the project directory (except in
  "Review Zip/" folder).
- ~~Do NOT make architectural decisions.~~ **RETIRED 2026-09-21** — authorised architectural implementation is part of
  the execution model (`operating-model.md` §3).
- ~~Do NOT "fix" things that were not broken or not mentioned.~~ **RETIRED 2026-09-21** — a directly-related defect
  discovered inside an authorised workstream is fixed inside that workstream.
- ACTIVE: the Founder's word is final — never argue that an unrequested change is an "improvement".
- ACTIVE: never weaken, disable or delete a validator or test to make a gate pass, and never fake completion
  (`operating-model.md` §7–§8).
---

---
## After Every Session (MANDATORY):
- Run the review-zip script in the Mercenta project root (currently
  `/Users/tadii/Desktop/1. Mercenta`): `bash scripts/export-review-zip.sh`
  (the script resolves the project root itself, so no hardcoded path is needed).
  It may also be invoked as `bash "<project root>/scripts/export-review-zip.sh"`.
- If the zip is not at `<project root>/Review Zip/mercenta-review.zip`,
  something went wrong. Report it.
- Do NOT create any other zip files. Do NOT save zips to ~/Desktop/
  directly.
---

## Handoff:
- If the user says "Provide Handoff" or "update handoff":
  1. Read the current state of the project (git log, what's
     built, what's pending)
  2. Update `<project root>/HANDOFF.md` with:  (the repo root; the old `~/Desktop/Mercenta/` path is stale)
     - Last updated date
     - What's built (add new items)
     - What's left (remove completed items, add new ones)
     - Current API key status
     - Next prompt to paste
  3. Show me the updated file
---

## Standing Requirements (apply to EVERY task):

Before claiming a task is complete, you MUST:
1. Run: npx tsc --noEmit — confirm 0 new errors
2. Run: npm run build — confirm it compiles
3. If the task involves UI or user-facing changes: run the
   relevant Playwright tests (npx playwright test [relevant-spec])
   and report pass/fail/skip counts
4. Show me: git diff --stat
5. Show me the test results
6. Run: `bash scripts/export-review-zip.sh` — run it from the project root; the script resolves its own root, so the
   old hardcoded `~/Desktop/Mercenta/...` path (stale since the folder was renamed) is NOT used.
7. Run: `git status --porcelain` — it MUST print nothing. The commit that carries this task's work (including the
   reconciliation of any inherited dirtiness) must already exist, because the review ZIP is a generated, gitignored
   artefact and does not dirty the tree. A dirty tree after the zip step means the commit was incomplete.

Do NOT say "DONE" or "complete" until all 7 steps above are shown.
If a test fails, report it honestly. Do not mark tests as fixme
to hide failures.

## Deployment rules — CRITICAL

- Deploy ONLY when the current Founder directive instructs deployment (this deploy gate is unchanged).
- Only deploy to demo.mercenta.co.uk (Namecheap shared hosting).
- The deploy script is scripts/deploy-demo.sh — do NOT create any other deploy script.
- Never deploy to mercenta.co.uk (live domain) until the GO_LIVE.md playbook is executed.
- A deployment is NOT complete until the live site has been opened and the deployed change verified
  (`operating-model.md` §5). Never invent or print a credential; if the demo-host credential is genuinely
  unavailable, that is a real hard stop — report it rather than implying a deploy happened.

Additional standing rules:
- ~~Do NOT change any visual styling, layout, fonts, or colors unless explicitly told to in the current task.~~
  **RETIRED 2026-09-21** — presentation change is authorised whenever the current directive requires it
  (`operating-model.md` §4).
- ACTIVE: Do NOT remove or modify demo data or demo accounts (unchanged).
- ~~Do NOT commit or push unless I explicitly say "commit" or "push".~~ **RETIRED 2026-09-21** — commit your own
  VERIFIED work as the checkpoint; **push only when instructed**. The §6 reconciliation of inherited dirtiness is part of
  that checkpoint (required work is committed, unneeded material is removed), and completion requires a clean tree.
- ACTIVE: if a requirement is genuinely ambiguous and unresolvable from the repository, ask (`operating-model.md` §3).
- ~~If a change would affect more than 5 files, STOP and list them first. Wait for my approval.~~ **RETIRED 2026-09-21**
  — there is no file-count gate.
- ACTIVE: show the real output of the commands you rely on as evidence, and report the exact files changed.