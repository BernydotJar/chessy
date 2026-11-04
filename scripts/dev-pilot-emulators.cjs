'use strict';
/** Synthetic-only emulators. LiveKit QA project credentials never enter Git or Vite. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const configPath=process.env.CHESSY_DEV_LIVEKIT_CONFIG || '';
let provider=null;
if(configPath){
 const stat=fs.statSync(configPath);
 if((stat.mode&0o077)!==0)throw Error('Provider config permissions must be 0600');
 provider=JSON.parse(fs.readFileSync(configPath,'utf8'));
 if(!provider || !/^wss:\/\//.test(provider.url) ||
    !provider.apiKey || !provider.apiSecret)throw Error('Invalid dedicated QA provider config');
}
const secrets=path.join(root,'functions/.secret.local');
if(fs.existsSync(secrets))throw new Error('Another LiveKit QA run owns emulator secret bindings');
if(provider)fs.writeFileSync(secrets,'CHESSY_LIVEKIT_API_KEY='+provider.apiKey+'\nCHESSY_LIVEKIT_API_SECRET='+provider.apiSecret+'\n',{mode:0o600});
const env={...process.env,CHESSY_ADULT_PILOT_ONLY:'true',CHESSY_LIVEKIT_ENABLED:provider?'true':'false',
 CHESSY_ROOM_PRIVACY_NOTICE_URL:'https://example.test/chessy-qa-only',CHESSY_ROOM_PRIVACY_VERSION:'DEV-ONLY-2026'};
if(provider)Object.assign(env,{CHESSY_LIVEKIT_URL:provider.url,CHESSY_LIVEKIT_API_KEY:provider.apiKey,
  CHESSY_LIVEKIT_API_SECRET:provider.apiSecret});
if(fs.existsSync('/opt/luma-jre21/bin/java'))Object.assign(env,{JAVA_HOME:'/opt/luma-jre21',
  PATH:'/opt/luma-jre21/bin:'+process.env.PATH});
if(!provider)console.log('CHESSY_DEV_PILOT_MEDIA_DISABLED provider-config-absent; rooms and exercises remain enabled');
const child=spawn('firebase',['emulators:start','--project','demo-chessy-livekit','--config','firebase.livekit-emulators.json',
 '--only','auth,firestore,functions'],{cwd:root,env,stdio:'inherit'});
let closing=false;
function cleanup(){if(fs.existsSync(secrets))fs.unlinkSync(secrets);}
function stop(signal){if(closing)return;closing=true;child.kill(signal);}
process.on('SIGTERM',()=>stop('SIGTERM'));process.on('SIGINT',()=>stop('SIGINT'));
child.on('error',e=>{console.error('EMULATOR_START_ERROR',e.code);cleanup();process.exitCode=1;});
child.on('exit',code=>{cleanup();process.exit(code||0);});
