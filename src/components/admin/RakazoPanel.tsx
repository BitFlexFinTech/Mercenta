/** §Rakazo — Super Admin iframe dashboard for the Rakazo bot fleet. */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

type LoadState = 'loading' | 'loaded' | 'error';

const RAKAZO_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_RAKAZO_URL as string | undefined)) ||
  'https://24-144-86-50.sslip.io';

/**
 * If the iframe hasn't fired onLoad within TIMEOUT_MS we show the fallback
 * error card. The onLoad event never fires for a cross-origin page that loads
 * successfully unless the page itself sends a postMessage, so we treat *any*
 * iframe load event (even error-page HTML from behind the IP) as "loaded".
 * The timeout catches the case of a completely unreachable host.
 */
const TIMEOUT_MS = 10_000;

export function RakazoPanel() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [iframeKey, setIframeKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
/** Clear the timeout, regardless of current state. */
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Called when the iframe src changes or is refreshed. */
  const startLoading = useCallback(() => {
    clearTimer();
    setLoadState('loading');
    timeoutRef.current = setTimeout(() => {
      setLoadState((prev) => (prev === 'loading' ? 'error' : prev));
    }, TIMEOUT_MS);
  }, [clearTimer]);

  useEffect(() => {
    startLoading();
    return clearTimer;
  }, [iframeKey, startLoading, clearTimer]);

  const handleLoad = useCallback(() => {
    clearTimer();
    setLoadState('loaded');
  }, [clearTimer]);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const openInNewTab = useCallback(() => {
    window.open(RAKAZO_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const retry = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);
return (
    <div className="flex flex-col h-full gap-0">
      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0 py-4">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-state-success" />
          <h2 className="text-lg font-semibold text-strong">Rakazo Bot Dashboard</h2>
          <span
            className={cn(
              'inline-block w-2.5 h-2.5 rounded-full',
              loadState === 'loaded'
                ? 'bg-emerald-500'
                : loadState === 'loading'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500',
            )}
            title={
              loadState === 'loaded'
                ? 'Droplet reachable'
                : loadState === 'loading'
                  ? 'Connecting…'
                  : 'Droplet unreachable'
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openInNewTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-medium
                       bg-tint hover:bg-tint/[0.1] text-strong hover:text-strong
                       transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-medium
                       bg-tint hover:bg-tint/[0.1] text-strong hover:text-strong
                       transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Iframe (or error fallback) ──────────────────────────── */}
      <div className="flex-1 relative min-h-[300px]">
        {loadState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-overlay/50 rounded-ds-md z-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-state-success animate-spin" />
              <span className="text-sm text-muted">Connecting to Rakazo droplet…</span>
            </div>
          </div>
        )}

        {loadState === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-8 rounded-ds-lg border border-state-danger/20 bg-red-500/5 max-w-md text-center">
              <AlertTriangle className="w-10 h-10 text-state-danger" />
              <div>
                <h3 className="text-base font-semibold text-state-danger mb-1">
                  Unable to reach Rakazo droplet
                </h3>
                <p className="text-sm text-muted">
                  The bot dashboard at <code className="text-xs bg-surface-hover px-1.5 py-0.5 rounded-ds-sm">{RAKAZO_URL}</code>{' '}
                  did not respond within {TIMEOUT_MS / 1000} seconds.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openInNewTab}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-ds-sm text-sm font-medium
                             bg-tint hover:bg-tint/[0.1] text-strong hover:text-strong
                             transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </button>
                <button
                  onClick={retry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-ds-sm text-sm font-medium
                             bg-state-success/10 hover:bg-emerald-500/20 text-state-success hover:text-state-success
                             transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={RAKAZO_URL}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
            title="Rakazo Bot Dashboard"
            allowFullScreen
            onLoad={handleLoad}
            className="rounded-ds-md"
          />
        )}
      </div>

      {/* ── Footer strip ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0 py-3 text-xs text-muted border-t border-hairline mt-4">
        <span>20 bots active · Demo mode</span>
        <span>Droplet: 24.144.86.50</span>
      </div>
    </div>
  );
}