# USERTOUR / PRODUCT-EDUCATION EVALUATION

> Repository inspection performed 2026-09-21 (redesign workstream, session 3).
> **No paid service was deployed, activated or subscribed to.** This document is
> an evaluation and an architecture note only.

## What already exists in the repository

| Piece | File | What it actually does |
|---|---|---|
| Tour engine | `src/components/shared/TourEngine.tsx` | Coach-mark/step engine with completion + skip state, exposed through `isTourCompleted` / `isTourSkipped` / `restartTour` / `useTourProgress` |
| Tour definitions | `src/config/tours/tourDefinitions.ts` | Declarative step definitions (route-aware anchors, `data-tour` attributes) |
| Tour loader | `src/components/shared/TourLoader.tsx` | Mounts the active tour |
| Admin surface | `src/components/admin/UsertourAdminPanel.tsx` | Admin view over the tours (canonical workspace composition) |
| Brand bridge | `src/components/shared/UsertourBrandBridge.tsx` | Brand-scoped tour wiring |
| Brand restart UI | `src/components/brand/BrandSettings.tsx` → `ToursSection` | Per-brand restart of a completed/skipped tour |
| Browser coverage | `e2e/tours.spec.ts` | Executes the tours in a real browser, including dismissal |

So Mercenta already owns a **route-aware, declarative, replayable walkthrough
system** with real browser coverage. It is not a stub.

## Screenity-style requirement (recordings / cursor emphasis / GIF-MP4-WebM / KB embedding)

**Assessment: not present, and not needed for correctness.**

- There is no recording capture, no cursor-emphasis renderer and no media
  pipeline in the repository (`grep` finds none).
- The knowledge base is text (`src/data/knowledgeBase.ts` +
  `src/lib/helpdesk/kbSufficiency.ts`), and the helpdesk already surfaces KB
  sufficiency verdicts, so KB *embedding* is a presentation question, not a new
  system.
- A recording pipeline would add a media dependency, storage cost and a
  maintenance surface. Nothing in the product currently depends on it.

**Recommendation:** treat screen recordings as an *optional later layer over the
existing tour definitions* — the tour steps already carry the route and the
anchor, which is exactly the timeline a recording tool needs. Do not add it now.

## Trailguide-style requirement (interactive walkthroughs / route-aware steps / Playwright-compatible definitions)

**Assessment: substantially already satisfied.**

- Route-aware steps: yes — `data-tour` attributes are placed on the shell and
  nav items (`BrandShell.tsx`, `AdminShell.tsx`) and the definitions consume
  them.
- Reusable, test-compatible definitions: yes — the same `data-tour` anchors are
  what `e2e/tours.spec.ts` drives, so a tour definition and a Playwright selector
  are the same contract. That is the Trailguide property the brief asks for.
- Interactive: yes — steps advance through real UI.

## Conclusion

| Requirement | Status |
|---|---|
| Route-aware interactive walkthroughs | **PRESENT / VERIFIED** (`e2e/tours.spec.ts`) |
| Reusable Playwright-compatible step definitions | **PRESENT** (`data-tour` = the shared anchor contract) |
| Restart / skip / completion state | **PRESENT** |
| Screen-recording capture + cursor emphasis + media export | **NOT PRESENT — intentionally deferred** (no dependency added, no paid service activated) |
| KB embedding in a tour step | **NOT PRESENT — deferred**; the KB and its sufficiency layer exist, so the seam is a rendering step |

No paid dependency was added. No production activation occurred.
