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
