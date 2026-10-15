/**
 * §Batch -4 — React Error Boundary
 *
 * Catches render-time crashes and displays a graceful fallback instead of
 * white-screening the entire app. Wraps major sections (admin portal, brand
 * portal, individual heavy views).
 *
 * §OPENSHIP BATCH 8 — the fallback's TREATMENT is no longer declared here: it
 * renders the canonical `ErrorState` (`src/components/ui.tsx`), so the previous
 * sentence describing this file as "dark ink background, brass accents,
 * stamp-red error icon" is SUPERSEDED rather than left standing — those were the
 * pre-theme values, and the state now takes the theme's card token, its danger
 * token and the canonical control. What this file owns is the CONTAINMENT
 * behaviour: catching the fault, reporting it, and offering the reset.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui';
import { sentryCaptureException } from '@/lib/monitoring/sentry';

interface Props {
  children: ReactNode;
  /** Optional human-readable label for the crashed section, shown in the fallback UI. */
  sectionLabel?: string;
  /** Optional callback fired on error (e.g. logging to monitoring service). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to Sentry when VITE_SENTRY_DSN is configured; no-op otherwise
    sentryCaptureException(error, { sectionLabel: this.props.sectionLabel, componentStack: info.componentStack });
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback
        sectionLabel={this.props.sectionLabel}
        error={this.state.error}
        onReset={() => this.setState({ hasError: false, error: null })}
      />;
    }
    return this.props.children;
  }
}

/**
 * Styled fallback UI. §OPENSHIP BATCH 8 — it now renders THROUGH the canonical
 * `ErrorState` owner (`src/components/ui.tsx`) instead of carrying the only copy
 * of the treatment, so the error state has ONE implementation and takes its
 * surface edge from the theme (`ds-card` → `--mr-card-border`) rather than the
 * hardcoded `border-white/[0.06]` it used to declare. The copy is unchanged on
 * purpose: two browser specs and an operator's muscle memory both name it.
 */
function ErrorFallback({ sectionLabel, error, onReset }: {
  sectionLabel?: string;
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <ErrorState
      className="h-full min-h-[200px]"
      title={sectionLabel ? `${sectionLabel} — something went wrong` : 'Something went wrong'}
      description="This section encountered an unexpected error. The rest of the platform is unaffected."
      details={error ? `${error.message}\n${error.stack ?? ''}` : undefined}
      onRetry={onReset}
    />
  );
}