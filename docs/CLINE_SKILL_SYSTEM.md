# CLINE SKILL SYSTEM + TASK TRIAGE — ADDITIVE INSTALLATION (2026-09-23)

> **ADDITIVE ONLY.** This increment adds a specialist skill layer and a lightweight task-triage router
> beside the existing Mercenta governance. **No existing rule, resume mechanism, project-state source,
> protection rule, validator or application file was modified.** Where this system and an existing
> Mercenta rule could differ, the existing rule wins
> (`.clinerules/operating-model.md` §1 authority order is unchanged).
>
> The current Mercenta programme is untouched: P5 (`f07a63f`) remains the last verified product work,
> and the recorded `NEXT TASK` (P6 — the PO document pack) is unchanged.

## 1. What was added

| Artefact | Role | Loaded |
|---|---|---|
| `.clinerules/task-triage-and-skill-router.md` | The always-active trigger: classify every request (QUESTION / ANALYZE / PLAN / IMPLEMENT), minimum-context rule, real-invocation rule, broad-language protection, compat pointer, resume flow | Always (rule file) |
| `.agents/skills/skill-router/SKILL.md` | The routing procedure: mode definitions, routing tables, invocation protocol, anti-patterns, worked examples | On demand |
| `.agents/skills/business-analyst/SKILL.md` | Requirements: actors/tenants, as-is/to-be flow, business rules with canonical owners, edge cases, acceptance criteria | On demand |
| `.agents/skills/project-manager/SKILL.md` | Sequencing: phases, dependencies, scope boundaries, acceptance gates + evidence, status vocabulary, project-state upkeep | On demand |
| `.agents/skills/senior-software-architect/SKILL.md` | Boundaries/ownership/contracts, fail-closed semantics, seams, auditability, trade-offs, regression surfaces | On demand |
| `.agents/skills/senior-software-engineer/SKILL.md` | Implementation, debugging protocol, proof discipline, close-out | On demand |
| `.agents/skills/ux-product-analyst/SKILL.md` | IA/hierarchy/density/state coverage/drill-down/name-implies-capability/flow friction | On demand |
| `.agents/skills/CLINE-COMPAT.md` | Global thin compatibility layer (Claude Code mechanics → Cline/DeepSeek equivalents) | Read when routing a skill that has harness-specific mechanics |
| `.agents/skills/<upstream>/…` | 10 verbatim upstream UI skills (§3) | On demand |
| `.agents/skills/UPSTREAM-PROVENANCE.json` | SHA-256 of every vendored upstream file — proves the upstream bodies were not locally edited | Read by the validator |
| `scripts/validate-cline-skills.mjs` | The gate: frontmatter/path integrity, router coverage, upstream byte-identity | Run manually (§7) |
| `skills-lock.json` | The official installer's record of source repo + content hash per installed skill | Installer-maintained |
| `docs/CLINE_SKILL_SYSTEM.md` (this file) | Reference: installation, sources, mechanism, compat, maintenance | Reference |

## 2. Where skills live, and why there

Cline loads skills from directories it scans at the workspace root. Verified from the **installed**
extension (`~/.vscode/extensions/saoudrizwan.claude-dev-4.1.20/next/dist/extension.js`):

```
.clinerules/skills   .cline/skills   .claude/skills   .agents/skills        (project)
~/.cline/skills      ~/.agents/skills                                    (global)
allowed frontmatter: name · description · license · compatibility · metadata · allowed-tools
```

`.agents/skills` was chosen because it is simultaneously (a) a directory Cline scans and (b) the
canonical target of the official `skills` CLI's `cline` agent — so installation, update and
verification all use one path, with no duplication, no symlinks and no second copy of any skill.

Progressive loading (Cline's own model) is what keeps this cheap: only each skill's name + description
(~100 tokens) is present at startup; the body loads only when the skill is invoked.

## 3. External skills — exact sources, installed verbatim

Installed with the official CLI, e.g.
`npx skills add <repo> --skill <name> --agent cline -y --copy`. Bodies are unmodified; a SHA-256 per
file is recorded in `UPSTREAM-PROVENANCE.json`, and `skills-lock.json` records the upstream repo +
content hash.

| Skill | Source repository | ui-skills page | Installed from |
|---|---|---|---|
| frontend-design | https://github.com/anthropics/skills | https://ui-skills.com/skills/anthropics/frontend-design | `--skill frontend-design` |
| apple-design | https://github.com/emilkowalski/skills | https://ui-skills.com/skills/emilkowalski/apple-design | `--skill apple-design` |
| emil-design-eng | https://github.com/emilkowalski/skills | https://ui-skills.com/skills/emilkowalski/emil-design-eng | `--skill emil-design-eng` |
| beautiful-shadows | https://github.com/MengTo/Skills (`agent-skills/web-design/beautiful-shadows`) | https://ui-skills.com/skills/mengto/beautiful-shadows | the tree URL below |
| accessibility | https://github.com/addyosmani/web-quality-skills | https://ui-skills.com/skills/addyosmani/accessibility | `--skill accessibility` |
| design-review | https://github.com/Superfuture/design-review | https://ui-skills.com/skills/superfuture/design-review | `--skill design-review` |
| shadcn | https://github.com/shadcn-ui/ui | https://ui-skills.com/skills/shadcn-ui/shadcn | `--skill shadcn` |
| impeccable — **contains `adapt`** | https://github.com/pbakaus/impeccable | https://ui-skills.com/skills/pbakaus/adapt | `--skill impeccable` |
| better-interface | https://github.com/jakubkrehel/skills | https://ui-skills.com/skills/jakubkrehel/better-interface | `--skill better-interface` |
| interaction-design | https://github.com/wshobson/agents | https://ui-skills.com/skills/wshobson/interaction-design | `--skill interaction-design` |

**`adapt` — source reference preserved, install path corrected.** The ui-skills page instructs
`npx skills add https://github.com/pbakaus/impeccable --skill adapt`, but that repository now publishes
a single skill, `impeccable`, and `adapt` exists inside it as a mode
(`skills/impeccable/reference/adapt.md`, plus `adapt.native.md`). Rather than recreate a home-made
`adapt` skill, the upstream `impeccable` skill is installed verbatim and the router routes
"responsive/adaptive UI" to it. The alias and its reason are recorded in `skill-router/SKILL.md` and in
`scripts/validate-cline-skills.mjs` (`ROUTER_ALIASES`).

**`beautiful-shadows` — nested path.** That repo's skills sit two levels deep
(`agent-skills/<category>/<skill>`), which the CLI's default scan does not resolve, so it was installed
through the explicit tree URL:
`https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/beautiful-shadows`
(`skills-lock.json` records the resolved `skillPath`).

**Also previously on disk:** `.skills/emilkowalski-skills` and `.skills/jakubkrehel-skills` (gitignored
reference clones from an earlier session) are untouched. They are reference material; the installed,
Cline-loadable copies are the ones in `.agents/skills/`. Nothing was created twice.

## 4. Specialist skills — what each is for and what it produces

These are capabilities, not personas: each names the concrete artefacts it must produce.

| Skill | Produces |
|---|---|
| `business-analyst` | Outcome, actors + tenancy boundaries, as-is/to-be flow, testable rules with their canonical owner file, edge cases incl. fail-closed refusals, acceptance criteria (≥1 negative), open questions |
| `project-manager` | Phase table (goal/scope/out-of-scope/dependencies/acceptance command), risks with the validator that catches them, critical path, canonical status phrase, next starting point |
| `senior-software-architect` | Decision, current vs new owner + migration, boundary contract, failure modes, audit record shape, trade-offs incl. the rejected option, regression surfaces |
| `senior-software-engineer` | The change itself, a root-cause statement before the fix, a test that fails without it, real command output as proof, honest BUILT/TESTED/RESULT/NEXT reporting |
| `ux-product-analyst` | Verdict, the job-to-be-done, findings ranked blocking→polish with evidence, state coverage, drill-down map, verified tenant/role filter, smallest-change recommendation |
| `skill-router` | The classification, the minimum skill set with reasons, and the invocation protocol |

Authoring rules applied to each: no persona padding, no restatement of Mercenta rules that already
exist elsewhere, explicit deliverable shape, explicit guardrails, and a pointer to the canonical source
of truth instead of a duplicated number.

## 5. How skill loading/invocation actually works

1. On startup Cline enumerates the scanned directories and lists each skill's `name` + `description`
   (progressive loading — bodies are not in context).
2. A request is triaged by `.clinerules/task-triage-and-skill-router.md`; the minimum skill set is
   chosen from `skill-router/SKILL.md`; each chosen skill is then **invoked** with the `use_skill` tool
   (or its `/skill` slash command), which loads that `SKILL.md` body.
3. The skill's instructions are then followed for the work itself. Skills are never "simulated": the
   file on disk is the instruction set, and the router forbids summarising/re-creating a skill instead
   of loading it.
4. Bundled files (e.g. `shadcn/cli.md`, `impeccable/reference/*`, `design-review/*`) are read with
   `read_files` only when the loaded skill points at them — resources cost nothing until then.

The `use_skill` tool exists in the installed extension (`USE_SKILL = "use_skill"` →
`{tool:"useSkill", path: skill_name}`), and enabled/disabled state is tracked per skill
(`localSkillsToggles` / `globalSkillsToggles`).

## 6. DeepSeek / Cline compatibility — thin, never a rewrite

Approach: **keep the proven upstream skill byte-for-byte; translate only execution mechanics; never
duplicate or water down the methodology.**

- `.agents/skills/CLINE-COMPAT.md` — the global translation table (no `TodoWrite`; no subagents/Task
  tool; Claude-only tool names → this session's tools; plugin/slash installation → skill files;
  "read everything" → minimum-context; "plan file then execute" → PLAN mode stops at the plan;
  assumed browser feedback → state the limitation honestly).
- `.agents/skills/shadcn/CLINE-COMPAT.md` + adapter `SKILL.md` — **genuinely required**: upstream
  declares `user-invocable: false` and `allowed-tools: Bash(npx shadcn@latest *)`, and Cline's loader
  rejects unknown frontmatter fields, so the skill would not load at all. The upstream body was moved
  unchanged to `SKILL.upstream.md`, and a thin adapter `SKILL.md` (valid frontmatter, no methodology)
  instructs Cline to read and follow the upstream body, restating the tool restriction in prose.
- `.agents/skills/impeccable/CLINE-COMPAT.md` — **genuinely required**: upstream branches on harness
  (Cursor / Claude Code / Codex / Copilot) and, for harnesses without a sub-agent tool, ships its own
  degraded inline roles (`reference/degraded/*`). The note maps Cline to that existing degraded branch
  and marks hook installation and live-browser iteration as unavailable/unverified here.
- All other 8 upstream skills load as published; their frontmatter already satisfies the loader.

## 7. Verification performed (this session)

| Check | Evidence |
|---|---|
| Skills installed in a scanned directory with loader-valid frontmatter | `node scripts/validate-cline-skills.mjs` → `CLINE_SKILLS_VALIDATION_PASS (152 assertions, 0 network calls)` |
| The validator genuinely fails when it should | Injected two defects → `CLINE_SKILLS_VALIDATION_FAIL (2 of 152)`: `business-analyst: frontmatter declares only Cline-accepted fields — version` and `provenance: frontend-design upstream files are byte-identical — modified: SKILL.md`; restored → PASS (exit 0) |
| Upstream skills are not local imitations | `UPSTREAM-PROVENANCE.json` records a SHA-256 for every vendored file; the validator compares them (10 vendored skills) and `skills-lock.json` is asserted to name each upstream source |
| Router exists and is usable | `.agents/skills/skill-router/SKILL.md` + the always-active `.clinerules/task-triage-and-skill-router.md`; the validator asserts every routed name exists and every installed skill is routed (no drift) |
| Loading is on demand, not global | Progressive loading is Cline's model; the router loads the minimum set per request; nothing is preloaded into `.clinerules` except the short triage trigger |
| QUESTION / ANALYZE / PLAN / IMPLEMENT classification exists | Defined in both the rule file and the router skill (grep-verifiable; example classifications included) |
| Skills live in only one place | One directory (`.agents/skills`); no symlinks, no duplicate copies, no second implementation of any upstream skill |

**Honest limitations (not claimed as verified):**

- A live `use_skill` invocation could **not** be executed inside this session: the tool is not exposed
  in this session's toolset (built at session start, before the skills existed) and the Cline UI cannot
  be driven from here. What is verified is *loadability* (scanned path + accepted frontmatter, proven
  against the installed extension) and the integrity gate — not a rendered invocation. Confirmation
  belongs to the next session: type `/` in the chat input and the installed skills should be listed,
  or simply ask for a skill-driven task.
- Skill enable/disable toggles live in Cline's own state (`localSkillsToggles`). If the Skills menu
  shows a skill as off, enable it there; that state is not stored in the repository.

## 8. What was deliberately NOT changed

`.clinerules/operating-model.md` · `.clinerules/protection-rules.md` ·
`.clinerules/project-state-contract.md` · `.clinerules/mercenta-business-model.md` ·
`.clinerules/always-export-review-zip.md` — all untouched. `PROJECT_STATUS.md`, `HANDOFF.md`,
`STATUS_CHECK.md`, `requirements-registry.json` were **updated** (they are the project-state sources and
§12 requires them to record every increment) but their structure, resume mechanism and completion
vocabulary are unchanged. **No file under `src/`, `e2e/`, `supabase/` or any other application path was
modified** — see the report's `git status` evidence.

## 9. Maintenance — adding, updating or removing a skill

Install (verbatim upstream):

```bash
npx skills add <owner>/<repo> --skill <name> --agent cline -y --copy
# nested-path repos:
npx skills add https://github.com/<owner>/<repo>/tree/<branch>/<path/to/skill> --agent cline -y --copy
```

Then, always:

```bash
node scripts/validate-cline-skills.mjs            # must print ..._PASS
```

If the new skill is upstream, add it to `UPSTREAM` in `scripts/validate-cline-skills.mjs`, regenerate
provenance (`--write-provenance`), and add it to the router table. If its frontmatter is rejected by
the loader, apply the adapter pattern used for `shadcn`:

```bash
mv .agents/skills/<name>/SKILL.md .agents/skills/<name>/SKILL.upstream.md
# write a thin adapter SKILL.md (valid frontmatter + "CLINE ADAPTER" marker) + CLINE-COMPAT.md
node scripts/validate-cline-skills.mjs --write-provenance && node scripts/validate-cline-skills.mjs
```

**Reinstalling an existing skill overwrites its `SKILL.md`,** which removes any adapter — re-apply the
adapter and regenerate provenance afterwards (the validator will fail loudly until you do, because the
adapter check and the provenance check both fire).

Router hygiene: any skill that exists must be routed, and anything the router names must exist; the
validator enforces both directions. `adapt` is the one documented alias (→ `impeccable`).

## 10. Relationship to the existing resume workflow

The existing entry point is unchanged. The triage step is inserted *after* the resume point is read and
*before* work starts:

```
NEW CHAT
→ permanent rules (.clinerules/*, including the new triage rule)
→ PROJECT_STATUS.md → CURRENT RESUME STATE
→ "continue, where you left off"
→ NEXT TASK + EXACT NEXT STARTING POINT
→ TASK TRIAGE → SELECT SKILLS → use_skill (minimum set) → CONTINUE
→ existing close-out (test → verify → project state → commit → push → deploy+verify live → next point)
```

The user is never asked to restate project history, and never asked to hand-pick skills.