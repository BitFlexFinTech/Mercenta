// §PHASE 1 (0B.4 #3) — BRANDCOMM CANONICAL SSOT validator.
//
// Proves the brand inbox derivation is the SINGLE canonical `normalizeBrandKey`
// (src/lib/intelligence/prospectPipeline.ts) and there is NO second, divergent
// normalisation in the brand-communication layer. The Tapatío case (a diacritic
// brand) must resolve to the same canonical key everywhere.
//
//   • normalizeBrandKey is the established SSOT (NFD → strip marks → lowercase
//     → drop non-alphanumerics);
//   • brandInboxAddress delegates to it (ASCII behaviour unchanged);
//   • every consumer imports the shared helper (no inline re-derivation).
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const pipeline = await server.ssrLoadModule('/src/lib/intelligence/prospectPipeline.ts');
  const brandComm = await server.ssrLoadModule('/src/components/shared/BrandComm.tsx');

  const normalizeBrandKey = pipeline.normalizeBrandKey;
  const brandInboxAddress = brandComm.brandInboxAddress;

  test('normalizeBrandKey SSOT exists', typeof normalizeBrandKey === 'function');
  test('brandInboxAddress exists', typeof brandInboxAddress === 'function');

  // Canonical Tapatío result must be consistent across both.
  const canonical = normalizeBrandKey('Tapatío');
  const inbox = brandInboxAddress('Tapatío');
  test('Tapatío resolves to a canonical key', canonical === 'tapatio', `got "${canonical}"`);
  test('brandInboxAddress uses the canonical key', inbox === `hello@${canonical}.example`, `got "${inbox}"`);
  test('Tapatío inbox is hello@tapatio.example', inbox === 'hello@tapatio.example');

  // Diacritics are normalised, NOT silently dropped (the old [^a-z] strip).
  test('diacritics are normalised not dropped', normalizeBrandKey('Tapatío') !== 'tapato');

  // §Phase 4 — the canonical 20-brand universe means keys derive from the
  // real brand names. ASCII behaviour is unchanged (pure key derivation);
  // 'Astonish' now resolves canonically to itself (previously the invented
  // 'Zambezi Organic Extracts Ltd' tenant).
  test('ASCII brand behaviour unchanged (canonical derivations)',
    normalizeBrandKey('Astonish') === 'astonish' &&
    brandInboxAddress('Astonish') === 'hello@astonish.example');

  // No second normalisation function in the comm layer.
  const brandCommSrc = read('src/components/shared/BrandComm.tsx');
  test('BrandComm delegates to the canonical SSOT (no local regex strip)',
    /normalizeBrandKey/.test(brandCommSrc) && !/\.replace\(\[\^a-z\]/g.test(brandCommSrc));

  // Every consumer imports the shared helper — no inline re-derivation.
  const messagesHub = read('src/components/admin/MessagesHub.tsx');
  test('MessagesHub imports the shared brandInboxAddress (no duplicate derivation)',
    /import \{ brandInboxAddress/.test(messagesHub));

  console.log(`\nBRANDCOMM_SSOT_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error('[validate-brandcomm-ssot] THREW:', err);
  failures++;
  console.log(`\nBRANDCOMM_SSOT_VALIDATION_FAIL (${failures})`);
  process.exit(1);
}
