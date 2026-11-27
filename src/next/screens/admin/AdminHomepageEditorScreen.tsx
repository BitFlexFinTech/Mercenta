/**
 * §PHASE C BATCH C1 — THE HOMEPAGE EDITOR'S DATA HALF (the console's Screen/View split).
 *
 * This file owns the DRAFT the editor is working on, calls the three existing owners, and
 * hands the view plain values and callbacks — the same shape every other console screen
 * uses (`AdminUsertourScreen` + `AdminUsertourView`).
 *
 * IT OWNS NOTHING ELSE. The model is `@/config/homepageContent`, the design list is
 * `@/config/homepageDesign` (labels are READ from the owner, never retyped here) and the
 * draft/publish pipeline is `@/data/api` — the SAME pipeline the legacy editor uses, so
 * the two screens can never disagree about what is published.
 *
 * FAIL-CLOSED, LIKE THE LEGACY EDITOR. If any outward-facing field contains wording this
 * project never publishes outward, Save AND Publish are disabled and the view names the
 * first reason. A load failure is shown, never swallowed, and never leaves a blank form
 * pretending the copy is empty.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomeCardItem,
  type HomepageContent,
} from '@/config/homepageContent';
import {
  HOMEPAGE_DESIGNS,
  HOMEPAGE_DESIGN_ORDER,
  type HomepageDesignId,
} from '@/config/homepageDesign';
import { fetchHomepageContent, publishHomepageContent, saveHomepageDraft } from '@/data/api';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import {
  AdminHomepageEditorView,
  type HeroField,
  type HomepageEditorDesignOption,
  type PointSectionId,
} from './AdminHomepageEditorView';

/** The design options, projected from the ONE owner (`homepageDesign.ts`). */
const DESIGN_OPTIONS: readonly HomepageEditorDesignOption[] = HOMEPAGE_DESIGN_ORDER.map((id) => ({
  id,
  label: HOMEPAGE_DESIGNS[id].label,
  description: HOMEPAGE_DESIGNS[id].description,
}));

/**
 * Every outward-facing string the wording gate must cover. THE SAME LIST the legacy
 * editor checks: a section missing from here would be publishable with banned
 * positioning, which is the defect this gate exists to prevent.
 */
function outwardTexts(content: HomepageContent): string[] {
  return [
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
}

export function AdminHomepageEditorScreen() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  /** The design that is LIVE, kept separate from the draft selection so the picker can
   *  always distinguish what is published from what is merely selected. */
  const [publishedDesign, setPublishedDesign] = useState<HomepageDesignId>(
    DEFAULT_HOMEPAGE_CONTENT.design
  );
  const [status, setStatus] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the persisted copy (draft if one exists, otherwise live). Extracted so Revert
   * re-runs EXACTLY the same load the editor performs on open: reverting discards the
   * in-form edits and re-reads persisted state, it never invents a default.
   */
  const loadPersisted = useCallback(async () => {
    const result = await fetchHomepageContent();
    setContent(result.draft ?? result.live);
    setPublishedDesign(result.live.design);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadPersisted()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPersisted]);

  /** The FIRST banned-term reason, or null when every outward field is safe. */
  const unsafeReason = useMemo(() => {
    for (const text of outwardTexts(content)) {
      const lint = lintOutwardWording(text);
      if (!lint.safe) return lint.hits[0]?.reason ?? 'banned positioning';
    }
    return null;
  }, [content]);

  const setHero = useCallback((field: HeroField, value: string) => {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }, []);

  const setDesign = useCallback((id: HomepageDesignId) => {
    setContent((prev) => ({ ...prev, design: id }));
  }, []);

  const resetDesignToPublished = useCallback(() => {
    setContent((prev) => ({ ...prev, design: publishedDesign }));
  }, [publishedDesign]);

  /** Each write touches ONLY its own section, so an edit here can never mutate
   *  unrelated homepage copy. */
  const setSectionHeading = useCallback((section: PointSectionId, value: string) => {
    setContent((prev) => ({ ...prev, [section]: { ...prev[section], heading: value } }));
  }, []);

  const setSectionSubheading = useCallback((section: PointSectionId, value: string) => {
    setContent((prev) => ({ ...prev, [section]: { ...prev[section], subheading: value } }));
  }, []);

  const setSectionPoint = useCallback(
    (section: PointSectionId, index: number, patch: Partial<HomeCardItem>) => {
      setContent((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          points: prev[section].points.map((p, i) => (i === index ? { ...p, ...patch } : p)),
        },
      }));
    },
    []
  );

  /* Every action reports its REAL outcome. A failure sets `error` rather than leaving
     the operator believing a draft was saved when it was not. */
  const saveDraft = useCallback(() => {
    setError(null);
    void saveHomepageDraft(content).then(
      () => setStatus('Draft saved — the public homepage is unchanged until you publish'),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e))
    );
  }, [content]);

  const publish = useCallback(() => {
    setError(null);
    void saveHomepageDraft(content)
      .then(() => publishHomepageContent())
      .then(
        () => {
          setPublishedDesign(content.design);
          setStatus('Published — the public homepage now serves this copy');
        },
        (e: unknown) => setError(e instanceof Error ? e.message : String(e))
      );
  }, [content]);

  const revert = useCallback(() => {
    setError(null);
    void loadPersisted().then(
      () => setStatus('Reverted — the form now shows the last persisted copy'),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e))
    );
  }, [loadPersisted]);

  const sections = useMemo(
    () => [
      {
        id: 'visibility' as const,
        title: 'Visibility & control',
        subtitle: 'The "you see exactly what we see" section of the public homepage.',
        heading: content.visibility.heading,
        subheading: content.visibility.subheading,
        points: content.visibility.points,
      },
      {
        id: 'protection' as const,
        title: 'Protection',
        subtitle: 'The "built to stop deadlines becoming problems" section of the public homepage.',
        heading: content.protection.heading,
        subheading: content.protection.subheading,
        points: content.protection.points,
      },
    ],
    [content.protection, content.visibility]
  );

  return (
    <AdminHomepageEditorView
      loading={loading}
      error={error}
      content={content}
      publishedDesignId={publishedDesign}
      designOptions={DESIGN_OPTIONS}
      sections={sections}
      unsafeReason={unsafeReason}
      status={status}
      previewOpen={previewOpen}
      onHeroField={setHero}
      onDesign={setDesign}
      onResetDesignToPublished={resetDesignToPublished}
      onSectionHeading={setSectionHeading}
      onSectionSubheading={setSectionSubheading}
      onSectionPoint={setSectionPoint}
      onSaveDraft={saveDraft}
      onPublish={publish}
      onRevert={revert}
      onTogglePreview={() => setPreviewOpen((v) => !v)}
      onClosePreview={() => setPreviewOpen(false)}
    />
  );
}
