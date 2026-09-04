import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' });
const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
const integ = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const qc = new QueryClient();
qc.setQueryData(['brands'], { data: store.demoBrands, source: 'seed' });
qc.setQueryData(['contracts'], { data: store.demoContracts, source: 'seed' });
qc.setQueryData(['messages'], { data: store.demoMessages, source: 'seed' });
const wrap = (el) =>
  createElement(g.AppProvider, null,
    createElement(integ.IntegrationsProvider, null,
      createElement(QueryClientProvider, { client: qc }, el)));

for (const [name, file] of [
  ['BrandCRM', 'BrandCRM'],
  ['RetailPipeline', 'RetailPipeline'],
  ['MessagesHub', 'MessagesHub'],
  ['Contracts', 'ContractsAdminPanel'],
]) {
  const m = await server.ssrLoadModule(`/src/components/admin/${file}.tsx`);
  const key = Object.keys(m).find((k) => typeof m[k] === 'function');
  try {
    const html = renderToString(wrap(createElement(m[key])));
    console.log(`== ${name} len=${html.length}`);
    for (const probe of ['Nordhaus', 'Zambezi', 'PO-90', 'Distribution', 'Re:']) {
      if (html.includes(probe)) console.log('   has:', probe);
    }
    console.log('   tail:', html.slice(-200).replace(/</g, '<'));
  } catch (e) {
    console.log(`== ${name} THREW: ${e.message.slice(0, 140)}`);
  }
}
await server.close();
