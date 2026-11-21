import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /**
   * §S2a — test/automation hook passthrough. Hyphenated JSX attributes are not
   * forwarded automatically, so a `data-*` attribute written on `<Card>` was
   * silently dropped before this. Declared explicitly (the same convention
   * `Button` already documents) so the attribute actually reaches the DOM.
   */
  'data-state'?: string;
  'data-testid'?: string;
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  'data-state': dataState,
  'data-testid': dataTestId,
}: CardProps) {
  return (
    <div
      className={cn(
        /* §PHASE C — REPOINTED to the elevation scale. The card previously had a
           hairline border and NO shadow, so on every theme it sat flat against the
           canvas and the surfaces read as one undifferentiated mass — the single
           biggest reason the product looked utilitarian rather than considered.
           `shadow-ds-subtle` is theme-driven (`--mr-shadow-subtle`), so a light
           theme gets a soft grey lift and a dark theme a deeper one, with no
           per-theme branching here.

           §OPENSHIP BATCH 4 (2026-10-15) — REPOINTED AGAIN, and the §PHASE C
           sentence that read "The border is KEPT: on dark themes a shadow alone is
           nearly invisible, so the pair carries the separation" is SUPERSEDED here
           rather than left standing (a live describer must not outlive the thing it
           describes). The reference makes a container BORDERLESS in all three of
           its designs (`--th-card-bd: transparent`, spec §2.3–§2.5, §2.7), and the
           colour is now the theme's own token, applied by `.ds-card` in
           `src/index.css`:

             'ds-card bg-surface-raised border rounded-ds-lg shadow-ds-subtle'

           `border` (the 1px width) is KEPT deliberately: the border BOX is
           unchanged, so no card moves by a pixel, and a caller that supplies its own
           border utility still wins (the token is applied in the `components`
           layer). `bold`'s token reproduces exactly the colour it draws today, so
           that theme is preserved by mechanism. */
        'ds-card bg-surface-raised border rounded-ds-lg shadow-ds-subtle',
        className
      )}
      data-state={dataState}
      data-testid={dataTestId}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            {title && (
              /* §PHASE C — REPOINTED from `text-sm` (14px) to the canonical
                 `ds-title` step (15px), so a card heading uses the design system's
                 own type scale instead of a raw Tailwind size that sits outside
                 it. Hierarchy, not decoration: the card title now reads a step
                 above its own body copy rather than level with it. */
              <h3 className="text-ds-title font-semibold text-strong tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-ds-label text-muted mt-1">{subtitle}</p>
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
  variant?: 'primary' | 'accent' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  'data-state'?: string;
  /** §Sprint — test hook passthrough. Hyphenated JSX attributes are dropped by
   *  TypeScript's checker but NOT forwarded by this component, so an explicit
   *  prop is required for a spec to select a button reliably. */
  'data-testid'?: string;
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
  'data-testid': dataTestId,
  title,
}: ButtonProps) {
  const variants = {
    /* §OPENSHIP MAPPING BATCH 3 — THE PAGE PRIMARY ACTION IS THE SOLID BUTTON.
       The reference's own `.th-btn` is a solid fill from `--th-btn-bg` with
       `--th-btn-text` on it (spec §2.7) — near-black with white text on its two
       LIGHT designs, white with black text on dim and dark (§2.3–§2.5). Those
       values live in the theme (`--mr-btn-*`, one set per design) and reach the
       button through the `.ds-btn` utility in src/index.css. `bold`'s three
       tokens reproduce exactly what this variant painted before, so that theme
       moves no pixel. */
    primary: 'ds-btn font-semibold shadow-ds-raised',
    /* §OPENSHIP MAPPING BATCH 3 — THE ACCENT GRADIENT CTA, RESERVED FOR
       CREATE-STYLE ACTIONS. This is the treatment `primary` used to carry, moved
       onto its own variant: the reference keeps its gradient for actions that
       CREATE something (its empty state's "Create project", spec §5.4, and its
       header CTA, §5.1) rather than for every primary action, because an accent
       on every button is no accent at all. `bg-accent-500` STAYS as the flat
       colour, which is both the fallback for a browser without `in oklab`
       support AND the whole treatment in `bold`, whose two gradient tokens are
       `none`. No prop, size or API changed. */
    /* §BATCH 5 (2026-11-21) — `text-ink` -> `text-on-accent`, a REAL CONTRAST
       DEFECT FIXED AT SOURCE. `text-ink` resolves to `--mr-surface`, which is
       DARK in the dark appearance but LIGHT in the light one — so the accent
       button's label was light-on-orange in the light appearance, where the
       project's own config records that white on #FF6A00 measures only
       2.34:1. `--mr-on-accent` is black in BOTH appearances, which is the token
       declared for exactly this pairing. (The comment sits ABOVE the key, never
       between the key and its value: `validate-theme-distinctness` reads the
       variant with `accent:\s*'…'`.) */
    accent: 'ds-btn-accent bg-accent-500 hover:bg-accent-600 text-on-accent font-semibold shadow-ds-raised',
    secondary: 'bg-tint hover:bg-tint/[0.1] text-strong border border-hairline',
    tertiary: 'bg-surface-overlay hover:bg-surface-hover text-strong border border-hairline',
    ghost: 'hover:bg-tint text-muted hover:text-strong',
    // `danger` retained for backward compatibility; `destructive` is canonical.
    danger: 'bg-crimson-accent hover:bg-red-700 text-strong',
    destructive: 'bg-state-danger hover:bg-red-700 text-on-fill',
    link: 'text-accent-400 hover:underline underline-offset-4 p-0 h-auto shadow-ds-none',
  } as const;
  const sizes = {
    sm: 'px-3 py-1.5 text-ds-label',
    md: 'px-4 py-2 text-ds-body',
    /* §PHASE C — REPOINTED, and §PHASE C4 corrected the note below. `lg` used to
       be `px-6 py-2.5 text-sm`. It now sits on the canonical body step
       (`ds-body`, 14px since §PHASE C4) with more generous padding and a 44px
       minimum height — the WCAG 2.5.5 touch-target size.
       HONEST STATE: with `ds-body` at 14px, `lg` and `md` are the SAME text size
       again, so the hierarchy of `lg` is carried by PADDING and HEIGHT, not by
       font size (the earlier claim that "size carries real hierarchy" is no
       longer true and was corrected rather than left standing). A button label
       larger than body copy is deliberately NOT introduced here: that is a
       visual decision for the application-wide pass, not a side effect of the
       type scale. */
    lg: 'px-6 py-3 text-ds-body min-h-[44px]',
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
      data-testid={dataTestId}
      data-state={dataState ?? (loading ? 'loading' : disabled ? 'disabled' : undefined)}
      className={cn(
        'rounded-ds-md inline-flex items-center justify-center gap-2 font-medium',
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
  /** §Functional-completion — numeric passthrough. */
  min?: number;
  step?: number | string;
  /** §Functional-completion — testid + accessible name passthrough. */
  dataTestid?: string;
  ariaLabel?: string;
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
  min,
  step,
  dataTestid,
  ariaLabel,
}: InputProps) {
  /**
   * §Wave-3 Part 4 (2026-10-08) — the derived id now carries a `useId` suffix.
   * It was `${label}`-derived, so two inputs sharing a visible label ("Email",
   * "Country") both rendered the SAME id, which is invalid HTML and makes the
   * `<label for>` association ambiguous for assistive technology. The explicit
   * `id` prop still wins, so no caller's id contract changes.
   */
  const uid = useId();
  const inputId =
    id ||
    (label
      ? `input-${label.toLowerCase().replace(/\W+/g, '-')}-${uid.replace(/:/g, '')}`
      : undefined);
  const describedBy =
    [helper ? `${inputId}-helper` : null, error ? `${inputId}-error` : null].filter(Boolean).join(' ') ||
    undefined;
  return (
    <div className={className}>
      {label && (
        /* §OPENSHIP BATCH 4 — the label step is the reference's measured 14px
           (spec §7.4: `text-sm font-medium`; the measured gap is "input label
           12px → 14px", spec §12). It is the canonical `ds-body` step — the same
           14px by name, not a raw Tailwind size — because the reference labels a
           control at its body size. The label's own association, id derivation,
           `required` marker, helper and error wiring are UNCHANGED. */
        <label htmlFor={inputId} className="block text-ds-body font-medium text-muted mb-1.5">
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
        min={min}
        step={step}
        aria-label={ariaLabel}
        data-testid={dataTestid}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        /* §OPENSHIP BATCH 4 — the reference's control METRICS (spec §7.3, and the
           measured gaps in §12: height +8px, radius already 12px, padding 14px):
           a 44px control (`h-11`, which is also the WCAG 2.5.5 touch target), the
           14px horizontal padding of `px-3.5`, and the SAME radius step the ramp
           already declares (`ds-md` = 12px, spec §2.2). No prop, id, ARIA or
           behaviour changes; the focus treatment stays the product's own
           accent-tinted border + ring. */
        className="w-full bg-surface border border-hairline rounded-ds-md h-11 px-3.5 py-2 text-sm text-strong placeholder-faint focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-colors"
      />
      {helper && !error && (
        <p id={`${inputId}-helper`} className="text-ds-label text-muted mt-1">{helper}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-ds-label text-state-danger mt-1" role="alert">{error}</p>
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
  /** §Wave-3 Part 4 — explicit id, otherwise a unique one is generated. */
  id?: string;
  /** Accessible name for a select rendered WITHOUT a visible label. */
  ariaLabel?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
  className,
  id,
  ariaLabel,
}: SelectProps) {
  /**
   * §Wave-3 Part 4 (2026-10-08) — the label is now ASSOCIATED with its control.
   *
   * Before: the `<label>` had no `htmlFor` and the `<select>` had no `id`, so the
   * visible label was decorative — a screen reader announced an unnamed combobox,
   * clicking the label did not focus the control, and the Wave-3 Part 4 audit
   * measured exactly that on every surface using this primitive. `useId` guarantees
   * a unique id per instance (two selects can share a label such as "Country").
   */
  const uid = useId();
  const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\W+/g, '-')}-${uid.replace(/:/g, '')}` : undefined);
  return (
    <div className={className}>
      {label && (
        /* §OPENSHIP BATCH 4 — the same 14px label step as `Input` (the reference
           labels a control at its body size, spec §7.4). */
        <label htmlFor={selectId} className="block text-ds-body font-medium text-muted mb-1.5">
          {label} {required && <span className="text-crimson-accent">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        /* §OPENSHIP BATCH 4 — DERIVED, and stated as such: the reference pins a
           height on its INPUT (44px) but not on its SELECT, whose own radius it
           also contradicts (8px there against 12px on the input, spec §7.4). A
           form row cannot mix a 44px field with a 38px field, so this control
           takes the ONE control height the ramp and the reference's input already
           agree on (`h-11`). The radius stays on the canonical control step. */
        className="w-full bg-surface border border-hairline rounded-ds-md h-11 px-3 py-2 text-sm text-strong focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-colors appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
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
  /** §Wave-3 Part 4 — explicit id, otherwise a unique one is generated. */
  id?: string;
  /** Accessible name for a textarea rendered WITHOUT a visible label. */
  ariaLabel?: string;
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  id,
  ariaLabel,
}: TextareaProps) {
  /**
   * §Wave-3 Part 4 (2026-10-08) — the label is now ASSOCIATED with its control,
   * for the same reason as `Select` above: the `<label>` had no `htmlFor` and the
   * `<textarea>` had no `id`, so every textarea in the platform was unnamed to
   * assistive technology (the audit measured this on the admin Marketing surface,
   * the brand Support surface and elsewhere).
   */
  const uid = useId();
  const areaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\W+/g, '-')}-${uid.replace(/:/g, '')}` : undefined);
  return (
    <div className={className}>
      {label && (
        /* §OPENSHIP BATCH 4 — the same 14px label step as `Input` and `Select`: the
           three controls share ONE label treatment, so they cannot drift apart. */
        <label htmlFor={areaId} className="block text-ds-body font-medium text-muted mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
        className="w-full bg-surface border border-hairline rounded-ds-md px-3 py-2 text-sm text-strong placeholder-faint focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30 transition-colors resize-none"
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
            'w-4 h-4 rounded-ds-sm border transition-all flex items-center justify-center',
            checked
              ? 'bg-accent-500 border-accent-500'
              : 'border-hairline-strong group-hover:border-hairline-strong'
          )}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-strong"
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
      <span className="text-xs text-strong leading-relaxed">
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
  neutral: { badge: 'bg-tint text-muted border-hairline', dot: 'bg-state-muted', label: 'Neutral' },
  brass: { badge: 'bg-accent-500/15 text-accent-300 border-accent-500/25', dot: 'bg-accent-400', label: 'Accent' },
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
    <div role="alert" className={cn('rounded-ds-sm border px-3.5 py-2.5 text-sm', ALERT_STYLES[tone], className)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-ds-body opacity-90">{children}</div>}
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
    <div role="tablist" aria-label={ariaLabel ?? 'Tabs'} className={cn('flex gap-1 border-b border-hairline', className)}>
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
              selected ? 'text-accent-300 border-accent-500' : 'text-muted border-transparent hover:text-strong'
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
  /**
   * §Wave-3 Part 4 (2026-10-08) — the trail can now be SHORT (ellipsised) instead
   * of pushing its row wider than the screen. The app bar's context zone rendered
   * a long trail ("Operations / Work Management") as an unshrinkable block, which
   * pushed the notification and profile controls off a 390px viewport and — because
   * the shell root clips its overflow — made them unreachable. Nothing about the
   * crumbs' TEXT changes; they simply use the space available.
   */
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
      {items.map((it, i) => (
        <span key={it.label} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          {it.href ? (
            <a href={it.href} className="truncate hover:text-accent-300">{it.label}</a>
          ) : (
            <span className="truncate text-strong" aria-current="page">{it.label}</span>
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
      {/* §OPENSHIP BATCH 4 (2026-10-15) — THE SCRIM IS THE THEME'S OWN TOKEN, by the
          reference's own mechanism (`style={{ background: "var(--th-overlay)" }}`,
          spec §7.5) plus its defining backdrop BLUR. The value was hardcoded
          `bg-black/70`, which ignored the theme completely — and `serious` (whose
          page is pure BLACK) needs the reference's INVERTED scrim, or a black veil
          over a black page dims nothing and the dialog reads as floating with no
          separation (spec §2.3, "the `--th-overlay` inversion — do not miss this").
          The same pattern is already used by `CommandPalette` and `workspace.tsx`. */}
      <div
        className="absolute inset-0 backdrop-blur-lg"
        style={{ background: 'var(--mr-overlay-tint)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        /* §PHASE C4 — REPOINTED from the CONTROL step to the CONTAINER step. The
           rename onto the scale preserved pixels, and in doing so preserved a
           pre-existing inconsistency: `Card` was `rounded-xl` (12px) while `Modal`
           was `rounded-lg` (8px), although both are containers — and every OTHER
           overlay in the app (drawers, popovers, floating cards) was already 12px.
           A dialog is a container, so it now sits on `ds-lg` with the rest. */
        className="relative w-full max-w-lg bg-surface-raised border border-hairline rounded-ds-lg shadow-ds-overlay"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3 className="text-sm font-semibold text-strong">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            /* §OPENSHIP BATCH 4 — the reference's own close control (a surfaced
               chip: `p-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground
               hover:text-foreground`, spec §7.5). The visible glyph is unchanged;
               what this adds is a real TARGET (≈30px instead of the ~18px a bare
               `×` gave, which was below every touch-target guideline) and a
               hover state that reads. Tokens, so it follows the theme; `text-lg`
               is kept so the glyph stays the same size. */
            className="rounded-ds-sm bg-surface-overlay hover:bg-surface-hover p-1.5 text-lg text-muted hover:text-strong leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline">{footer}</div>}
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
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-2.5 py-1 rounded-ds-sm border border-hairline disabled:opacity-40 hover:bg-tint">
        Previous
      </button>
      <span className="text-muted" data-testid="pagination-page">
        Page {page} of {pageCount}
      </span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="px-2.5 py-1 rounded-ds-sm border border-hairline disabled:opacity-40 hover:bg-tint">
        Next
      </button>
    </nav>
  );
}

/**
 * §OPENSHIP BATCH 8 — THE EMPTY STATE, to the reference's own metrics (spec §9.1:
 * `py-16 text-center`, a title, a `max-w-sm` description, then the actions).
 *
 * Two divergences, both stated rather than left silent:
 *
 *  · the TITLE stays on the project's own named type step (`ds-title`, 16px).
 *    The reference's empty-state title is 24px, which is ABOVE this project's
 *    page title (`ds-page`, 20px) — an empty region would out-rank the page it
 *    sits on, and the named scale is the single owner of type sizes.
 *  · the reference's four-tile feature row and its `⌘K` hint are its HOME-PAGE
 *    composition (spec §5.4/§5.5), not part of a general empty state. Mercenta's
 *    empty states are per-REGION inside dense operational surfaces, where a 2×4
 *    feature grid would be wrong at that scale, so nothing was invented to
 *    match it.
 *
 * Like `LoadingState`, this is the ONE owner of its state: a surface renders
 * through it rather than hand-rolling its own centred block.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  /** Optional glyph — the reference's empty state carries an illustration (spec §9.1). */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-ds-md bg-tint text-muted"
        >
          {icon}
        </span>
      )}
      <p className="text-ds-title font-medium tracking-tight text-strong">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-ds-body leading-relaxed text-muted">{description}</p>
      )}
      {action}
    </div>
  );
}

/**
 * §OPENSHIP BATCH 8 — THE SKELETON FILL IS NOW THE THEME'S OWN TINT.
 *
 * It was `bg-white/[0.06]`, whose light-shell shim maps to `--mr-surface-tint`
 * (`#FAFAFA` in `minimal-light`/`professional`/`fun`) while the card behind it
 * is `#FFFFFF` — a **1.02:1** difference, i.e. a loading indicator that is
 * measurably invisible on all three light designs. `bg-tint` is
 * `--mr-hover-tint`, the ONE subtle fill this project already resolved as the
 * visible one on light surfaces (BATCH 5 moved the rail's hover to it for
 * exactly this reason: the near-white legacy hover "is invisible on the light
 * designs"). One token, five themes, and the skeleton reads on every one.
 *
 * Guarded by `scripts/validate-state-coverage.mjs` (an absence guard for
 * `bg-white/[0.06]` in this owner) and measured in a browser by
 * `e2e/state-coverage.spec.ts` (the fill must differ from the surface behind it).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-ds-sm bg-tint', className)} />;
}

/**
 * §WAVE 3 PART 5 — the canonical REGION LOADING state.
 *
 * One owner for "this region's data is still resolving", exactly as
 * `EmptyState` is the one owner for "this region has no data". It exists
 * because a data-backed surface that has no loading state does not merely look
 * unfinished: while its query is still resolving it believes its array is empty
 * and tells the operator so — "No purchase orders for this brand yet", a queue
 * value of £0, a 0% confirmation rate. That is a FALSE statement about the
 * operator's business, and it is what this owner prevents (Wave 3 Part 5,
 * measured in a real browser: 13 surfaces did exactly this).
 *
 * `DataTable` already rendered this shape inline; it now renders THROUGH this
 * owner, so there is exactly one implementation of it. Announced to assistive
 * technology (`role="status"` + `aria-busy`) because "the data is still
 * arriving" is information an operator needs.
 *
 * §OPENSHIP BATCH 8 — THE ROW ANATOMY IS THE REFERENCE'S (spec §9.2: a skeleton
 * row carries a leading square TILE plus a wide bar and a short bar, so the
 * skeleton has the shape of the row that is coming rather than being a blank
 * block). The `rows` prop still means "match the region's rough height", so the
 * row BOX stays the project's measured 36px — the dense operational row it
 * stands in for — and the tile is scaled to fit it; the reference's 40px tile
 * belongs to its own roomier list rows, and a skeleton taller than the row it
 * replaces is a layout shift rather than fidelity.
 */
export function LoadingState({
  rows = 3,
  label = 'Loading…',
  className,
}: {
  /** Number of skeleton rows; match the region's rough height. */
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-2 p-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-state"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-9 items-center gap-3">
          <Skeleton className="h-6 w-6 flex-shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * §OPENSHIP BATCH 8 — THE ERROR STATE (§9.3).
 *
 * The spec is explicit that this trait is **DERIVED, not copied**: the
 * reference's error views (`error-view.tsx`, `resource-not-found.tsx`,
 * `api-unavailable.tsx`) were never extracted (spec §9.3, §15.3), so Mercenta's
 * existing error treatment is RETAINED and restyled with the VERIFIED tokens —
 * it is never presented as a copy of a reference component.
 *
 * It exists because the treatment lived in exactly one place (`ErrorBoundary`'s
 * private `ErrorFallback`) and nowhere else, so any second error surface had
 * nothing to render through and would have hand-rolled its own. One owner now,
 * and the boundary renders THROUGH it.
 *
 * What the verified tokens change:
 *  · the surface takes its edge from the THEME (`ds-card` → `--mr-card-border`)
 *    instead of the hardcoded `border-white/[0.06]`, so `bold` keeps the border
 *    it draws today while the four replaced themes take the reference's
 *    borderless container rule (BATCH 4);
 *  · the recovery control is the CANONICAL control, so it carries the reference's
 *    per-theme CTA gradient (BATCH 3) and the canonical metrics rather than a
 *    one-off flat brass button;
 *  · `role="alert"` — a region that has crashed is an interruption an operator
 *    must hear, and the previous fallback announced nothing.
 */
export function ErrorState({
  title,
  description,
  details,
  onRetry,
  retryLabel = 'Try again',
  action,
  className,
}: {
  title: string;
  description?: string;
  /** Technical detail (message + stack). Rendered collapsed, never dropped. */
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Any additional recovery control. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex w-full items-center justify-center', className)}
      role="alert"
      data-testid="error-state"
    >
      <div className="ds-card mx-4 max-w-md rounded-ds-lg border bg-surface-raised p-8 text-center shadow-ds-overlay">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-ds-md bg-state-danger/15 text-state-danger"
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 className="mb-1 text-ds-title font-semibold tracking-tight text-strong">{title}</h2>
        {description && <p className="mb-4 text-ds-body leading-relaxed text-muted">{description}</p>}
        {details && (
          <details className="mb-4 rounded-ds-md bg-surface-tint p-3 text-left">
            <summary className="cursor-pointer text-ds-micro text-faint hover:text-muted">
              Technical details
            </summary>
            <pre className="mt-2 max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all font-mono text-ds-micro text-muted">
              {details}
            </pre>
          </details>
        )}
        <span className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && <Button onClick={onRetry}>{retryLabel}</Button>}
          {action}
        </span>
      </div>
    </div>
  );
}

/**
 * §OPENSHIP BATCH 8 — THE NO-PERMISSION STATE (§9.5).
 *
 * **DERIVED, and stated as derived.** The spec records this trait as UNVERIFIED
 * in the reference (§9.5, §15.3) — "Mercenta's existing RBAC-hidden behaviour is
 * retained". What this owner changes is not the behaviour: NO permission, role
 * or gate was added, removed or widened anywhere. It changes the fact that the
 * same state had been hand-rolled SEVEN times, each with its own copy of the
 * same icon tile and wording, so no two were identical and none was gated.
 *
 * `variant="page"` is a shell's whole-view refusal; `variant="inline"` is a
 * panel's refusal card. Both carry the danger token AND an always-readable text
 * label, so colour is never the only signal.
 *
 * `title` is OPTIONAL for the page variant on purpose: the shell that owns the
 * view already renders the page `<h1>` naming the refusal, and repeating it as a
 * second heading produced two headings with the same accessible name (which is
 * both a duplicate announcement and an ambiguous landmark for a browser spec).
 * Omitted, the page variant renders the description and the action only.
 */
export function NoPermissionState({
  title,
  description,
  action,
  variant = 'inline',
  className,
  icon,
}: {
  /** Defaults to the canonical refusal label for the inline variant only. */
  title?: string;
  description: string;
  action?: ReactNode;
  variant?: 'inline' | 'page';
  className?: string;
  icon?: ReactNode;
}) {
  const heading = title ?? (variant === 'page' ? null : 'Super Admin access required');
  const glyph = icon ?? <ShieldCheck className={variant === 'page' ? 'h-6 w-6' : 'h-5 w-5'} />;
  if (variant === 'page') {
    return (
      <div
        role="status"
        data-testid="no-permission-state"
        className={cn(
          'mx-auto max-w-md rounded-ds-lg border border-state-danger/20 bg-surface-raised p-8 text-center',
          className
        )}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-state-danger/15 text-state-danger"
        >
          {glyph}
        </span>
        {heading && (
          <h2 className="mb-2 text-ds-title font-semibold tracking-tight text-strong">{heading}</h2>
        )}
        <p className="mb-6 text-ds-body leading-relaxed text-muted">{description}</p>
        {action && <span className="inline-flex items-center gap-2">{action}</span>}
      </div>
    );
  }
  return (
    <div
      role="status"
      data-testid="no-permission-state"
      className={cn('ds-card rounded-ds-lg border bg-surface-raised p-6', className)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-ds-md bg-state-danger/15 text-state-danger"
        >
          {glyph}
        </span>
        <div className="min-w-0">
          <h3 className="text-ds-body font-semibold text-strong">{heading}</h3>
          <p className="mt-0.5 text-ds-label leading-snug text-muted">{description}</p>
        </div>
      </div>
      {action && <div className="mt-4 flex items-center gap-2">{action}</div>}
    </div>
  );
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
        <h1 className="font-display text-2xl font-semibold text-strong tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
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
        {eyebrow && <p className="text-xs uppercase tracking-wider text-muted mb-1">{eyebrow}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-xl font-semibold text-strong tracking-tight">{title}</h1>
          {status}
        </div>
        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * DataTable — the canonical operational table.
 *
 * §Phase D3 extension (backwards-compatible): the original foundation only
 * accepted string cells, had no row actions and had no deliberate mobile
 * behaviour (it merely allowed horizontal overflow). Operational tables need all
 * three, so the primitive now supports:
 *   - `render` for arbitrary cells (status badges, links, money formatting);
 *   - `align` for numeric columns and `hideBelow` for progressive disclosure;
 *   - `primary` — the column that becomes the card TITLE on mobile;
 *   - `rowActions` — kept on the row (desktop) and in the card footer (mobile);
 *   - `mobile: 'cards' | 'scroll'` — an INTENTIONAL mobile strategy. 'cards'
 *     (default) renders a labelled key/value card list below `md`, so no action
 *     is ever clipped or hidden behind a horizontal scroll; 'scroll' keeps the
 *     desktop table for genuinely columnar comparison data;
 *   - `emptyAction` / `errorAction` — a recovery path out of the empty/error state.
 * Existing string-only usage keeps working unchanged.
 */
export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** The column used as the mobile card title. Defaults to the first column. */
  primary?: boolean;
  /** Hide this column below the given breakpoint (keep it at/above it). */
  hideBelow?: 'sm' | 'md' | 'lg';
  /**
   * §Wave-3 Part 4 — extra classes for this column's header AND cells, so a
   * caller can express per-column presentation (e.g. `text-right` for money) that
   * `align` alone cannot. The search/filter/sort layer in
   * `src/components/shared/DataTable.tsx` passes its own `className` through here,
   * which is what keeps that column contract intact now that it renders through
   * this one owner.
   */
  className?: string;
}

/**
 * §Phase D5 — media query as state, so a DataTable renders ONE DOM instance:
 * the labelled card list below `md`, the semantic table at `md`+. The previous
 * CSS-toggled approach kept BOTH in the DOM, which duplicated every row for
 * assistive tech and made text/role selectors able to resolve to the hidden
 * copy. Resolved synchronously on first render (no flash).
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage,
  emptyAction,
  errorMessage,
  errorAction,
  rowActions,
  onRowClick,
  rowClassName,
  mobile = 'cards',
  caption = 'Data table',
  dataTable,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  errorAction?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  /** Optional per-row styling hook (e.g. highlighting a delayed shipment). */
  rowClassName?: (row: T) => string | undefined;
  mobile?: 'cards' | 'scroll';
  caption?: string;
  /** Stable hook for the semantic `<table>` (`data-table="…"`), used by E2E
   *  selectors that assert real row counts rather than incidental text. */
  dataTable?: string;
  className?: string;
}) {
  // Called before any early return — Rules of Hooks require it, and the value
  // decides WHICH single representation is rendered (never both).
  const isDesktop = useMediaQuery('(min-width: 768px)');
  if (errorMessage) {
    return <EmptyState title="Error loading data" description={errorMessage} action={errorAction} />;
  }
  if (loading) {
    /* §Wave 3 Part 5 — one owner for the loading region (`LoadingState`); this
       primitive used to render its own copy of the same three skeleton bars. */
    return <LoadingState rows={3} />;
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No data to display'} action={emptyAction} />;
  }

  const cell = (c: DataTableColumn<T>, r: T): ReactNode =>
    c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '');
  const alignClass = (c: DataTableColumn<T>) =>
    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left';
  const hideClass = (c: DataTableColumn<T>) =>
    c.hideBelow === 'sm'
      ? 'hidden sm:table-cell'
      : c.hideBelow === 'md'
        ? 'hidden md:table-cell'
        : c.hideBelow === 'lg'
          ? 'hidden lg:table-cell'
          : '';
  const primaryColumn = columns.find((c) => c.primary) ?? columns[0];
  const detailColumns = columns.filter((c) => c !== primaryColumn);
  const showCards = mobile === 'cards' && !isDesktop;
  const showTable = mobile === 'scroll' || isDesktop;

  return (
    <div className={className}>
      {/* ── Mobile: labelled cards (no clipped actions, no horizontal scroll) ── */}
      {showCards && (
        <ul className="space-y-2" aria-label={caption}>
          {rows.map((r) => (
            <li
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                'rounded-ds-md border border-hairline bg-surface-raised p-3',
                onRowClick && 'cursor-pointer hover:border-hairline-strong transition-ds',
                rowClassName?.(r)
              )}
            >
              <div className="text-sm font-medium text-strong">{cell(primaryColumn, r)}</div>
              {detailColumns.length > 0 && (
                <dl className="mt-2 space-y-1">
                  {detailColumns.map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-3">
                      <dt className="text-ds-label text-muted">{c.label}</dt>
                      <dd className="min-w-0 text-right text-xs text-strong">{cell(c, r)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {rowActions && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-2">
                  {rowActions(r)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* ── Desktop (or mobile:'scroll'): the semantic table ── */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-ds-body border-collapse" data-table={dataTable}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-hairline">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    /* §PHASE C4 — REPOINTED to the canonical type scale and given a
                       real header treatment. It used `text-xs` (12px, a raw
                       Tailwind size outside the design system) with `py-2` (8px),
                       which made the header cramped and visually level with the
                       rows beneath it. Now: the `ds-label` step, generous padding,
                       and uppercase micro-tracking — the standard premium-table
                       convention for separating a column heading from its data.
                       `uppercase` is CSS-only, so no DOM text changes and no
                       selector or test is affected. */
                    className={cn(
                      'px-4 py-3 text-ds-label font-semibold uppercase tracking-wider text-muted',
                      alignClass(c),
                      hideClass(c),
                      c.className
                    )}
                  >
                    {c.label}
                  </th>
                ))}
                {rowActions && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-ds-label font-semibold uppercase tracking-wider text-muted"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={rowKey(r)}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  /* §PHASE C4 — rows given room to breathe (`py-3`, was `py-2`) and a
                     slightly stronger hover. At 8px of vertical padding a dense list
                     reads as a wall of text; 12px makes each row scannable without
                     changing the information density or any behaviour. */
                  className={cn(
                    'border-b border-hairline hover:bg-tint transition-colors',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(r)
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 text-strong', alignClass(c), hideClass(c), c.className)}>
                      {cell(c, r)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">{rowActions(r)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
