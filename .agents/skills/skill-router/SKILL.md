---
name: skill-router
description: Use at the start of a request, or when unsure which specialist capability applies, to classify the request as QUESTION / ANALYZE / PLAN / IMPLEMENT and to select the MINIMUM set of specialist or UI skills for it. Contains the routing table, the invocation protocol and the anti-patterns. Use before broad exploration; not a substitute for the specialist skills themselves.
---

# Skill Router (task triage)

Classify first, then pick the smallest set of skills, then load only those. Selecting a skill is
not optional politeness — if a skill is selected, invoke it so its real instructions load.

## 1. Classification (state it on one line)

| Mode | Signal | Allowed work |
|---|---|---|
| **QUESTION** | "why is…", "what does…", "how come…", "is X true", "compare A and B" | Answer. No implementation. |
| **ANALYZE** | "analyse whether…", "assess the current…", "what should change", "find the problems" | Targeted investigation; findings + recommendation. No application code changes. |
| **PLAN** | "create a plan", "roadmap", "architecture for…", "migration strategy", "overhaul plan" | Plan with scope, phases, risks, gates. No application code changes unless asked. |
| **IMPLEMENT** | "implement", "build", "fix", "change", "add … to the app" | Change code under all existing Mercenta rules. |

Broad wording ("complete design overhaul") is **PLAN** until the scope is approved — never a
repository-wide rewrite authorisation. Ambiguous: ask one clarifying question rather than guessing.

## 2. Routing table — specialist skills (authored for Mercenta)

| The work is about… | Load |
|---|---|
| requirements, workflows, business rules, edge cases, acceptance criteria, model A/B questions | **business-analyst** |
| sequencing, scope boundaries, phase gates, progress truth, project-state upkeep | **project-manager** |
| boundaries, ownership of a value, data contracts, seams, tenant isolation, integration modes, reuse-vs-add | **senior-software-architect** |
| writing/changing/debugging/testing code, validators, root-cause work, proof | **senior-software-engineer** |
| IA, hierarchy, density, states, drill-down, name-implies-capability, flow friction, accessibility of a flow | **ux-product-analyst** |

## 3. Routing table — upstream UI skills (verbatim upstream, `.agents/skills/`)

| The work is about… | Load |
|---|---|
| UI implementation / new interface composition / distinctive visual direction | **frontend-design** |
| Apple-style interface and fluid-motion principles | **apple-design** |
| component-system work (shadcn primitives, composition, tokens) | **shadcn** |
| accessibility conformance and audit | **accessibility** |
| interaction and animation design/implementation | **interaction-design**, plus **emil-design-eng** where taste/timing matters |
| responsive / adaptive behaviour across breakpoints and inputs | **adapt** — published upstream inside **impeccable** as its `adapt` mode (`reference/adapt.md`), because the publisher consolidated it |
| visual polish — shadow/elevation/depth | **beautiful-shadows** |
| general interface-quality pass (spacing, focus, motion, details) | **better-interface** |
| evaluating an existing interface and producing a prioritised review | **design-review** (and **ux-product-analyst** for the flow view) |

Cross-disciplinary work may load several — but only those that are genuinely needed, and state which
ones and why.

## 4. Invocation protocol

1. Classify and state the mode.
2. Choose the minimum skill set from §2/§3 and say why each is needed.
3. Invoke each chosen skill (`use_skill`, or the `/skill` slash command) so its real `SKILL.md` loads.
4. Obey the skill's methodology while doing the work; keep any project rule that is stricter.
5. Do not re-summarise the skill into your own prompt, and do not approximate it from memory.
6. If a skill's guidance conflicts with a Mercenta rule, the Mercenta rule wins and the conflict is
   reported, not silently resolved.

## 5. Minimum-context rules that apply on every job

- Resume from `PROJECT_STATUS.md` → `CURRENT RESUME STATE` (first screen only).
- Open only the files the resume state's `EXACT NEXT STARTING POINT` (or the task's own scope) names.
- Targeted `grep -rn`/`rg` over directory sweeps; bounded line ranges over whole-file reads.
- Never re-read a file from memory; read immediately before editing.
- Never reload every skill, and never reload the full project history.

## 6. Anti-patterns (each has caused real waste)

- Reading a skill file once and claiming it is "installed" — installation is the file being present in
  a scanned skill directory; use is the `use_skill` invocation.
- Scanning the repository to answer a question that one `grep` answers.
- Adding a new module/abstraction because a skill prefers cleaner theory — REMOVE → CONSOLIDATE →
  REUSE → SIMPLIFY comes first.
- Treating a PLAN request as permission to edit application code.
- Loading UI skills for a backend task (or the reverse) "to be safe".

## 7. Example classifications

- "Why is the Overview dashboard so cluttered?" → **QUESTION**; skills: `ux-product-analyst`,
  `design-review`; inspect only the dashboard component and its data.
- "Analyse whether Mercenta needs a complete design overhaul." → **ANALYZE**; skills:
  `ux-product-analyst`, `senior-software-architect`, `design-review`, `frontend-design`; findings +
  recommendation, no code changes.
- "Create a complete design-overhaul plan." → **PLAN**; skills: `ux-product-analyst`,
  `senior-software-architect`, `senior-software-engineer`, `project-manager`, `frontend-design`,
  `design-review`, `accessibility`, `interaction-design`, `adapt`, `shadcn` as relevant; phased plan,
  no implementation until approved.
- "Implement the approved design overhaul." → **IMPLEMENT**; load only the skills the approved scope
  needs, obey every Mercenta protection rule and the close-out sequence.