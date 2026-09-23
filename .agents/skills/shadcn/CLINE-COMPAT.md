# CLINE-COMPAT — shadcn

Thin per-skill compatibility note. **The upstream body (`SKILL.upstream.md`) is unmodified.** Only
the two frontmatter declarations below needed translation for the Cline runtime; the methodology,
rules and file layout are exactly as published.

## Required translations

| Upstream declaration | Cline behaviour | Translation applied |
|---|---|---|
| `user-invocable: false` | Cline's skill loader accepts only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`; the unknown field makes the whole skill fail to load. | Field removed from `SKILL.md`. The skill is therefore *listed* in Cline's skill list rather than being invocation-restricted. Its description already scopes when it applies (shadcn/ui work, `components.json`, presets), and `SKILL.md` adds no trigger of its own — so the practical effect is: the skill loads when shadcn work is requested, and does nothing on unrelated work. |
| `allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx --bun shadcn@latest *)` | Cline has no frontmatter tool-allowlist. Leaving it makes the skill fail to load; deleting it silently would lose the restriction. | Moved into the body: `SKILL.md` states that only `shadcn@latest` CLI invocations are authorised by this skill, executed via `run_commands` with this project's runner (`npx`). |

Everything else — the CLI workflow, component registry, presets, the `rules/*` files, `cli.md`,
`registry.md`, `customization.md`, `mcp.md` — is upstream and untouched.

## What is NOT translated (preserved upstream semantics)

- The upstream instruction to use the project's package runner and to check `packageManager` before
  running commands: retained, because this project uses npm (declared in `package.json`).
- The upstream `components.json` preconditions: retained. This repository does **not** use shadcn/ui
  as its component system (it has its own ink/brass primitives and Tailwind config), so the skill is
  dormant unless a future task explicitly introduces shadcn primitives. That is upstream's own
  conditionality, not a local edit.

## Maintenance

Reinstalling from upstream **overwrites `SKILL.md` with the upstream file**, removing the adapter.
After any reinstall or update:

```
mv .agents/skills/shadcn/SKILL.md .agents/skills/shadcn/SKILL.upstream.md
# then restore this directory's adapter SKILL.md (see docs/CLINE_SKILL_SYSTEM.md §Reinstall)
node scripts/validate-cline-skills.mjs --write-provenance
node scripts/validate-cline-skills.mjs
```