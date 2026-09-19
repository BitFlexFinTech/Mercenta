/**
 * Regional demo dossiers — CANONICAL home (moved verbatim from the retired
 * src/mockData.ts during the Stage-20 fixture collapse). Consumed by the
 * GlobalStateContext one-click demo login and the audit checks.
 *
 * §Phase 4 — these are now DERIVED from the canonical 20 real brands via
 * `buildBrandDossier`, never hand-maintained. Three representative real
 * brands cover the DemoRegion keys:
 *   uk      → Astonish  (real UK brand)
 *   usa     → Tapatío   (real international brand, United States)
 *   europe  → Le Creuset (real international brand, France)
 *
 * There is deliberately NO fake brand data here: every dossier below is a
 * real company's row, and the operational records it carries are the same
 * simulated data every other demo view reads (single source of truth).
 */
import type {
  DemoRegion,
  RegionalDossier,
} from '../types';
import { ALL_DEMO_BRANDS } from './demoData';
import { buildBrandDossier } from './brandDossiers';

/**
 * canonicalBrandForRegion — the single representative canonical real brand
 * mapped to each DemoRegion key. A UK origin is always expressed by nation
 * (never by guessing from the region label).
 */
const canonicalBrandForRegion = (region: DemoRegion) => {
  const id =
    region === 'uk' ? 'brand-astonish'
    : region === 'usa' ? 'brand-tapatio'
    : 'brand-lecreuset';
  const brand = ALL_DEMO_BRANDS.find((b) => b.id === id);
  if (!brand) throw new Error(`[regionalDossiers] canonical brand ${id} missing — dataset is corrupted`);
  return brand;
};

export const REGIONAL_DOSSIERS: Record<DemoRegion, RegionalDossier> = {
  uk: buildBrandDossier(canonicalBrandForRegion('uk')),
  usa: buildBrandDossier(canonicalBrandForRegion('usa')),
  europe: buildBrandDossier(canonicalBrandForRegion('europe')),
};
