/**
 * §12 — Super Admin Homepage Editor.
 *
 * Edit every homepage section against the HomepageContent model, with:
 *  - wording-safety lint on every outward-facing field (save/publish blocked
 *    while any banned term is present);
 *  - draft/publish separation (draft renders in the embedded preview via the
 *    real Home component; Publish promotes it);
 *  - persistence through src/data/api (Supabase homepage_content once
 *    deployed, session-backed seed mode until then).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  fetchHomepageContent,
  saveHomepageDraft,
  publishHomepageContent,
} from '@/data/api';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type HomeCardItem,
} from '@/config/homepageContent';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import { Home } from '@/components/marketing/Home';
import { Badge, Button, Card, Input } from '@/components/ui';
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, Save, Send } from 'lucide-react';

type HeroField = 'eyebrow' | 'headingStart' | 'headingHighlight' | 'subheading' | 'primaryCta' | 'secondaryCta';

function LintableInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const lint = useMemo(() => lintOutwardWording(value), [value]);
  return (
    <div>
      <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {!lint.safe && (
        <p className="text-[10px] text-stamp mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Unsafe wording ({lint.hits[0]?.reason}) — fix before saving
        </p>
      )}
    </div>
  );
}

/** Multi-line variant of the lintable field (long outward copy). */
function LintableTextarea({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  const lint = useMemo(() => lintOutwardWording(value), [value]);
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-zinc-500">{label}</label>
      <textarea
        aria-label={label}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white"
      />
      {!lint.safe && (
        <p className="text-[10px] text-stamp mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Unsafe wording ({lint.hits[0]?.reason}) — fix before saving
        </p>
      )}
    </div>
  );
}

/**
 * §UI/UX Wave 2 completion — the Homepage Editor previously edited ONLY the
 * hero fields, while `visibility` / `protection` were linted but had no form.
 * They are outward copy on the live public homepage, so they must be editable
 * through the same draft → publish pipeline (and the same wording gate).
 */
function PointsEditor({
  heading,
  subheading,
  points,
  onChangeHeading,
  onChangeSubheading,
  onChangePoint,
}: {
  heading: string;
  subheading: string;
  points: HomeCardItem[];
  onChangeHeading: (v: string) => void;
  onChangeSubheading: (v: string) => void;
  onChangePoint: (index: number, patch: Partial<HomeCardItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LintableInput label="Section heading" value={heading} onChange={onChangeHeading} />
        <LintableTextarea label="Section subheading" value={subheading} onChange={onChangeSubheading} />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Points ({points.length})
        </p>
        {points.map((p, i) => (
          <div key={i} className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-2.5">
            <LintableInput
              label={`Point ${i + 1} title`}
              value={p.title}
              onChange={(v) => onChangePoint(i, { title: v })}
            />
            <div className="mt-2">
              <LintableTextarea
                label={`Point ${i + 1} description`}
                value={p.description}
                rows={2}
                onChange={(v) => onChangePoint(i, { description: v })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomepageEditor() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [status, setStatus] = useState('');
  const [previewDraft, setPreviewDraft] = useState(false);

  /**
   * §UI/UX Wave 2 completion — load the persisted copy (draft if one exists,
   * otherwise the live copy). Extracted so the explicit "Revert" control re-runs
   * exactly the same load the editor performs on open: reverting discards the
   * in-form edits and re-reads persisted state, it does not invent a default.
   */
  async function loadPersisted() {
    const r = await fetchHomepageContent();
    setContent(r.draft ?? r.live);
  }

  useEffect(() => {
    void loadPersisted();
  }, []);

  const anyUnsafe = useMemo(() => {
    const texts = [
      content.hero.eyebrow,
      content.hero.headingStart,
      content.hero.headingHighlight,
      content.hero.subheading,
      content.about.heading,
      content.about.subheading,
      content.services.heading,
      content.services.subheading,
      content.route.heading,
      content.route.subheading,
      // §UI/UX Wave 2 — the new homepage sections are outward copy too, so the
      // wording gate must cover them (an unlisted section would be publishable
      // with banned positioning).
      content.visibility.heading,
      content.visibility.subheading,
      content.protection.heading,
      content.protection.subheading,
      content.finalCta.heading,
      content.finalCta.subheading,
      ...content.services.cards.map((c) => `${c.title} ${c.description}`),
      ...content.route.steps.map((s) => `${s.title} ${s.description}`),
      ...content.visibility.points.map((p) => `${p.title} ${p.description}`),
      ...content.protection.points.map((p) => `${p.title} ${p.description}`),
    ];
    return texts.some((t) => !lintOutwardWording(t).safe);
  }, [content]);

  const setHero = (k: HeroField, v: string) =>
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [k]: v } }));

  /**
   * §UI/UX Wave 2 completion — section/point editors for the two sections that
   * had lint coverage but no form. Each write touches ONLY its own section, so an
   * edit here can never mutate unrelated homepage content.
   */
  const setSectionHeading = (section: 'visibility' | 'protection', v: string) =>
    setContent((prev) => ({ ...prev, [section]: { ...prev[section], heading: v } }));
  const setSectionSubheading = (section: 'visibility' | 'protection', v: string) =>
    setContent((prev) => ({ ...prev, [section]: { ...prev[section], subheading: v } }));
  const setSectionPoint = (
    section: 'visibility' | 'protection',
    index: number,
    patch: Partial<HomeCardItem>
  ) =>
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        points: prev[section].points.map((p, i) => (i === index ? { ...p, ...patch } : p)),
      },
    }));

  return (
    <div className="space-y-4">
      <Card title="Homepage Editor" subtitle="Every section of the public homepage — drafts stay private until you Publish">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button
            onClick={() => { void saveHomepageDraft(content).then(() => setStatus('Draft saved')); }}
            className="text-xs"
            disabled={anyUnsafe}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Draft
          </Button>
          <Button
            onClick={() => {
              void saveHomepageDraft(content)
                .then(() => publishHomepageContent())
                .then(() => setStatus('Published to live homepage'));
            }}
            className="text-xs"
            disabled={anyUnsafe}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Publish
          </Button>
          <Button variant="ghost" onClick={() => setPreviewDraft((v) => !v)} className="text-xs">
            <Eye className="w-3.5 h-3.5 mr-1.5" /> {previewDraft ? 'Hide' : 'Show'} draft preview
          </Button>
          {/* §UI/UX Wave 2 completion — explicit cancel/reset: discards the
              in-form edits by re-reading the persisted copy. */}
          <Button
            variant="ghost"
            className="text-xs"
            data-state="homepage-editor-revert"
            onClick={() => {
              void loadPersisted().then(() => setStatus('Reverted to the last saved copy'));
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Revert
          </Button>
          {anyUnsafe ? (
            <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20">
              <AlertTriangle className="w-3 h-3 mr-1" /> Unsafe wording blocks saving
            </Badge>
          ) : (
            status && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {status}
              </Badge>
            )
          )}
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
          <LintableInput label="Hero eyebrow" value={content.hero.eyebrow}
            onChange={(v) => setHero('eyebrow', v)} />
          <LintableInput label="Hero heading (first part)" value={content.hero.headingStart}
            onChange={(v) => setHero('headingStart', v)} />
          <LintableInput label="Hero heading (highlight)" value={content.hero.headingHighlight}
            onChange={(v) => setHero('headingHighlight', v)} />
          <LintableInput label="Hero primary CTA" value={content.hero.primaryCta}
            onChange={(v) => setHero('primaryCta', v)} />
          <LintableInput label="Nav / secondary CTA" value={content.hero.secondaryCta}
            onChange={(v) => setHero('secondaryCta', v)} />
        </div>
        <div className="mt-2">
          <textarea
            value={content.hero.subheading}
            onChange={(e) => setHero('subheading', e.target.value)}
            rows={4}
            className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white"
          />
          {!lintOutwardWording(content.hero.subheading).safe && (
            <p className="text-[10px] text-stamp mt-1">Unsafe wording in hero subheading</p>
          )}
        </div>
      </Card>

      {/* §UI/UX Wave 2 completion — visibility & protection: outward copy on the
          live homepage, previously linted but not editable. */}
      <Card
        title="Visibility & control"
        subtitle="The “you see exactly what we see” section of the public homepage"
      >
        <PointsEditor
          heading={content.visibility.heading}
          subheading={content.visibility.subheading}
          points={content.visibility.points}
          onChangeHeading={(v) => setSectionHeading('visibility', v)}
          onChangeSubheading={(v) => setSectionSubheading('visibility', v)}
          onChangePoint={(i, patch) => setSectionPoint('visibility', i, patch)}
        />
      </Card>

      <Card
        title="Protection"
        subtitle="The “built to stop deadlines becoming problems” section of the public homepage"
      >
        <PointsEditor
          heading={content.protection.heading}
          subheading={content.protection.subheading}
          points={content.protection.points}
          onChangeHeading={(v) => setSectionHeading('protection', v)}
          onChangeSubheading={(v) => setSectionSubheading('protection', v)}
          onChangePoint={(i, patch) => setSectionPoint('protection', i, patch)}
        />
      </Card>

      {previewDraft && (
        <Card title="Draft Preview (renders the actual homepage component)">
          <div className="h-[520px] overflow-y-auto overflow-x-hidden rounded-lg border border-white/[0.08] bg-black">
            <div style={{ width: '1280px', transform: 'scale(0.75)', transformOrigin: 'top left' }}>
              <Home content={content} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

