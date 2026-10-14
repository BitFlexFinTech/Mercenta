/**
 * §Batch -4 — React Error Boundary
 *
 * Catches render-time crashes and displays a graceful fallback instead of
 * white-screening the entire app. Wraps major sections (admin portal, brand
 * portal, individual heavy views).
 *
 * Design-system consistent: dark ink background, brass accents, stamp-red
 * error icon, Fraunces display + Plus Jakarta Sans UI typography via Tailwind.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
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

/** Styled fallback UI matching the project's ink/brass/stamp-red design system. */
function ErrorFallback({ sectionLabel, error, onReset }: {
  sectionLabel?: string;
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] w-full">
      <div className="bg-ink-850 border border-white/[0.06] rounded-ds-lg p-8 max-w-md mx-4 text-center shadow-ds-overlay">
        <AlertTriangle className="w-10 h-10 text-crimson-accent mx-auto mb-4" />
        <h2 className="text-base font-semibold text-white mb-1">
          {sectionLabel ? `${sectionLabel} — something went wrong` : 'Something went wrong'}
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          This section encountered an unexpected error. The rest of the platform
          is unaffected.
        </p>
        {error && (
          <details className="text-left mb-4 bg-black/30 rounded-ds-md p-3">
            <summary className="text-ds-micro text-zinc-600 cursor-pointer hover:text-zinc-400">
              Technical details
            </summary>
            <pre className="mt-2 text-ds-micro text-zinc-500 font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={onReset}
          className="text-xs bg-brass-500 hover:bg-brass-600 text-white font-medium rounded-ds-md px-4 py-2 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}