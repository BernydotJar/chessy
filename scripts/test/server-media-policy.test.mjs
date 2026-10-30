import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mediaPermissionsPolicy } from '../classroom-http-policy.mjs';

const blocked = 'camera=(), microphone=(), display-capture=(), geolocation=()';
const permitted = 'camera=(self), microphone=(self), display-capture=(self), geolocation=()';
const service = resolve('scripts/serve-production.mjs');

test('HTTP policy fails closed outside explicitly enabled adult pilot HTML', () => {
  for (const deploymentClass of ['public-web','development','adult-pilot','']) {
    for (const enabled of [undefined, 'false', 'TRUE']) {
      assert.equal(mediaPermissionsPolicy({deploymentClass,enabled,isHtml:true}),blocked);
    }
    assert.equal(mediaPermissionsPolicy({deploymentClass,enabled:'true',isHtml:false}),blocked);
  }
  assert.equal(mediaPermissionsPolicy({deploymentClass:'adult-pilot',enabled:'true',isHtml:true}),permitted);
});

async function availablePort() {
  return new Promise((done, fail) => {
    const server=createServer();
    server.once('error',fail);
    server.listen(0,'127.0.0.1',()=> {
      const address=server.address();
      server.close(()=>done(address.port));
    });
  });
}
async function launch(dist, deploymentClass, enabled) {
  const port=await availablePort();
  const child=spawn(process.execPath,[service],{
    env:{...process.env,CHESSY_DIST:dist,CHESSY_DEPLOYMENT_CLASS:deploymentClass,
      CHESSY_MEDIA_PERMISSIONS_ENABLED:enabled,PORT:String(port),HOST:'127.0.0.1',
      CHESSY_RELEASE_SHA:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
    stdio:'ignore'
  });
  const base='http://127.0.0.1:'+port;
  for(let tries=0;tries<60;tries++){
    if(child.exitCode!==null)throw new Error('Server exited before readiness');
    try {const response=await fetch(base+'/health');if(response.ok)return {child,base};}
    catch {await new Promise(done=>setTimeout(done,35));}
  }
  child.kill();
  throw new Error('Server did not become ready');
}

test('real HTTP server grants capture only for adult pilot HTML, never public or health', async () => {
  const dist=await mkdtemp(join(tmpdir(),'chessy-server-policy-'));
  await mkdir(join(dist,'assets'));
  await writeFile(join(dist,'index.html'),'<html><body>Chessy</body></html>');
  await writeFile(join(dist,'assets','demo.js'),'console.log(1)');
  try {
    for(const [deploymentClass,enabled,expectPolicy] of [
      ['public-web','true',blocked],['adult-pilot','false',blocked],['adult-pilot','true',permitted]
    ]){
      const {child,base}=await launch(dist,deploymentClass,enabled);
      try {
        for(const [url,policy] of [['/',expectPolicy],['/health',blocked],['/assets/demo.js',blocked]]) {
          const response=await fetch(base+url);
          assert.equal(response.status,200,url);
          assert.equal(response.headers.get('permissions-policy'),policy,url);
        }
      } finally {child.kill();await new Promise(done=>child.once('exit',done));}
    }
  } finally {await rm(dist,{recursive:true,force:true});}
});
