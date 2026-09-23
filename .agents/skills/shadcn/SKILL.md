---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".
metadata:
  upstream: shadcn-ui/ui
  upstream-file: SKILL.upstream.md
  adapter: cline-loader
---

# shadcn — CLINE ADAPTER (upstream body preserved verbatim)

**CLINE ADAPTER.** This file exists for one reason: the published `shadcn` skill declares two
frontmatter fields the Cline skill loader rejects (`user-invocable`, `allowed-tools`), so Cline would
refuse to load it and the skill would be dead. The upstream file is **not** modified, summarised or
re-implemented — it is stored beside this one, byte-for-byte, as `SKILL.upstream.md`.

## What to do when this skill is selected

1. Read `SKILL.upstream.md` in this directory with `read_files` (it is the authoritative upstream
   instruction set — follow it as written).
2. Apply the two mechanical translations in `CLINE-COMPAT.md` (this directory) — they concern *how*
   the commands are executed, never *what* the skill prescribes.
3. Resolve the upstream's supporting files relative to this directory, exactly as published:
   `cli.md`, `registry.md`, `customization.md`, `mcp.md`, `rules/*.md`, `agents/*`, `assets/*`,
   `evals/*`.
4. Run shadcn CLI commands through `run_commands` with this project's package runner
   (`npx shadcn@latest` — package.json declares npm here). The upstream `allowed-tools` frontmatter
   restriction cannot be expressed to Cline, so the restriction is stated here instead of enforced by
   the loader: **only** `shadcn@latest` CLI invocations are authorised by this skill.

## Integrity

`SKILL.upstream.md` is verified byte-for-byte against `../UPSTREAM-PROVENANCE.json` by
`node scripts/validate-cline-skills.mjs`. If that validator reports this skill's upstream files as
modified, the vendored body was edited locally — reinstall it with
`npx skills add https://github.com/shadcn-ui/ui --skill shadcn --agent cline -y --copy` and re-apply
this adapter (see `docs/CLINE_SKILL_SYSTEM.md`).