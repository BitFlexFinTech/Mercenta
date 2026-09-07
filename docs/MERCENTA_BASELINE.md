# MERCENTA BASELINE

> Verified recovery point captured BEFORE the master redesign. Do not modify.
> Created: 2026-09-07

## Baseline identity

| Item | Value |
|---|---|
| Baseline date | 2026-09-07 |
| Commit hash | `959b4d276b9f3d40603ad82e93365e53010dc6ae` |
| Short hash | `959b4d2` |
| Branch (source) | `main` |
| Tag | `mercenta-baseline-before-redesign-20260907` (annotated) |
| Backup bundle | `/Users/tadii/Desktop/mercenta-baseline-backup-20260907.bundle` (99 MB, full history, `--all`) |
| Working branch after baseline | `redesign/foundation` |

## What the baseline contains

- Git history through commit `959b4d2` (previous HEAD `e723fe4` "Pre-audit snapshot: current state before visual forensic audit" + one follow-up commit staging the two tracked test-artifact changes: `Review Zip/mercenta-review.zip`, `test-results/.last-run.json`).
- Untracked forensic/test artifacts were deliberately EXCLUDED from the baseline commit per user instruction: `forensic-captures/`, `nohup.out`, `scripts/forensic-diag.cjs`, `scripts/forensic-screenshots.mjs`, `scripts/test_write.txt`, `test-results/visual-forensic-FA-01-hp/`, `test-screenshots/`. They remain in the working tree.
- Secrets were not committed. `.env` and `.env.deploy` remain on disk and are excluded by `.gitignore`.

## Verification evidence (2026-09-07)

1. **Build** — `npm run build` → `✓ built in 2.38s` (Vite 5.4.8). Main bundle split into vendor chunks (smallest 2 KB, largest vendor-sentry 493 KB gzip ~163 KB).
2. **Typecheck** — `npx tsc --noEmit -p tsconfig.app.json` → **FAILS with 27 pre-existing errors** in 2 files:
   - `src/lib/intelligence/outreachGenerator.ts` — 24 errors (unterminated string literal / syntax errors, lines 85–86) → file does not parse.
   - `src/components/admin/XeroConnection.tsx` — 3 errors (line 104 unmatched `</div>`, lines 213–214 declaration/expression expected).
   - These files are outside the Vite build graph (tree-shaken/dead or lazily loaded), which is why the build passes while typecheck fails. **Known baseline warning — must be fixed before claiming full TS health.** This is a CRITICAL-class defect for Phase 4/12 QA.
3. **Runtime boot** — `npm run dev -- --port 5198` → Vite ready in 72 ms, HTTP 200 on `/`.
4. **Recovery restore test** — `git clone /Users/tadii/Desktop/mercenta-baseline-backup-20260907.bundle /tmp/mercenta-recovery-test/repo` → HEAD = `959b4d276b9f3d40603ad82e93365e53010dc6ae`, 201 source files in `src/`. Restore verified.

## Commands

| Action | Command |
|---|---|
| Dev | `npm run dev` (default 5173) |
| Build | `npm run build` (output `dist/`) |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` |
| Preview | `npm run preview` |
| E2E | `npx playwright test [spec]` (dev server must be running) |

## Known baseline environment state

- A suspended Vite preview is running on port 4173 (process state `TN`, non-responsive, HTTP 000) — started 2026-09-07 06:02. It does NOT serve requests in its current state; use fresh `npm run dev` / `npm run preview` for inspection.
- `.env` contains real credentials for paid/live services (DO, Postmark, Hunter, Firecrawl, PandaDoc, OpenRouter, Instantly, Namecheap FTP). **Never print, log, or commit them.** Display only `PRESENT` in diagnostics.

## Restore procedure

```bash
# Option A — from local git (tag)
git checkout mercenta-baseline-before-redesign-20260907
git checkout -b recovery/baseline

# Option B — from external bundle (full restore)
rm -rf <dest>
git clone /Users/tadii/Desktop/mercenta-baseline-backup-20260907.bundle <dest>
cd <dest> && git checkout mercenta-baseline-before-redesign-20260907

# Then in either case:
npm install
npm run build        # must succeed
npm run dev          # must return HTTP 200
```

## Guardrails

- Baseline tag and bundle are IMMUTABLE. No commit, amend, or force-push through the tag.
- All redesign work happens on `redesign/foundation` / logical phase branches off it.
- If recovery from either the tag or the bundle is ever required and fails, STOP — report before improvising.