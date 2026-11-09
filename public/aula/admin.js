/** Standalone browser-only administrator console. Secrets never enter localStorage. */
const root=document.querySelector('#admin-root');
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>new Date(d).toLocaleDateString('es-GT',{year:'numeric',month:'short',day:'numeric'});
const statusText={active:'Vigente',revoked:'Revocado',expired:'Vencido'};
let freshCode=null;
async function api(path,body){
 const method=body?'POST':'GET';
 const r=await fetch('/aula/api/admin/'+path,{
   method,cache:'no-store',credentials:'same-origin',
   headers:body?{'Content-Type':'application/json'}:{},
   body:body?JSON.stringify(body):undefined
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'No se pudo completar la operación');
 return data;
}
function announce(message,success=false){
 const el=document.querySelector('#admin-notice');if(!el)return;
 el.textContent=message;el.className=success?'feedback good-feedback':'feedback';
}
function login(){
 root.className='admin-login';
 root.innerHTML='<p class="eyebrow">Control de acceso</p><h1>Administración del aula.</h1>'+
  '<p class="muted">Crea y revoca códigos de profesores. Solo la persona administradora puede gestionar estos accesos.</p>'+
  '<div class="card"><form id="admin-login-form">'+
  '<label for="admin-code">Código de administrador</label><input id="admin-code" type="password" required minlength="24" autocomplete="off" placeholder="Código privado de administración">'+
  '<div class="spacer"></div><button class="btn primary" type="submit">Entrar a administración</button>'+
  '</form><div id="admin-notice" role="alert" class="hidden"></div></div>'+
  '<p class="notice">El código administrador se guarda únicamente en el servidor, nunca en el navegador.</p>';
 document.querySelector('#admin-login-form').addEventListener('submit',async ev=>{
  ev.preventDefault();const button=ev.currentTarget.querySelector('button');button.disabled=true;
  try{await api('login',{code:document.querySelector('#admin-code').value});
   document.querySelector('#admin-code').value='';await dashboard();}
  catch(e){announce(e.message==='access-denied'?'Código incorrecto o no autorizado.':e.message);}
  finally{button.disabled=false;}
 });
}
async function dashboard(){
 let data;
 try{data=await api('teachers');}
 catch(e){login();return;}
 root.className='admin-dashboard';
 const entries=data.teachers||[];
 const rows=entries.length?entries.map(t=>'<tr>'+
  '<td>'+escapeHTML(t.name)+'</td>'+
  '<td><span class="status-'+escapeHTML(t.status)+'">'+(statusText[t.status]||t.status)+'</span></td>'+
  '<td>'+fmt(t.expiresAt)+'</td>'+
  '<td>'+(t.status==='active'?'<button class="btn danger" type="button" data-revoke="'+escapeHTML(t.id)+'">Revocar</button>':'—')+'</td></tr>').join(''):
  '<tr><td colspan="4" class="muted">Todavía no hay profesores. Crea el primero para comenzar.</td></tr>';
 root.innerHTML='<div class="admin-heading"><div><p class="eyebrow">Chessy · Gobierno de accesos</p><h1>Códigos de profesores</h1>'+
  '<p class="muted">Emite códigos individuales, define vencimiento y revoca accesos en cualquier momento.</p></div>'+
  '<button class="btn quiet" id="admin-logout">Cerrar sesión</button></div>'+
  '<div class="admin-grid"><section class="card"><h2>Profesores autorizados</h2>'+
  '<div class="table-container"><table class="admin-table"><thead><tr><th>Profesor</th><th>Estado</th><th>Vence</th><th>Acciones</th></tr></thead><tbody>'+
  rows+'</tbody></table></div><p class="notice">Los códigos nuevos se muestran solo una vez. La revocación cierra también sus clases abiertas.</p></section>'+
  '<section class="card"><h2>Crear profesor</h2><form id="new-teacher" class="admin-form">'+
  '<div class="field"><label for="teacher-name">Nombre del profesor</label><input id="teacher-name" type="text" required minlength="2" maxlength="64" placeholder="Ej. Profesor de ajedrez"></div>'+
  '<div class="field"><label for="teacher-days">Vigencia del código</label><select id="teacher-days">'+
  '<option value="7">7 días</option><option value="30" selected>30 días</option><option value="90">90 días</option></select></div>'+
  '<button type="submit" class="btn primary">Generar código de profesor</button></form>'+
  '<div id="one-time-code"></div></section>'+
  '<section class="card admin-wide"><h2>Código compartido original</h2>'+
  '<div class="admin-legacy"><p class="muted">Este código existe desde el primer piloto. Puedes desactivarlo después de crear un código individual para cada profesor.</p>'+
  '<button id="legacy-toggle" class="btn '+(data.legacyEnabled?'danger':'secondary')+'">'+
  (data.legacyEnabled?'Desactivar código antiguo':'Reactivar código antiguo')+'</button></div></section>'+
  '<section class="card admin-wide"><h2>Actividad de accesos</h2>'+
  '<ul class="admin-audit">'+(data.events||[]).slice().reverse().slice(0,25).map(e=>'<li>'+
  '<strong>'+escapeHTML(e.action)+'</strong><span>'+fmt(e.at)+'</span></li>').join('')+'</ul></section></div>'+
  '<div id="admin-notice" role="alert" class="hidden"></div>';
 document.querySelector('#new-teacher').addEventListener('submit',async ev=>{
  ev.preventDefault();const button=ev.currentTarget.querySelector('button');button.disabled=true;
  try{
   const name=document.querySelector('#teacher-name').value,days=Number(document.querySelector('#teacher-days').value);
   const out=await api('teachers/create',{name,days});
   freshCode=out.teacher.code;await dashboard();
   const el=document.querySelector('#one-time-code');
   el.className='admin-code-card';
   el.innerHTML='<strong>Código generado. Copia y entrégalo de forma privada:</strong><div id="generated-code" class="admin-code">'+
    escapeHTML(freshCode)+'</div><button type="button" id="copy-teacher-code" class="btn secondary">Copiar código</button>'+
    '<p class="notice">No podrás volver a consultar este código. Para cambiarlo, revoca y crea uno nuevo.</p>';
   document.querySelector('#copy-teacher-code').addEventListener('click',()=>navigator.clipboard.writeText(freshCode).then(()=>{
    announce('Código de profesor copiado.',true);
   }).catch(()=>announce('Selecciona el código y cópialo manualmente.')));
  }catch(e){announce(e.message);}
  finally{button.disabled=false;}
 });
 root.querySelectorAll('[data-revoke]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.revoke;
  if(!confirm('¿Revocar este código? El profesor perderá acceso y sus clases activas finalizarán.'))return;
  btn.disabled=true;
  try{await api('teachers/revoke',{teacherId:id});freshCode=null;await dashboard();announce('Código revocado y salas cerradas.',true);}
  catch(e){announce(e.message);btn.disabled=false;}
 }));
 document.querySelector('#legacy-toggle').addEventListener('click',async()=>{
  if(!confirm('¿Cambiar el estado del código compartido original? Podría cerrar clases activas.'))return;
  try{await api('legacy',{enabled:!data.legacyEnabled});freshCode=null;await dashboard();announce('Configuración actualizada.',true);}
  catch(e){announce(e.message);}
 });
 document.querySelector('#admin-logout').addEventListener('click',async()=>{
  try{await api('logout',{});}finally{freshCode=null;login();}
 });
}
(async()=>{try{const r=await api('me');if(r.role==='admin')await dashboard();else login();}
catch{login();}})();
