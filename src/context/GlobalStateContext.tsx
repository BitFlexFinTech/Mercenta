import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Environment,
  SessionRole,
  Shipment,
  Product,
  ActivityLog,
  Lead,
  Campaign,
  ApiLogEntry,
  BrandProfile,
  ShipmentStatus,
  StaffMember,
  StaffRole,
  DemoRegion,
  FinancialRecord,
  RegionalComplianceDoc,
  CarrierTokens,
  ComplianceDocument,
  CarrierId,
} from '../types';
import { buildDistributionAgreement } from '@/lib/agreement';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
import { tierForRole, canAccessEnvironment, staffCanMutate, type DemoSession } from '@/lib/auth/rbac';
import { isCommercialModel } from '@/config/commercialModel';

interface AppState {
  environment: Environment;
  setEnvironment: (env: Environment) => void;

  role: SessionRole | null;
  /** RBAC session — tier + tenant pinning for the active login. */
  session: DemoSession | null;
  signIn: (env: Environment, role: SessionRole) => void;
  /** One-click brand login pinned to a specific demo tenant. */
  activateDemoBrand: (brandId: string) => void;
  /**
   * §Phase E2 — enter the portal as a brand whose tenant came from the CANONICAL
   * onboarding record (acquisition hand-off, approved application, or manual
   * creation). The profile is built only from what Mercenta actually holds.
   */
  activateOnboardingBrand: (brandId: string) => void;
  signOut: () => void;

  shipments: Shipment[];
  updateShipmentStatus: (id: string, status: ShipmentStatus) => void;

  products: Product[];
  addProduct: (product: Product) => void;

  activityLogs: ActivityLog[];
  addActivityLog: (log: ActivityLog) => void;

  leads: Lead[];
  /** §Phase A — status transition; `fitScore` persists the live-computed ICP
   *  fit at the moment of the transition (was display-only before).
   *  §Phase C — for a BI-linked lead (id `lead-<prospectId>`) the canonical
   *  Brand Intelligence prospect is moved with it, so the BI lifecycle records
   *  the transition. */
  updateLeadStatus: (
    id: string,
    status: Lead['outreachStatus'],
    fitScore?: number
  ) => void;
  /** §7 — imported/sourced leads enter the pipeline here. */
  addLead: (lead: Lead) => void;
  /**
   * §Phase C — re-read the ICP acquisition universe from the canonical BI
   * prospect store. ICP rows are a PROJECTION of the canonical prospects, so
   * any acquisition transition re-syncs them (leads with no BI counterpart —
   * e.g. CSV imports — are preserved untouched).
   */
  refreshLeadsFromProspects: () => Promise<void>;

  campaigns: Campaign[];

  apiLogs: ApiLogEntry[];
  addApiLog: (log: ApiLogEntry) => void;

  brandProfile: BrandProfile;
  setBrandProfile: (profile: BrandProfile) => void;
  completeOnboarding: () => void;
  /** §3 — compliance-gate documents for the active brand; catalog sync blocked until all approved. */
  gateDocs: ComplianceDocument[];
  reviewGateDocument: (id: string, status: ComplianceDocument['status']) => void;
  generatedAgreement: string;

  carrierContext: CarrierId;
  setCarrierContext: (c: CarrierId) => void;

  staff: StaffMember[];
  addStaff: (member: StaffMember) => void;
  removeStaff: (id: string) => void;
  toggleStaffActive: (id: string) => void;
  updateStaffRole: (id: string, role: StaffRole) => void;
  updateStaffChannel: (id: string, channel: string) => void;
  /** §Stage-25 — the staff account performing admin actions + its RBAC tier. */
  actingStaffId: string;
  setActingStaffId: (id: string) => void;
  actingStaff: StaffMember | null;
  canCurrentUserMutate: boolean;
  updateStaffTier: (id: string, tier: StaffMember['permissionTier']) => void;

  demoRegion: DemoRegion | null;
  financials: FinancialRecord[];
  complianceDocs: RegionalComplianceDoc[];
  carrierTokens: CarrierTokens;
  activateDemo: (region: DemoRegion) => void;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_PROFILE: BrandProfile = {
  businessName: '',
  region: 'africa',
  nation: '',
  taxId: '',
  email: '',
  phone: '',
  signatory: '',
  agreed: false,
  bic: '',
  iban: '',
  payoutCurrency: 'GBP',
  dhlConnected: false,
  fedexConnected: false,
  bakConnected: false,
  onboarded: false,
  fulfillmentTrack: 'unassigned',
  complianceGateStatus: 'blocked',
  workingCapitalAnswer: undefined,
  category: undefined,
  /** §5/M12 — fail-closed until the brand picks its commercial relationship. */
  commercialModel: 'not_selected',
};

let logCounter = 100;
let apiCounter = 100;

export function AppProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>('home');
  const [role, setRole] = useState<SessionRole | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => [lead, ...prev]);
  }, []);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile>(DEFAULT_PROFILE);
  const [carrierContext, setCarrierContext] = useState<CarrierId>('dhl');
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // ── Lazy bootstrap: seed data loads after first render, not before ──
  useEffect(() => {
    import('@/data/bootstrap').then((m) => {
      setShipments(m.INITIAL_SHIPMENTS);
      setProducts(m.INITIAL_PRODUCTS);
      setActivityLogs(m.INITIAL_ACTIVITY_LOGS);
      setCampaigns(m.INITIAL_CAMPAIGNS);
      setApiLogs(m.INITIAL_API_LOGS);
      setStaff(m.INITIAL_STAFF);
    });
    // §Phase C — the ICP acquisition universe is DERIVED from the canonical
    // Brand Intelligence prospect store. The seeded `INITIAL_LEADS` fixture is
    // no longer the active acquisition source (it remains a validation fixture
    // for the identity-bridge collision check).
    import('@/data/prospectStore').then((store) => {
      setLeads(store.getAcquisitionLeads());
    });
  }, []);
  /** §Stage-25 — which staff account is performing admin actions (RBAC tier). */
  const [actingStaffId, setActingStaffId] = useState<string>('staff-001');
  const [demoRegion, setDemoRegion] = useState<DemoRegion | null>(null);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [complianceDocs, setComplianceDocs] = useState<RegionalComplianceDoc[]>([]);
  const [carrierTokens, setCarrierTokens] = useState<CarrierTokens>({});
  /** §3 compliance-gate documents for the active brand session. */
  const [gateDocs, setGateDocs] = useState<ComplianceDocument[]>([]);
  const [generatedAgreement, setGeneratedAgreement] = useState('');

  const signIn = useCallback((env: Environment, nextRole: SessionRole) => {
    const tier = tierForRole(nextRole);
    // RBAC: a tier may only enter environments its allowlist permits.
    if (!canAccessEnvironment(tier, env)) {
      console.warn(`[rbac] ${tier} is not permitted to enter "${env}" — refused`);
      return;
    }
    setSession({ tier, role: nextRole });
    setRole(nextRole);
    setEnvironment(env);
  }, []);

  /**
   * One-click demo login pinned to one specific brand tenant.
   * §Stage-20 fix #1 — hydrates the FULL brand state from a per-brand dossier
   * (products, shipments, financials, compliance, carrier tokens, onboarded
   * profile), exactly like activateDemo does for regional dossiers. Reference-
   * implementation parity: same state depth, not just the same landing page.
   */
  const activateDemoBrand = useCallback((brandId: string) => {
    Promise.all([
      import('@/data/demoData'),
      import('@/data/brandDossiers'),
      import('@/data/demoStore'),
    ]).then(([demoData, brandDossiers, store]) => {
      const brand = demoData.ALL_DEMO_BRANDS.find((b: { id: string }) => b.id === brandId);
      if (!brand) {
        console.warn(`[rbac] unknown demo brand "${brandId}" — refused`);
        return;
      }
      const dossier = brandDossiers.buildBrandDossier(brand);
      setSession({ tier: 'brand', tenantId: brand.id, role: 'Brand Partner' });
      setRole('Brand Partner');
      // §5/M12 — the brand's commercial relationship comes from the canonical
      // store (seeded from the brand's own declaration), never from a guess.
      setBrandProfile({
        ...dossier.profile,
        commercialModel: store.resolveBrandCommercialModel(brand.id).model,
      });
      setProducts(dossier.products);
      setShipments(dossier.shipments);
      setFinancials(dossier.financials);
      setComplianceDocs(dossier.compliance);
      setCarrierTokens(dossier.tokens);
      // §FIX — populate gateDocs from the canonical DEMO_COMPLIANCE_DOCS so the
      // Product Catalog's compliance gate reflects the brand's actual doc status
      // instead of showing "all missing" (gateDocs was never set by this path).
      const brandDocs = demoData.DEMO_COMPLIANCE_DOCS.filter((d: { brandId: string }) => d.brandId === brandId);
      if (brandDocs.length > 0) {
        setGateDocs(brandDocs);
      } else {
        // Fallback: if no compliance docs found in seed, set gate to 'under_review'
        // so the brand can still interact with the compliance gate UI
        setGateDocs([
          { id: `gate-${brandId}-loa`, brandId, type: 'letter_of_authorization' as const, status: 'under_review' },
          { id: `gate-${brandId}-ps`, brandId, type: 'product_safety_ukca' as const, status: 'under_review' },
          { id: `gate-${brandId}-ic`, brandId, type: 'insurance_certificate' as const, status: 'under_review' },
          { id: `gate-${brandId}-brc`, brandId, type: 'brand_registry_confirmation' as const, status: 'under_review' },
        ]);
      }
      setDemoRegion(dossier.region);
      setEnvironment('brand');
    });
  }, []);

  const signOut = useCallback(() => {
    setRole(null);
    setEnvironment('home');
  }, []);

  /**
   * §Phase E2 — enter the portal as a CANONICAL onboarding tenant.
   *
   * The profile is built ONLY from what Mercenta actually holds (the onboarding
   * record's business name/category/track, and the brand's own declared origin
   * derived through the canonical ICP mapping). A brand that has not yet supplied
   * its details has EMPTY detail fields and NO products / POs / shipments — the
   * opposite of the demo-brand dossiers, which are derived fixtures. Nothing here
   * is fabricated; the brand supplies its information in the wizard.
   */
  const activateOnboardingBrand = useCallback((brandId: string) => {
    void Promise.all([
      import('@/data/acquisitionStore'),
      import('@/lib/onboarding/onboardingLifecycle'),
      import('@/data/demoStore'),
    ]).then(([store, onboarding, catalogStore]) => {
      const record = store.getOnboardingForBrand(brandId);
      if (!record) {
        console.warn(`[rbac] unknown onboarding tenant "${brandId}" — refused`);
        return;
      }
      setSession({ tier: 'brand', tenantId: brandId, role: 'Brand Partner' });
      setRole('Brand Partner');
      const region = onboarding.deriveBrandRegionForOnboarding(record);
      setBrandProfile({
        ...DEFAULT_PROFILE,
        businessName: record.businessName,
        category: record.category,
        fulfillmentTrack: record.track,
        ...(region ? { region } : {}),
        onboarded: false,
        complianceGateStatus: 'blocked',
        // §5/M12 — whatever is actually recorded for this brand; an unrecorded
        // model stays `not_selected` (fail-closed) rather than being assumed.
        commercialModel: catalogStore.resolveBrandCommercialModel(brandId).model,
      });
      // §Phase E3 — the tenant's products come from the CATALOG STORE (the
      // single write path), not from a hand-kept session list. Honest empty
      // state for a brand that has created nothing yet.
      setProducts(catalogStore.productsForBrandFromStore(brandId));
      setShipments([]);
      setFinancials([]);
      setComplianceDocs([]);
      setCarrierTokens({});
      setGateDocs([]);
      setEnvironment('brand');
    });
  }, []);
  const activateDemo = useCallback((region: DemoRegion) => {
    import('@/data/regionalDossiers').then((m) => {
      const dossier = m.REGIONAL_DOSSIERS[region];
      setDemoRegion(region);
      setBrandProfile(dossier.profile);
      setProducts(dossier.products);
      setShipments(dossier.shipments);
      setFinancials(dossier.financials);
      setComplianceDocs(dossier.compliance);
      setCarrierTokens(dossier.tokens);
      setRole('Brand Partner');
      setEnvironment('brand');
    });
  }, []);

  const addApiLog = useCallback((log: ApiLogEntry) => {
    setApiLogs((prev) => [log, ...prev].slice(0, 50));
  }, []);

  const addActivityLog = useCallback((log: ActivityLog) => {
    setActivityLogs((prev) => [log, ...prev].slice(0, 30));
  }, []);

  const updateShipmentStatus = useCallback(
    (id: string, status: ShipmentStatus) => {
      setShipments((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status,
                stage: statusToStage(status),
              }
            : s
        )
      );
      const shipment = shipments.find((s) => s.id === id);
      if (shipment) {
        const log: ActivityLog = {
          id: `log-${logCounter++}`,
          timestamp: new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }) + ' — Today',
          shipmentRef: shipment.reference,
          carrier: shipment.carrier,
          message: `Status updated to ${status.replace(/_/g, ' ')}`,
          status,
        };
        addActivityLog(log);

        const apiLog: ApiLogEntry = {
          id: `api-${apiCounter++}`,
          timestamp: new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          method: 'PUT',
          endpoint: `/v1/shipments/${shipment.reference}/status`,
          payload: { status, carrier: shipment.carrier },
          status: 200,
        };
        addApiLog(apiLog);
      }
    },
    [shipments, addActivityLog, addApiLog]
  );

  /**
   * §Phase E3 — product creation is now ONE write path.
   *
   * The product is written to the canonical catalog store (tenant-scoped,
   * idempotent by SKU — see `demoStore.addCatalogProduct`), and the session
   * projection is then re-read from it. Previously this pushed the product
   * straight into React state, so a product created by a brand existed only in
   * that browser tab and never reached the catalog every other surface reads
   * (nor the submission seam, which is keyed by SKU).
   *
   * No tenant session → no write: a product can never be created without an
   * owner, so it can never leak across tenants.
   */
  const addProduct = useCallback(
    (product: Product) => {
      const tenantId = session?.tenantId;
      if (!tenantId) {
        console.warn('[rbac] product creation refused — no tenant session');
        return;
      }
      void import('@/data/demoStore').then((store) => {
        store.addCatalogProduct(tenantId, product);
        setProducts(store.productsForBrandFromStore(tenantId));
      });
    },
    [session?.tenantId]
  );

  const updateLeadStatus = useCallback(
    (id: string, status: Lead['outreachStatus'], fitScore?: number) => {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                outreachStatus: status,
                ...(fitScore !== undefined ? { fitScore } : {}),
              }
            : l
        )
      );
      // §Phase C — a BI-linked ICP lead (deterministic id `lead-<prospectId>`)
      // is a PROJECTION of the canonical prospect: move the canonical record
      // too so the BI lifecycle stays the single source of truth and the
      // transition is audited on the prospect timeline. Leads with no canonical
      // counterpart (CSV imports) are unaffected.
      const prospectId = id.startsWith('lead-') ? id.slice('lead-'.length) : '';
      if (!prospectId) return;
      void Promise.all([
        import('@/data/prospectStore'),
        import('@/lib/intelligence/prospectLifecycle'),
        import('@/lib/intelligence/prospectPipeline'),
      ]).then(([store, lifecycle, pipeline]) => {
        if (!store.getProspect(prospectId)) return;
        lifecycle.setProspectOutreachStatus(
          prospectId,
          pipeline.outreachStatusForLeadStage(status),
          `ICP stage set to ${status}`,
          actingStaffId
        );
      });
    },
    [actingStaffId]
  );

  /**
   * §Phase C — re-read the derived ICP universe from the canonical store,
   * preserving leads that have no canonical BI counterpart (CSV imports) and
   * the ICP fit score persisted at their last transition.
   */
  const refreshLeadsFromProspects = useCallback(async () => {
    const store = await import('@/data/prospectStore');
    const canonical = store.getAcquisitionLeads();
    setLeads((prev) => {
      const prior = new Map(prev.filter((l) => l.prospectId).map((l) => [l.id, l]));
      const projected = canonical.map((l) => {
        const before = prior.get(l.id);
        return before && before.fitScore > 0 ? { ...l, fitScore: before.fitScore } : l;
      });
      return [...projected, ...prev.filter((l) => !l.prospectId)];
    });
  }, []);

  // Subscribe once so the ICP list always projects the canonical store state
  // (the BI prospect owns the outreach status; the lead row displays it).
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    void import('@/data/prospectStore').then((store) => {
      unsubscribe = store.subscribeCanonicalStore(() => void refreshLeadsFromProspects());
    });
    return () => unsubscribe?.();
  }, [refreshLeadsFromProspects]);

  const completeOnboarding = useCallback(() => {
    setBrandProfile((prev) => {
      // §3: completing onboarding auto-generates the Distribution Agreement
      // from the template and puts the compliance gate into review.
      // Catalog sync stays BLOCKED until every required doc is approved.
      const agreementText = buildDistributionAgreement({
        businessName: prev.businessName || 'Unnamed Brand',
        commissionRate: COMMISSION_RATE_PLACEHOLDER,
        monthlyFee: MONTHLY_FEE_PLACEHOLDER_GBP,
        category: prev.category || 'Uncategorised', // fallback if category not yet selected
        fulfillmentTrack:
          prev.fulfillmentTrack === 'direct_fulfillment'
            ? 'direct_fulfillment'
            : prev.workingCapitalAnswer === 'yes' && prev.fulfillmentTrack === 'unassigned'
              ? 'financed' // default until brand confirms in wizard
              : 'financed',
      });
      // §Batch-5 — distribution agreement is now the Contract itself,
      // not a separate ComplianceDocument. The gate checks the Contract
      // status directly. No need to push a second agreement doc.
      setGateDocs((docs) => docs);
      setGeneratedAgreement(agreementText);
      return { ...prev, onboarded: true, complianceGateStatus: 'in_review' };
    });

    /**
     * §Phase E2 — the brand's wizard submission is ALSO a real canonical
     * onboarding transition: the brand ACCEPTS the onboarding it was invited into
     * and the `profile` step completes, attributed to the brand session (not to a
     * staff account). For demo tenants (which have no canonical record) this is a
     * no-op, so their behaviour is unchanged.
     */
    const tenantId = session?.tenantId;
    if (tenantId) {
      void Promise.all([
        import('@/data/acquisitionStore'),
        import('@/lib/onboarding/onboardingLifecycle'),
      ]).then(([store, onboarding]) => {
        const record = store.getOnboardingForBrand(tenantId);
        if (!record) return;
        const actor = { staffId: `brand:${tenantId}`, canMutate: true, tenantId };
        onboarding.acceptOnboarding(record.id, actor, 'Submitted by the brand through the onboarding wizard');
        onboarding.completeOnboardingStep(record.id, 'profile', actor, 'Brand profile submitted in the wizard');
      });

      /**
       * §5/M12 — the brand's chosen COMMERCIAL RELATIONSHIP is persisted against
       * the brand record (one canonical store, audited). Fail-closed: an
       * unselected/unknown model is refused and the (already-opened) onboarding
       * completion is reported as not-selected rather than being invented. This
       * write can never touch the compliance requirements.
       */
      setBrandProfile((prev) => {
        const chosen = isCommercialModel(prev.commercialModel) ? prev.commercialModel : null;
        void import('@/data/demoStore').then((store) => {
          if (!chosen) {
            console.warn(
              '[commercial] onboarding completed with NO commercial relationship recorded — reported as not selected'
            );
            return;
          }
          const r = store.setBrandCommercialModel({
            brandId: tenantId,
            model: chosen,
            actorId: `brand:${tenantId}`,
            reason: 'Selected by the brand during onboarding (commercial relationship step)',
            source: 'onboarding',
          });
          if (!r.ok) console.warn(`[commercial] ${r.error}`);
        });
        return prev;
      });
    }
  }, [session?.tenantId]);

  /** §3 — admin/staff action: move a gate document to a new status. */
  const reviewGateDocument = useCallback(
    (id: string, status: ComplianceDocument['status']) => {
      let nextDocs: ComplianceDocument[] = [];
      setGateDocs((prev) => {
        nextDocs = prev.map((d) => (d.id === id ? { ...d, status } : d));
        return nextDocs;
      });
    },
    []
  );

  const addStaff = useCallback((member: StaffMember) => {
    setStaff((prev) => [...prev, member]);
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleStaffActive = useCallback((id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }, []);

  const updateStaffRole = useCallback((id: string, staffRole: StaffRole) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, role: staffRole } : s))
    );
  }, []);

  const updateStaffChannel = useCallback((id: string, channel: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, channel } : s))
    );
  }, []);

  const updateStaffTier = useCallback(
    (id: string, tier: StaffMember['permissionTier']) => {
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, permissionTier: tier } : s))
      );
    },
    []
  );

  /** §Stage-25 — acting staff identity + whether that account may mutate. */
  const actingStaff =
    staff.find((s) => s.id === actingStaffId) ?? null;
  const canCurrentUserMutate = staffCanMutate(actingStaff);

  const value: AppState = {
    environment,
    setEnvironment,
    role,
    signIn,
    signOut,
    shipments,
    updateShipmentStatus,
    products,
    addProduct,
    activityLogs,
    addActivityLog,
    leads,
    updateLeadStatus,
    addLead,
    refreshLeadsFromProspects,
    campaigns,
    apiLogs,
    addApiLog,
    brandProfile,
    setBrandProfile,
    completeOnboarding,
    gateDocs,
    reviewGateDocument,
    generatedAgreement,
    carrierContext,
    setCarrierContext,
    staff,
    addStaff,
    removeStaff,
    toggleStaffActive,
    updateStaffRole,
    updateStaffChannel,
    actingStaffId,
    setActingStaffId,
    actingStaff,
    canCurrentUserMutate,
    updateStaffTier,
    demoRegion,
    financials,
    complianceDocs,
    carrierTokens,
    activateDemo,
    session,
    activateDemoBrand,
    activateOnboardingBrand,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function statusToStage(status: ShipmentStatus): Shipment['stage'] {
  const map: Record<ShipmentStatus, Shipment['stage']> = {
    factory_intake: 'factory_intake',
    bak_depot: 'bak_depot',
    sea_transit: 'international_forwarding',
    air_transit: 'international_forwarding',
    uk_customs_cleared: 'uk_port_hmrc',
    mercenta_hub: 'mercenta_hub',
    live_amazon: 'live_amazon',
  };
  return map[status];
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
