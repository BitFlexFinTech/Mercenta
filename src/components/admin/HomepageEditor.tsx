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
} from '@/config/homepageContent';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import { Home } from '@/components/marketing/Home';
import { Badge, Button, Card, Input } from '@/components/ui';
import { AlertTriangle, CheckCircle2, Eye, Save, Send } from 'lucide-react';

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

export function HomepageEditor() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [status, setStatus] = useState('');
  const [previewDraft, setPreviewDraft] = useState(false);

  useEffect(() => {
    void fetchHomepageContent().then((r) => setContent(r.draft ?? r.live));
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
      content.finalCta.heading,
      content.finalCta.subheading,
      ...content.services.cards.map((c) => `${c.title} ${c.description}`),
      ...content.route.steps.map((s) => `${s.title} ${s.description}`),
    ];
    return texts.some((t) => !lintOutwardWording(t).safe);
  }, [content]);

  const setHero = (k: HeroField, v: string) =>
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [k]: v } }));

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

