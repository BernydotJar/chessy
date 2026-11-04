'use strict';
/** Seed verified synthetic adults in the disposable emulator only. Never touches cloud Firebase. */
const fs=require('node:fs');
const config=JSON.parse(fs.readFileSync(process.env.CHESSY_PILOT_ACCESS_FILE,'utf8'));
const project='demo-chessy-livekit',base='http://127.0.0.1:19739';
const users=[
 {localId:'coachPilotDemo',email:'profesor@chessy.demo',rawPassword:config.demoPassword,emailVerified:true,
  customAttributes:JSON.stringify({chessyRole:'coach'})},
 {localId:'learnerPilotDemo',email:'alumno@chessy.demo',rawPassword:config.demoPassword,emailVerified:true},
 {localId:'outsiderPilotDemo',email:'observador@chessy.demo',rawPassword:config.demoPassword,emailVerified:true}
];
(async()=>{
 let ready=false;
 for(let i=0;i<70;i++){
  try{const r=await fetch(base+'/emulator/v1/projects/'+project+'/config');if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw Error('Auth emulator did not become ready');
 const response=await fetch(base+'/identitytoolkit.googleapis.com/v1/projects/'+project+'/accounts:batchCreate',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({users})
 });
 if(!response.ok)throw Error('Emulator fixture creation failed: '+response.status);
 for(const u of users){
  const r=await fetch(base+'/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic-emulator-key',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:u.email,password:config.demoPassword,returnSecureToken:true})
  });
  if(!r.ok)throw Error('Fixture sign-in failed: '+u.localId);
 }
 console.log('CHESSY_SYNTHETIC_ADULT_FIXTURES_READY count='+users.length);
})().catch(e=>{console.error('FIXTURES_FAILED',e.message);process.exitCode=1});
