/**
 * §Priority-1 — MOCK HMRC client (mock-first policy).
 *
 * Same signatures and shapes as the live client in hmrcClient.ts. Every
 * seeded VRN is registered; filing is accepted except every 3rd filing is
 * rejected once for a realistic reason (retry accepted), and a transient
 * outage flag makes the next attempt fail once. No real HMRC call is made.
 */

import type { HmrcClient, HmrcFilingInput, HmrcFilingResult, HmrcVatStatusResult } from './hmrcClient';

let filingCounter = 0;
let outageMode = false;

export function resetMockHmrcState(): void {
  filingCounter = 0;
  outageMode = false;
}

/** Deterministically make the next filing fail once (then recover). */
export function simulateHmrcOutage(flag = true): void {
  outageMode = flag;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockHmrcClient(): Pick<HmrcClient, 'getVatStatus' | 'fileReturn'> {
  return {
    async getVatStatus(vrn: string): Promise<HmrcVatStatusResult> {
      await delay(160);
      if (!/^GB/.test(vrn) && !/^MOCK-/.test(vrn)) {
        return { ok: true, vrn, status: 'not_registered' };
      }
      return {
        ok: true,
        vrn,
        status: 'registered',
        registrationDate: '2025-03-14',
        nextReturnDue: '2026-10-07',
      };
    },

    async fileReturn(input: HmrcFilingInput): Promise<HmrcFilingResult> {
      await delay(260);
      if (outageMode) {
        outageMode = false;
        return { ok: false, error: 'HMRC service unavailable (simulated transient outage) — retry' };
      }
      filingCounter += 1;
      const submissionId = `MOCK-HMRC-${String(filingCounter).padStart(5, '0')}`;
      // Every 3rd filing is rejected once with a realistic schema error.
      if (filingCounter % 3 === 0) {
        return {
          ok: false,
          status: 'rejected',
          submissionId,
          rejectionReason: 'Rejected by HMRC schema (simulated): net VAT mismatch on box 5',
          error: 'Rejected by HMRC schema (simulated): net VAT mismatch on box 5',
        };
      }
      return { ok: true, status: 'accepted', submissionId };
    },
  };
}