# Stage-2 completion pass 2 — switch admin/brand views from direct demoStore
# imports to api.ts functions + react-query hooks. Per-file targeted patches.

def patch(path, pairs):
    s = open(path).read()
    missed = []
    for old, new in pairs:
        if old in s:
            s = s.replace(old, new)
        else:
            missed.append(old[:60].replace('\n', '\\n'))
    open(path, 'w').write(s)
    if missed:
        print(path, 'MISSED:')
        for m in missed:
            print('   ', m)
    else:
        print(path, 'ok')

Q = "from '@/data/queries'"

# ── ShipmentsTerminal ──
patch('src/components/admin/ShipmentsTerminal.tsx', [
    ("import { updatePurchaseOrderStatus, createShipmentForPO } from '@/data/api';\nimport { demoBrands, demoPurchaseOrders, demoShipments, amendShipment } from '@/data/demoStore';",
     "import { updatePurchaseOrderStatus, createShipmentForPO, amendShipment } from '@/data/api';\nimport { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';"),
    ("  const brands = demoBrands;\n  const shipments = demoShipments;\n  const pos = demoPurchaseOrders;",
     "  const brands = useBrands().data?.data ?? [];\n  const shipments = useShipmentsAll().data?.data ?? [];\n  const pos = usePurchaseOrders().data?.data ?? [];"),
])

# ── BrandCRM ──
patch('src/components/admin/BrandCRM.tsx', [
    ("import { useBrands, useContracts } from '@/data/queries';\nimport { fetchPurchaseOrders } from '@/data/api';\nimport { demoComplianceDocs, demoPurchaseOrders, setBrandTrack, renameBrand } from '@/data/demoStore';",
     "import {\n  useBrands,\n  useContracts,\n  usePurchaseOrders as usePOsHook,\n  useComplianceDocuments as useCompDocsHook,\n} from '@/data/queries';\nimport { fetchPurchaseOrders, renameBrand, setBrandTrack } from '@/data/api';"),
    ("  const poQuery = { data: demoPurchaseOrders };",
     "  const poQuery = { data: usePOsHook().data?.data ?? [] };\n  const complianceDocs = useCompDocsHook().data?.data ?? [];"),
    ("    ? demoPurchaseOrders.filter((p) => p.brandId === selected.id)",
     "    ? poQuery.data.filter((p) => p.brandId === selected.id)"),
    ("    ? demoComplianceDocs.filter((d) => d.brandId === selected.id)",
     "    ? complianceDocs.filter((d) => d.brandId === selected.id)"),
])

# ── LogisticsControl ──
patch('src/components/admin/LogisticsControl.tsx', [
    ("import { demoPurchaseOrders, demoShipments } from '@/data/demoStore';",
     "import { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';"),
    ("  const shipments = demoShipments;",
     "  const shipments = useShipmentsAll().data?.data ?? [];"),
    ("  const pos = demoPurchaseOrders;",
     "  const pos = usePurchaseOrders().data?.data ?? [];"),
])

# ── RetailPipeline ──
patch('src/components/admin/RetailPipeline.tsx', [
    ("import {\n  demoDeductions,\n  demoPurchaseOrders,\n  demoSubmissions,\n} from '@/data/demoStore';",
     "import { useDeductions, usePurchaseOrders, useCatalogSubmissions } from '@/data/queries';"),
    ("function UnlockedPipeline() {\n  return (",
     """function UnlockedPipeline() {
  const deductions = useDeductions().data?.data ?? [];
  const purchaseOrders = usePurchaseOrders().data?.data ?? [];
  const submissions = useCatalogSubmissions().data?.data ?? [];
  return ("""),
    ("          {demoSubmissions.map((sub) => (", "          {submissions.map((sub) => ("),
    ("          {demoPurchaseOrders.map((po) => {", "          {purchaseOrders.map((po) => {"),
    ("            {demoDeductions.map((d) => (", "            {deductions.map((d) => ("),
])

# ── ComplianceApprovals ──
patch('src/components/admin/ComplianceApprovals.tsx', [
    ("import { demoBrands, demoComplianceDocs, demoProducts, setComplianceDocStatus } from '@/data/demoStore';",
     "import { useBrands, useComplianceDocuments, useProducts } from '@/data/queries';\nimport { setComplianceDocStatus } from '@/data/api';"),
    ("  const [docs, setDocs] = useState<ComplianceDocument[]>(demoComplianceDocs);",
     "  const docsQuery = useComplianceDocuments();\n  const [docs, setDocs] = useState<ComplianceDocument[]>(docsQuery.data?.data ?? []);\n  useEffect(() => {\n    if (docsQuery.data) setDocs(docsQuery.data.data);\n  }, [docsQuery.data]);"),
    ("  const brand = demoBrands.find((b) => b.id === doc.brandId);\n  const products = demoProducts.filter((p) => p.brandId === doc.brandId);",
     "  const brandsList = useBrands().data?.data ?? [];\n  const products = useProducts().data?.data.filter((p) => p.brandId === doc.brandId) ?? [];\n  const brand = brandsList.find((b) => b.id === doc.brandId);"),
    ("              const brand = demoBrands.find((b) => b.id === d.brandId);",
     "              const brand = brandsList.find((b) => b.id === d.brandId);"),
    ("        const docBrand = demoBrands.find((b) => b.id === preview.brandId);",
     "        const docBrand = brandsList.find((b) => b.id === preview.brandId);"),
])

# ── CatalogManagerAdmin ──
patch('src/components/admin/CatalogManagerAdmin.tsx', [
    ("import { demoProducts, demoBrands } from '@/data/demoStore';",
     "import { useBrands, useProducts } from '@/data/queries';"),
    ("  const products = demoProducts;",
     "  const products = useProducts().data?.data ?? [];"),
    ("    demoBrands.find((b) => b.id === id)?.profile.businessName ?? id;",
     "    (useBrands().data?.data ?? []).find((b) => b.id === id)?.profile.businessName ?? id;"),
])

# ── ComplianceHub (brand, read-only) ──
patch('src/components/brand/ComplianceHub.tsx', [
    ("import { demoBrands, demoProducts, demoPurchaseOrders } from '@/data/demoStore';",
     "import { useBrands, useProducts, usePurchaseOrders } from '@/data/queries';"),
])
