/**
 * §WAVE 3h (2026-11-25) — brand settings (data + the one action a brand owns here).
 *
 * The brand can REQUEST a change to an allowed field, with a reason: that is the
 * canonical `requestProfileChange` command, and every request is tracked with its
 * reviewer. Banking and identity changes are never edited directly — the business
 * model requires Mercenta verification.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands } from '@/data/queries';
import { fetchProfileChangeRequests, requestProfileChange } from '@/data/api';
import { resolveBrandCommercialModel } from '@/data/demoStore';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
  type CommercialModel,
} from '@/config/commercialModel';
import { VERTICAL_LABELS, verticalOf } from '@/config/verticals';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import type { ProfileChangeField } from '@/types';
import { BrandSettingsView } from './BrandSettingsView';

const FIELD_LABELS: Record<ProfileChangeField, string> = {
  businessName: 'Business name',
  email: 'Email',
  phone: 'Phone',
  signatory: 'Authorised signatory',
  iban: 'IBAN',
  bic: 'BIC',
};

export function BrandSettingsScreen() {
  const { brandProfile, session } = useApp();
  const brandsQ = useBrands();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const brandId = session?.tenantId ?? '';
  const brand = (brandsQ.data?.data ?? []).find((candidate) => candidate.id === brandId);

  /* The commercial relationship is read from its CANONICAL owner, and an unrecorded
     model is reported as unrecorded — never guessed. */
  const relationship = resolveBrandCommercialModel(brandId);
  const commercialRelationshipLabel = relationship.selected
    ? COMMERCIAL_MODELS[relationship.model as CommercialModel].label
    : COMMERCIAL_MODEL_NOT_SELECTED_LABEL;

  /**
   * No canonical hook exists for this read yet, so it is queried directly — with the
   * SAME owner (`fetchProfileChangeRequests`) a hook would use.
   */
  const requestsQ = useQuery({
    queryKey: ['profile-change-requests', brandId],
    queryFn: fetchProfileChangeRequests,
    enabled: Boolean(brandId),
    staleTime: 30_000,
  });

  const submit = useMutation({
    mutationFn: async (input: {
      field: ProfileChangeField;
      requestedValue: string;
      reason: string;
    }) =>
      requestProfileChange({
        brandId,
        field: input.field,
        currentValue: fieldCurrentValues[input.field],
        requestedValue: input.requestedValue,
        reason: input.reason,
      }),
    onSuccess: async (request) => {
      setNotice(
        `Request recorded for ${FIELD_LABELS[request.field]} — Mercenta will review it. You can see its status below.`
      );
      await qc.invalidateQueries({ queryKey: ['profile-change-requests', brandId] });
    },
  });

  /* The current value of each requestable field, read from the brand's own record —
     the request carries the true "from" value rather than an empty string. */
  const fieldCurrentValues = useMemo<Record<ProfileChangeField, string>>(
    () => ({
      businessName: brandProfile.businessName,
      email: brandProfile.email,
      phone: brandProfile.phone,
      signatory: brandProfile.signatory,
      iban: brandProfile.iban,
      bic: brandProfile.bic,
    }),
    [brandProfile]
  );

  const fieldOptions = useMemo(
    () =>
      (Object.keys(FIELD_LABELS) as ProfileChangeField[]).map((id) => ({
        id,
        label: FIELD_LABELS[id],
        currentValue: fieldCurrentValues[id],
      })),
    [fieldCurrentValues]
  );

  const requests = useMemo(() => {
    const result = requestsQ.data;
    const list = result && 'data' in result ? result.data : [];
    return list.filter((request) => request.brandId === brandId);
  }, [requestsQ.data, brandId]);

  return (
    <BrandSettingsView
      profile={brandProfile}
      verticalLabel={VERTICAL_LABELS[verticalOf({ vertical: brand?.vertical })]}
      commercialRelationshipLabel={commercialRelationshipLabel}
      fulfilmentTrackLabel={fulfillmentTrackLabel(brand?.track)}
      requests={requests}
      fieldOptions={fieldOptions}
      busy={submit.isPending}
      notice={notice}
      onSubmitRequest={(input) => submit.mutate(input)}
    />
  );
}