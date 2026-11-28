import fs from 'node:fs';
import path from 'node:path';

/**
 * PASS 2 — the shades the owner's 13-entry map did not name, mapped onto tokens that
 * ALREADY EXIST in tailwind.config.js (the `ink` scale 2/500/600/700/800/850/900/950, the
 * `hairline` scale, and opacity modifiers on `surface`). Nothing is invented: every target
 * below was verified present in the config before this ran.
 */
const MAP = [
  ['text-zinc-950', 'text-ink-950'],
  ['text-zinc-600', 'text-ink-600'],
  ['text-zinc-800', 'text-ink-800'],
  ['text-zinc-300', 'text-quiet'],
  ['bg-zinc-950', 'bg-ink-950'],
  ['bg-zinc-900', 'bg-ink-900'],
  ['bg-zinc-800', 'bg-ink-800'],
  ['border-zinc-100', 'border-hairline'],
  ['border-zinc-950', 'border-ink-950'],
  ['border-zinc-900', 'border-ink-900'],
  ['border-zinc-400', 'border-hairline-strong'],
  ['divide-zinc-100', 'divide-hairline-06'],
];

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) acc.push(p);
  }
  return acc;
};

const files = walk('src/next');
const counts = {};
let touched = 0;

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let s = before;
  for (const [from, to] of MAP) {
    const re = new RegExp(`(?<![\\w-])${from}(?![\\w/-])`, 'g');
    const hits = (s.match(re) || []).length;
    if (hits) { counts[from] = (counts[from] || 0) + hits; s = s.replace(re, to); }
  }
  // Opacity variants on the plain tint family: bg-zinc-50/70 -> bg-surface/70 (valid).
  s = s.replace(/(?<![\w-])bg-zinc-50\/(\d+)/g, (_m, o) => { counts['bg-zinc-50/*'] = (counts['bg-zinc-50/*'] || 0) + 1; return `bg-surface/${o}`; });
  s = s.replace(/(?<![\w-])bg-zinc-100\/(\d+)/g, (_m, o) => { counts['bg-zinc-100/*'] = (counts['bg-zinc-100/*'] || 0) + 1; return `bg-tint/${o}`; });
  if (s !== before) { fs.writeFileSync(file, s); touched++; }
}

const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const grey = (all.match(/(?:bg|text|border|divide|from|to|via|ring|outline|fill|stroke)-(?:zinc|gray|slate|neutral|stone)-[0-9]{2,3}(?:\/[0-9]+)?/g) || []);
const lit = (all.match(/(?:bg|text|border|divide|ring|outline|fill|stroke)-(?:white|black)(?:\/[0-9]+)?/g) || []);
console.log('TOUCHED:', touched);
console.log('REPLACEMENTS:', JSON.stringify(counts));
console.log('GREY REMAINING:', grey.length, JSON.stringify(Object.entries(grey.reduce((m,k)=>((m[k]=(m[k]||0)+1),m),{})).sort((a,b)=>b[1]-a[1]).slice(0,10)));
console.log('LITERAL REMAINING:', lit.length);