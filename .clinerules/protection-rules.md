---
## Design Freeze — CRITICAL

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
- If a task requires a visual change to fix a bug, STOP and ask me
  first.

---
# Protection Rules — MANDATORY

These rules override all other instructions. Violating them is
a critical failure.

## Before any work:
- Run: git status
- If there are uncommitted changes, STOP and tell the user.
- Ask: "Should I commit the current state before I start?"
- Do NOT proceed until the user says yes and you've committed.

## During work:
- Make the SMALLEST possible change to accomplish the task.
- NEVER rewrite an entire file. Use targeted line replacements.
- NEVER delete a file unless the user explicitly says "delete this file."
- NEVER rename a file or folder.
- NEVER change architecture, add new systems, refactor, or "improve"
  anything that was not explicitly requested.
- If a task is ambiguous, ASK before acting.
- If a change would affect more than 3 files, STOP and list the
  files you plan to touch. Wait for approval.

## After work:
- Show the user exactly which files were changed and what changed.
- Run: git diff --stat
- Do NOT commit unless the user explicitly says "commit."
- Do NOT push unless the user explicitly says "push."

## Absolute prohibitions:
- Do NOT create numbered zip files.
- Do NOT save zips inside the project directory (except in
  "Review Zip/" folder).
- Do NOT make architectural decisions.
- Do NOT "fix" things that were not broken or not mentioned.
- Do NOT argue with the user about whether a change is an
  "improvement." The user's word is final.
---

---
## After Every Session (MANDATORY):
- Run: bash ~/Desktop/Mercenta/scripts/export-review-zip.sh
- If the zip is not at ~/Desktop/Mercenta/Review Zip/mercenta-review.zip,
  something went wrong. Report it.
- Do NOT create any other zip files. Do NOT save zips to ~/Desktop/
  directly.
---

## Handoff:
- If the user says "Provide Handoff" or "update handoff":
  1. Read the current state of the project (git log, what's
     built, what's pending)
  2. Update ~/Desktop/Mercenta/HANDOFF.md with:
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
6. Run: bash ~/Desktop/Mercenta/scripts/export-review-zip.sh

Do NOT say "DONE" or "complete" until all 6 steps above are shown.
If a test fails, report it honestly. Do not mark tests as fixme
to hide failures.

Additional standing rules:
- Do NOT change any visual styling, layout, fonts, or colors
  unless explicitly told to in the current task
- Do NOT remove or modify any demo data or demo accounts
- Do NOT commit or push unless I explicitly say "commit" or "push"
- If a task is ambiguous, STOP and ask me before acting
- If a change would affect more than 5 files, STOP and list them
  first. Wait for my approval
- Show me the output of every command you run