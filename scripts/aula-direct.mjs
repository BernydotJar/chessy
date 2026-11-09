/**
 * Chessy Aula Directa: disposable adult-only 1:1 classroom hosted with Chessy.
 * No Firebase Functions, billing, cloud media secrets or student accounts.
 * Server owns identities, moves, exercises and peer signaling; never records media.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';
import { createAulaGovernance } from './aula-governance.mjs';
import bank from '../functions/classroom-exercise-bank.json' with { type: 'json' };

const ROOM_TTL = 2 * 60 * 60 * 1000;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const MAX_ROOMS = 5;
const validRoom = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const validSquare = value => typeof value === 'string' && /^[a-h][1-8]$/.test(value);
const token = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const same = (a,b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x,y);
};
const puzzles = new Map(bank.map(item => [item.id,item]));
const puzzleCatalogue = bank.map(({id,block}) => ({id,block,title:id.replace(/-/g,' ').replace(/^./,s=>s.toUpperCase())}));

function cookie(req,name) {
  const input = req.headers.cookie || '';
  for(const pair of input.split(';')){
    const sep=pair.indexOf('=');
    if(sep>=0 && pair.slice(0,sep).trim()===name) return pair.slice(sep+1).trim();
  }
  return '';
}
function secureOrigin(req){
  let origin, host;
  try {origin=new URL(String(req.headers.origin||''));host=String(req.headers.host||'');}
  catch {return false;}
  if(!host || origin.host!==host || !['http:','https:'].includes(origin.protocol))return false;
  if(origin.protocol==='http:' && !/^127\.0\.0\.1(:\d+)?$|^localhost(:\d+)?$/.test(host))return false;
  return true;
}
function send(res,code,obj,extra={}){
  const body=JSON.stringify(obj);
  res.writeHead(code,{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(body),
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'DENY',
    ...extra
  });
  res.end(body);
}
async function readBody(req){
  const chunks=[];let total=0;
  for await(const chunk of req){
    total+=chunk.length;
    if(total>8192)throw Error('size');
    chunks.push(chunk);
  }
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!body || typeof body!=='object' || Array.isArray(body))throw Error('body');
  return body;
}
function now(){return Date.now();}
function status(room){
  return {
    id:room.id,title:room.title,fen:room.fen,revision:room.revision,
    control:room.control||'both',lastMove:room.lastMove||null,hint:room.hint||null,
    status:room.closed?'closed':'active',exercise:room.exercise ?
      {id:room.exercise.id,status:room.exercise.status,attempts:room.exercise.attempts,ply:room.exercise.ply} : null,
    history:room.history.slice(-30),chat:room.chat.slice(-12),
    present:{teacher:room.sockets.teacher?.readyState===WebSocket.OPEN,
             student:room.sockets.student?.readyState===WebSocket.OPEN}
  };
}

export function attachAulaDirect(server,{secretPath,adminSecretPath,registryPath}){
  const stat=fs.statSync(secretPath);
  if((stat.mode & 0o077)!==0)throw Error('Aula teacher secret must have owner-only permissions');
  const teacherCode=fs.readFileSync(secretPath,'utf8').trim();
  if(teacherCode.length<24)throw Error('Aula teacher secret too short');
  const governance=createAulaGovernance({adminSecretPath,registryPath,legacyTeacherCode:teacherCode});
  const sessions=new Map();
  const rooms=new Map();
  const attempts=new Map();
  const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false,clientTracking:true});
  const getSession=req=>{
    for(const name of ['chessy_teacher','chessy_learner','chessy_admin']){
      const id=cookie(req,name),s=sessions.get(id);
      if(s && s.exp>now() && s.cookieName===name){
        if(s.role==='teacher' && !governance.teacherActive(s.teacherId||'legacy')){
          sessions.delete(id);continue;
        }
        if(s.role==='admin' && !governance.enabled){sessions.delete(id);continue;}
        return s;
      }
    }
    return null;
  };
  const getAdminSession=req=>{
    const s=sessions.get(cookie(req,'chessy_admin'));
    return s?.role==='admin' && s.exp>now() && governance.enabled ? s : null;
  };
  const authorized=(req,id)=>{
    const room=rooms.get(id),s=getSession(req);
    if(!room || room.closed || room.exp<=now() || !s)return null;
    if(s.role==='teacher' && s.teacherId===room.teacherId)return {room,role:'teacher',session:s};
    if(s.role==='student' && s.id===room.studentSession && s.roomId===id)return {room,role:'student',session:s};
    return null;
  };
  const sendTo=(socket,obj)=>{
    if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj));
  };
  const broadcast=(room,event={})=>{
    for(const role of ['teacher','student']){
      sendTo(room.sockets[role],{type:'state',...status(room),role,...event});
    }
  };
  const snapshot=rm=>{
    rm.past.push({fen:rm.fen,history:rm.history.slice(),exercise:rm.exercise?
      {...rm.exercise,solution:rm.exercise.solution.slice()}:null,
      control:rm.control,lastMove:rm.lastMove,hint:rm.hint});
    if(rm.past.length>120)rm.past.shift();
  };
  const sessionCookie=(name,value)=>name+'='+value+'; Path=/aula; Max-Age=28800; HttpOnly; Secure; SameSite=Lax';
  const expireCookie=name=>name+'=; Path=/aula; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  const newSession=(role,extra={})=>{
    const id=token();
    const s={id,role,exp:now()+SESSION_TTL,cookieName:role==='admin'?'chessy_admin':role==='teacher'?'chessy_teacher':'chessy_learner',...extra};
    sessions.set(id,s);return s;
  };
  const limiter=(key,limit,ms)=>{
    let x=attempts.get(key);
    if(!x || now()-x.since>ms)x={since:now(),count:0};
    x.count++;attempts.set(key,x);
    return x.count<=limit;
  };
  async function handle(req,res,pathname){
    if(pathname==='/aula/api/health' && req.method==='GET')return send(res,200,{status:'ok',mode:'direct-1to1',backendReady:true,roomsActive:[...rooms.values()].filter(r=>!r.closed&&r.exp>now()).length});
    if(req.method==='GET' && pathname==='/aula/api/admin/me'){
      const s=getAdminSession(req);
      return send(res,200,{role:s?'admin':null,configured:governance.enabled});
    }
    if(req.method==='GET' && pathname==='/aula/api/admin/teachers'){
      const s=getAdminSession(req);
      return s
        ? send(res,200,{teachers:governance.listTeachers(),legacyEnabled:governance.legacyEnabled(),
            events:governance.audit()})
        :send(res,403,{error:'administrator-only'});
    }
    if(req.method==='GET' && pathname==='/aula/api/me'){
      const s=getSession(req);
      return send(res,200,{role:s?.role||null,roomId:s?.roomId||null});
    }
    if(req.method==='GET' && pathname==='/aula/api/my-rooms'){
      const s=getSession(req);
      if(s?.role!=='teacher')return send(res,403,{error:'teacher-only'});
      const list=[...rooms.values()].filter(r=>!r.closed&&r.exp>now()&&r.teacherId===s.teacherId)
        .map(r=>({id:r.id,title:r.title,exp:r.exp,invite:r.invite,present:status(r).present}))
        .slice(-MAX_ROOMS).reverse();
      return send(res,200,{rooms:list});
    }
    if(req.method==='GET' && pathname==='/aula/api/puzzles'){
      return getSession(req)?send(res,200,{puzzles:puzzleCatalogue}):send(res,401,{error:'login-required'});
    }
    if(req.method==='GET' && pathname==='/aula/api/room'){
      const id=new URL(req.url,'http://localhost').searchParams.get('id');
      const a=authorized(req,id);
      return a?send(res,200,{...status(a.room),role:a.role,...(a.role==='teacher'?{invite:a.room.invite}:{})}):send(res,403,{error:'access-denied'});
    }
    if(req.method!=='POST')return send(res,405,{error:'method-not-allowed'});
    if(!secureOrigin(req))return send(res,403,{error:'origin-denied'});
    let input;
    try{input=await readBody(req);}catch{return send(res,400,{error:'invalid-body'});}
    if(pathname==='/aula/api/admin/login'){
      if(!governance.enabled)return send(res,503,{error:'administrator-not-configured'});
      const ip=req.socket.remoteAddress||'unknown';
      if(!limiter('admin-login:'+ip,8,15*60*1000))return send(res,429,{error:'retry-later'});
      if(typeof input.code!=='string' || !governance.verifyAdmin(input.code))
        return send(res,403,{error:'access-denied'});
      const s=newSession('admin');
      governance.addAudit('admin-login');
      return send(res,200,{role:'admin'}, {'Set-Cookie':sessionCookie(s.cookieName,s.id)});
    }
    if(pathname==='/aula/api/admin/teachers/create'){
      const s=getAdminSession(req);
      if(!s)return send(res,403,{error:'administrator-only'});
      try{
        const teacher=governance.createTeacher(input.name,input.days??30);
        return send(res,201,{teacher});
      }catch(e){return send(res,400,{error:e.message});}
    }
    if(pathname==='/aula/api/admin/teachers/revoke'){
      const s=getAdminSession(req);
      if(!s)return send(res,403,{error:'administrator-only'});
      if(!governance.revokeTeacher(input.teacherId))
        return send(res,404,{error:'teacher-not-found'});
      for(const [sid,session] of sessions)
        if(session.role==='teacher' && session.teacherId===input.teacherId)sessions.delete(sid);
      for(const rm of rooms.values())if(rm.teacherId===input.teacherId && !rm.closed){
        rm.closed=true;broadcast(rm);
        for(const ws of Object.values(rm.sockets))ws?.close(1008,'teacher revoked');
      }
      return send(res,200,{revoked:true});
    }
    if(pathname==='/aula/api/admin/legacy'){
      const s=getAdminSession(req);
      if(!s)return send(res,403,{error:'administrator-only'});
      if(typeof input.enabled!=='boolean')return send(res,400,{error:'invalid-setting'});
      governance.setLegacy(input.enabled);
      if(!input.enabled){
        for(const [sid,session] of sessions)
          if(session.role==='teacher' && session.teacherId==='legacy')sessions.delete(sid);
        for(const rm of rooms.values())if(rm.teacherId==='legacy' && !rm.closed){
          rm.closed=true;broadcast(rm);
          for(const ws of Object.values(rm.sockets))ws?.close(1008,'legacy access disabled');
        }
      }
      return send(res,200,{legacyEnabled:governance.legacyEnabled()});
    }
    if(pathname==='/aula/api/admin/logout'){
      const s=getAdminSession(req);
      if(s)sessions.delete(s.id);
      return send(res,200,{loggedOut:true},{'Set-Cookie':expireCookie('chessy_admin')});
    }
    if(pathname==='/aula/api/logout'){
      const s=getSession(req);
      if(s)sessions.delete(s.id);
      const cname=s?.cookieName||'chessy_teacher';
      return send(res,200,{loggedOut:true},{'Set-Cookie':expireCookie(cname)});
    }
    if(pathname==='/aula/api/login'){
      const ip=req.socket.remoteAddress||'unknown';
      if(!limiter('login:'+ip,15,15*60*1000))return send(res,429,{error:'retry-later'});
      const account=governance.verifyTeacher(input.code);
      if(!account)return send(res,403,{error:'access-denied'});
      const s=newSession('teacher',{teacherId:account.id});
      return send(res,200,{role:'teacher',name:account.name}, {'Set-Cookie':sessionCookie(s.cookieName,s.id)});
    }
    if(pathname==='/aula/api/create'){
      const s=getSession(req);
      if(!s || s.role!=='teacher')return send(res,403,{error:'teacher-only'});
      if(!limiter('create:'+s.teacherId,10,60*60*1000))return send(res,429,{error:'quota'});
      const active=[...rooms.values()].filter(r=>!r.closed&&r.exp>now()&&r.teacherId===s.teacherId);
      if(active.length>=MAX_ROOMS)return send(res,429,{error:'room-limit'});
      const title=typeof input.title==='string'?input.title.trim().slice(0,70):'';
      if(title.length<3)return send(res,400,{error:'title-required'});
      const id=crypto.randomBytes(12).toString('hex'),inviteToken=token();
      const room={id,title,owner:s.id,teacherId:s.teacherId||'legacy',studentSession:null,inviteHash:hash(inviteToken),
        invite:'',exp:now()+ROOM_TTL,closed:false,
        fen:new Chess().fen(),revision:0,exercise:null,history:[],chat:[],sockets:{teacher:null,student:null},
        control:'both',past:[],lastMove:null,hint:null};
      room.invite='/aula/#/join/'+id+'/'+inviteToken;
      rooms.set(id,room);
      governance.addAudit('room-created',{roomId:id,teacherId:room.teacherId});
      return send(res,201,{...status(room),role:'teacher',invite:room.invite});
    }
    if(pathname==='/aula/api/join'){
      if(input.adult!==true || !validRoom(input.roomId) ||
        typeof input.inviteToken!=='string' || input.inviteToken.length>100)
        return send(res,400,{error:'adult-consent-required'});
      const r=rooms.get(input.roomId);
      if(!r || r.closed || r.exp<=now() || !same(hash(input.inviteToken),r.inviteHash))
        return send(res,403,{error:'invite-invalid'});
      if(r.studentSession && sessions.get(r.studentSession)?.exp>now())
        return send(res,409,{error:'seat-occupied'});
      const s=newSession('student',{roomId:r.id});
      r.studentSession=s.id;
      governance.addAudit('learner-joined',{roomId:r.id,teacherId:r.teacherId});
      return send(res,200,{...status(r),role:'student'}, {'Set-Cookie':sessionCookie(s.cookieName,s.id)});
    }
    if(pathname==='/aula/api/invite/rotate'){
      const a=authorized(req,input.roomId);
      if(!a || a.role!=='teacher')return send(res,403,{error:'teacher-only'});
      const value=token();
      a.room.inviteHash=hash(value);
      a.room.invite='/aula/#/join/'+a.room.id+'/'+value;
      governance.addAudit('invite-rotated',{roomId:a.room.id,teacherId:a.room.teacherId});
      return send(res,200,{invite:a.room.invite});
    }
    if(pathname==='/aula/api/learner/remove'){
      const a=authorized(req,input.roomId);
      if(!a || a.role!=='teacher')return send(res,403,{error:'teacher-only'});
      const rm=a.room;
      if(rm.studentSession)sessions.delete(rm.studentSession);
      rm.studentSession=null;
      rm.sockets.student?.close(1008,'teacher removed learner');
      rm.sockets.student=null;
      const value=token();
      rm.inviteHash=hash(value);
      rm.invite='/aula/#/join/'+rm.id+'/'+value;
      governance.addAudit('learner-removed',{roomId:rm.id,teacherId:rm.teacherId});
      broadcast(rm);
      return send(res,200,{removed:true,invite:rm.invite});
    }
    if(pathname==='/aula/api/close'){
      const a=authorized(req,input.roomId);
      if(!a || a.role!=='teacher')return send(res,403,{error:'teacher-only'});
      a.room.closed=true;
      governance.addAudit('room-closed',{roomId:a.room.id,teacherId:a.room.teacherId});
      broadcast(a.room);
      for(const role of ['teacher','student'])a.room.sockets[role]?.close(1000,'class ended');
      return send(res,200,{closed:true});
    }
    return send(res,404,{error:'not-found'});
  }
  server.on('upgrade',(req,socket,head)=>{
    let url;
    try{url=new URL(req.url,'http://localhost');}
    catch{socket.destroy();return;}
    if(url.pathname!=='/aula/ws' || !secureOrigin(req)){socket.destroy();return;}
    const id=url.searchParams.get('room');
    if(!validRoom(id)){socket.destroy();return;}
    const a=authorized(req,id);
    if(!a){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>{
      ws.roomId=id;ws.role=a.role;ws.sessionId=a.session.id;
      const prev=a.room.sockets[a.role];
      if(prev && prev!==ws)prev.close(4001,'replaced');
      a.room.sockets[a.role]=ws;
      wss.emit('connection',ws,req);
    });
  });
  wss.on('connection',(ws)=>{
    const room=rooms.get(ws.roomId),role=ws.role;
    let count=0,windowStart=now();
    broadcast(room);
    ws.on('message',raw=>{
      if(ws.readyState!==WebSocket.OPEN || room.closed || room.exp<=now() ||
        room.sockets[role]!==ws || !sessions.has(ws.sessionId) ||
        (role==='teacher' && !governance.teacherActive(room.teacherId)))return;
      if(now()-windowStart>60000){count=0;windowStart=now();}
      if(++count>120){ws.close(1008,'rate limit');return;}
      let data;try{data=JSON.parse(raw.toString());}catch{return;}
      if(!data || typeof data!=='object' || Array.isArray(data) || typeof data.type!=='string')return;
      if(data.type==='signal'){
        if(data.kind==='description' && data.payload &&
          ['offer','answer'].includes(data.payload.type) && typeof data.payload.sdp==='string' &&
          data.payload.sdp.length<=12000){
          sendTo(room.sockets[role==='teacher'?'student':'teacher'],{type:'signal',kind:'description',payload:data.payload});
        }else if(data.kind==='candidate' && data.payload && typeof data.payload.candidate==='string' &&
          data.payload.candidate.length<=4000){
          sendTo(room.sockets[role==='teacher'?'student':'teacher'],{type:'signal',kind:'candidate',payload:data.payload});
        }else if(data.kind==='renegotiate' && role==='student'){
          sendTo(room.sockets.teacher,{type:'signal',kind:'renegotiate'});
        }
        return;
      }
      if(data.type==='assign'){
        if(role!=='teacher' || typeof data.id!=='string' || !puzzles.has(data.id))return sendTo(ws,{type:'error',message:'Acceso denegado'});
        const p=puzzles.get(data.id);
        room.exercise={id:p.id,solution:p.solution,attempts:0,ply:0,status:'active'};
        room.fen=p.fen;room.history=[];room.past=[];
        room.lastMove=null;room.hint=null;room.control='student';room.revision++;
        broadcast(room,{feedback:'exercise-assigned'});return;
      }
      if(data.type==='reset'){
        if(role!=='teacher')return sendTo(ws,{type:'error',message:'Solo el profesor puede reiniciar'});
        room.exercise=null;room.fen=new Chess().fen();room.history=[];
        room.past=[];room.lastMove=null;room.hint=null;room.control='both';room.revision++;
        broadcast(room,{feedback:'board-reset'});return;
      }
      if(data.type==='control'){
        if(role!=='teacher' || !['teacher','student','both'].includes(data.value))
          return sendTo(ws,{type:'error',message:'Solo el profesor puede asignar turnos'});
        room.control=data.value;room.revision++;
        broadcast(room,{feedback:'control-updated'});return;
      }
      if(data.type==='undo'){
        if(role!=='teacher')return sendTo(ws,{type:'error',message:'Solo el profesor puede deshacer'});
        const previous=room.past.pop();
        if(!previous)return sendTo(ws,{type:'error',message:'No hay jugadas para deshacer'});
        room.fen=previous.fen;room.history=previous.history;
        room.exercise=previous.exercise;room.control=previous.control;
        room.lastMove=previous.lastMove;room.hint=previous.hint;room.revision++;
        broadcast(room,{feedback:'move-undone'});return;
      }
      if(data.type==='setup'){
        if(role!=='teacher' || typeof data.fen!=='string' || data.fen.length>110)
          return sendTo(ws,{type:'error',message:'Solo el profesor puede cambiar la posición'});
        try{
          const game=new Chess(data.fen.trim());
          room.fen=game.fen();room.exercise=null;room.history=[];room.past=[];
          room.control='both';room.lastMove=null;room.hint=null;room.revision++;
          broadcast(room,{feedback:'position-updated'});
        }catch{sendTo(ws,{type:'error',message:'FEN inválido. Revisa la posición.'});}
        return;
      }
      if(data.type==='hint'){
        if(role!=='teacher' || !room.exercise || room.exercise.status!=='active')
          return sendTo(ws,{type:'error',message:'No hay ejercicio activo'});
        const expected=room.exercise.solution[room.exercise.ply];
        if(typeof expected!=='string' || expected.length<4)return;
        room.hint={from:expected.slice(0,2),to:expected.slice(2,4)};
        broadcast(room,{feedback:'hint-shown'});return;
      }
      if(data.type==='legal'){
        if(!validSquare(data.square))return;
        const allowed=(!room.exercise || room.exercise.status==='active') &&
          (room.exercise ? role==='student' : room.control==='both'||room.control===role);
        let moves=[];
        if(allowed){
          try{moves=new Chess(room.fen).moves({square:data.square,verbose:true}).map(m=>m.to);}
          catch{}
        }
        return sendTo(ws,{type:'legal',from:data.square,moves:[...new Set(moves)]});
      }
      if(data.type==='move'){
        if(!validSquare(data.from)||!validSquare(data.to)||
          !Number.isSafeInteger(data.revision) || data.revision!==room.revision)
          return sendTo(ws,{type:'error',message:'La posición cambió. Actualiza el tablero.'});
        if(!room.exercise && room.control!=='both' && room.control!==role)
          return sendTo(ws,{type:'error',message:'El profesor bloqueó tus movimientos'});
        const game=new Chess(room.fen),promo=['q','r','b','n'].includes(data.promotion)?data.promotion:'q';
        if(room.exercise){
          if(room.exercise.status!=='active'||role!=='student')return sendTo(ws,{type:'error',message:'Esperando al alumno'});
          const e=room.exercise,uci=data.from+data.to+(data.promotion||'');
          const expected=e.solution[e.ply];
          if(uci!==expected){
            e.attempts++;room.revision++;
            broadcast(room,{feedback:'retry'});
            return;
          }
          try {game.move({from:data.from,to:data.to,promotion:promo});}
          catch {return sendTo(ws,{type:'error',message:'Jugada ilegal'});}
          snapshot(room);
          e.ply++;
          if(e.ply<e.solution.length){
            const answer=e.solution[e.ply];
            try{game.move({from:answer.slice(0,2),to:answer.slice(2,4),promotion:answer[4]||'q'});e.ply++;}
            catch {return sendTo(ws,{type:'error',message:'Respuesta del ejercicio inválida'});}
          }
          e.status=e.ply>=e.solution.length?'completed':'active';
          room.fen=game.fen();room.history.push(uci);
          room.lastMove={from:data.from,to:data.to};room.hint=null;room.revision++;
          broadcast(room,{feedback:e.status==='completed'?'completed':'correct'});return;
        }
        try {
          const move=game.move({from:data.from,to:data.to,promotion:promo});
          if(!move)return sendTo(ws,{type:'error',message:'Jugada ilegal'});
          snapshot(room);
          room.fen=game.fen();room.history.push(move.san);
          room.lastMove={from:data.from,to:data.to};room.hint=null;room.revision++;
          broadcast(room,{feedback:'move'});
        }catch {sendTo(ws,{type:'error',message:'Movimiento inválido'});}
        return;
      }
      if(data.type==='chat' && typeof data.text==='string'){
        const clean=data.text.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,200);
        if(clean){room.chat.push({role,text:clean});room.chat=room.chat.slice(-12);broadcast(room);}
      }
    });
    ws.on('close',()=>{if(room.sockets[role]===ws){room.sockets[role]=null;broadcast(room);}});
    ws.on('error',()=>{});
  });
  const sweeper=setInterval(()=>{
    for(const [id,r] of rooms)if(r.exp<=now() || r.closed) {
      for(const role of ['teacher','student'])r.sockets[role]?.close(1000,'room closed');
      rooms.delete(id);
    }
    for(const [id,s] of sessions)if(s.exp<=now())sessions.delete(id);
    for(const [id,a] of attempts)if(now()-a.since>60*60*1000)attempts.delete(id);
  },60*1000);
  sweeper.unref();
  return {handle,activeRooms:()=>[...rooms.values()].filter(r=>!r.closed&&r.exp>now()).length};
}
