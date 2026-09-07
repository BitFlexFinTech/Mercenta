/**
 * §Batch-4 item 2 — Sentry error monitoring initialization.
 * Conditionally initializes only when VITE_SENTRY_DSN is configured.
 * Uses dynamic import to keep the Sentry SDK out of the critical path.
 */

const SENTRY_DSN: string | undefined =
  typeof import.meta !== 'undefined'
    ? (import.meta as Record<string, any>).env?.VITE_SENTRY_DSN
    : undefined;

export const sentryEnabled = Boolean(SENTRY_DSN);

export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) {
    console.info('[sentry] No VITE_SENTRY_DSN — running without error monitoring.');
    return;
  }
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: (import.meta as Record<string, any>).env?.MODE ?? 'development',
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
  console.info('[sentry] Initialized.');
}

export async function sentryCaptureException(
  error: Error,
  context?: Record<string, unknown>,
): Promise<string | null> {
  if (!SENTRY_DSN) return null;
  const Sentry = await import('@sentry/react');
  const scope = new Sentry.Scope();
  if (context) scope.setContext('extra', context);
  return Sentry.captureException(error, scope);
}

export async function sentrySetUser(
  user: { id: string; email?: string; role?: string } | null,
): Promise<void> {
  if (!SENTRY_DSN) return;
  const Sentry = await import('@sentry/react');
  if (user) Sentry.setUser({ id: user.id, email: user.email, role: user.role });
  else Sentry.setUser(null);
}
