# UI/UX REDESIGN — WAVE 1 FOUNDATION PASS (2026-09-18)

> Phase: **UI/UX redesign — foundation** (branch `redesign/foundation`, HEAD `ea700a1`,
> protected baseline `959b4d2` remains an ancestor; the working tree was intentionally
> left dirty — **no git mutation was performed**).
>
> This is the FIRST Wave of the UI/UX redesign. It is explicitly **not** a claim that
> the entire application has been visually redesigned. Wave 2 (page-by-page surface
> migration) requires explicit user approval (see "Wave 2 — NOT STARTED" below).

## Scope delivered (Wave 1)

| Area | What exists now |
|---|---|
| A — Theme/token architecture | `src/config/themes.ts` = canonical six-theme + design-token single source of truth; `src/context/ThemeContext.tsx` applies CSS variables + `data-mercenta-theme`; whole Tailwind palette routed through `var(--mr-*)`; alpha-modifier utilities re-generated for variable colours (`src/theme-alpha-shims.css` ← `scripts/gen-theme-alpha-shims.mjs`, 406 rules); light-shell remap layer in `src/index.css` |
| B — Minimal Light default | `DEFAULT_THEME = 'minimal-light'` — verified first-load `dataset.mercenta-theme=minimal-light`, body `rgb(246,247,249)`; light surfaces, hairline borders, deep-gold accent, semantic colour used intelligently |
| C — Six themes | Minimal Light · Professional · Bold · Fun · Serious · **Current Mercenta** (preserved ink-near-black + brass + parchment identity, re-expressed through the new system) |
| D — Dark foundation | Bold `#0B0C0F`, Serious `#0E0F11`, Current `#000000` — genuinely near-black/charcoal, **no navy** (validator-enforced: avg<40, blue-dominance rejected) |
| E — App shell | `AppShell`/`Sidebar`/`Header` rebuilt on tokens: `data-shell-theme`, feature-identity active nav rail, Avatar footer, theme selector in the top bar, severity-aware notification bell, persisted theme choice |
| F — Presentation seams | `Avatar` (profile image seam / initials fallback / aria + responsive), `ThemeSelector`, notification severity presentation, `UnlockGrowth` |
| G — Homepage | Redesigned hero composition + **the existing animated shipment tracker preserved verbatim** (`route-dot` / `tracker-ping` keyframes retained, shadow tokenised) + "Unlock growth with data" element (truthful copy) |
| H — Charts | `MercentaCharts.tsx` — delicate line (1–1.5px, subtle grid, quiet axes, hover points) + thin-ring doughnut (11–12px, centre metric), accessible; showcased on Design System |
| I — Matrix | `requirements-registry.json` **198 → 214** (16 `uiux-*` rows; 15 built_and_tested + 1 explicit wave-2 deferral `not_started`); `verify-registry` back at the documented **123** informational baseline |

## How the six themes coexist without a second component system

One canonical semantic colour language: critical=red · warning=yellow · info=blue/cyan
· success=green, plus expressive feature tokens (`--mr-feature-{intel,orders,finance,
social,compliance,ops}`). The same semantic colour keeps the same MEANING in every
theme; only the EXPRESSION changes:
Minimal=indicator · Professional=tint · Bold=surface · Fun=expressive · Serious=edge
· Current=preserved-Mercenta. Themes are presentation-only: `e2e/uiux-foundation.spec.ts`
proves data (KPI values) and permissions (Super Admin nav hidden for brands) are
identical across theme switches.

## Homepage: the animation that was identified and preserved

- **What creates it:** pure CSS keyframes in `src/index.css` — `@keyframes route-dot`
  (moving waypoint dot on the dotted route line, 6s loop) and `@keyframes tracker-ping`
  (soft radar ping on the "LIVE" indicator, 2s loop), consumed by
  `src/components/marketing/Home.tsx` in the hero's **Shipment Tracker** card
  (`.animate-route-dot`, `.animate-tracker-ping`), data-driven by the canonical
  `HomepageContent.tracker` model.
- **How it was preserved:** the tracker card markup, keyframes and content model are
  unchanged; only the heavy `shadow-black/50` became the `--mr-shadow-overlay` token so
  light themes stay refined. Browser-verified in **both** Minimal Light and Bold
  (`animationName` resolves to `route-dot` / `tracker-ping`).

## Verification evidence (2026-09-18)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run build` | **PASS** (3.0s) |
| `node scripts/validate-theme-foundation.mjs` | **50 PASS / 0 FAIL** |
| `node scripts/verify-registry.mjs` | baseline restored — **123 informational flags, zero new issues** |
| `e2e/uiux-foundation.spec.ts` | **9/9 PASS** |
| `e2e/app-shell.spec.ts · design-system · notifications · dashboard` | all PASS (55 passed in the first affected run) |
| Browser (Playwright/Chromium 1440x900 + 390x844) | six themes applied; charcoals `rgb(11,12,15)` / `rgb(14,15,17)` / `rgb(0,0,0)`; sidebar `rgb(255,255,255)` in light; notification severities `critical/warning`; chart stroke 1.5px / ring 11px; screenshot batch `test-screenshots/wave1/` |

## Wave 2 — NOT STARTED (explicit STOP condition)

Per the approved two-wave instruction, these are **explicitly deferred** until the user
inspects Wave 1 and approves:

- Brand Overview redesign (SEE/UNDERSTAND) — currently token-adapted, not redesigned
- Brand **Operational** (ACT/COMPLETE) surface work
- Marketplace Intelligence / Orders & Distribution / Finance / Super Admin surface
  redesigns
- Broader page-by-page component migration
- Additive per-page chart/notification adoption

## Constraints honoured

No API activation · no credential/.env change · no Rakazo/parked-item work · no
deployment · no git mutation · protected `design/*.png` assets untouched · business
logic / data / permissions / routes / tenant isolation / simulation semantics / AI
policy unchanged · social-media and all existing capabilities intact.