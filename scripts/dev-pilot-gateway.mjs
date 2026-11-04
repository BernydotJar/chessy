/** Disposable adult-only Chessy QA gateway. No raw emulator admin routes or secrets exposed. */
import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { connect } from 'node:net';
import { URL } from 'node:url';

const cfg = JSON.parse(fs.readFileSync(process.env.CHESSY_PILOT_ACCESS_FILE, 'utf8'));
const port = Number(process.env.CHESSY_PILOT_GATEWAY_PORT || 14330);
const staticPort = Number(process.env.CHESSY_PILOT_STATIC_PORT || 14329);
const maxRequestBytes = 100 * 1024;
const attempts = new Map();
const secretEqual = (a,b) => {
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};
const cookieValue = req => (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('chessy_pilot='))?.slice(13) || '';
const authenticated = req => secretEqual(cookieValue(req), cfg.cookieToken);
const headers = {
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive',
  'Permissions-Policy':'camera=(self), microphone=(self), display-capture=(self), geolocation=()'
};
const send=(res,code,body,type='text/plain; charset=utf-8',extra={})=>{
  res.writeHead(code,{...headers,'Content-Type':type,...extra});res.end(body);
};
const privacyHtml=`<!doctype html><html lang="es"><meta charset="utf-8"><title>Chessy · QA</title><h1>Piloto técnico de Chessy</h1><p>Solo pruebas de adultos con datos sintéticos. No utilizar información personal real, no grabar las llamadas y cerrar la sala al terminar.</p><p>Este entorno usa Firebase Emulators; las sesiones son temporales y pueden perderse al reiniciar.</p></html>`;
const loginHtml=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chessy · Piloto privado</title><style>body{font:16px system-ui;background:#101820;color:white;min-height:90vh;display:grid;place-items:center;margin:0}form{width:min(340px,85vw);padding:2rem;background:#22313a;border-radius:20px;display:grid;gap:1rem}input,button{font:inherit;padding:.8rem;border-radius:8px;border:0}button{background:#e6bd61;color:#15212a;cursor:pointer}</style><form action="/_pilot/login" method="POST"><h1>Chessy · Aula de desarrollo</h1><p>Acceso exclusivo al piloto de adultos. No contiene datos de producción.</p><label>Clave del piloto<input name="code" type="password" required autocomplete="off"></label><button type="submit">Ingresar al aula</button></form></html>`;
function upstream(req,path){
  if (/^\/identitytoolkit.googleapis.com\/v1\/accounts:(signInWithPassword|lookup|update|sendOobCode)$/.test(path) ||
      /^\/securetoken.googleapis.com\/v1\/token$/.test(path)) return 19739;
  if (/^\/google\.firestore\.v1\.Firestore\/(Listen|Write|BatchGetDocuments|Commit)\/channel$/.test(path) ||
      /^\/google\.firestore\.v1\.Firestore\/(Listen|Write|BatchGetDocuments|Commit)$/.test(path)) return 19708;
  if (/^\/demo-chessy-livekit\/us-central1\/[A-Za-z][A-Za-z0-9]{0,90}$/.test(path)) return 19749;
  if (path.startsWith('/identitytoolkit.')||path.startsWith('/securetoken.')||path.startsWith('/google.firestore.')||
    path.startsWith('/demo-chessy-livekit/')||path.startsWith('/emulator/')||path.startsWith('/_pilot/')) return 0;
  return staticPort;
}
const handle=async (req,res)=>{
  let url;
  try {url=new URL(req.url || '/', 'https://pilot.invalid');} catch {return send(res,400,'Bad request');}
  if (url.pathname==='/_pilot/health' && req.method==='GET') {
    const services=await Promise.all([19739,19708,19749].map(port=>new Promise(resolve=>{
      const socket=connect({host:'127.0.0.1',port});let done=false;
      const finish=ok=>{if(done)return;done=true;socket.destroy();resolve(ok);};
      socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));
      socket.setTimeout(700,()=>finish(false));
    })));
    const ready=services.every(Boolean);
    return send(res,ready?200:503,JSON.stringify({status:ready?'ok':'degraded',deployment_class:'adult-dev-only',backendReady:ready,mediaConfigured:Boolean(process.env.CHESSY_DEV_LIVEKIT_CONFIG)}), 'application/json; charset=utf-8');
  }
  if (url.pathname==='/_pilot/login' && req.method==='POST') {
    const origin=req.headers.origin;
    if (origin) {
      let originHost;try{originHost=new URL(origin).host;}catch{return send(res,403,'Origin denied');}
      if(originHost!==req.headers.host)return send(res,403,'Origin denied');
    }
    const ip=String(req.headers['cf-connecting-ip']||req.socket.remoteAddress).slice(0,110);
    const record=attempts.get(ip)||{at:Date.now(),count:0};
    if(Date.now()-record.at>600000){record.at=Date.now();record.count=0;}
    attempts.set(ip,record);
    if(++record.count>12) return send(res,429,'Too many attempts');
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return send(res,413,'Too large');}
    const code=new URLSearchParams(body).get('code')||'';
    if(!secretEqual(code,cfg.accessCode))return send(res,403,'Invalid pilot key');
    attempts.delete(ip);
    return send(res,303,'Login successful','text/plain; charset=utf-8',{
      Location:'/', 'Set-Cookie':`chessy_pilot=${cfg.cookieToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800`
    });
  }
  if (!authenticated(req)) {
    if (req.method==='GET'&&url.pathname==='/') return send(res,200,loginHtml,'text/html; charset=utf-8');
    return send(res,401,'Pilot session required');
  }
  if (req.method==='GET'&&url.pathname==='/privacy')return send(res,200,privacyHtml,'text/html; charset=utf-8');
  if (req.method==='GET'&&url.pathname==='/_pilot/logout')
    return send(res,303,'Logged out','text/plain; charset=utf-8',{Location:'/', 'Set-Cookie':'chessy_pilot=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0'});
  const target=upstream(req,url.pathname);
  if (!target || (target!==staticPort && !['GET','POST','OPTIONS'].includes(req.method))) return send(res,404,'Not found');
  if (target===staticPort && !['GET','HEAD'].includes(req.method)) return send(res,405,'Not allowed');
  // Only authenticated and intentionally allowlisted SDK paths reach the three emulators.
  const hs={...req.headers,host:`127.0.0.1:${target}`};delete hs.cookie;delete hs['cf-connecting-ip'];
  const proxy=httpRequest({host:'127.0.0.1',port:target,method:req.method,path:req.url,headers:hs},response=>{
    const h={...response.headers,...headers};delete h['set-cookie'];
    res.writeHead(response.statusCode||502,h);response.pipe(res);
  });
  proxy.on('error',()=>{if(!res.headersSent)send(res,502,'Pilot service temporarily unavailable');else res.destroy();});
  req.pipe(proxy);
};
const server=process.env.CHESSY_PILOT_TLS_CERT && process.env.CHESSY_PILOT_TLS_KEY ?
 createHttpsServer({cert:fs.readFileSync(process.env.CHESSY_PILOT_TLS_CERT),key:fs.readFileSync(process.env.CHESSY_PILOT_TLS_KEY)},handle) :
 createHttpServer(handle);
server.headersTimeout=15000; server.requestTimeout=120000;
server.listen(port,'127.0.0.1',()=>console.log(`CHESSY_DEV_PILOT_GATEWAY_READY port=${port}`));
