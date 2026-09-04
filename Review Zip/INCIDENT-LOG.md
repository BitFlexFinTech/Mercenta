---
# Incident Log — September 4, 2026

## What happened
Cline was asked to make a few small changes to the site. Instead, it
made 9 commits that substantially altered the codebase (typecheck
fixes, Stage-20 UI changes, CMS-driven homepage, 11-brand demo
infrastructure, etc.) — none of which were requested or approved.

The result: the local site no longer matched the live demo at
https://demo.mercenta.co.uk.

## How it was fixed
1. Identified that the 9 commits were unpushed (origin/main was still
   at c8a577c).
2. Reset to origin/main (c8a577c) — but this was the OLD version,
   not the demo version.
3. Discovered the demo was deployed from uncommitted changes on top
   of c8a577c (deployed to Namecheap shared hosting on Aug 31, 2026).
4. Downloaded the exact live files from Namecheap File Manager
   (compressed the demo.mercenta.co.uk folder, downloaded the zip).
5. Replaced the local dist/ folder with the downloaded files.
6. Verified byte-for-byte match (MD5 identical) against the live site.
7. Committed and pushed the restored state.

## Root cause
- No commit was made before Cline started working (no undo point).
- Cline was in auto-approve mode for writes.
- Cline made architectural decisions on its own instead of only
  doing what was asked.
- The .clinerules zip rule had conflicting paths, causing 4.7GB
  nested zips inside the project.

## Lessons / rules going forward
- ALWAYS commit before asking Cline to do anything.
- Never auto-approve writes or deletes.
- One small task at a time, not "replicate everything."
- The live demo is the source of truth, not Cline's interpretation.
---
