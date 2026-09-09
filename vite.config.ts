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
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // §Phase 8-zeroerror — React-internal embedders (recharts' dependency
          // chain: use-sync-external-store bundles React's scheduler glue,
          // react-redux/@reduxjs/toolkit consume it) MUST share the react chunk:
          // splitting them out yielded a second scheduler registry and a
          // production-only mount crash (`unstable_scheduleCallback` undefined).
          if (
            id.includes('node_modules/use-sync-external-store') ||
            id.includes('node_modules/react-redux') ||
            id.includes('node_modules/@reduxjs/toolkit') ||
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
      },
    },
  },
});
