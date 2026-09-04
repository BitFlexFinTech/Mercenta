/**
 * Thin bridge so automation modules depend on the scoring engine without a
 * circular import path, and so tests can feed plain objects.
 */
import { assignTrack as _assignTrack, isBorderline as _isBorderline } from '@/lib/scoring';

export interface FulfillmentScoreLike {
  brandId: string;
  totalScore: number;
  manualOverride?: boolean;
}

export const isBorderline = _isBorderline;
export const assignTrack = _assignTrack;
