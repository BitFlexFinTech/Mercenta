import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import './theme-alpha-shims.css';

// §SEO FOUNDATION — the document title is NO LONGER set here. Route metadata
// (title, description, canonical, robots) is owned by ONE component
// (`src/components/shared/RouteMetadata.tsx`), which resolves it per route and
// per environment from `src/lib/seo/publicRoutes.ts`. A second writer here is
// exactly how every route ended up advertising the homepage title.

// §Batch-4 item 2 — initialize error monitoring if VITE_SENTRY_DSN is set
// Dynamic import keeps the Sentry SDK (~280 KB) out of the first-load critical path
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);

// Defer sentry init until AFTER first render so it doesn't block paint
queueMicrotask(() => {
  import('./lib/monitoring/sentry').then((m) => m.initSentry());
});
