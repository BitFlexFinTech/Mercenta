/**
 * §PHASE C BATCH C1 — THE HOMEPAGE EDITOR, IN THE CONSOLE.
 *
 * WHAT THIS IS. The Super Admin homepage editor has existed in the LEGACY shell
 * (`src/components/admin/HomepageEditor.tsx`) since §12. This is the same capability
 * presented in the console, which is now the DEFAULT for a signed-in session — so
 * until this existed, the owner had to find the hidden legacy switch to edit their
 * own front page.
 *
 * ONE OWNER PER VALUE — NOTHING IS RE-DERIVED HERE. The content model is
 * `src/config/homepageContent.ts`, the design axis is `src/config/homepageDesign.ts`,
 * and persistence is `src/data/api.ts`. This view renders what the screen hands it and
 * calls back; it owns no content, no design list and no draft state.
 *
 * WHY THE DRAFT PREVIEW IS PORTALLED TO `document.body` — MEASURED, NOT STYLE.
 * The console's root carries the `.mercenta-next` scope (`NextShell.tsx`), and
 * `src/next/next.css` overrides `.mercenta-next .text-strong` / `.text-muted` /
 * `.text-faint` with the CONSOLE's tokens, which follow the console's appearance. The
 * marketing components use exactly those classes (`text-muted` 104 sites, `text-strong`
 * 48, `text-faint` 15), so a preview rendered INSIDE that scope would paint the public
 * page in the console's colours — in brand-dark it would render light text over the
 * homepage's light sections. A preview that shows something other than what publishes is
 * worse than no preview, because it is believed. The portal puts the preview OUTSIDE the
 * scoped subtree, so React context still flows while the console's class overrides cannot
 * reach it: what the owner sees is what publishes.
 * `scripts/validate-console-homepage-editor.mjs` pins that decision.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type HomeCardItem, type HomepageContent } from '@/config/homepageContent';
import type { HomepageDesignId } from '@/config/homepageDesign';
import { Home } from '@/components/marketing/Home';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import { LoadingRows, MetricStrip, InlineStatus, type MetricItem } from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

/** The hero fields the editor exposes. Declared HERE and imported by the screen, so the
 *  field set has one owner (the legacy editor declares its own copy). */
export type HeroField =
  | 'eyebrow'
  | 'headingStart'
  | 'headingHighlight'
  | 'subheading'
  | 'primaryCta'
  | 'secondaryCta';

export type PointSectionId = 'visibility' | 'protection';

export interface HomepageEditorDesignOption {
  id: HomepageDesignId;
  label: string;
  description: string;
}

export interface HomepageEditorPointSection {
  id: PointSectionId;
  title: string;
  subtitle: string;
  heading: string;
  subheading: string;
  points: HomeCardItem[];
}

export interface AdminHomepageEditorViewProps {
  loading: boolean;
  error: string | null;
  content: HomepageContent;
  publishedDesignId: HomepageDesignId;
  designOptions: readonly HomepageEditorDesignOption[];
  sections: readonly HomepageEditorPointSection[];
  /** The first banned-term hit, or null when every outward field is safe. */
  unsafeReason: string | null;
  status: string;
  previewOpen: boolean;
  onHeroField: (field: HeroField, value: string) => void;
  onDesign: (id: HomepageDesignId) => void;
  onResetDesignToPublished: () => void;
  onSectionHeading: (section: PointSectionId, value: string) => void;
  onSectionSubheading: (section: PointSectionId, value: string) => void;
  onSectionPoint: (section: PointSectionId, index: number, patch: Partial<HomeCardItem>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onRevert: () => void;
  onTogglePreview: () => void;
  onClosePreview: () => void;
}

const PRIMARY_BUTTON =
  'px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const QUIET_BUTTON =
  'px-3 py-1.5 rounded-ds-sm border border-hairline text-ds-label font-medium text-secondary hover:text-strong hover:bg-tint focus-visible:outline-2 focus-visible:outline-accent';
const FIELD =
  'w-full rounded-ds-sm border border-hairline bg-surface px-2.5 py-2 text-ds-label text-strong placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

/**
 * An outward-facing field with its wording lint attached, so the editor sees the problem
 * AT THE FIELD rather than only at the publish button (the legacy editor's behaviour,
 * kept — the project must never let banned positioning reach the public page).
 */
function LintableField({
  label,
  value,
  multiline = false,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  const lint = lintOutwardWording(value);
  const fieldId = `hp-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-ds-micro font-medium uppercase tracking-[0.06em] text-faint mb-1"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={fieldId}
          aria-label={label}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD}
        />
      ) : (
        <input
          id={fieldId}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD}
        />
      )}
      {!lint.safe && (
        <p className="mt-1 text-ds-label text-state-danger">
          Unsafe wording ({lint.hits[0]?.reason}) — fix before saving
        </p>
      )}
    </div>
  );
}

/** The draft preview, rendered outside the console's `.mercenta-next` scope (see header). */
function DraftPreview({ content, onClose }: { content: HomepageContent; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Draft homepage preview (not published)"
      data-testid="homepage-draft-preview"
      className="fixed inset-0 z-[60] bg-surface flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-hairline">
        <div className="min-w-0">
          <p className="text-ds-label font-semibold text-strong">Draft preview — not published</p>
          <p className="text-ds-micro text-muted">
            Renders the REAL homepage component from your draft, outside the console&rsquo;s own
            styling, so this is what visitors would see.
          </p>
        </div>
        <button type="button" className={QUIET_BUTTON} onClick={onClose} data-testid="homepage-preview-close">
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-surface">
        <div style={{ width: '1280px', transform: 'scale(0.75)', transformOrigin: 'top left' }}>
          <Home content={content} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AdminHomepageEditorView({
  loading,
  error,
  content,
  publishedDesignId,
  designOptions,
  sections,
  unsafeReason,
  status,
  previewOpen,
  onHeroField,
  onDesign,
  onResetDesignToPublished,
  onSectionHeading,
  onSectionSubheading,
  onSectionPoint,
  onSaveDraft,
  onPublish,
  onRevert,
  onTogglePreview,
  onClosePreview,
}: AdminHomepageEditorViewProps) {
  const publishedLabel = designOptions.find((d) => d.id === publishedDesignId)?.label ?? publishedDesignId;
  const draftLabel = designOptions.find((d) => d.id === content.design)?.label ?? content.design;
  const designChanged = content.design !== publishedDesignId;
  const editablePoints =
    sections.reduce((n, s) => n + s.points.length, 0) +
    content.about.points.length +
    content.services.cards.length +
    content.route.steps.length;

  const metrics: MetricItem[] = [
    { id: 'designs', label: 'Designs available', value: String(designOptions.length) },
    { id: 'published', label: 'Published design', value: publishedLabel, context: 'Live on the public homepage' },
    {
      id: 'draft',
      label: 'Draft selection',
      value: designChanged ? draftLabel : 'No change pending',
      context: designChanged ? 'Selected but NOT published' : 'Draft matches what is live',
    },
    { id: 'points', label: 'Editable copy blocks', value: String(editablePoints) },
  ];

  if (loading) return <LoadingRows rows={4} />;

  return (
    <div className="space-y-6">
      {error && (
        <NoticeBanner
          tone="danger"
          title="The saved homepage copy could not be loaded"
          message={error}
        />
      )}

      <NoticeBanner
        tone={unsafeReason ? 'warning' : 'info'}
        title={unsafeReason ? 'Saving and publishing are blocked' : 'Drafts stay private until you publish'}
        message={
          unsafeReason
            ? `An outward-facing field contains wording this project never publishes outward: ${unsafeReason}`
            : `Editing here changes the DRAFT only. The public homepage keeps serving the published copy — design: ${publishedLabel} — until Publish is pressed.`
        }
      />

      <MetricStrip items={metrics} columns={4} />

      <SectionCard
        title="Publish controls"
        description="Save a draft, publish it to the live homepage, or discard your edits by re-reading the persisted copy."
        testId="homepage-editor-controls"
        actions={
          <>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={unsafeReason !== null}
              onClick={onSaveDraft}
              data-testid="homepage-save-draft"
            >
              Save draft
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              disabled={unsafeReason !== null}
              onClick={onPublish}
              data-testid="homepage-publish"
            >
              Publish
            </button>
            <button
              type="button"
              className={QUIET_BUTTON}
              onClick={onTogglePreview}
              data-testid="homepage-toggle-preview"
            >
              {previewOpen ? 'Hide' : 'Show'} draft preview
            </button>
            <button
              type="button"
              className={QUIET_BUTTON}
              onClick={onRevert}
              data-testid="homepage-editor-revert"
            >
              Revert
            </button>
          </>
        }
      >
        <InlineStatus
          label={status || 'No change has been saved or published in this session yet.'}
          tone={status ? 'success' : 'neutral'}
          dataStatus="homepage-editor-status"
        />
      </SectionCard>

      <SectionCard
        title="Homepage design"
        description="The composition the public front page uses. This is a separate axis from light/dark: changing the appearance never changes this."
        testId="homepage-design-picker"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {designOptions.map((option) => {
            const active = content.design === option.id;
            const live = publishedDesignId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`homepage-design-option-${option.id}`}
                data-state={active ? 'active' : 'idle'}
                onClick={() => onDesign(option.id)}
                className={`text-left rounded-ds-md border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  active
                    ? 'border-ink bg-surface'
                    : 'border-hairline bg-surface-raised hover:border-hairline-strong'
                }`}
              >
                <span className="block text-ds-body font-semibold text-strong">{option.label}</span>
                <span className="mt-1 block text-ds-label text-muted leading-relaxed">
                  {option.description}
                </span>
                {live && (
                  <span className="mt-2 inline-block">
                    <InlineStatus label="Live now" tone="success" dataStatus="homepage-design-live" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {designChanged && (
          <div className="mt-3">
            <button
              type="button"
              className={QUIET_BUTTON}
              onClick={onResetDesignToPublished}
              data-testid="homepage-design-reset"
            >
              Reset to published
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Hero"
        description="The first thing a visitor reads. Every field is checked against this project's outward-wording rules as you type."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <LintableField label="Hero eyebrow" value={content.hero.eyebrow} onChange={(v) => onHeroField('eyebrow', v)} />
          <LintableField label="Hero heading (first part)" value={content.hero.headingStart} onChange={(v) => onHeroField('headingStart', v)} />
          <LintableField label="Hero heading (highlight)" value={content.hero.headingHighlight} onChange={(v) => onHeroField('headingHighlight', v)} />
          <LintableField label="Hero primary CTA" value={content.hero.primaryCta} onChange={(v) => onHeroField('primaryCta', v)} />
          <LintableField label="Nav / secondary CTA" value={content.hero.secondaryCta} onChange={(v) => onHeroField('secondaryCta', v)} />
          <LintableField label="Hero subheading" value={content.hero.subheading} multiline rows={4} onChange={(v) => onHeroField('subheading', v)} />
        </div>
      </SectionCard>

      {sections.map((section) => (
        <SectionCard
          key={section.id}
          title={section.title}
          description={section.subtitle}
          testId={`homepage-section-${section.id}`}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <LintableField
              label={`${section.title} heading`}
              value={section.heading}
              onChange={(v) => onSectionHeading(section.id, v)}
            />
            <LintableField
              label={`${section.title} subheading`}
              value={section.subheading}
              onChange={(v) => onSectionSubheading(section.id, v)}
            />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-ds-micro font-medium uppercase tracking-[0.06em] text-faint">
              Points ({section.points.length})
            </p>
            {section.points.map((point, index) => (
              <div
                key={`${section.id}-${index}`}
                className="rounded-ds-md border border-hairline bg-surface p-3"
                data-testid={`homepage-point-${section.id}-${index}`}
              >
                <LintableField
                  label={`Point ${index + 1} title`}
                  value={point.title}
                  onChange={(v) => onSectionPoint(section.id, index, { title: v })}
                />
                <div className="mt-2">
                  <LintableField
                    label={`Point ${index + 1} description`}
                    value={point.description}
                    multiline
                    rows={2}
                    onChange={(v) => onSectionPoint(section.id, index, { description: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}

      {previewOpen && <DraftPreview content={content} onClose={onClosePreview} />}

    </div>
  );
}


