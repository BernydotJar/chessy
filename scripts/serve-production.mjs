import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mediaPermissionsPolicy } from './classroom-http-policy.mjs';
import { attachAulaDirect } from './aula-direct.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const root = path.resolve(process.env.CHESSY_DIST || path.join(projectRoot, 'dist'));
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || '14176');
const gitSha = process.env.CHESSY_RELEASE_SHA || (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();
const deploymentClass = process.env.CHESSY_DEPLOYMENT_CLASS || 'public-web';
const blocked = new Set(['/internal', '/metrics', '/meta', '/ready', '/debug', '/admin']);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
  '.gz': 'application/gzip'
};
const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': mediaPermissionsPolicy({deploymentClass, enabled: false, isHtml: false}),
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
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

let aula = null;
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
  catch { return respond(res, 400, 'Bad request\n'); }

  if (pathname === '/aula') return respond(res, 302, 'Aula directa\n', undefined, {Location:'/aula/', 'Cache-Control':'no-store'});
  if (pathname.startsWith('/aula/api/')) {
    if (!aula) return respond(res, 404, 'Not found\n');
    void aula.handle(req,res,pathname).catch(() => {
      if (!res.headersSent) respond(res,500,'Classroom service error\n'); else res.destroy();
    });
    return;
  }
  if (pathname.startsWith('/aula/') && !aula) return respond(res, 404, 'Not found\n');
  if (pathname === '/health') {
    return respond(res, 200, JSON.stringify({ status: 'ok', product: 'chessy', release_sha: gitSha, deployment_class: deploymentClass }) + '\n', 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
  }
  if (blocked.has(pathname)) return respond(res, 404, 'Not found\n', undefined, { 'Cache-Control': 'no-store' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return respond(res, 405, 'Method not allowed\n', undefined, { Allow: 'GET, HEAD' });

  const requested = pathname === '/' ? '/index.html' : pathname === '/aula/' ? '/aula/index.html' : pathname;
  let candidate = path.resolve(root, '.' + requested);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return respond(res, 400, 'Bad request\n');
  let stat;
  try { stat = fs.statSync(candidate); } catch { stat = null; }
  if (!stat?.isFile()) {
    if (!path.extname(pathname)) { candidate = path.join(root, 'index.html'); stat = fs.statSync(candidate); }
    else return respond(res, 404, 'Not found\n');
  }
  const ext = path.extname(candidate);
  const immutable = candidate.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    ...security,
    'Permissions-Policy': aula && pathname.startsWith('/aula/') && ext === '.html' ?
      'camera=(self), microphone=(self), display-capture=(self), geolocation=()' :
      mediaPermissionsPolicy({deploymentClass, enabled: process.env.CHESSY_MEDIA_PERMISSIONS_ENABLED, isHtml: ext === '.html'}),
    ...(pathname.startsWith('/aula/') ? {
      'X-Robots-Tag':'noindex, nofollow, noarchive',
      'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    } : {}),
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(candidate).pipe(res);
});

if (process.env.CHESSY_AULA_TEACHER_SECRET_FILE) {
  aula = attachAulaDirect(server,{secretPath:process.env.CHESSY_AULA_TEACHER_SECRET_FILE});
}
server.listen(port, host, () => console.log(`chessy release server http://${host}:${port} root=${root} sha=${gitSha} aula=${Boolean(aula)}`));
