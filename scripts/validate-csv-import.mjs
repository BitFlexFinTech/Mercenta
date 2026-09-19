// §9 — validates the streaming CSV catalog import:
//   stream parsing across chunk boundaries · per-row validation ·
//   all-or-nothing atomic commit (bad file imports nothing) · laziness
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

const HEADER = 'name,sku,barcode,exWorksPrice,ukRetailPrice,commodityCode,vatStatus,hazmat,length,width,height,weight\n';
const goodRow = (sku, price) =>
  `Widget ${sku},${sku},5060000000000,${price},${(price * 2.2).toFixed(2)},3924909990,Standard 20%,no,10,10,20,1.5\n`;
const badRow = `Broken Item,BRK-001,,abc,19.99,NOTACODE,,yes,1,2,3,0.5\n`;

try {
  const m = await server.ssrLoadModule('/src/lib/catalog/csvImport.ts');

  // 1. Chunk boundaries split mid-line — must reassemble correctly.
  const csv = HEADER + goodRow('SKU-A', 5) + goodRow('SKU-B', 7.5) + goodRow('SKU-C', 12);
  const chunks = [];
  for (let i = 0; i < csv.length; i += 17) chunks.push(csv.slice(i, i + 17)); // awkward sizes
  async function* from(arr) { for (const c of arr) yield c; }

  const r1 = await m.importCatalogCsv('brand-astonish', from(chunks), { client: new m.MockCatalogImportClient() });
  test('chunk-split rows parse correctly (3 imported)', r1.commit?.ok === true && r1.commit?.imported === 3);

  // 2. Bad row → whole import aborts BEFORE commit; nothing written.
  m.resetMockCatalogImports();
  const r2 = await m.importCatalogCsv(
    'brand-astonish',
    from([HEADER + goodRow('SKU-D', 5) + badRow + goodRow('SKU-E', 6)]),
    { client: new m.MockCatalogImportClient() }
  );
  test('invalid row reported with line number and reasons',
    r2.rejected === 1 && /line \d+/.test(r2.abortedReason ?? '') && r2.abortedReason.includes('commodity code'));
  test('all-or-nothing: aborted batch wrote NOTHING',
    r2.commit?.attempted === false && m.MockCatalogImportClient.committedSkuCount() === 0);

  // 3. Clean file still imports after an abort.
  const r3 = await m.importCatalogCsv('brand-astonish', from([HEADER + goodRow('SKU-F', 9)]), { client: new m.MockCatalogImportClient() });
  test('subsequent clean import works', r3.commit?.ok === true && m.MockCatalogImportClient.committedSkuCount() >= 1);

  // 4. Duplicate SKU inside one batch → transaction rollback at commit stage.
  const dup = HEADER + goodRow('SKU-G', 5) + goodRow('SKU-G', 6);
  const r4 = await m.importCatalogCsv('brand-astonish', from([dup]), { client: new m.MockCatalogImportClient() });
  test('duplicate sku → commit rolled back cleanly', !r4.commit?.ok && /rolled back/.test(r4.commit?.error ?? ''));

  // 5. Laziness: streaming yields rows before the source is exhausted.
  let consumedChunks = 0;
  async function* lazySource() {
    yield HEADER;
    for (let i = 0; i < 5; i++) { consumedChunks += 1; yield goodRow(`LAZY-${i}`, 3); }
  }
  let seenRows = 0;
  for await (const o of m.streamValidateCsv(lazySource())) {
    if (o.type === 'row') seenRows += 1;
    if (seenRows === 2) break; // consumer stops early
  }
  test('generator is lazy (consumer can stop early)', seenRows === 2 && consumedChunks < 5);

  // 6. Quoted fields with commas parse.
  const quoted = HEADER + `"Widget, Large","SKU-H",5060000000000,4,8.8,3924909990,Standard 20%,no,10,10,20,1\n`;
  const r6 = await m.importCatalogCsv('brand-astonish', from([quoted]), { client: new m.MockCatalogImportClient() });
  test('quoted field containing comma parses', r6.commit?.imported === 1);

  console.log(failures === 0 ? 'CSV_IMPORT_VALIDATION_PASS' : `CSV_IMPORT_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
