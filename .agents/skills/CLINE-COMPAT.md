# CLINE / DeepSeek COMPATIBILITY LAYER (thin — upstream skills are NOT rewritten)

**Status:** ACTIVE · added 2026-09-23 · scope: `.agents/skills/**`
**Rule:** upstream skills stay byte-for-byte as published. This file (and a per-skill
`CLINE-COMPAT.md` only where a skill genuinely needs one) translates *execution mechanics* for the
Cline + DeepSeek runtime. No methodology is weakened, rewritten, summarised or duplicated.

## Why a layer is needed at all

Several published skills were authored for Claude Code style runtimes. Their *methodology* is
runtime-independent; a few *mechanics* are not. The differences observed in the installed set are
handled by the translations below rather than by editing the upstream files.

## Translation table

| Upstream mechanic | Cline/DeepSeek equivalent |
|---|---|
| `TodoWrite` / todo list tool | No todo tool. Track steps in the response, or as a short checklist line in the report. Do not pretend a tool call happened. |
| Subagents / Task tool / "spawn an agent" | Not available. Perform the sub-task inline, sequentially, in this session; state that it was done inline. |
| Claude-only tools (`str_replace_editor`, `computer`, `artifacts`, notebook tools) | Use the tools this session actually has: `read_files`, `search_codebase`, `editor`, `run_commands`, `fetch_web_content`. |
| Plugin/slash commands (`/plugin`, marketplace installs) | Skills are files in `.agents/skills/`; invoke with `use_skill` or the `/skill` slash command listed in the Skills menu. |
| "Read every file to build context" / full-repo sweeps | Minimum-context rule: targeted `grep -rn`/`rg` and bounded reads; resume from `PROJECT_STATUS.md → CURRENT RESUME STATE`. |
| "Write a plan file then execute it" | In a `PLAN`-mode request, produce the plan and stop; implementation waits for authorisation (Mercenta protection rules). |
| Model-specific prompt tuning / "think step by step like Claude" | Keep the method's *sequence of checking*; the reasoning style is the runtime's own. Methodology preserved, style not simulated. |
| Assumed visual/browser feedback ("look at the page") | If no browser is available this session, say so explicitly and restrict claims to what code and automated checks prove. Never imply a visual check happened. |

## Project rules that always outrank a skill (unchanged)

`.clinerules/operating-model.md` (§5 commit/deploy, §10 three-way completion, §11 status vocabulary,
§12 task-close + resume state), `protection-rules.md` active safety rules, `project-state-contract.md`,
`mercenta-business-model.md`, and `task-triage-and-skill-router.md`. Where a skill's guidance and a
project rule differ, the project rule wins and the difference is reported.

## Verification of the layer

- Upstream skill bodies are unmodified: each was installed by the official `skills` CLI
  (`--copy`) and its per-file content hash is recorded in `skills-lock.json` / recorded hash
  comparisons in `docs/CLINE_SKILL_SYSTEM.md`.
- The only files added by this layer are this document plus per-skill `CLINE-COMPAT.md` notes where
  the upstream skill contains Claude-specific mechanics (see the per-skill files).