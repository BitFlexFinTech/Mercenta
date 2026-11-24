import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrandAgreements,
  useCanonicalStoreVersion,
  useCatalogSubmissions,
  useContracts,
} from '@/data/queries';
import {
  getProductIdentifier,
  latestSubmissionForProduct,
  updateProductAvailability,
  updateProductCost,
} from '@/data/demoStore';
import { evaluateComplianceGate } from '@/lib/compliance';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import {
  pollCatalogSubmission,
  submitCatalogProduct,
  type CatalogActor,
} from '@/lib/catalog/catalogLifecycle';
import { SUBMISSION_STATUS_LABELS } from '@/lib/spapi/transform';
import { createCatalogImportClient, importCatalogCsv, type CatalogCsvRow } from '@/lib/catalog/csvImport';
import type { ApprovedCategory, Product } from '@/types';
import { BrandCatalogView, type BrandCatalogRowMeta } from './BrandCatalogView';

export function BrandCatalogScreen() {
  const { products, addProduct, gateDocs, brandProfile, session } = useApp();
  const qc = useQueryClient();
  const contracts = useContracts().data?.data ?? [];
  const brandAgreements = useBrandAgreements().data?.data ?? [];
  const submissionsQ = useCatalogSubmissions();
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;

  const [availabilityOverride, setAvailabilityOverride] = useState<Record<string, boolean>>({});
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);

  const brandId = session?.tenantId;
  const hasSignedAgreement = brandId
    ? contracts.some(
        (c) =>
          c.brandId === brandId &&
          c.type === 'distribution_agreement' &&
          (c.status === 'signed' || c.status === 'active')
      )
    : false;
  const logisticsSlaAccepted = brandId
    ? brandAgreements.some((a) => a.brandId === brandId && a.agreementType === 'logistics_sla')
    : false;
  const chargebackIndemnityAccepted = brandId
    ? brandAgreements.some(
        (a) => a.brandId === brandId && a.agreementType === 'chargeback_indemnity'
      )
    : false;

  const gate = evaluateComplianceGate(
    gateDocs,
    brandProfile?.category as ApprovedCategory | undefined,
    hasSignedAgreement,
    logisticsSlaAccepted,
    chargebackIndemnityAccepted
  );

  const actor = useMemo<CatalogActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId }),
    [brandId]
  );

  const rows = useMemo<BrandCatalogRowMeta[]>(() => {
    void submissionsQ.data;
    void canonicalVersion;
    return products.map((product) => ({
      product,
      completeness: evaluateProductCompleteness(product as unknown as Record<string, unknown>),
      identifier: brandId ? getProductIdentifier(brandId, product.sku) : undefined,
      latestSubmission: brandId ? latestSubmissionForProduct(brandId, product.sku) : undefined,
      isAvailable: availabilityOverride[product.sku] ?? product.isAvailable !== false,
    }));
  }, [products, brandId, submissionsQ.data, canonicalVersion, availabilityOverride]);

  const incompleteCount = rows.filter((r) => !r.completeness.complete).length;

  async function handleSubmitProduct(p: Product) {
    if (!brandId) return;
    setBusySku(p.sku);
    setSubmissionNotice(null);
    const result = await submitCatalogProduct(
      brandId,
      p as unknown as Record<string, unknown>,
      actor
    );
    setBusySku(null);
    if (!result.ok) {
      setSubmissionNotice(`${p.sku}: ${result.error}`);
      return;
    }
    setSubmissionNotice(
      `${p.sku}: submitted (${result.value.submissionId}) · ${SUBMISSION_STATUS_LABELS[result.value.status]}${
        result.value.simulated ? ' (SIMULATED)' : ''
      }`
    );
    await qc.invalidateQueries({ queryKey: ['catalog-submissions'] });
  }

  async function handlePollSubmission(submissionId: string) {
    setBusySku(submissionId);
    setSubmissionNotice(null);
    const result = await pollCatalogSubmission(submissionId, actor);
    setBusySku(null);
    if (!result.ok) {
      setSubmissionNotice(result.error);
      return;
    }
    setSubmissionNotice(
      `${result.value.sku}: ${SUBMISSION_STATUS_LABELS[result.value.status]}${
        result.value.rejectionReason ? ` — ${result.value.rejectionReason}` : ''
      }`
    );
    await qc.invalidateQueries({ queryKey: ['catalog-submissions'] });
  }

  function handleAddProduct(p: Product) {
    if (!gate.cleared) {
      setGateError(
        `Catalog submission blocked — ${gate.missing.length} missing / ${gate.blocking.length} pending document(s).`
      );
      return;
    }
    setGateError(null);
    addProduct(p);
  }

  async function handleImportCsvText(csvText: string): Promise<{ ok: boolean; summary: string }> {
    if (!brandId) return { ok: false, summary: 'No active brand tenant.' };
    async function* chunks(): AsyncIterable<string> {
      yield csvText;
    }
    const validRows: CatalogCsvRow[] = [];
    const result = await importCatalogCsv(brandId, chunks(), {
      client: createCatalogImportClient(null),
      onRow: (o) => {
        if (o.type === 'row' && o.ok) validRows.push(o.row);
      },
    });
    if (validRows.length > 0) {
      const client = createCatalogImportClient(null);
      await client.commitBatch(brandId, validRows);
    }
    return {
      ok: validRows.length > 0,
      summary: `Parsed ${result.totalRows} row(s): ${validRows.length} imported.`,
    };
  }

  return (
    <BrandCatalogView
      loading={submissionsQ.isPending}
      products={rows}
      gateCleared={gate.cleared}
      gateStatusLabel={brandProfile.complianceGateStatus === 'in_review' ? 'In Review' : 'Blocked'}
      gateMissing={gate.missing}
      gateBlocking={gate.blocking.map((b) => ({ type: b.type, status: b.status }))}
      incompleteCount={incompleteCount}
      submissionNotice={submissionNotice}
      gateError={gateError}
      busySku={busySku}
      onToggleAvailability={(sku, next) => {
        setAvailabilityOverride((prev) => ({ ...prev, [sku]: next }));
        updateProductAvailability(sku, next);
      }}
      onEditCost={(sku, newPrice) => {
        updateProductCost(sku, newPrice);
        setSubmissionNotice(`Updated Ex-Works price for ${sku} to £${newPrice.toFixed(2)}.`);
      }}
      onSubmitProduct={handleSubmitProduct}
      onPollSubmission={handlePollSubmission}
      onAddProduct={handleAddProduct}
      onImportCsvText={handleImportCsvText}
    />
  );
}
export default BrandCatalogScreen;
