# CLINE-COMPAT — impeccable (which is also the upstream home of `adapt`)

Thin per-skill compatibility note. **The upstream body is unmodified** (verified by
`UPSTREAM-PROVENANCE.json`). This note only maps the harness-specific branches the skill already
contains onto the Cline runtime — the skill is explicitly multi-harness and ships its own degraded
paths, so no methodology is added, removed or re-implemented.

## Runtime mapping

| Upstream branch | This runtime (Cline + DeepSeek) |
|---|---|
| Sub-agents / Task tool (`reference/critique.md` calls for A and B as isolated sub-agents; `reference/new-work.md` spawns finish-reviewer / documenter) | **No sub-agent tool is exposed.** The skill's own definition of "unavailable" is exactly this case, so use the bundled degraded paths instead: `reference/degraded/finish-reviewer.md`, `reference/degraded/documenter.md`, `reference/degraded/manual-edit-applier.md`, `reference/degraded/asset-producer.md` — run those roles **inline, sequentially** in this session and say that you did. Do not simulate a parallel agent. |
| Harness detection (`.cursor/`, `.claude/`, Codex, Copilot, Gemini, …) | Detect nothing: neither `.cursor/` nor `.claude/` project manifests exist here. Take the harness-agnostic / degraded branch and state the branch you took. |
| Hook installation (`reference/hooks.md`) | Cline has no hook install path in this repository; the per-edit detector cannot be installed. Keep the detector's **rules** as review criteria you apply by reading the diff — do not claim a hook is running. |
| Live browser iteration (`reference/live.md`, `scripts/live-browser.js`) | Available only through `run_commands` (Node is present). If the script cannot run in this environment, say so and fall back to static review; never imply a live browser session happened. |
| `adapt` mode (`reference/adapt.md`, `reference/adapt.native.md`) | Fully usable — this is the route the Mercenta router uses for responsive/adaptive UI work (`ui-skills` still lists `--skill adapt`, but upstream consolidated it into this skill). |

## Project precedence

`.clinerules/operating-model.md` (§5, §10, §11, §12), `protection-rules.md`,
`project-state-contract.md`, `mercenta-business-model.md` and `task-triage-and-skill-router.md`
outrank any skill instruction. Their workflow gates — verified commits, the clean tree, three-way
completion, simulation labelling, tenant isolation, compliance gating, human payout approval — are
not overridden by this skill's broader creative latitude.