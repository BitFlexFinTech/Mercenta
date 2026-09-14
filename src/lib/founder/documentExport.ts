/**
 * §41.15/§41.16/M12 — FOUNDER DOCUMENT + PRESENTATION GENERATION.
 *
 * Produces two artefacts with NO new dependency and NO network call:
 *   • a PRINT-READY BRIEF (self-contained HTML → the browser's own print-to-PDF);
 *   • a PRESENTATION DECK (self-contained HTML, one slide per screen, keyboard
 *     navigable, presentable full-screen and printable to PDF).
 *
 * Deliberately honest about what these are: HTML documents, not .docx/.pptx
 * binaries. A PPTX writer would need a new dependency and is NOT claimed.
 */
import type {
  FounderPracticeSegment,
  FounderPitch,
  FounderQuestion,
  FounderTalkingPoint,
  FounderModelSection,
} from '@/config/founderContent';

export const DOCUMENT_FORMAT = 'self-contained HTML (print to PDF from the browser)' as const;

export const PRESENTATION_FORMAT =
  'HTML slide deck — present full-screen or print to PDF; .pptx export is NOT provided' as const;

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragraphs = (body: string): string =>
  body
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p.trim())}</p>`)
    .join('\n');

const BASE_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; background:#09090b; color:#e4e4e7;
         font: 14px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 26px; margin: 0 0 6px; color:#fff; }
  h2 { font-size: 16px; margin: 28px 0 8px; color:#fff; border-bottom:1px solid #27272a; padding-bottom:6px; }
  h3 { font-size: 13px; margin: 18px 0 6px; color:#c4b5fd; text-transform:uppercase; letter-spacing:.06em; }
  p { margin: 8px 0; }
  .meta { color:#71717a; font-size:12px; margin-bottom:24px; }
  .note { border-left:3px solid #a16207; background:#1c1917; padding:10px 14px; color:#fde68a; font-size:12px; margin:18px 0; }
  .qa { border:1px solid #27272a; border-radius:8px; padding:12px 14px; margin:10px 0; page-break-inside: avoid; }
  .qa .q { color:#fff; font-weight:600; }
  .qa .a { color:#d4d4d8; }
  table { border-collapse: collapse; width:100%; margin:6px 0 14px; }
  td { border-bottom:1px solid #27272a; padding:5px 8px; font-size:12px; }
  td:first-child { color:#a1a1aa; width:45%; }
`;

/** The print-ready founder brief. */
export function renderFounderBriefHtml(input: {
  generatedFor: string;
  keyFigures: Record<string, unknown>;
  pitches: readonly FounderPitch[];
  businessModel: readonly FounderModelSection[];
  talkingPoints: readonly FounderTalkingPoint[];
  questions: readonly FounderQuestion[];
  practice: readonly FounderPracticeSegment[];
  honestyNotice: string;
}): string {
  const figures = Object.entries(input.keyFigures)
    .map(([group, values]) => {
      const rows = Object.entries(values as Record<string, string>)
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`)
        .join('');
      return `<h3>${esc(group)}</h3><table>${rows}</table>`;
    })
    .join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Mercenta — Founder Investor Brief</title><style>${BASE_CSS}</style></head><body>
<h1>Mercenta — Founder Investor Brief</h1>
<div class="meta">Prepared for ${esc(input.generatedFor)} · internal preparation material</div>
<div class="note">${esc(input.honestyNotice)}</div>

<h2>Canonical figures used in every pitch</h2>
${figures}

<h2>Pitches</h2>
${input.pitches.map((p) => `<h3>${esc(p.label)} (${esc(p.duration)})</h3>${paragraphs(p.body)}`).join('\n')}

<h2>Business model</h2>
${input.businessModel.map((s) => `<h3>${esc(s.title)}</h3>${paragraphs(s.body)}`).join('\n')}

<h2>Investor talking points</h2>
${input.talkingPoints.map((t) => `<h3>${esc(t.title)}</h3>${paragraphs(t.body)}`).join('\n')}

<h2>Difficult questions and answers</h2>
${input.questions
  .map((q) => `<div class="qa"><p class="q">${esc(q.question)}</p><p class="a">${esc(q.answer)}</p></div>`)
  .join('\n')}

<h2>Meeting practice</h2>
${input.practice
  .map(
    (s) =>
      `<div class="qa"><p class="q">${esc(s.label)} — ${esc(s.targetTime)}</p><p class="a">${esc(
        s.direction
      )}</p><p class="a"><strong>Cue:</strong> ${esc(s.cue)}</p></div>`
  )
  .join('\n')}
</body></html>`;
}

/** The presentation deck: one slide per section, keyboard navigable. */
export function renderPitchDeckHtml(input: {
  title: string;
  slides: readonly { title: string; lines: readonly string[] }[];
  honestyNotice: string;
}): string {
  const slides = input.slides
    .map(
      (s, i) =>
        `<section class="slide" data-slide="${i}"><h2>${esc(s.title)}</h2>${s.lines
          .map((l) => `<p>${esc(l)}</p>`)
          .join('')}</section>`
    )
    .join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(input.title)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#09090b; color:#e4e4e7; font: 22px/1.5 -apple-system, Roboto, sans-serif; }
  .slide { display:none; padding:8vh 8vw; min-height:100vh; }
  .slide.active { display:block; }
  h2 { font-size:38px; margin:0 0 24px; color:#fff; }
  p { margin:14px 0; max-width:60ch; }
  .deck-note { position:fixed; bottom:14px; left:8vw; right:8vw; font-size:12px; color:#52525b; }
  .deck-nav { position:fixed; bottom:14px; right:8vw; font-size:12px; color:#71717a; }
</style></head><body>
${slides}
<div class="deck-note">${esc(input.honestyNotice)}</div>
<div class="deck-nav"><span id="pos">1</span> / ${input.slides.length} · press &larr; / &rarr; · Esc for overview</div>
<script>
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var i = 0;
  function show(n) { i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.className = 'slide' + (k === i ? ' active' : ''); });
    document.getElementById('pos').textContent = String(i + 1); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'Escape') slides.forEach(function (s) { s.className = 'slide'; });
  });
  show(0);
</script>
</body></html>`;
}

/* ─ Browser-side delivery (download / print). No network, no dependency. ─── */

/** Download a self-contained HTML document (browser only). */
export function downloadHtml(filename: string, html: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open a document in a new window ready to print (the browser makes the PDF). */
export function openPrintView(html: string): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}