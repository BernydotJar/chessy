/** Deterministic, standalone Node.js release bundle for Chessy public server + Aula Directa. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.env.CHESSY_AULA_SERVER_OUTPUT ||
  path.join(root,'progress/runtime/aula-server.mjs');
await build({
  entryPoints:[path.join(root,'scripts/serve-production.mjs')],
  outfile:output,
  bundle:true,platform:'node',target:'node22',format:'esm',
  banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"},
  legalComments:'none',logLevel:'warning'
});
console.log('CHESSY_AULA_SERVER_BUNDLE_READY',output);
