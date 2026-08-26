import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  Environment,
  Shipment,
  Product,
  ActivityLog,
  Lead,
  Campaign,
  ApiLogEntry,
  BrandProfile,
  ShipmentStatus,
} from './types';
import {
  INITIAL_SHIPMENTS,
  INITIAL_PRODUCTS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_LEADS,
  INITIAL_CAMPAIGNS,
  INITIAL_API_LOGS,
} from './mockData';

interface AppState {
  environment: Environment;
  setEnvironment: (env: Environment) => void;

  shipments: Shipment[];
  updateShipmentStatus: (id: string, status: ShipmentStatus) => void;

  products: Product[];
  addProduct: (product: Product) => void;

  activityLogs: ActivityLog[];
  addActivityLog: (log: ActivityLog) => void;

  leads: Lead[];
  updateLeadStatus: (id: string, status: Lead['outreachStatus']) => void;

  campaigns: Campaign[];

  apiLogs: ApiLogEntry[];
  addApiLog: (log: ApiLogEntry) => void;

  brandProfile: BrandProfile;
  setBrandProfile: (profile: BrandProfile) => void;
  completeOnboarding: () => void;

  carrierContext: 'dhl' | 'fedex' | 'bak';
  setCarrierContext: (c: 'dhl' | 'fedex' | 'bak') => void;
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
};

let logCounter = 100;
let apiCounter = 100;

export function AppProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>('home');
  const [shipments, setShipments] = useState<Shipment[]>(INITIAL_SHIPMENTS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activityLogs, setActivityLogs] =
    useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [campaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>(INITIAL_API_LOGS);
  const [brandProfile, setBrandProfile] = useState<BrandProfile>(DEFAULT_PROFILE);
  const [carrierContext, setCarrierContext] = useState<'dhl' | 'fedex' | 'bak'>(
    'dhl'
  );

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

  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => [product, ...prev]);
  }, []);

  const updateLeadStatus = useCallback(
    (id: string, status: Lead['outreachStatus']) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, outreachStatus: status } : l))
      );
    },
    []
  );

  const completeOnboarding = useCallback(() => {
    setBrandProfile((prev) => ({ ...prev, onboarded: true }));
  }, []);

  const value: AppState = {
    environment,
    setEnvironment,
    shipments,
    updateShipmentStatus,
    products,
    addProduct,
    activityLogs,
    addActivityLog,
    leads,
    updateLeadStatus,
    campaigns,
    apiLogs,
    addApiLog,
    brandProfile,
    setBrandProfile,
    completeOnboarding,
    carrierContext,
    setCarrierContext,
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
    boxbee_hub: 'boxbee_hub',
    live_amazon: 'live_amazon',
  };
  return map[status];
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
