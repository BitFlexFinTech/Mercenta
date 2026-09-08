import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={cn(
        'bg-ink-850 border border-white/[0.06] rounded-xl',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        className
      )}
    >
      {children}
    </span>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  'data-state'?: string;
  title?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  type = 'button',
  'data-state': dataState,
  title,
}: ButtonProps) {
  const variants = {
    primary:
      'bg-brass-500 hover:bg-brass-600 text-ink font-semibold shadow-ds-raised',
    secondary: 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]',
    tertiary: 'bg-ink-800 hover:bg-ink-700 text-zinc-300 border border-white/[0.06]',
    ghost: 'hover:bg-white/[0.04] text-zinc-400 hover:text-white',
    // `danger` retained for backward compatibility; `destructive` is canonical.
    danger: 'bg-crimson-accent hover:bg-red-700 text-white',
    destructive: 'bg-state-danger hover:bg-red-700 text-white',
    link: 'text-brass-400 hover:underline underline-offset-4 p-0 h-auto shadow-none',
  } as const;
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
  } as const;
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      title={title}
      data-state={dataState ?? (loading ? 'loading' : disabled ? 'disabled' : undefined)}
      className={cn(
        'rounded-lg inline-flex items-center justify-center gap-2 font-medium',
        'transition-ds duration-200',
        variant === 'link' ? 'h-auto leading-none' : 'min-h-[36px]',
        variants[variant],
        sizes[size],
        isDisabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

interface InputProps {
  label?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
  /** §Phase 5 — form foundation. */
  id?: string;
  error?: string;
  helper?: string;
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  className,
  readOnly,
  id,
  error,
  helper,
}: InputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\W+/g, '-')}` : undefined);
  const describedBy =
    [helper ? `${inputId}-helper` : null, error ? `${inputId}-error` : null].filter(Boolean).join(' ') ||
    undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-zinc-400 mb-1.5">
          {label} {required && <span className="text-state-danger">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-brass-500/50 focus:ring-1 focus:ring-brass-500/30 transition-colors"
      />
      {helper && !error && (
        <p id={`${inputId}-helper`} className="text-[11px] text-zinc-500 mt-1">{helper}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-[11px] text-state-danger mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}

interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
  className,
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {label} {required && <span className="text-crimson-accent">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brass-500/50 focus:ring-1 focus:ring-brass-500/30 transition-colors appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextareaProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: TextareaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/50 focus:ring-1 focus:ring-brass-500/30 transition-colors resize-none"
      />
    </div>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

export function Checkbox({
  label,
  checked,
  onChange,
  required,
}: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            'w-4 h-4 rounded border transition-all flex items-center justify-center',
            checked
              ? 'bg-brass-500 border-brass-500'
              : 'border-white/[0.15] group-hover:border-white/[0.3]'
          )}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </span>
      <span className="text-xs text-zinc-300 leading-relaxed">
        {label} {required && <span className="text-crimson-accent">*</span>}
      </span>
    </label>
  );
}
/* ── §Phase 5 — canonical status / feedback primitives ───────────────────── */

/** Semantic status — machine + human readable, never colour-only. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brass';

const STATUS_STYLES: Record<StatusTone, { badge: string; dot: string; label: string }> = {
  success: { badge: 'bg-state-success/15 text-state-success border-state-success/25', dot: 'bg-state-success', label: 'Success' },
  warning: { badge: 'bg-state-warning/15 text-state-warning border-state-warning/25', dot: 'bg-state-warning', label: 'Warning' },
  danger: { badge: 'bg-state-danger/15 text-state-danger border-state-danger/30', dot: 'bg-state-danger', label: 'Error' },
  info: { badge: 'bg-state-info/15 text-state-info border-state-info/25', dot: 'bg-state-info', label: 'Info' },
  neutral: { badge: 'bg-white/[0.04] text-zinc-400 border-white/[0.08]', dot: 'bg-zinc-500', label: 'Neutral' },
  brass: { badge: 'bg-brass-500/15 text-brass-300 border-brass-500/25', dot: 'bg-brass-400', label: 'Accent' },
};

/**
 * Semantic StatusBadge: icon + dot + label, machine-readable via `data-status`
 * and `role="status"`. Colour is never the sole indicator.
 */
export function StatusBadge(props: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
  dataStatus?: string;
}) {
  const { tone, children, className, dataStatus } = props;
  const s = STATUS_STYLES[tone];
  return (
    <span
      role="status"
      aria-label={typeof children === 'string' ? children : s.label}
      data-status={dataStatus ?? tone}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border', s.badge, className)}
    >
      <span aria-hidden="true" className={cn('status-dot', s.dot)} />
      {children}
    </span>
  );
}

export type AlertTone = 'success' | 'warning' | 'error' | 'info';

const ALERT_STYLES: Record<AlertTone, string> = {
  success: 'border-state-success/25 bg-state-success/10 text-state-success',
  warning: 'border-state-warning/25 bg-state-warning/10 text-state-warning',
  error: 'border-state-danger/30 bg-state-danger/10 text-state-danger',
  info: 'border-state-info/25 bg-state-info/10 text-state-info',
};

export function Alert({
  tone,
  title,
  children,
  className,
}: {
  tone: AlertTone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('rounded-md border px-3.5 py-2.5 text-sm', ALERT_STYLES[tone], className)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-[13px] opacity-90">{children}</div>}
    </div>
  );
}

/** REST-friendly Tabs with explicit ARIA tab semantics. */
export function Tabs({
  items,
  active,
  onSelect,
  ariaLabel,
  className,
}: {
  items: { id: string; label: string; testId?: string }[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel ?? 'Tabs'} className={cn('flex gap-1 border-b border-white/[0.06]', className)}>
      {items.map((it) => {
        const selected = active === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={selected}
            data-state={selected ? 'active' : 'inactive'}
            onClick={() => onSelect(it.id)}
            data-testid={it.testId}
            className={cn(
              'px-3.5 py-2 text-sm font-medium border-b-2 transition-colors',
              selected ? 'text-brass-300 border-brass-500' : 'text-zinc-400 border-transparent hover:text-white'
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {it.href ? (
            <a href={it.href} className="hover:text-brass-300">{it.label}</a>
          ) : (
            <span className="text-zinc-300" aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
/* ── §Phase 5 — overlays, tables, page primitives ────────────────────────── */

/** Accessible Modal: ESC to close, backdrop click to close, labelled, focus-on-open. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    // Move focus into the dialog for keyboard users.
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevActive?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        className="relative w-full max-w-lg bg-ink-850 border border-white/[0.08] rounded-lg shadow-ds-overlay"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-zinc-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center gap-2 text-xs">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-2.5 py-1 rounded border border-white/[0.08] disabled:opacity-40 hover:bg-white/[0.05]">
        Previous
      </button>
      <span className="text-zinc-400" data-testid="pagination-page">
        Page {page} of {pageCount}
      </span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="px-2.5 py-1 rounded border border-white/[0.08] disabled:opacity-40 hover:bg-white/[0.05]">
        Next
      </button>
    </nav>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="text-xs text-zinc-500 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-white/[0.06]', className)} />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white tracking-tight">{title}</h1>
        {description && <p className="text-sm text-zinc-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EntityHeader({
  eyebrow,
  title,
  status,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  status?: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{eyebrow}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-xl font-semibold text-white tracking-tight">{title}</h1>
          {status}
        </div>
        {description && <p className="text-sm text-zinc-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/** DataTable foundation: semantic table + loading/empty/error states. */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage,
  errorMessage,
}: {
  columns: { key: string; label: string }[];
  rows: T[];
  rowKey: (r: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
}) {
  if (errorMessage) {
    return <EmptyState title="Error loading data" description={errorMessage} />;
  }
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No data to display'} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">Data table</caption>
        <thead>
          <tr className="border-b border-white/[0.08] text-left">
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-2 text-xs font-semibold text-zinc-400">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-zinc-300">
                  {String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
