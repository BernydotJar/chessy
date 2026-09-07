const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
function readEnv(file){const out={};for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i>0)out[line.slice(0,i)]=line.slice(i+1);}return out;}
const env=readEnv(path.join(ROOT,'.env.production'));
const key=env.VITE_FIREBASE_API_KEY,project=env.VITE_FIREBASE_PROJECT_ID;
if(!key||project!=='chessy-pwa-2026')throw new Error('Chessy production Firebase config missing');
const idBase='https://identitytoolkit.googleapis.com/v1';
const fsBase=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const password=`C!${crypto.randomBytes(15).toString('base64url')}9a`;
const accounts=[];
async function identity(endpoint,body,expectOk=true){const r=await fetch(`${idBase}/${endpoint}?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(expectOk&&!r.ok)throw new Error(`${endpoint} ${r.status} ${j.error?.message||'unknown'}`);return {ok:r.ok,status:r.status,json:j};}
function validFields(uid){return {fields:{schemaVersion:{integerValue:'1'},ownerUid:{stringValue:uid},progressVersion:{integerValue:'2'},solved:{arrayValue:{values:[{stringValue:'rook-file'}]}},lessons:{arrayValue:{}},days:{arrayValue:{values:[{stringValue:'2026-09-07'}]}},mistakes:{integerValue:'0'},review:{arrayValue:{}}}};}
async function fire(method,path,token,body){const headers={'content-type':'application/json'};if(token)headers.authorization=`Bearer ${token}`;const r=await fetch(`${fsBase}/${path}`,{method,headers,body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json();}catch{}return {ok:r.ok,status:r.status,json:j};}
(async()=>{
 const result={project,ownWrite:'PENDING',ownRead:'PENDING',crossUserReadDenied:'PENDING',unauthenticatedDenied:'PENDING',invalidSchemaDenied:'PENDING',ownDelete:'PENDING'};
 try{
  for(let i=0;i<2;i++){const email=`chessy-rules-${Date.now()}-${i}-${crypto.randomBytes(3).toString('hex')}@example.com`;const created=await identity('accounts:signUp',{email,password,returnSecureToken:true});accounts.push({email,idToken:created.json.idToken,uid:created.json.localId});}
  const [a,b]=accounts; const pathA=`users/${encodeURIComponent(a.uid)}/progress/current`;
  const own=await fire('PATCH',`${pathA}?updateMask.fieldPaths=schemaVersion&updateMask.fieldPaths=ownerUid&updateMask.fieldPaths=progressVersion&updateMask.fieldPaths=solved&updateMask.fieldPaths=lessons&updateMask.fieldPaths=days&updateMask.fieldPaths=mistakes&updateMask.fieldPaths=review&updateMask.fieldPaths=updatedAt`,a.idToken,{...validFields(a.uid),fields:{...validFields(a.uid).fields,updatedAt:{timestampValue:new Date().toISOString()}}});
  // Direct REST timestamps are not server transforms; rules require request.time. Use commit transform for the authoritative allow test.
  if(own.ok)throw new Error('direct client timestamp unexpectedly passed updatedAt server-time rule');
  const commit=await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${a.idToken}`},body:JSON.stringify({writes:[{update:{name:`projects/${project}/databases/(default)/documents/${pathA}`,...validFields(a.uid)},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]}]})});
  if(!commit.ok)throw new Error(`own write denied ${commit.status} ${await commit.text()}`);result.ownWrite='PASS';
  const ownRead=await fire('GET',pathA,a.idToken);if(!ownRead.ok)throw new Error(`own read ${ownRead.status}`);result.ownRead='PASS';
  const cross=await fire('GET',pathA,b.idToken);if(cross.ok||cross.status!==403)throw new Error(`cross user read ${cross.status}`);result.crossUserReadDenied='PASS';
  const anon=await fire('GET',pathA,null);if(anon.ok||anon.status!==403)throw new Error(`anonymous read ${anon.status}`);result.unauthenticatedDenied='PASS';
  const bad=await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${a.idToken}`},body:JSON.stringify({writes:[{update:{name:`projects/${project}/databases/(default)/documents/${pathA}`,fields:{...validFields(a.uid).fields,xp:{integerValue:'999999'}}},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]}]})});
  if(bad.ok||bad.status!==403)throw new Error(`invalid schema write ${bad.status}`);result.invalidSchemaDenied='PASS';
  const del=await fire('DELETE',pathA,a.idToken);if(!del.ok)throw new Error(`own delete ${del.status}`);result.ownDelete='PASS';
  fs.mkdirSync(path.join(ROOT,'progress/evidence/release'),{recursive:true});fs.writeFileSync(path.join(ROOT,'progress/evidence/release/firestore-rules-live-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 } finally {for(const a of accounts){if(a.idToken)await identity('accounts:delete',{idToken:a.idToken},false).catch(()=>{});}}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
