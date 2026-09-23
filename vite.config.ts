import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
