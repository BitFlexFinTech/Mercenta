# WAVE 4 — MERCENTA BRAIN: GENUINE 3D SPATIAL EXPERIENCE

**Date:** 2026-09-22 · **Branch:** `redesign/foundation` · **Scope:** Wave 4 of the full UI/UX redesign

---

## 1. What was replaced

The previous Brain canvas (`src/components/shared/brain/BrainCanvas.tsx`) was a **flat 2D SVG
graph**: nodes drawn as `<circle>` on a 1000×1000 viewBox, edges as straight `<line>`s, pan/zoom
by transform. It failed the redesign's acceptance test for the Brain ("a 2D graph is a failure",
"a cosmetically animated graph is a failure", "a dashboard surrounding a graph is a failure").

It is now a **real WebGL scene**: perspective camera, orbit navigation, a spatial wheel of five
cluster sectors, depth-stratified records, animated relationships and travelling signals.

**The data did not change.** `src/lib/intelligence/brain/buildGraph.ts` — the canonical,
tenant-scoped, deterministic projection — was not touched. The Brain still owns no business state
and still makes zero network calls (`validate:brain` → 30 assertions, runtime executed, 0 network
calls).

## 2. Open-source reuse — source → integration → licence → verification

| Source | Licence | What Mercenta uses it for | Where it is integrated | Verified |
|---|---|---|---|---|
| `three` 0.186.0 | MIT | WebGL renderer, scene-graph primitives, geometry (`SphereGeometry`, `OctahedronGeometry`, `BufferGeometry`, `InstancedMesh`), math (`Vector3`, `Color`, `Object3D`) | `src/components/shared/brain/BrainCanvas3D.tsx`, `BrainScene.tsx` | Build + Chromium render (`e2e/mercenta-brain.spec.ts` 10/10) |
| `@react-three/fiber` 8.18.0 | MIT | Declarative React renderer for three (`<Canvas>`, `useFrame`, `useThree`) — avoids hand-writing a render loop and lifecycle management | `BrainScene.tsx`, `BrainCanvas3D.tsx` | same |
| `@react-three/drei` 9.122.0 | MIT | `OrbitControls` — camera orbit, damping, auto-rotation, distance clamps | `BrainScene.tsx` | same |

**Version pins are deliberate.** R3F v9 requires React 19; this project is React 18.3, so the v8
line (`react >=18 <19`) is the only compatible one. `@types/three@0.186.0` is declared explicitly
rather than relied on transitively.

### What was NOT reused, and why (required justification)

Investigation covered open-source 3D graph/knowledge-graph systems (force-directed 3D layouts,
WebGL node/edge libraries, 3D knowledge-graph viewers). None was adopted, for concrete reasons:

1. **The graph is already computed.** Mercenta's node/edge model, its four-state epistemic status,
   its provenance pointers, its authority model and its tenant-scoped builder are canonical
   product contracts (`types.ts`, `buildGraph.ts`). Every general-purpose graph library wants to
   own its own node/edge schema, and adopting one would have meant translating — and then keeping
   in step — a second representation of data the repository already defines. That is exactly the
   duplication the single-source-of-truth rule forbids.
2. **The placement authority is already canonical.** `layout.ts` decides the cluster sector, ring
   and angle of every record, deterministically, with no force simulation. A force-directed
   library would have replaced a deterministic, testable placement with a stochastic one.
3. **The accessibility contract is non-negotiable and library-specific.** The Brain must expose
   every entity as a real, named DOM element with a stable testid (keyboard and screen-reader
   access, plus the existing acceptance suite). No 3D graph library provides that; it is
   implemented here as a projected DOM layer.
4. **Licence/architecture fit.** Several candidate libraries are large, opinionated frameworks
   that would have imposed their own state model, styling system and animation semantics on a
   product whose design system is already canonical.

The reusable parts that *did* exist and fit were reused rather than rebuilt: the renderer, the
React renderer binding and the camera controls (the three rows above). The Mercenta-specific parts
— the spatial wheel, the entity field, the relationship flow, the projection layer — are our own.

## 3. Founder-provided resources — actually used

Both mandatory repositories were cloned (MIT) and read in-session; the rules below changed the
implementation rather than being cited:

| Skill | Rule applied | Where |
|---|---|---|
| `emilkowalski/skills` → `pick-ui-library` | "Check what's already installed"; 3D globes → Cobe, animation → motion, charts → recharts. Confirmed recharts is already the chart library and no animation library is needed for the Brain (three's own clock drives it) | reuse decision, §2 |
| `emilkowalski/skills` → `emil-design-eng` | Never animate from `scale(0)`; ease-out for enters; springs for drag momentum; a static cue alongside every motion | node emphasis, core spin, reduced-motion behaviour |
| `jakubkrehel/skills` → `better-ui` | "Skip animation on page load"; interruptible transitions over keyframes; motion restraint; every animated state change also needs a static cue | the mount scroll is instant, not `smooth`; selection emphasis is a size change (static) *plus* a pulse |
| `jakubkrehel/skills` → `better-accessibility` | Focus, keyboard support, reduced motion, hit areas | arrow-key record navigation, Enter/Escape, `prefers-reduced-motion`, hit target = the visible sphere |

## 4. The one defect that mattered, and its real root cause

Three browser measurements were taken rather than assumed, and each one overturned a hypothesis:

1. **Overlapping hit boxes.** The first DOM layer gave every entity a fixed 18–56 px box. Measured
   node spacing inside a ring is ≈ 11 px, so a neighbour intercepted the click
   (`elementFromPoint` returned `brain-node-brand:brand-autoglym` when clicking Astonish).
   *Fix:* the pointer target is now the **projected sphere itself** (with a 6 px floor), and
   `zIndex` is derived from camera distance so the **nearest record** wins the pointer.
2. **Unreachable records.** Records outside the camera frustum projected outside the canvas box;
   the layer is clipped by that box, so those targets existed and could not be hit.
   *Fix:* the camera is fitted to the model's bounding **sphere** (`sin(halfFov)`, conservative, so
   rotation cannot swing a record out of frame), and anything outside the frame is **hidden**
   rather than left clipped.
3. **Zero targets at first interaction.** `visibleNodes: 0` was measured at the instant the
   surface became interactive: positions were written only by the animation frame, so before the
   first frame every entity element was `visibility:hidden` at zero size. This was made worse by
   an initial `React.lazy` code split, which widened the window.
   *Fix:* **one** pure projection (`src/lib/intelligence/brain/project.ts`) that runs both before
   the first paint (`useLayoutEffect`) and every frame afterwards, plus a `ResizeObserver`; and the
   lazy split was **removed** because the async gap was itself the defect. The Brain sits behind an
   already-lazy `AdminShell`, so three.js still never reaches a public or brand first paint.

## 5. Accessibility model

- Every visible entity is a real `<div role="button">` with an accessible name
  (`"<Kind>: <label> (<STATUS>)"`), `data-status`, `data-kind` and the same `brain-node-<id>`
  testid the 2D canvas exposed.
- The canvas wrapper is `role="group"` with a text alternative stating the rendered counts and the
  keyboard contract; it is focusable and supports **arrow keys** to change the selected record,
  **Enter/Space** to select, **Escape** to clear.
- Colour is never the only signal: selection is a size change and a ring; status is stated in words
  in the inspector and in the accessible name.
- `prefers-reduced-motion`: no auto-rotation, no breathing, no travelling signals, no core spin —
  the scene renders still and remains fully explorable.

## 6. Verification (all run in-session)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm run build` | exit 0, 6.71 s |
| `node scripts/validate-mercenta-brain.mjs` | PASS — 30 assertions, runtime executed, 0 network calls |
| `npx playwright test e2e/mercenta-brain.spec.ts` | **10 passed** |
| `npx playwright test e2e/canonical-propagation.spec.ts e2e/runtime-entry.spec.ts` | **10 passed** |
| `npx playwright test e2e/accessibility.spec.ts` | **16 passed** |
| `npx playwright test e2e/redesign-surfaces.spec.ts` | **11 passed** (incl. "Mercenta Brain holds at every target width") |
| `node scripts/validate-theme-foundation.mjs` / `validate-uiux-redesign.mjs` / `validate-workspace-shell.mjs` | 41 / 344 / 92 PASS, 0 FAIL |

**No test was weakened, skipped or marked fixme to reach these results.**

## 7. Honest gaps

- **Bundle accounting is not fully explained.** three.js / R3F / drei are bundled into the shared
  `vendor-other` chunk (1,039 kB raw / 286 kB gzip) via the existing `manualChunks` rule, which
  routes every unmatched `node_modules` module there. The chunk's size is essentially unchanged
  from the pre-Brain build, which was not expected and has not been explained; it is recorded here
  rather than asserted away. Total bundle size did not regress.
- **Colour contrast** on the Brain is measured and reported by the accessibility suite
  (9 serious `color-contrast` nodes on the Brain surface), consistent with that suite's documented
  two-tier policy — advisory rules are reported, not gated. Not fixed here.
- **The Logistics Hub (Wave 3) is still the old 2D SVG map** and still fails its acceptance test.
  Wave 4 did not touch it.

