import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { attachAulaDirect } from '../aula-direct.mjs';

test('REA: private teacher/learner free board, editing, markings, authority and history',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-board-ws-'));
  const secretPath=path.join(dir,'teacher-secret');
  fs.writeFileSync(secretPath,'CHESSY-TEST-TEACHER-SECRET-BOARD-20261110',{mode:0o600});
  let aula;
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    void aula.handle(req,res,pathname).catch(e=>{if(!res.headersSent){res.writeHead(500);res.end(String(e));}});
  });
  aula=attachAulaDirect(server,{secretPath});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  let wsTeacher,wsStudent;
  t.after(async()=>{
    for(const ws of [wsTeacher,wsStudent])if(ws?.readyState===WebSocket.OPEN)ws.terminate();
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  });
  async function api(pathname,method='GET',body=null,cookie=''){
    const result=await fetch(base+'/aula/api/'+pathname,{
      method,headers:{origin:base, ...(body?{'content-type':'application/json'}:{}), ...(cookie?{cookie}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    return {code:result.status,body:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0]};
  }
  const login=await api('login','POST',{code:'CHESSY-TEST-TEACHER-SECRET-BOARD-20261110'});
  assert.equal(login.code,200);
  const made=await api('create','POST',{title:'Aula adversarial 1:1'},login.cookie);
  assert.equal(made.code,201);
  const invite=made.body.invite.split('/');
  const learner=await api('join','POST',{roomId:made.body.id,inviteToken:invite.at(-1),adult:true});
  assert.equal(learner.code,200);
  const client=async cookie=>{
    const socket=new WebSocket(base.replace('http:','ws:')+'/aula/ws?room='+made.body.id,{
      origin:base,headers:{Cookie:cookie}
    });
    const messages=[];
    socket.on('message',raw=>{try{messages.push(JSON.parse(raw.toString()));}catch{}});
    await once(socket,'open');
    const wait=async predicate=>{
      const until=Date.now()+4500;
      while(Date.now()<until){
        const item=messages.find(predicate);
        if(item)return item;
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      throw Error('No expected websocket event; recent='+JSON.stringify(messages.slice(-3)));
    };
    return {socket,messages,wait,get state(){return messages.filter(m=>m.type==='state').at(-1);}};
  };
  const teacher=await client(login.cookie);
  const student=await client(learner.cookie);
  wsTeacher=teacher.socket;wsStudent=student.socket;
  await teacher.wait(m=>m.type==='state'&&m.present?.student);
  const update=async (payload,predicate)=>{
    const previous=teacher.state.revision;
    teacher.socket.send(JSON.stringify({...payload,...(payload.revision===undefined?{revision:previous}:{})}));
    const current=await teacher.wait(m=>m.type==='state'&&m.revision===previous+1 && (!predicate||predicate(m)));
    const mirrored=await student.wait(m=>m.type==='state'&&m.revision===current.revision);
    assert.equal(mirrored.fen,current.fen);
    assert.deepEqual(mirrored.editor,current.editor);
    return current;
  };
  await t.test('learner cannot invoke teacher editor',async()=>{
    student.socket.send(JSON.stringify({type:'mode',value:'setup',revision:0}));
    const denied=await student.wait(m=>m.type==='error'&&m.message.includes('profesor'));
    assert.ok(denied);
    assert.equal(teacher.state.boardMode,'play');
  });
  await t.test('teacher enters synchronized editor, clears, places kings and rook',async()=>{
    let state=await update({type:'mode',value:'setup'});
    assert.equal(state.boardMode,'setup');
    state=await update({type:'edit',action:'clear'});
    assert.equal(state.editor.placement,'8/8/8/8/8/8/8/8');
    teacher.socket.send(JSON.stringify({type:'mode',value:'play',revision:state.revision}));
    const bad=await teacher.wait(m=>m.type==='error'&&m.message.includes('rey'));
    assert.ok(bad);
    assert.equal(teacher.state.boardMode,'setup');
    state=await update({type:'edit',action:'place',square:'e1',piece:'K'});
    state=await update({type:'edit',action:'place',square:'e8',piece:'k'});
    state=await update({type:'edit',action:'place',square:'a1',piece:'R'});
    assert.match(state.editor.placement,/R3K3/);
    student.socket.send(JSON.stringify({type:'edit',action:'place',square:'a8',piece:'q',revision:state.revision}));
    assert.ok(await student.wait(m=>m.type==='error'&&m.message.includes('profesor')));
    state=await update({type:'mode',value:'play'});
    assert.equal(state.boardMode,'play');
    assert.equal(state.fen,'4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  });
  await t.test('annotations are shared and can be cleared',async()=>{
    teacher.socket.send(JSON.stringify({type:'annotate',action:'arrow',from:'a1',to:'a8',revision:teacher.state.revision}));
    assert.ok(await student.wait(m=>m.type==='state'&&m.annotations?.arrows?.some(x=>x.from==='a1'&&x.to==='a8')));
    teacher.socket.send(JSON.stringify({type:'annotate',action:'square',square:'e4',revision:teacher.state.revision}));
    assert.ok(await student.wait(m=>m.type==='state'&&m.annotations?.squares?.includes('e4')));
    teacher.socket.send(JSON.stringify({type:'annotate',action:'clear',revision:teacher.state.revision}));
    assert.ok(await student.wait(m=>m.type==='state'&&m.feedback==='annotation-updated'&&m.annotations?.squares.length===0&&m.annotations?.arrows.length===0));
  });
  await t.test('color assignment authorizes only correct role per turn',async()=>{
    let state=await update({type:'control',value:'student-black'});
    assert.equal(state.control,'student-black');
    student.socket.send(JSON.stringify({type:'move',from:'a1',to:'a2',revision:state.revision}));
    assert.ok(await student.wait(m=>m.type==='error'&&m.message.includes('bloque')));
    state=await update({type:'move',from:'a1',to:'a2'});
    assert.equal(state.fen.split(' ')[1],'b');
    teacher.socket.send(JSON.stringify({type:'move',from:'e8',to:'e7',revision:state.revision}));
    assert.ok(await teacher.wait(m=>m.type==='error'&&m.message.includes('bloque')));
    student.socket.send(JSON.stringify({type:'move',from:'e8',to:'e7',revision:state.revision}));
    assert.ok(await teacher.wait(m=>m.type==='state'&&m.revision===state.revision+1&&m.history.at(-1)==='Ke7'));
  });
  await t.test('undo/redo recover both position and permissions',async()=>{
    const before=teacher.state;
    const back=await update({type:'undo'});
    assert.notEqual(back.fen,before.fen);
    const again=await update({type:'redo'});
    assert.equal(again.fen,before.fen);
    assert.equal(again.control,'student-black');
  });
});
