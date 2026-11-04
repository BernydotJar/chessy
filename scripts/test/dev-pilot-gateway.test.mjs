import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('pilot gateway requires an authenticated session and blocks emulator administration',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-pilot-gateway-'));
 const access=path.join(dir,'access.json');
 fs.writeFileSync(access,JSON.stringify({accessCode:'TEST-ONLY-GATE-KEY',cookieToken:'TEST-ONLY-SESSION-KEY'}),{mode:0o600});
 const backend=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('qa-static-ok');});
 await new Promise(r=>backend.listen(0,'127.0.0.1',r));
 const port=await freePort(),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['scripts/dev-pilot-gateway.mjs'],{cwd:process.cwd(),
  env:{...process.env,CHESSY_PILOT_ACCESS_FILE:access,CHESSY_PILOT_GATEWAY_PORT:String(port),
   CHESSY_PILOT_STATIC_PORT:String(backend.address().port)},stdio:'ignore'});
 try{
  let up=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/_pilot/health')).ok){up=true;break;}}catch{}await wait(100);}
  assert.ok(up,'gateway starts');
  let r=await fetch(base+'/identitytoolkit.googleapis.com/v1/accounts:lookup');assert.equal(r.status,401);
  r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/Piloto privado/);
  r=await fetch(base+'/_pilot/login',{method:'POST',body:'code=wrong',redirect:'manual'});assert.equal(r.status,403);
  r=await fetch(base+'/_pilot/login',{method:'POST',body:'code=TEST-ONLY-GATE-KEY',redirect:'manual'});
  assert.equal(r.status,303);
  const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie?.startsWith('chessy_pilot='));
  assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  const auth={headers:{Cookie:cookie}};
  r=await fetch(base+'/emulator/v1/projects/demo-chessy-livekit',auth);assert.equal(r.status,404);
  r=await fetch(base+'/demo-chessy-livekit/us-central1/some/unknown',auth);assert.equal(r.status,404);
  r=await fetch(base+'/privacy',auth);assert.equal(r.status,200);assert.match(await r.text(),/datos sintéticos/);
  r=await fetch(base+'/',auth);assert.equal(r.status,200);assert.equal(await r.text(),'qa-static-ok');
  r=await fetch(base+'/any-write',{method:'POST',headers:{Cookie:cookie}});assert.equal(r.status,405);
 } finally {child.kill('SIGTERM');await new Promise(r=>backend.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
