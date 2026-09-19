import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { BRAND_NAME } from './config/brand';
import './index.css';
import './theme-alpha-shims.css';

document.title = BRAND_NAME;

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
