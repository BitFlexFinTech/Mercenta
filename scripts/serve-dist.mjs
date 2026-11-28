#!/usr/bin/env node
/**
 * §SERVE THE BUILT APP — `npm run serve:dist`
 *
 * WHY THIS EXISTS (2026-11-28). `vite preview` was used to show the owner the adopted
 * frontend locally and it HUNG: two instances ended up listening on the same port (one on
 * IPv6 `::1`, one on IPv4 `127.0.0.1`), `curl` got no response, and the owner was shown a
 * BLANK SCREEN. That looked like a broken frontend and was not one — served by this plain
 * static server, the same build reaches `readyState: complete`, renders, and logs zero
 * errors (proved with the browser, both cold and signed-in).
 *
 * So the way a build is shown locally is now a small, boring, deterministic server:
 * no transform, no dependency-optimisation, no port negotiation — one port, one process,
 * a clear error if the port is taken, and correct MIME types for the built assets.
 *
 * Usage:
 *   node scripts/serve-dist.mjs            # http://127.0.0.1:5223/
 *   PORT=5300 node scripts/serve-dist.mjs  # another port
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 5223);
const HOST = '127.0.0.1';

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error(`REFUSED: no build at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(ROOT, urlPath);
  /* The app is a single-page application: an unknown path is the app, not a 404. */
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`REFUSED: port ${PORT} is already in use. Free it, or run with PORT=<other>.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`Serving dist/ on http://${HOST}:${PORT}/  (Ctrl+C stops it)`);
});