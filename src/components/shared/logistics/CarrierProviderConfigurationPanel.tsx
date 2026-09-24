/**
 * §P10 (programme §4 P10) — CARRIER PROVIDER CONFIGURATION PANEL.
 *
 * The ONE presentation of `src/lib/shipping/providerConfiguration.ts`, used by BOTH
 * logistics workspaces so the brand and the operator read the same derived record:
 *
 *   · `scope: 'brand'` — read-only. The account, its lane, its declared capability and
 *     its truthful state; no credential, no cost, no control.
 *   · `scope: 'admin'`  — the same record plus the control plane, what activates it, and
 *     a REAL hand-off to the canonical Integrations view that owns the credential.
 *     Mercenta administers these accounts; a carrier never logs in (programme §1).
 *
 * It adds no rule: operational/state/basis all come from the owner, and a
 * non-operational provider is shown as non-operational rather than quietly greyed out.
 */
import { Button, StatusBadge } from '@/components/ui';
import { PlugZap, ShieldCheck } from 'lucide-react';
import {
  BRAND_PROVIDER_CONFIGURATION_NOTICE,
  type CarrierProviderConfiguration,
} from '@/lib/shipping/providerConfiguration';

export interface CarrierProviderConfigurationPanelProps {
  configurations: CarrierProviderConfiguration[];
  scope: 'brand' | 'admin';
  /** Admin only — the canonical Integrations view that owns the credential. */
  onOpenIntegrations?: () => void;
}

export function CarrierProviderConfigurationPanel({
  configurations,
  scope,
  onOpenIntegrations,
}: CarrierProviderConfigurationPanelProps) {
  return (
    <div
      data-testid={`carrier-provider-configuration-${scope}`}
      /**
       * §P10 — FAIL-CLOSED HAND-OFF. The Integrations view is restricted by the canonical
       * RBAC (`src/lib/auth/rbac.ts → VIEW_ALLOWLIST`, with the shell's own render guard),
       * so the hand-off is rendered ONLY when the caller has confirmed the destination is
       * reachable for this session. Otherwise the record is still shown, with no control
       * that would land the actor on an access-denied screen.
       */
      data-handoff={onOpenIntegrations ? 'available' : 'role_restricted'}
    >
      <ul className="space-y-2">
        {configurations.map((config) => (
          <li
            key={config.carrier}
            className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-2.5"
            data-testid={`carrier-provider-${config.carrier}`}
            data-operational={config.operational ? 'true' : 'false'}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <div className="min-w-0">
                <p className="text-ds-label font-medium text-zinc-200">{config.accountLabel}</p>
                <p className="mt-0.5 text-ds-micro leading-relaxed text-zinc-500">
                  {config.capabilityLabel}
                </p>
              </div>
              <span
                data-testid={`carrier-provider-state-${config.carrier}`}
                data-mode={config.mode}
              >
                <StatusBadge tone={config.operational ? 'success' : 'neutral'}>
                  {config.stateLabel}
                </StatusBadge>
              </span>
            </div>

            <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              <div className="flex items-baseline gap-1 text-ds-micro">
                <dt className="text-zinc-600">Lane:</dt>
                <dd className="text-zinc-400">{config.laneLabels.join(' · ')}</dd>
              </div>
              <div className="flex items-baseline gap-1 text-ds-micro">
                <dt className="text-zinc-600">Service:</dt>
                <dd className="text-zinc-400">{config.services.join(' · ')}</dd>
              </div>
              <div className="flex items-baseline gap-1 text-ds-micro">
                <dt className="text-zinc-600">Lane account for:</dt>
                <dd className="font-mono text-zinc-400">
                  {config.routingLanes.length > 0 ? config.routingLanes.join(', ') : '— override only'}
                </dd>
              </div>
            </dl>

            <p className="mt-1.5 text-ds-micro leading-relaxed text-zinc-500">{config.basis}</p>

            {scope === 'admin' && (
              <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
                <p className="flex items-start gap-1.5 text-ds-micro leading-relaxed text-zinc-400">
                  <ShieldCheck className="mt-px h-3 w-3 flex-shrink-0 text-zinc-500" aria-hidden="true" />
                  Configured by Mercenta in the {config.controlPlane}.
                </p>
                <p className="text-ds-micro leading-relaxed text-zinc-500">{config.activation}</p>
                {onOpenIntegrations && (
                  <Button size="sm" variant="secondary" onClick={onOpenIntegrations}>
                    <PlugZap className="h-3 w-3" />
                    Open Integration Settings
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {scope === 'brand' ? (
        <p className="mt-2 text-ds-micro leading-relaxed text-zinc-500" data-testid="carrier-provider-brand-notice">
          {BRAND_PROVIDER_CONFIGURATION_NOTICE}
        </p>
      ) : (
        <p className="mt-2 text-ds-micro leading-relaxed text-zinc-500">
          A provider that is not positively operational is refused by the eligibility derivation and by the
          carrier domain — availability is never eligibility, and an unregistered provider is never treated
          as simulation.
        </p>
      )}
    </div>
  );
}
