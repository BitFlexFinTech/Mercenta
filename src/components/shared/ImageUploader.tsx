/**
 * §Batch-21 — Product image uploader with Amazon-standard validation.
 * Reusable for brand and admin contexts. In mock mode, uses emoji placeholders.
 */
import { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Badge, Button } from '@/components/ui';
import { validateProductImage, createProductImage } from '@/lib/amazon/productImageValidator';
import type { ProductImage } from '@/types';
import { ImageUp, AlertTriangle, CheckCircle2, X, Info } from 'lucide-react';

interface ImageUploaderProps {
  slot: string;
  currentImage?: ProductImage;
  onImageChange: (image: ProductImage) => void;
  mockMode?: boolean;
  editable?: boolean;
  slotLabel?: string;
  compact?: boolean;
}

function ImageUploader({
  slot, currentImage, onImageChange, mockMode = true,
  editable = true, slotLabel, compact = false,
}: ImageUploaderProps) {
  const [showSpecs, setShowSpecs] = useState(false);
  const checks = useMemo(() => {
    if (currentImage?.checks) return currentImage.checks;
    return validateProductImage(slot, currentImage?.url ?? '', mockMode);
  }, [currentImage, slot, mockMode]);
  const compliant = useMemo(() => checks.every((c) => c.severity !== 'error' || c.passed), [checks]);
  const errors = checks.filter((c) => c.severity === 'error' && !c.passed);

  function handleMockUpload() {
    const mockUrls: Record<string, string> = {
      main: '📸', alt1: '📷', alt2: '🔍', alt3: '🏷️',
      alt4: '📐', alt5: '📏', alt6: '⚙️',
      lifestyle: '🏠', packaging: '📦',
    };
    onImageChange(createProductImage(slot, mockUrls[slot] ?? '📸', true));
  }

  const label = slotLabel ?? (slot === 'main' ? 'Main Image' : slot === 'lifestyle' ? 'Lifestyle' : slot === 'packaging' ? 'Packaging' : `Alt ${slot.replace('alt', '')}`);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 bg-surface rounded-ds-md p-2', editable && 'hover:bg-tint')}>
        <span className="text-lg">{currentImage?.url ?? '—'}</span>
        <div className="flex-1 min-w-0">
          <span className="text-ds-micro font-medium text-strong">{label}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {compliant ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
            <span className={cn('text-ds-micro', compliant ? 'text-emerald-500' : 'text-amber-500')}>{compliant ? 'ok' : `${errors.length} issue(s)`}</span>
          </div>
        </div>
        {editable && (
          <button onClick={handleMockUpload} className="text-ds-micro text-muted hover:text-accent-400"><ImageUp className="w-3.5 h-3.5" /></button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-surface border rounded-ds-md p-3', compliant ? 'border-hairline' : 'border-state-warning/20')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentImage?.url ?? '—'}</span>
          <span className="text-xs font-medium text-strong">{label}</span>
          {slot === 'main' && <Badge className="text-ds-micro bg-accent-500/15 text-accent-300">Required</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {compliant ? <Badge className="text-ds-micro bg-state-success/10 text-state-success">Compliant</Badge> : <Badge className="text-ds-micro bg-state-warning/10 text-state-warning">{errors.length} error(s)</Badge>}
          <button onClick={() => setShowSpecs(!showSpecs)} className="text-muted hover:text-strong"><Info className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {showSpecs && (
        <div className="mb-2 space-y-0.5">
          {checks.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-ds-micro">
              {c.passed ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className={cn('w-2.5 h-2.5 flex-shrink-0', c.severity === 'error' ? 'text-red-400' : 'text-state-warning')} />}
              <span className={cn(c.passed ? 'text-muted' : 'text-muted')}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
      {editable && (
        <div className="flex items-center gap-2 pt-1 border-t border-hairline">
          <Button className="text-ds-micro" onClick={handleMockUpload}><ImageUp className="w-3 h-3 mr-1" />{currentImage?.url ? 'Replace' : 'Upload'}</Button>
          {currentImage?.url && <button onClick={() => onImageChange(createProductImage(slot, '📸', true))} className="text-ds-micro text-muted hover:text-red-400"><X className="w-3 h-3" /></button>}
        </div>
      )}
    </div>
  );
}

/* ── ImageSetEditor ──────────────────────────────────────────────── */

interface ImageSetEditorProps {
  images?: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  mockMode?: boolean;
  editable?: boolean;
  compact?: boolean;
}

export function ImageSetEditor({ images = [], onImagesChange, mockMode = true, editable = true, compact = false }: ImageSetEditorProps) {
  const SLOTS = ['main', 'alt1', 'alt2', 'alt3', 'alt4', 'alt5', 'alt6', 'lifestyle', 'packaging'] as const;
  const SLOT_LABELS: Record<string, string> = {
    main: 'Main Image', alt1: 'Alt 1', alt2: 'Alt 2', alt3: 'Alt 3',
    alt4: 'Alt 4', alt5: 'Alt 5', alt6: 'Alt 6', lifestyle: 'Lifestyle', packaging: 'Packaging',
  };
  function handleSlotChange(slot: string, img: ProductImage) {
    onImagesChange([...images.filter((i) => i.slot !== slot), img]);
  }
  function getImageForSlot(slot: string) { return images.find((i) => i.slot === slot); }
  const compliantCount = images.filter((i) => i.compliant).length;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-ds-micro text-muted">Images ({images.length})</span>
          <span className={cn("text-ds-micro", compliantCount >= 1 ? "text-emerald-500" : "text-amber-500")}>
            {compliantCount >= 1 ? "✓ Main compliant" : "⚠ Main needs review"}
          </span>
        </div>
        {SLOTS.map((slot) => (
          <ImageUploader key={slot} slot={slot} slotLabel={SLOT_LABELS[slot]}
            currentImage={getImageForSlot(slot)} onImageChange={(i) => handleSlotChange(slot, i)}
            mockMode={mockMode} editable={editable} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-strong">Product Images</span>
        <Badge className="text-ds-micro bg-tint text-muted">{images.length} of 9 slots</Badge>
        {compliantCount >= 1 ? <Badge className="text-ds-micro bg-state-success/10 text-state-success">Main compliant</Badge> : <Badge className="text-ds-micro bg-state-warning/10 text-state-warning">Main needs review</Badge>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ImageUploader slot="main" slotLabel="Main Image" currentImage={getImageForSlot("main")} onImageChange={(i) => handleSlotChange("main", i)} mockMode={mockMode} editable={editable} />
        {["alt1", "alt2", "alt3"].map((slot) => (
          <ImageUploader key={slot} slot={slot} slotLabel={SLOT_LABELS[slot]} currentImage={getImageForSlot(slot)} onImageChange={(i) => handleSlotChange(slot, i)} mockMode={mockMode} editable={editable} />
        ))}
      </div>
      <details className="text-ds-micro text-muted">
        <summary className="cursor-pointer hover:text-strong">More images ({["alt4", "alt5", "alt6", "lifestyle", "packaging"].filter((s) => getImageForSlot(s)).length} added)</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {["alt4", "alt5", "alt6", "lifestyle", "packaging"].map((slot) => (
            <ImageUploader key={slot} slot={slot} slotLabel={SLOT_LABELS[slot]} currentImage={getImageForSlot(slot)} onImageChange={(i) => handleSlotChange(slot, i)} mockMode={mockMode} editable={editable} compact />
          ))}
        </div>
      </details>
    </div>
  );
}

export { ImageUploader };
