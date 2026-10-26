const origin='http://127.0.0.1:19639/identitytoolkit.googleapis.com/v1';
const project='demo-chessy-rooms';
const result=await fetch(origin+'/projects/'+project+'/accounts:batchCreate',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer owner'},
  body:JSON.stringify({users:[
    {localId:'coachChessyE2E',email:'coach-rooms-e2e@example.test',rawPassword:'ChessyEmulator123',
      emailVerified:true,customAttributes:'{"chessyRole":"coach"}'},
    {localId:'studentChessyE2E',email:'student-rooms-e2e@example.test',rawPassword:'ChessyEmulator123',
      emailVerified:true},
  ]}),
});
console.log('AUTH_EMULATOR_IMPORT',result.status,JSON.stringify(await result.json()).slice(0,1500));
if(!result.ok)process.exit(1);
