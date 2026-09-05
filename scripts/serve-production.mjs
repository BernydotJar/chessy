import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const root = path.resolve(process.env.CHESSY_DIST || path.join(projectRoot, 'dist'));
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || '14176');
const gitSha = process.env.CHESSY_RELEASE_SHA || 'unknown';
const blocked = new Set(['/internal', '/metrics', '/meta', '/ready', '/debug', '/admin']);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
  '.gz': 'application/gzip'
};
const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY'
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`Chessy production artifact missing: ${root}/index.html`);
  process.exit(1);
}

function respond(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  const payload = Buffer.from(body);
  res.writeHead(code, { ...security, 'Content-Type': type, 'Content-Length': payload.length, ...extra });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
  catch { return respond(res, 400, 'Bad request\n'); }

  if (pathname === '/health') {
    return respond(res, 200, JSON.stringify({ status: 'ok', product: 'chessy', git_sha: gitSha }) + '\n', 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
  }
  if (blocked.has(pathname)) return respond(res, 404, 'Not found\n', undefined, { 'Cache-Control': 'no-store' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return respond(res, 405, 'Method not allowed\n', undefined, { Allow: 'GET, HEAD' });

  const requested = pathname === '/' ? '/index.html' : pathname;
  let candidate = path.resolve(root, '.' + requested);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return respond(res, 400, 'Bad request\n');
  let stat;
  try { stat = fs.statSync(candidate); } catch { stat = null; }
  if (!stat?.isFile()) {
    // Hash-based routes normally do not hit the server, but this keeps the SPA resilient.
    if (!path.extname(pathname)) { candidate = path.join(root, 'index.html'); stat = fs.statSync(candidate); }
    else return respond(res, 404, 'Not found\n');
  }
  const ext = path.extname(candidate);
  const immutable = candidate.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    ...security,
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(candidate).pipe(res);
});

server.listen(port, host, () => console.log(`chessy release server http://${host}:${port} root=${root} sha=${gitSha}`));
