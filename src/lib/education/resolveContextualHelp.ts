/**
 * §PHASE 5 — THE CONTEXTUAL EDUCATION RESOLVER — the pure rules over the owner.
 *
 * The owner (`src/config/contextualEducation.ts`) declares the field explanations;
 * this module applies them. It is PURE and DETERMINISTIC: no clock, no randomness,
 * no network, no AI.
 *
 * THE RULES IT ENFORCES:
 *   · an explanation's help text is NEVER duplicated — the resolver resolves the
 *     canonical Knowledge Base article live, by id, so the article stays the ONE
 *     owner of the help text (LEARN) and the canonical guided tour stays the ONE
 *     owner of the screen walk-through (WATCH);
 *   · an UNKNOWN field key is REFUSED (fail closed) — no explanation is guessed;
 *   · an explanation that points at a Knowledge Base article which does not exist
 *     is REFUSED (fail closed), so a broken link is never shown as if it worked.
 */
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import { TOUR_REGISTRY } from '@/config/tours/tourDefinitions';
import {
  CONTEXTUAL_EDUCATION_BASIS,
  CONTEXTUAL_EDUCATION_DISCLAIMER,
  CONTEXTUAL_EXPLANATIONS,
  CONTEXTUAL_SCREENS,
  CONTEXTUAL_SCREEN_ORDER,
  EXPLANATIONS_ATTACH_TO_REAL_SCREENS,
  EXPLANATIONS_REUSE_CANONICAL_KB,
  type ContextualExplanation,
  type ContextualScreenId,
} from '@/config/contextualEducation';

export type ContextualRefusal = 'CONTEXTUAL_HELP_UNKNOWN' | 'CONTEXTUAL_HELP_ARTICLE_MISSING';

export interface ResolvedContextualHelp {
  key: string;
  label: string;
  screen: ContextualScreenId;
  screenLabel: string;
  why: string;
  /** The resolved canonical Knowledge Base article, or null when refused. */
  article: { id: string; title: string; summary: string } | null;
  /** The canonical guided tour of the screen, or null when the screen has none. */
  tour: { id: string; name: string } | null;
  refused: ContextualRefusal | null;
}

/** The refusal object for an explanation that cannot be shown. */
function refusal(key: string, code: ContextualRefusal): ResolvedContextualHelp {
  return {
    key,
    label: '',
    screen: 'product-catalog',
    screenLabel: '',
    why: '',
    article: null,
    tour: null,
    refused: code,
  };
}

/** The canonical tour for a screen, resolved live from the tour registry. */
function tourForScreen(screen: ContextualScreenId): ResolvedContextualHelp['tour'] {
  const tourId = CONTEXTUAL_SCREENS[screen]?.tourId ?? null;
  if (!tourId) return null;
  const tour = TOUR_REGISTRY[tourId];
  return tour ? { id: tour.id, name: tour.name } : null;
}

/**
 * Resolve ONE explanation against the canonical Knowledge Base + tour registry.
 * Exported so the gate can exercise the fail-closed branch directly (an
 * explanation whose article does not exist must be REFUSED, not shown).
 */
export function resolveContextualExplanation(def: ContextualExplanation): ResolvedContextualHelp {
  const article = getKnowledgeArticle(def.articleId);
  if (!article) return refusal(def.key, 'CONTEXTUAL_HELP_ARTICLE_MISSING');
  return {
    key: def.key,
    label: def.label,
    screen: def.screen,
    screenLabel: CONTEXTUAL_SCREENS[def.screen]?.label ?? def.screen,
    why: def.why,
    article: { id: article.id, title: article.title, summary: article.summary },
    tour: tourForScreen(def.screen),
    refused: null,
  };
}

/**
 * Resolve the "why do we need this?" explanation for a real field, by key.
 *
 * FAIL CLOSED: an unknown field key is REFUSED (`CONTEXTUAL_HELP_UNKNOWN`) and the
 * explanation carries an empty body — the caller shows nothing rather than a guess.
 */
export function resolveContextualHelp(fieldKey: string): ResolvedContextualHelp {
  const def = CONTEXTUAL_EXPLANATIONS.find((e) => e.key === fieldKey);
  if (!def) return refusal(fieldKey, 'CONTEXTUAL_HELP_UNKNOWN');
  return resolveContextualExplanation(def);
}

/* ── The labelled DEMO field ──────────────────────────────────────────────── */

/** The field the founder surface illustrates with — resolved live, never retyped. */
export const DEMO_CONTEXTUAL_FIELD_KEY = 'po.acknowledgedQuantity';

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface ContextualEducationSummary {
  /** The real screens, with how many fields each explains. */
  screens: {
    id: ContextualScreenId;
    label: string;
    tourId: string | null;
    tourName: string | null;
    fieldCount: number;
  }[];
  screenCount: number;
  /** Every declared explanation, with its canonical article + tour resolved. */
  explanations: {
    key: string;
    label: string;
    screen: ContextualScreenId;
    screenLabel: string;
    why: string;
    articleId: string;
    articleTitle: string;
    tourId: string | null;
  }[];
  explanationCount: number;
  /** The distinct canonical Knowledge Base articles the explanations reuse. */
  articleIds: string[];
  reuseCanonicalKb: boolean;
  attachToRealScreens: boolean;
  /** A labelled DEMO field, resolved from the owner — never retyped. */
  demo: {
    key: string;
    label: string;
    why: string;
    articleTitle: string;
    tourName: string | null;
  } | null;
  basis: string;
  disclaimer: string;
}

/** Summarise contextual education for the founder surface. Derived, never retyped. */
export function buildContextualEducationSummary(): ContextualEducationSummary {
  const explanations = CONTEXTUAL_EXPLANATIONS.map((def) => {
    const r = resolveContextualExplanation(def);
    return {
      key: r.key,
      label: r.label,
      screen: r.screen,
      screenLabel: r.screenLabel,
      why: r.why,
      articleId: def.articleId,
      articleTitle: r.article?.title ?? '',
      tourId: r.tour?.id ?? null,
    };
  });

  const demo = resolveContextualHelp(DEMO_CONTEXTUAL_FIELD_KEY);

  return {
    screens: CONTEXTUAL_SCREEN_ORDER.map((id) => {
      const screen = CONTEXTUAL_SCREENS[id];
      const tour = screen.tourId ? TOUR_REGISTRY[screen.tourId] : undefined;
      return {
        id,
        label: screen.label,
        tourId: screen.tourId,
        tourName: tour?.name ?? null,
        fieldCount: CONTEXTUAL_EXPLANATIONS.filter((e) => e.screen === id).length,
      };
    }),
    screenCount: CONTEXTUAL_SCREEN_ORDER.length,
    explanations,
    explanationCount: explanations.length,
    articleIds: [...new Set(explanations.map((e) => e.articleId))],
    reuseCanonicalKb: EXPLANATIONS_REUSE_CANONICAL_KB,
    attachToRealScreens: EXPLANATIONS_ATTACH_TO_REAL_SCREENS,
    demo: demo.refused
      ? null
      : {
          key: demo.key,
          label: demo.label,
          why: demo.why,
          articleTitle: demo.article?.title ?? '',
          tourName: demo.tour?.name ?? null,
        },
    basis: CONTEXTUAL_EDUCATION_BASIS,
    disclaimer: CONTEXTUAL_EDUCATION_DISCLAIMER,
  };
}
