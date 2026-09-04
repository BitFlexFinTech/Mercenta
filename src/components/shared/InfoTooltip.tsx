/**
 * §Batch-12 — Info tooltip icon (small circular "i" with hover popover).
 *
 * Reusable across the entire brand portal: every feature/setting gets
 * one of these to explain what it does in plain language.
 */
import { useState, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  /** The plain-language explanation text. */
  text: string;
  /** Optional link to the Batch-15 guidance section for more detail. */
  guidanceLink?: string;
  /** Position preference. */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Small variant for inline use. */
  small?: boolean;
}

export function InfoTooltip({ text, guidanceLink, position = 'top', small = false }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const POSITION_CLASSES: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex items-center" ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        className={cn(
          'rounded-full flex items-center justify-center text-zinc-500 hover:text-brass-400 hover:bg-brass-500/10 transition-colors',
          small ? 'w-3.5 h-3.5' : 'w-4 h-4',
        )}
        aria-label="More information"
      >
        <Info className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShow(false)} />
          <div className={cn(
            'absolute z-40 w-56 bg-ink-900 border border-white/[0.08] rounded-lg shadow-xl p-2.5 animate-fade-in',
            POSITION_CLASSES[position],
          )}>
            <p className="text-[10px] text-zinc-400 leading-relaxed">{text}</p>
            {guidanceLink && (
              <p className="text-[9px] text-brass-500 mt-1">See Operational Guidance for details</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}