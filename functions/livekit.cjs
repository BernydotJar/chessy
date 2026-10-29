'use strict';
const {createHash}=require('node:crypto');
const {rateNext}=require('./policy.cjs');
const SAFE=/^[A-Za-z0-9]{20}$/;
const safeId=value=>typeof value==='string'&&SAFE.test(value);
const MAX_PARTICIPANTS=12,TOKEN_SECONDS=90,CLASS_MS=120*60*1000;
const digest=value=>createHash('sha256').update(value).digest('hex');
const providerRoom=(roomId,sessionId)=>'chessy_'+digest(roomId+':'+sessionId);
const participantId=(sessionId,uid)=>'p_'+digest(sessionId+':'+uid);
const millis=value=>typeof value?.toMillis==='function'?value.toMillis():0;
function liveConfig(env=process.env){
  const url=env.CHESSY_LIVEKIT_URL||'';
  let parsed;
  try{parsed=new URL(url);}catch{throw new Error('live-unconfigured');}
  const cloud=parsed.protocol==='wss:'&&parsed.hostname.endsWith('.livekit.cloud');
  const local=env.FUNCTIONS_EMULATOR==='true'&&env.CHESSY_LIVEKIT_QA_MODE==='local'&&
    parsed.protocol==='ws:'&&['127.0.0.1','localhost'].includes(parsed.hostname);
  if((!cloud&&!local)||parsed.username||parsed.password||parsed.search||parsed.hash||
    !env.CHESSY_LIVEKIT_API_KEY||!env.CHESSY_LIVEKIT_API_SECRET)throw new Error('live-unconfigured');
  return {url,apiKey:env.CHESSY_LIVEKIT_API_KEY,apiSecret:env.CHESSY_LIVEKIT_API_SECRET,cloud};
}
function joinGrant(roomName,role,TrackSource){
  return {room:roomName,roomJoin:true,roomCreate:false,roomAdmin:false,roomRecord:false,
    canSubscribe:true,canPublish:true,canPublishData:false,canUpdateOwnMetadata:false,
    canPublishSources:role==='coach'?
      [TrackSource.CAMERA,TrackSource.MICROPHONE,TrackSource.SCREEN_SHARE,TrackSource.SCREEN_SHARE_AUDIO]:
      [TrackSource.CAMERA,TrackSource.MICROPHONE]};
}
function provider(config){
  const {RoomServiceClient,AccessToken,TrackSource}=require('livekit-server-sdk');
  const client=new RoomServiceClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);
  return {
    create:name=>client.createRoom({name,maxParticipants:MAX_PARTICIPANTS,emptyTimeout:120,departureTimeout:20}),
    remove:(name,identity)=>client.removeParticipant(name,identity,{revokeTokenTs:BigInt(Math.floor(Date.now()/1000)+1)}),
    delete:async name=>{try{await client.deleteRoom(name);}catch(e){if(e.code!=='not_found'&&e.status!==404)throw e;}},
    list:name=>client.listParticipants(name),
    mute:(name,identity,sid)=>client.mutePublishedTrack(name,identity,sid,true),
    sign:async(name,identity,role)=>{
      const token=new AccessToken(config.apiKey,config.apiSecret,{
        identity,name:role==='coach'?'Coach':'Learner '+identity.slice(2,6),ttl:TOKEN_SECONDS+'s'});
      token.metadata=JSON.stringify({role});
      token.addGrant(joinGrant(name,role,TrackSource));
      return token.toJwt();
    },
  };
}
function createLiveService({db,Timestamp,HttpsError,clock=Date.now,getConfig=liveConfig,makeProvider=provider,enabled=()=>process.env.CHESSY_LIVEKIT_ENABLED==='true'}){
  const fail=(code,message)=>{throw new HttpsError(code,message);};
  const stamp=ms=>Timestamp.fromMillis(ms);
  const identify=request=>{
    const a=request.auth;
    if(!a||a.token?.email_verified!==true)fail('unauthenticated','Verified account required');
    return a;
  };
  const ids=request=>{
    const data=request.data;
    if(!data||typeof data!=='object'||Array.isArray(data))fail('invalid-argument','Invalid classroom request');
    const {roomId,sessionId}=data;
    if(!safeId(roomId)||(sessionId!==undefined&&!safeId(sessionId)))fail('invalid-argument','Invalid classroom identifier');
    return {roomId,sessionId};
  };
  const current=roomId=>db.doc('learningRooms/'+roomId+'/live/current');
  const session=id=>db.doc('learningRoomLiveSessions/'+id);
  const config=()=>{
    try{return getConfig();}catch{fail('failed-precondition','live-unconfigured');}
  };
  const requireEnabled=()=>{if(!enabled())fail('failed-precondition','live-disabled');};
  async function access(tx,roomId,a,ownerOnly=false){
    const [r,m]=await Promise.all([tx.get(db.doc('learningRooms/'+roomId)),tx.get(db.doc('learningRooms/'+roomId+'/members/'+a.uid))]);
    const room=r.data(),member=m.data(),owner=room?.ownerUid===a.uid&&['coach','admin'].includes(a.token.chessyRole);
    if(!room||room.status!=='active'||millis(room.expiresAt)<=clock())fail('permission-denied','live-access-denied');
    if(ownerOnly&&!owner)fail('permission-denied','Coach required');
    if(!owner&&(!member||member.ageBand!=='adult'||millis(member.expiresAt)<=clock()))fail('permission-denied','Adult enrollment required');
    return {room,role:owner?'coach':'learner',member};
  }
  function audit(tx,action,uid,roomId,details={}){
    tx.create(db.collection('roomAudit').doc(),{schemaVersion:1,action,actorUid:uid,roomId,details,
      createdAt:stamp(clock()),expiresAt:stamp(clock()+90*86400000)});
  }
  async function takeRate(tx,uid,kind,count,windowMs){
    const ref=db.doc('roomRateLimits/'+uid+'_live_'+kind),previous=await tx.get(ref);
    const next=rateNext(previous.data(),clock(),{count,windowMs});
    if(!next)fail('resource-exhausted','live-rate-limited');
    return ()=>tx.set(ref,{schemaVersion:1,...next,expiresAt:stamp(clock()+windowMs+86400000)});
  }
  async function start(request){
    requireEnabled();const a=identify(request),{roomId}=ids(request),p=makeProvider(config());
    const ref=db.collection('learningRoomLiveSessions').doc();
    const selected=await db.runTransaction(async tx=>{
      await access(tx,roomId,a,true);
      const previous=await tx.get(current(roomId)),state=previous.data();
      if(state&&['starting','live','closing'].includes(state.status)){
        if(state.status==='closing')fail('failed-precondition','live-closing');
        return {id:state.sessionId,roomName:providerRoom(roomId,state.sessionId)};
      }
      const charge=await takeRate(tx,a.uid,'start',6,3600000);
      const epoch=clock(),data={schemaVersion:1,roomId,ownerUid:a.uid,sessionId:ref.id,status:'starting',
        startedAt:stamp(epoch),endsAt:stamp(epoch+CLASS_MS),updatedAt:stamp(epoch),expiresAt:stamp(epoch+7*86400000)};
      charge();tx.create(ref,{...data,roomName:providerRoom(roomId,ref.id)});
      tx.set(current(roomId),data);audit(tx,'live.started',a.uid,roomId,{sessionId:ref.id});
      return {id:ref.id,roomName:providerRoom(roomId,ref.id)};
    });
    // Retrying a provider timeout uses the same name/session, never a second class.
    try{
      await p.create(selected.roomName);
      await db.runTransaction(async tx=>{
        await access(tx,roomId,a,true);
        const s=await tx.get(session(selected.id)),c=await tx.get(current(roomId));
        if(c.data()?.sessionId!==selected.id||!['starting','live'].includes(s.data()?.status))
          fail('failed-precondition','live-closing');
        tx.update(session(selected.id),{status:'live',updatedAt:stamp(clock())});
        tx.update(current(roomId),{status:'live',updatedAt:stamp(clock())});
      });
    }catch(e){
      // An uncertain create is retained for end/reconciliation; no credentials were issued.
      if(e instanceof HttpsError)throw e;
      fail('unavailable','live-provider-unavailable');
    }
    return {sessionId:selected.id};
  }
  async function join(request){
    requireEnabled();const a=identify(request),{roomId,sessionId}=ids(request);
    if(!sessionId)fail('invalid-argument','Session required');
    const p=makeProvider(config()),identity=participantId(sessionId,a.uid),ref=session(sessionId);
    const ledger=ref.collection('participants').doc(identity);
    async function authorize(tx,issue){
      const info=await access(tx,roomId,a);
      const [s,c,l,all]=await Promise.all([tx.get(ref),tx.get(current(roomId)),tx.get(ledger),
        tx.get(ref.collection('participants'))]);
      const state=s.data(),entry=l.data();
      if(state?.roomId!==roomId||state.status!=='live'||c.data()?.sessionId!==sessionId||millis(state.endsAt)<=clock())
        fail('failed-precondition','live-ended');
      if(entry?.blocked)fail('permission-denied','live-removed');
      const learners=all.docs.filter(doc=>doc.data().role!=='coach').length;
      if(!entry&&(all.size>=MAX_PARTICIPANTS||(info.role==='learner'&&learners>=MAX_PARTICIPANTS-1)))
        fail('resource-exhausted','live-full');
      if(issue){
        const charge=await takeRate(tx,a.uid,'join',15,60000);charge();
        tx.set(ledger,{identity,uid:a.uid,role:info.role,blocked:false,status:'issued',issuedAt:stamp(clock()),
          membershipExpiresAt:info.role==='coach'?state.endsAt:info.member.expiresAt,expiresAt:state.expiresAt});
        // Serializes concurrent first admissions and close; prevents capacity races.
        tx.update(ref,{credentialRevision:(state.credentialRevision||0)+1});
      }
      return info.role;
    }
    const role=await db.runTransaction(tx=>authorize(tx,true));
    let token;
    try{token=await p.sign(providerRoom(roomId,sessionId),identity,role);}
    catch{fail('unavailable','live-provider-unavailable');}
    // A close/removal/withdrawal during signing invalidates the response.
    await db.runTransaction(tx=>authorize(tx,false));
    return {token,serverUrl:config().url,identity,role,sessionId,expiresIn:TOKEN_SECONDS};
  }
  async function finish(roomId,sessionId){
    const ref=session(sessionId);
    const state=await db.runTransaction(async tx=>{
      const [s,c]=await Promise.all([tx.get(ref),tx.get(current(roomId))]);
      const data=s.data();
      if(!data||data.roomId!==roomId)fail('not-found','live-not-found');
      if(data.status==='ended')return null;
      tx.update(ref,{status:'closing',updatedAt:stamp(clock())});
      if(c.data()?.sessionId===sessionId)tx.update(current(roomId),{status:'closing',updatedAt:stamp(clock())});
      return data;
    });
    if(!state)return {ended:true};
    const p=makeProvider(config());
    const ledger=await ref.collection('participants').get();
    try{
      // Includes credentials that have never connected or already left.
      for(const entry of ledger.docs)await p.remove(state.roomName,entry.id);
      await p.delete(state.roomName);
    }catch{fail('unavailable','live-close-retry');}
    await db.runTransaction(async tx=>{
      const c=await tx.get(current(roomId));
      tx.update(ref,{status:'ended',endedAt:stamp(clock()),updatedAt:stamp(clock())});
      if(c.data()?.sessionId===sessionId)tx.update(current(roomId),{status:'ended',updatedAt:stamp(clock())});
    });
    return {ended:true};
  }
  async function end(request){
    const a=identify(request),{roomId,sessionId}=ids(request);
    if(!sessionId)fail('invalid-argument','Session required');
    // Owners can retry cleanup after the learning room itself has been closed.
    const r=await db.doc('learningRooms/'+roomId).get();
    if(r.data()?.ownerUid!==a.uid||!['coach','admin'].includes(a.token.chessyRole))fail('permission-denied','Coach required');
    return finish(roomId,sessionId);
  }
  async function moderate(request){
    const a=identify(request),{roomId,sessionId}=ids(request),{identity,action}=request.data||{};
    if(!sessionId||typeof identity!=='string'||!/^p_[a-f0-9]{64}$/.test(identity)||!['mute','remove'].includes(action))fail('invalid-argument','Invalid moderation action');
    const ref=session(sessionId),target=ref.collection('participants').doc(identity);
    const state=await db.runTransaction(async tx=>{
      await access(tx,roomId,a,true);
      const [s,t]=await Promise.all([tx.get(ref),tx.get(target)]);
      const data=s.data();
      if(data?.roomId!==roomId||data.status!=='live'||t.data()?.role!=='learner')fail('permission-denied','Participant unavailable');
      const charge=await takeRate(tx,a.uid,'moderate',30,60000);charge();
      if(action==='remove')tx.update(target,{blocked:true,status:'revoking'});
      audit(tx,'live.'+action,a.uid,roomId,{sessionId,identity});
      return data;
    });
    const p=makeProvider(config());
    try{
      if(action==='remove'){await p.remove(state.roomName,identity);await target.update({status:'removed'});}
      else{
        const participant=(await p.list(state.roomName)).find(item=>item.identity===identity);
        if(!participant)fail('not-found','Participant unavailable');
        for(const track of participant.tracks||[])if(track.type===0)await p.mute(state.roomName,identity,track.sid);
      }
    }catch(e){if(e instanceof HttpsError)throw e;fail('unavailable','live-moderation-retry');}
    return {applied:true};
  }
  async function closeRoom(roomId){
    const c=await current(roomId).get(),state=c.data();
    if(state&&state.status!=='ended')await finish(roomId,state.sessionId);
  }
  async function withdraw(roomId,uid){
    const c=await current(roomId).get(),state=c.data();
    if(!state||state.status==='ended')return;
    const ref=session(state.sessionId).collection('participants').doc(participantId(state.sessionId,uid));
    const snap=await ref.get();
    if(!snap.exists)return;
    await ref.update({blocked:true,status:'revoking'});
    try{await makeProvider(config()).remove(providerRoom(roomId,state.sessionId),ref.id);}
    catch{fail('unavailable','live-moderation-retry');}
    await ref.update({status:'removed',uid: null});
  }
  async function reconcile(){
    const active=await db.collection('learningRoomLiveSessions').where('status','in',['starting','live','closing']).limit(100).get();
    let ended=0,removed=0,failed=0;
    for(const doc of active.docs){
      const s=doc.data();
      try{
        const room=await db.doc('learningRooms/'+s.roomId).get();
        if(s.status==='closing'||millis(s.endsAt)<=clock()||room.data()?.status!=='active'||
          millis(room.data()?.expiresAt)<=clock()||(s.status==='starting'&&clock()-millis(s.startedAt)>120000)){
          await finish(s.roomId,doc.id);ended++;continue;
        }
        const people=await doc.ref.collection('participants').get();
        for(const entry of people.docs){
          const data=entry.data();if(data.role==='coach'||data.status==='removed')continue;
          const member=data.uid?await db.doc('learningRooms/'+s.roomId+'/members/'+data.uid).get():null;
          if(data.blocked||member?.data()?.ageBand!=='adult'||millis(member?.data()?.expiresAt)<=clock()){
            await entry.ref.update({blocked:true,status:'revoking'});
            await makeProvider(config()).remove(s.roomName,entry.id);
            await entry.ref.update({status:'removed',uid:null});removed++;
          }
        }
      }catch{failed++;}
    }
    // Explicit recursive cleanup of ephemeral credential ledgers; Firestore TTL is not recursive.
    const expired=await db.collection('learningRoomLiveSessions').where('expiresAt','<',stamp(clock())).limit(50).get();
    for(const doc of expired.docs)if(doc.data().status==='ended')await db.recursiveDelete(doc.ref);
    return {ended,removed,failed};
  }
  return {start,join,end,moderate,closeRoom,withdraw,reconcile};
}
module.exports={liveConfig,joinGrant,providerRoom,participantId,createLiveService,MAX_PARTICIPANTS,TOKEN_SECONDS};
