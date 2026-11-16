import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root=path.resolve(import.meta.dirname,'../..');
const dist=path.join(root,'dist');
const version=JSON.parse(fs.readFileSync(path.join(dist,'version.json'),'utf8')).ui_version;

test('content fingerprint is stamped consistently into web and classroom shells',()=>{
  assert.match(version,/^[a-f0-9]{24}$/);
  for(const page of ['index.html','aula/index.html']){
    const html=fs.readFileSync(path.join(dist,page),'utf8');
    assert.match(html,new RegExp('name="chessy-ui-version" content="'+version+'"'));
    for(const resource of ['/version-notice.js','/version-notice.css']){
      assert.ok(html.includes(resource+'?v='+version),page+' must refresh '+resource);
    }
  }
});
test('classroom assets bypass stale PWA worker caches via fingerprinted URLs',()=>{
  const html=fs.readFileSync(path.join(dist,'aula/index.html'),'utf8');
  assert.ok(html.includes('/aula/app.js?v='+version));
  assert.ok(html.includes('/aula/style.css?v='+version));
  assert.deepEqual(fs.readFileSync(path.join(dist,'aula/app.js')),
                   fs.readFileSync(path.join(root,'public/aula/app.js')));
});
test('release notice is safe for the shared PWA and classroom cache',()=>{
  const sw=fs.readFileSync(path.join(dist,'sw.js'),'utf8');
  assert.match(sw,/url\.pathname===['"]\/health['"]/);
  assert.match(sw,/url\.pathname\.startsWith\(['"]\/aula\/['"]\)/);
  assert.match(sw,/event\.respondWith\(fetch\(request\)\)/);
  const js=fs.readFileSync(path.join(dist,'version-notice.js'),'utf8');
  assert.match(js,/credentials:'same-origin'/);
  assert.match(js,/if\(activeClass\(\)\)/);
  assert.match(js,/location\.reload\(\)/);
});
