import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  /**
   * §unique-dev-port-per-project (global rule) — MERCENTA OWNS PORT 5182.
   *
   * Defect fixed 2026-10-10: this project pinned NO port, so it fell back to
   * Vite's default 5173 — WHICH IS ALREADY OWNED BY `TSL Zimbabwe/TSL-Zimbabwe`
   * (see `~/.cline/DEV_PORTS.md`). Two dev servers cannot share one port: the
   * second one to start silently slides to another port, so the address you
   * typed can show ANOTHER project's page. `strictPort: true` makes the server
   * STOP with a clear error instead of sliding.
   *
   * 5182 is the next free port in the registry. Anything that must reach the
   * dev server (playwright.config.ts, scripts/runtime-sweep.mjs) is updated to
   * match in the same change — a port is only pinned if every consumer agrees.
   */
  server: { port: 5182, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * §Phase 8-zeroerror + §P3 (2026-09-23) — ONE VENDOR CHUNK, deliberately.
         *
         * History: the dependencies were split per family (`vendor-react`,
         * `vendor-other`, `vendor-supabase`, …). Two production-only mount crashes
         * came out of that split, both invisible to typecheck/build/tests because
         * dev mode is unbundled:
         *   1. Phase 8 — a second scheduler registry (`unstable_scheduleCallback`
         *      undefined), fixed by moving React-internal embedders into
         *      `vendor-react`;
         *   2. §P3 — the same class again: `vendor-react` (recharts) and
         *      `vendor-other` imported EACH OTHER, so recharts' evaluation ran
         *      before lodash/reselect had initialised ⇒
         *      `TypeError: createSelector is not a function`, then
         *      `ReferenceError: Cannot access 'gO' before initialization`, with
         *      `#root` EMPTY on the deployed bundle.
         * The cycle is inherent to splitting a cyclic graph, so the fix removes the
         * possibility rather than relocating it: ALL of `node_modules` now lands in
         * a single `vendor` chunk (one instance of React, scheduler and every
         * helper; a cycle cannot span one module). App code still splits normally.
         *
         * Verified by BOOTING the built bundle, not by inspection: `npm run build`
         * then `node test-results/dist-boot-check.mjs <url>` against a served
         * `dist` (a generated artefact). `scripts/validate-production-boot.mjs`
         * keeps this verified every session.
         */
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
