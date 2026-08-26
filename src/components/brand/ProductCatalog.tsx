import { useState } from 'react';
import { useApp } from '@/store';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Plus, X, Flame } from 'lucide-react';
import type { Product } from '@/types';

export function ProductCatalog() {
  const { products, addProduct } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Master Product Catalog</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Wholesale pricing schema and UK compliance metadata
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add New Product
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                <th className="text-left font-medium px-4 py-3">Product</th>
                <th className="text-left font-medium px-4 py-3">SKU / Barcode</th>
                <th className="text-right font-medium px-4 py-3">Ex-Works (£)</th>
                <th className="text-right font-medium px-4 py-3">UK MSRP (£)</th>
                <th className="text-left font-medium px-4 py-3">Commodity Code</th>
                <th className="text-left font-medium px-4 py-3">VAT</th>
                <th className="text-center font-medium px-4 py-3">Hazmat</th>
                <th className="text-left font-medium px-4 py-3">Dimensions (cm)</th>
                <th className="text-right font-medium px-4 py-3">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-white/[0.02] transition-colors text-zinc-300"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl w-8 h-8 flex items-center justify-center bg-ink-900 rounded-lg">
                        {p.image}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-mono text-zinc-400">{p.sku}</div>
                    <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                      {p.barcode}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                    £{p.exWorksPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-300">
                    £{p.ukRetailPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                    {p.commodityCode}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.vatStatus === 'Zero-rated'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                          : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20'
                      }
                    >
                      {p.vatStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.hazmat ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <Flame className="w-3 h-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {p.length}×{p.width}×{p.height}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400">
                    {p.weight} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <AddProductPanel
          onClose={() => setShowAdd(false)}
          onAdd={(p) => {
            addProduct(p);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddProductPanel({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (p: Product) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    image: '📦',
    exWorksPrice: '',
    ukRetailPrice: '',
    commodityCode: '',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: '',
    width: '',
    height: '',
    weight: '',
  });

  const handleSubmit = () => {
    onAdd({
      id: `prd-${Date.now()}`,
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      image: form.image,
      exWorksPrice: parseFloat(form.exWorksPrice) || 0,
      ukRetailPrice: parseFloat(form.ukRetailPrice) || 0,
      commodityCode: form.commodityCode,
      vatStatus: form.vatStatus,
      hazmat: form.hazmat,
      length: parseFloat(form.length) || 0,
      width: parseFloat(form.width) || 0,
      height: parseFloat(form.height) || 0,
      weight: parseFloat(form.weight) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-ink-850 border-l border-white/[0.08] h-full overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-ink-850 z-10">
          <h3 className="text-sm font-semibold text-white">Add New Product</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Marula Facial Oil"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="SPB-MAR-050"
            />
            <Input
              label="Barcode"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="600123..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ex-Works Price (£)"
              type="number"
              value={form.exWorksPrice}
              onChange={(e) => setForm({ ...form, exWorksPrice: e.target.value })}
              placeholder="8.50"
            />
            <Input
              label="UK MSRP (£)"
              type="number"
              value={form.ukRetailPrice}
              onChange={(e) => setForm({ ...form, ukRetailPrice: e.target.value })}
              placeholder="24.99"
            />
          </div>
          <Input
            label="UK Trade Tariff / Commodity Code"
            value={form.commodityCode}
            onChange={(e) => setForm({ ...form, commodityCode: e.target.value })}
            placeholder="3304990000"
          />
          <Select
            label="VAT Status"
            value={form.vatStatus}
            onChange={(e) => setForm({ ...form, vatStatus: e.target.value })}
            options={[
              { value: 'Standard 20%', label: 'Standard 20%' },
              { value: 'Zero-rated', label: 'Zero-rated' },
              { value: 'Exempt', label: 'Exempt' },
            ]}
          />
          <div className="grid grid-cols-4 gap-2">
            <Input
              label="L (cm)"
              type="number"
              value={form.length}
              onChange={(e) => setForm({ ...form, length: e.target.value })}
            />
            <Input
              label="W (cm)"
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: e.target.value })}
            />
            <Input
              label="H (cm)"
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
            <Input
              label="Wt (kg)"
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hazmat}
              onChange={(e) => setForm({ ...form, hazmat: e.target.checked })}
              className="rounded border-white/[0.15] bg-ink-900 text-neon-500 focus:ring-neon-500/30"
            />
            <span className="text-xs text-zinc-400">Contains hazardous materials</span>
          </label>
          <div className="pt-2">
            <Button onClick={handleSubmit} className="w-full">
              Save Product
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
