'use strict';
/** Disposable, adult-only provider QA using an existing approved QA account. No credentials are printed. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'progress/evidence/livekit');
fs.mkdirSync(OUT,{recursive:true});
if(!process.argv.includes('--existing-qa-project'))throw new Error('Explicit existing QA project selection required');
const configPath='/opt/luma-livekit-qa/privatehome/.livekit/cli-config.yaml';
const stat=fs.statSync(configPath);if((stat.mode&0o077)!==0)throw new Error('QA credential file must be owner-only');
const yaml=require('js-yaml'),cfg=yaml.load(fs.readFileSync(configPath,'utf8'));
const projects=Array.isArray(cfg.projects)?cfg.projects:Object.values(cfg.projects||{});
const project=projects.find(p=>p.project_id==='p_5650huuc5om');
if(!project||new URL(project.url).hostname!=='luma-0x6n7955.livekit.cloud'||!project.api_key||!project.api_secret)
  throw new Error('Expected existing QA project not configured');
const secretFile=path.join(ROOT,'functions/.secret.local');
if(fs.existsSync(secretFile))throw new Error('Preserve existing emulator secret bindings; select a separate source before QA');
const java=fs.existsSync('/opt/luma-jre21/bin/java')?{JAVA_HOME:'/opt/luma-jre21',PATH:'/opt/luma-jre21/bin:'+process.env.PATH}:{};
const env={...process.env,...java,CHESSY_LIVEKIT_ENABLED:'true',CHESSY_LIVEKIT_URL:'wss://luma-0x6n7955.livekit.cloud',
  CHESSY_LIVEKIT_API_KEY:project.api_key,CHESSY_LIVEKIT_API_SECRET:project.api_secret};
fs.writeFileSync(secretFile,'CHESSY_LIVEKIT_API_KEY='+project.api_key+'\nCHESSY_LIVEKIT_API_SECRET='+project.api_secret+'\n',{mode:0o600});
const state={startedAt:new Date().toISOString(),status:'RUNNING',scope:'disposable adult QA, existing LiveKit QA project',projectId:project.project_id};
const statePath=path.join(OUT,'run-state.json');
fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
function redact(value){return value.replaceAll(project.api_key,'[KEY_REDACTED]').replaceAll(project.api_secret,'[SECRET_REDACTED]')
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT_REDACTED]');}
const child=spawn('firebase',['emulators:exec','--project','demo-chessy-livekit','--config','firebase.livekit-emulators.json',
  '--only','auth,firestore,functions','node scripts/livekit-browser-e2e.cjs'],{cwd:ROOT,env,stdio:['ignore','pipe','pipe']});
let carry='';
function output(chunk){
  carry+=chunk.toString();
  const lines=carry.split('\n');carry=lines.pop();for(const line of lines)process.stdout.write(redact(line)+'\n');
}
child.stdout.on('data',output);child.stderr.on('data',output);
child.on('error',()=>{state.status='FAIL';state.reason='emulator-spawn-failed';});
function cleanup(){
  if(fs.existsSync(secretFile))fs.unlinkSync(secretFile);
  const safeEnvHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'functions/livekit.cjs'))).digest('hex');
  state.finishedAt=new Date().toISOString();state.backendSha256=safeEnvHash;
  fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
}
child.on('close',code=>{process.stdout.write(redact(carry));state.status=code===0?'PASS':'FAIL';state.exitCode=code;cleanup();process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{child.kill(signal);});
