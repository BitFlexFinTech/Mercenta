import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

/**
 * Lightweight monochrome SVG vertical bar chart with tabular values and hairline baseline.
 * Uses only Mercenta editorial zinc + var(--mr-accent) accent tokens (zero chart libraries).
 */
export function ConsoleBarChart({
  data,
  formatValue = (v) => `£${Math.round(v).toLocaleString('en-GB')}`,
  emptyText = 'No chart series recorded yet.',
  height = 148,
}: {
  data: ChartDatum[];
  formatValue?: (v: number) => string;
  emptyText?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-faint border border-dashed border-hairline rounded-md">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      <div
        className="flex items-end gap-2 pt-3 border-b border-hairline px-1"
        style={{ height }}
        role="img"
        aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}
      >
        {data.map((d, idx) => {
          const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
          const isLast = idx === data.length - 1;
          return (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[11px] font-mono tabular-nums text-ink-600 truncate max-w-full">
                {formatValue(d.value)}
              </span>
              <div className="w-full max-w-[36px] flex items-end flex-1">
                <div
                  title={d.hint ?? `${d.label}: ${formatValue(d.value)}`}
                  className={`w-full rounded-t-[3px] transition-all ${
                    isLast ? 'bg-[var(--mr-accent)]' : 'bg-ink-900'
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-1">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 min-w-0 text-center text-[11px] text-faint truncate font-mono"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Monochrome SVG polyline trend chart with hairline baselines and right-aligned extrema.
 */
export function ConsoleTrendChart({
  data,
  formatValue = (v) => `£${Math.round(v).toLocaleString('en-GB')}`,
  emptyText = 'Not enough dated records to plot a trend.',
}: {
  data: ChartDatum[];
  formatValue?: (v: number) => string;
  emptyText?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-faint border border-dashed border-hairline rounded-md">
        {emptyText}
      </div>
    );
  }

  const w = 480;
  const h = 132;
  const padX = 16;
  const padY = 14;
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const minVal = Math.min(0, ...data.map((d) => d.value));
  const range = Math.max(1, maxVal - minVal);

  const coords = data.map((d, idx) => {
    const x =
      data.length === 1
        ? w / 2
        : padX + (idx / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - ((d.value - minVal) / range) * (h - padY * 2);
    return { x, y, ...d };
  });

  const pointsAttr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-faint">
        <span>Peak: {formatValue(maxVal)}</span>
        <span>Latest: {formatValue(data[data.length - 1].value)}</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-36 overflow-visible"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}
      >
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#E4E4E7" strokeDasharray="3 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#E4E4E7" strokeDasharray="3 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#E4E4E7" />
        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="#09090B"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pointsAttr}
          />
        )}
        {coords.map((c, idx) => (
          <circle
            key={c.label}
            cx={c.x}
            cy={c.y}
            r={idx === coords.length - 1 ? 4 : 3}
            fill={idx === coords.length - 1 ? 'var(--mr-accent)' : '#09090B'}
          >
            <title>{`${c.label}: ${formatValue(c.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-faint">
        {data.map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal proportional track bar (used for order pipeline & completion bars).
 */
export function ConsoleProgressTrack({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-[12px] text-ink-600 tabular-nums font-mono">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded bg-tint overflow-hidden">
        <div className="h-full bg-ink-900 rounded" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Hairline section container card matching Mercenta Next editorial console grammar.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  testId,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="border border-hairline bg-surface-raised rounded-md overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-hairline flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-ink-950">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12px] text-ink-600 max-w-3xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * Quiet tab strip using 1px border rules (never bright pills).
 */
export function ConsoleTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Section tabs',
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1 border-b border-hairline pb-2 mb-4"
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[var(--mr-accent)] ${
              active
                ? 'bg-ink-950 text-on-dark'
                : 'text-ink-600 hover:text-ink-950 hover:bg-tint'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={`ml-1.5 font-mono text-[11px] tabular-nums ${
                  active ? 'text-quiet' : 'text-faint'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Quiet inline banner for disclosures, honest gaps, or mutation feedback.
 */
export function NoticeBanner({
  tone = 'info',
  title,
  message,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  message: ReactNode;
}) {
  const styles =
    tone === 'danger'
      ? 'border-state-danger/20 bg-state-danger/10/70 text-state-danger'
      : tone === 'warning'
        ? 'border-state-warning/20 bg-state-warning/10/70 text-state-warning'
        : tone === 'success'
          ? 'border-state-success/20 bg-state-success/10/70 text-state-success'
          : 'border-hairline bg-surface text-ink-800';

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'danger' || tone === 'warning'
        ? AlertCircle
        : Info;

  return (
    <div role="status" className={`rounded-md border px-3.5 py-2.5 flex items-start gap-2.5 text-[12px] ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        <div className="text-secondary leading-relaxed">{message}</div>
      </div>
    </div>
  );
}

export function formatGbp(amount: number, decimals = 0): string {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
