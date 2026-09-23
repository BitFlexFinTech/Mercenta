# TASK TRIAGE + SKILL ROUTER (ADDITIVE — 2026-09-23)

> **ADDITIVE ONLY. This file adds a triage/router layer. It does not modify, replace, weaken or
> override any existing rule. Authority order is unchanged** (`.clinerules/operating-model.md` §1:
> current Founder directive → `operating-model.md` → `protection-rules.md` active safety rules →
> `project-state-contract.md` → `mercenta-business-model.md` → historical documents).
> Where this file and any existing rule could disagree, **the existing rule wins.**
>
> The detailed routing catalogue and selection procedure live in the on-demand skill
> `.agents/skills/skill-router/SKILL.md`. This file is the always-active *trigger*; that skill is the
> *procedure*. Installing this layer did not renumber, rename or re-scope any phase of the current
> Mercenta programme.

## 1. Why this exists — context economy

Mercenta sessions were burning context by scanning broadly, re-reading long state documents and
re-deriving history before doing anything. The order is now fixed:

```
TRIAGE FIRST → SKILL SELECTION SECOND → MINIMUM CONTEXT THIRD → EXECUTION FOURTH
```

Nothing here changes **what** may be done; it changes **how much is loaded** before doing it.
It never relaxes evidence discipline, the clean-tree invariant, the three-way completion contract or
any protection rule.

## 2. Classify every incoming request before touching anything

At the start of a request, state the mode on one line, then proceed:

| Mode | Trigger | Behaviour |
|---|---|---|
| **QUESTION** | the user asks for an explanation, diagnosis, clarification, comparison or an answer | Answer. Do **not** start implementing. Load only the skills needed to answer. |
| **ANALYZE** | the user asks you to investigate, assess, find problems, or say what should change | Smallest useful investigation (targeted `grep`/`rg`/bounded file reads). Findings + recommendation. **No application code changes.** |
| **PLAN** | the user asks for a strategy, roadmap, architecture, redesign/migration plan | Inspect only what a reliable plan needs. Produce the phased plan with scope, sequencing, risks and acceptance gates. **Do not modify application code unless explicitly asked.** |
| **IMPLEMENT** | the user explicitly asks for changes | Then — and only then — modify code, continuing to obey all existing Mercenta protection/approval rules and the close-out sequence. |

Mixed requests: take the **higher** mode only if the user's words actually authorise it. "I want a
complete design overhaul" is PLAN, not IMPLEMENT, until the scope is approved (§5).

## 3. Minimum-context principle (mandatory)

- Resume work through **`PROJECT_STATUS.md` → `CURRENT RESUME STATE`** (first screen only). Never
  reconstruct history from chat, and never read all 750 KB of `PROJECT_STATUS.md` to answer
  "where were we".
- `git --no-pager log --oneline -5`, `git status --porcelain`, `git remote -v` — then open **only**
  the files the resume state's `EXACT NEXT STARTING POINT` names.
- Use targeted `grep -rn`/`rg` and bounded `read_files` line ranges; do not list or read whole
  directories "to look around".
- Re-read a file immediately before editing it; never edit from memory.
- Do not load every skill — load the minimum set the routing table names for this request.

## 4. Skill invocation — real loading, never impersonation

When a skill is selected, **actually invoke it** with the `use_skill` tool (or the matching `/skill`
slash command) so its real `SKILL.md` instructions load, then follow that skill's methodology while
doing the work.

Forbidden: summarising a skill and "acting like" it; recreating a skill from memory; replacing an
upstream skill with a local imitation; loading all skills "for safety". The upstream file on disk is
the source of truth for that domain.

Skills live in `.agents/skills/` — a project skill directory Cline scans (verified against the
installed Cline 4.1.20 extension, which enumerates `.clinerules/skills`, `.cline/skills`,
`.claude/skills`, `.agents/skills` at the workspace root, plus `~/.cline/skills` and
`~/.agents/skills` globally). Selection guidance is in `.agents/skills/skill-router/SKILL.md`; the
upstream source URL, repo and pinned content hash of every external skill are recorded in
`docs/CLINE_SKILL_SYSTEM.md` and `skills-lock.json`.

## 5. Broad-language protection (existing approval semantics, unchanged)

Broad or ambitious language ("complete design overhaul", "rebuild everything", "fix the whole
platform") **never** authorises a repository-wide change by itself. Always:

1. triage; 2. select skills; 3. minimum discovery; 4. state the scope; 5. produce a plan/assessment;
6. respect the existing approval requirements; 7. implement only after that scope is approved.

Scope, file count and surface count are still never hard gates *inside* an authorised directive
(`operating-model.md` §3) — but the breadth of the *request wording* is not itself the authorisation.

## 6. Anti-overengineering — inherited, restated

The skill system reinforces the existing principle:

```
REMOVE → CONSOLIDATE → REUSE → SIMPLIFY      before      ADD → EXPAND → DUPLICATE
```

A skill recommending a theoretically cleaner architecture is **not** a reason to introduce a new
architecture. Existing Mercenta functionality is preserved unless the Founder explicitly approves
changing it. Specialists advise; they do not authorise.

## 7. Compatibility with DeepSeek/Cline

Upstream skills are preserved byte-for-byte. Where an upstream skill assumes Claude Code-specific
execution (subagents, `TodoWrite`, Claude-only tools, plugin slash commands), the difference is
handled in a thin compatibility note — `.agents/skills/CLINE-COMPAT.md` plus, only where genuinely
required, a per-skill `CLINE-COMPAT.md` beside that skill's `SKILL.md`. The methodology is never
weakened, never rewritten and never duplicated.

## 8. Resume flow (unchanged entry point, with triage inserted)

```
NEW CHAT
→ permanent rules (.clinerules/*)
→ PROJECT_STATUS.md → CURRENT RESUME STATE
→ user: "continue, where you left off"
→ NEXT TASK + EXACT NEXT STARTING POINT
→ TASK TRIAGE (this file)          ← the only new step
→ SELECT REQUIRED SKILLS (skill-router)
→ use_skill → LOAD ONLY THOSE
→ CONTINUE THE TASK (existing rules, existing close-out)
```

The existing resume mechanism remains the entry point; nothing about it is replaced, and the user is
never asked to restate project history or to hand-pick skills.