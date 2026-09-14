/**
 * §M6 — THE ACCOUNTING SEAM.
 *
 * The reconciliation of a received payment must reach the accounting system
 * through ONE seam, and that seam must never claim a representation it did not
 * write:
 *
 *   - `simulated_accounting_representation` — the deterministic SIMULATION
 *     representation. In-process, zero network, unmistakably `SIM-…`, and only
 *     selected when the provider mode is POSITIVELY `simulation`.
 *   - `xero` — the REAL Xero integration, built on the EXISTING
 *     `src/services/xero` client (`createXeroClient` → `reconcileAmazonRemittance`).
 *     When credentials are absent the existing factory returns its Mock client,
 *     which reports "not connected": the posting is then recorded as NOT
 *     represented, with that real error. Nothing is faked.
 *   - `unavailable_accounting_representation` — FAIL-CLOSED for every other
 *     mode (unknown / available / configuring / disabled / degraded / error).
 *
 * Swapping simulation → live requires credentials only: the domain workflow
 * (reconcile → represent → payout eligibility → payout) never changes.
 */

import type { VatTreatment } from '@/types';
import { isProviderSimulationSafe, type ProviderResolutionMode } from '@/integrations/types';
import { createXeroClient, type RemittanceSyncData } from '@/services/xero';

export interface AccountingPostingInput {
  reconciliationId: string;
  brandId: string;
  brandName: string;
  purchaseOrderNumber: string;
  invoiceId: string;
  paymentId: string;
  currency: 'GBP';
  amountGbp: number;
  poValueGbp: number;
  commissionAmountGbp: number;
  deductionsAppliedGbp: number;
  netToBrandGbp: number;
  vatTreatment: VatTreatment;
  vatAmountGbp?: number;
  periodStart: string;
  periodEnd: string;
}

export interface AccountingPostingResult {
  ok: boolean;
  provider: string;
  mode: 'simulation' | 'live' | 'unavailable';
  /** TRUE only when the representation was actually written. */
  represented: boolean;
  representationId?: string;
  simulated: boolean;
  external: boolean;
  error?: string;
}

export interface AccountingClient {
  readonly id: string;
  readonly mode: 'simulation' | 'live' | 'unavailable';
  readonly simulated: boolean;
  readonly external: boolean;
  readonly available: boolean;
  post(input: AccountingPostingInput): Promise<AccountingPostingResult>;
}

/* ── Simulation ──────────────────────────────────────────────────────────── */

export class SimulatedAccountingClient implements AccountingClient {
  readonly id = 'simulated_accounting_representation';
  readonly mode = 'simulation' as const;
  readonly simulated = true;
  readonly external = false;
  readonly available = true;

  async post(input: AccountingPostingInput): Promise<AccountingPostingResult> {
    return {
      ok: true,
      provider: this.id,
      mode: 'simulation',
      represented: true,
      representationId: `SIM-XERO-REC-${input.reconciliationId}`,
      simulated: true,
      external: false,
    };
  }
}

/* ── Real Xero (existing service layer) ──────────────────────────────────── */

export class XeroAccountingClient implements AccountingClient {
  readonly id = 'xero';
  readonly mode = 'live' as const;
  readonly simulated = false;
  readonly external = true;
  readonly available = true;

  constructor(private readonly partnerId: string) {}

  async post(input: AccountingPostingInput): Promise<AccountingPostingResult> {
    const client = createXeroClient(this.partnerId);
    const remittance: RemittanceSyncData = {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      brandName: input.brandName,
      lines: [
        {
          poNumber: input.purchaseOrderNumber,
          grossValue: input.poValueGbp,
          commission: input.commissionAmountGbp,
          deductions: input.deductionsAppliedGbp
            ? [{ type: 'applied_deductions', amountGbp: input.deductionsAppliedGbp }]
            : [],
        },
      ],
    };
    try {
      const result = await client.reconcileAmazonRemittance(remittance);
      if (!result.ok) {
        // The real client refused (commonly: not connected). Record the truth —
        // nothing is claimed as represented.
        return {
          ok: false,
          provider: this.id,
          mode: 'live',
          represented: false,
          simulated: false,
          external: false,
          error: result.error ?? 'Xero refused the reconciliation posting',
        };
      }
      return {
        ok: true,
        provider: this.id,
        mode: 'live',
        represented: true,
        representationId: `XERO-REC-${input.reconciliationId}`,
        simulated: false,
        external: true,
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.id,
        mode: 'live',
        represented: false,
        simulated: false,
        external: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/* ── Fail-closed ─────────────────────────────────────────────────────────── */

export class UnavailableAccountingClient implements AccountingClient {
  readonly id = 'unavailable_accounting_representation';
  readonly mode = 'unavailable' as const;
  readonly simulated = false;
  readonly external = false;
  readonly available = false;

  constructor(private readonly reason: string) {}

  async post(): Promise<AccountingPostingResult> {
    return {
      ok: false,
      provider: this.id,
      mode: 'unavailable',
      represented: false,
      simulated: false,
      external: false,
      error: this.reason,
    };
  }
}

/**
 * Interchangeable selection. ONLY a positively identified `simulation` resolves
 * to the simulation representation and ONLY `live` to the real Xero client;
 * every other mode is fail-closed (nothing is represented).
 */
export function selectAccountingClient(opts: {
  mode: ProviderResolutionMode;
  partnerId?: string;
}): AccountingClient {
  if (isProviderSimulationSafe(opts.mode)) return new SimulatedAccountingClient();
  if (opts.mode === 'live') return new XeroAccountingClient(opts.partnerId ?? 'mercenta');
  return new UnavailableAccountingClient(
    `accounting representation is unavailable in provider mode "${opts.mode}"`
  );
}

