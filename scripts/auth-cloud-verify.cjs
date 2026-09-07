const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
function readEnv(file){const out={};for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i>0)out[line.slice(0,i)]=line.slice(i+1);}return out;}
const env=readEnv(path.join(ROOT,'.env.production'));
const key=env.VITE_FIREBASE_API_KEY,project=env.VITE_FIREBASE_PROJECT_ID;
if(!key||project!=='chessy-pwa-2026')throw new Error('Chessy production Firebase config missing');
const base='https://identitytoolkit.googleapis.com/v1';
const email=`chessy-e2e-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;
const password=`C!${crypto.randomBytes(15).toString('base64url')}9a`;
let idToken=null;
async function call(endpoint,body,expectOk=true){const r=await fetch(`${base}/${endpoint}?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(expectOk&&!r.ok)throw new Error(`${endpoint} ${r.status} ${j.error?.message||'unknown'}`);return {ok:r.ok,status:r.status,json:j};}
(async()=>{
 const result={project,emailPasswordProvider:'PASS',googleProvider:'PENDING',create:'PENDING',signIn:'PENDING',delete:'PENDING',deletedCredentialRejected:'PENDING'};
 try{
  const google=await call('accounts:createAuthUri',{providerId:'google.com',continueUri:'https://chessy.textilesdemedellin.com/'});if(google.json.providerId!=='google.com'||!google.json.authUri)throw new Error('Google provider did not return an authUri');result.googleProvider='PASS';
  const created=await call('accounts:signUp',{email,password,returnSecureToken:true});idToken=created.json.idToken;result.create='PASS';
  const signed=await call('accounts:signInWithPassword',{email,password,returnSecureToken:true});idToken=signed.json.idToken;result.signIn='PASS';
  await call('accounts:delete',{idToken});idToken=null;result.delete='PASS';
  const after=await call('accounts:signInWithPassword',{email,password,returnSecureToken:true},false);if(after.ok)throw new Error('deleted account still signs in');result.deletedCredentialRejected='PASS';
  fs.mkdirSync(path.join(ROOT,'progress/evidence/release'),{recursive:true});fs.writeFileSync(path.join(ROOT,'progress/evidence/release/auth-cloud-verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
 } finally {
  if(idToken){await call('accounts:delete',{idToken},false).catch(()=>{});}
 }
})().catch(e=>{console.error(e.message);process.exit(1)});
