import fs from 'node:fs';
import path from 'node:path';

const MAP = [
  // longest / most specific first
  ['bg-zinc-950/30', 'bg-scrim-30'],
  ['bg-white', 'bg-surface-raised'],
  ['bg-zinc-50', 'bg-surface'],
  ['bg-zinc-100', 'bg-tint'],
  ['bg-zinc-200', 'bg-tint-strong'],
  ['text-zinc-900', 'text-ink-900'],
  ['text-zinc-700', 'text-secondary'],
  ['text-zinc-500', 'text-faint'],
  ['text-zinc-400', 'text-quiet'],
  ['border-zinc-200', 'border-hairline'],
  ['border-zinc-300', 'border-hairline-strong'],
  ['divide-zinc-200', 'divide-hairline-06'],
  ['bg-orange-50', 'bg-accent-tint'],
  ['text-white', 'text-on-dark'],
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
const counts = Object.fromEntries(MAP.map(([f]) => [f, 0]));
let filesTouched = 0;

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let s = before;
  for (const [from, to] of MAP) {
    // Plain class only: not followed by a "/" opacity or another word char.
    const re = new RegExp(`(?<![\\w-])${from.replace(/[/.]/g, '\\$&')}(?![\\w/-])`, 'g');
    const hits = (s.match(re) || []).length;
    if (hits) {
      counts[from] += hits;
      s = s.replace(re, to);
    }
  }
  if (s !== before) {
    fs.writeFileSync(file, s);
    filesTouched++;
  }
}

/* What is left that the map cannot cover — measured, not guessed. */
const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const greyLeft = (all.match(/(?:bg|text|border|divide|from|to|via|ring|outline|fill|stroke)-(?:zinc|gray|slate|neutral|stone)-[0-9]{2,3}(?:\/[0-9]+)?/g) || []);
const literalLeft = (all.match(/(?:bg|text|border|divide|ring|outline|fill|stroke)-(?:white|black)(?:\/[0-9]+)?/g) || []);
const tally = (arr) => Object.entries(arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {}))
  .sort((a, b) => b[1] - a[1]);

console.log('FILES TOUCHED:', filesTouched, 'of', files.length);
console.log('REPLACEMENTS:', JSON.stringify(counts, null, 0));
console.log('GREY SITES REMAINING:', greyLeft.length);
console.log('LITERAL SITES REMAINING:', literalLeft.length);
console.log('TOP REMAINING GREY:', JSON.stringify(tally(greyLeft).slice(0, 12)));
console.log('TOP REMAINING LITERAL:', JSON.stringify(tally(literalLeft).slice(0, 8)));