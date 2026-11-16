/**
 * Stamp the verified frontend *content* version into both application shells.
 * The source commit from a PR and its squash-merge SHA differ; use a content
 * fingerprint instead of Git revision to compare an open tab with /health.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'dist');
const files=['aula/app.js','aula/style.css','version-notice.js','version-notice.css','sw.js'];
const assetsDir=path.join(root,'assets');
const assetFiles=fs.readdirSync(assetsDir).filter(name=>/\.(js|css)$/.test(name))
  .map(name=>'assets/'+name).sort();
if(!assetFiles.length)throw Error('Missing production bundle assets');
const hash=createHash('sha256');
for(const file of [...files,...assetFiles]){
  const data=fs.readFileSync(path.join(root,file));
  hash.update(file+'\0').update(data).update('\0');
}
const version=hash.digest('hex').slice(0,24);

for(const file of ['index.html','aula/index.html']){
  const full=path.join(root,file);
  let html=fs.readFileSync(full,'utf8');
  const meta='<meta name="chessy-ui-version" content="DEV">';
  if(html.split(meta).length!==2)throw Error('Missing unique Chessy version tag in '+file);
  html=html.replace(meta,'<meta name="chessy-ui-version" content="'+version+'">');
  for(const [src,attr] of [
    ['/version-notice.js','src'],['/version-notice.css','href'],
    ...(file.startsWith('aula/')?[['/aula/app.js','src'],['/aula/style.css','href']]:[])
  ]){
    const needle=attr+'="'+src+'"';
    if(html.split(needle).length!==2)throw Error('Missing unique '+needle+' in '+file);
    html=html.replace(needle,attr+'="'+src+'?v='+version+'"');
  }
  fs.writeFileSync(full,html);
}
fs.writeFileSync(path.join(root,'version.json'),JSON.stringify({ui_version:version})+'\n');
console.log('CHESSY_UI_VERSION',version);
