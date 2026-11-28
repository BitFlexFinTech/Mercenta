import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { isCommercialModel } from '@/config/commercialModel';
import { applyListingReviewOverrides, reviewListingRecommendation } from '@/data/api';
import { getProspects } from '@/data/prospectStore';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import type { ListingRecommendation } from '@/types';
import { BrandMarketIntelView } from './BrandMarketIntelView';

const QUALITATIVE_POSITION: Record<string, string> = {
  challenger: 'Growing challenger',
  established: 'Established brand',
  mega: 'Leading brand',
  niche: 'Niche brand',
};

export function BrandMarketIntelScreen() {
  const { brandProfile, session, products } = useApp();
  const tenantId = session?.tenantId;
  const brandName = brandProfile?.businessName ?? tenantId ?? 'Your Brand';
  const brandCategory = brandProfile?.category ?? 'Home';
  const commercialModel = isCommercialModel(brandProfile?.commercialModel)
    ? brandProfile.commercialModel
    : 'commission_agent';

  const [selectedSku, setSelectedSku] = useState<string>(products[0]?.sku ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stamp, setStamp] = useState(0);

  const sameCategoryProspects = useMemo(() => {
    const scored = getProspects().filter((p) => !p.disqualified);
    return {
      total: scored.length,
      sameCat: scored.filter((p) => p.category === brandCategory),
    };
  }, [brandCategory]);

  const productPerformance = useMemo(
    () =>
      products.map((product) => {
        const raw = analyzeProductListing(product as unknown as Record<string, unknown>, {
          category: brandCategory,
          brandId: tenantId,
          competitorBrandCount: sameCategoryProspects.sameCat.length,
        });
        return {
          product,
          analysis: tenantId ? applyListingReviewOverrides(raw, tenantId) : raw,
        };
      }),
    [products, brandCategory, tenantId, sameCategoryProspects.sameCat.length, stamp]
  );

  const activeSku =
    products.find((p) => p.sku === selectedSku)?.sku ?? products[0]?.sku ?? '';
  const selectedAnalysis =
    productPerformance.find((p) => p.product.sku === activeSku)?.analysis ?? null;

  const totalCategoryEst = sameCategoryProspects.sameCat.reduce(
    (sum, p) => sum + p.asins.reduce((s2, a) => s2 + (a.estimatedRevenue ?? 0), 0),
    0
  );

  async function handleReviewRecommendation(
    rec: ListingRecommendation,
    decision: 'approved' | 'edited' | 'rejected',
    editedCopy?: string
  ) {
    if (!tenantId || busyId) return;
    setBusyId(rec.id);
    setNotice(null);
    setError(null);
    const res = await reviewListingRecommendation(tenantId, rec.id, decision, {
      editedCopy: decision === 'edited' ? editedCopy : undefined,
      actorId: `brand:${tenantId}`,
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error ?? 'Decision refused.');
    } else {
      setNotice(`Recorded: "${rec.title}" marked ${decision}.`);
    }
    setStamp((s) => s + 1);
  }

  return (
    <BrandMarketIntelView
      brandName={brandName}
      brandCategory={brandCategory}
      commercialModel={commercialModel}
      totalCategoryEstMonthlyGbp={totalCategoryEst}
      trackedBrandsTotal={sameCategoryProspects.total}
      categoryBrandsCount={sameCategoryProspects.sameCat.length}
      competitors={sameCategoryProspects.sameCat.map((p) => ({
        id: p.id,
        brand: p.brand,
        positionLabel:
          p.brand === brandName
            ? 'Your brand'
            : (QUALITATIVE_POSITION[p.brandMaturity ?? ''] ?? 'Comparable brand'),
      }))}
      productPerformance={productPerformance}
      selectedSku={activeSku}
      onSelectSku={setSelectedSku}
      selectedAnalysis={selectedAnalysis}
      busyRecommendationId={busyId}
      actionNotice={notice}
      actionError={error}
      onReviewRecommendation={handleReviewRecommendation}
    />
  );
}

export default BrandMarketIntelScreen;
