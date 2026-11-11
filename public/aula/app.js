/**
 * Chessy Aula Directa: 1 coach + 1 adult learner, synchronized chess and P2P media.
 * Private invitation is in the URL fragment; it is exchanged before clearing the URL.
 */
const root=document.querySelector('#app');
const apiBase='/aula/api/';
let role=null, room=null, socket=null, selected=null, flipped=false, puzzles=[], reconnectTimer=null;
let legalSquares=[],dragStart=null,recentlyDropped=null,editorTool=null,marking=false,markSource=null;
let rtc=null, audioSender=null, videoSender=null, remoteStream=null, micTrack=null, cameraTrack=null, screenTrack=null;
let offerStarted=false, candidates=[];
let errorTimeout=null;
const glyph={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const labels={K:'rey',Q:'dama',R:'torre',B:'alfil',N:'caballo',P:'peón'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(path,method='GET',body){
  const res=await fetch(apiBase+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},
    body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const result=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(result.error||'El aula no está disponible');
  return result;
}
function feedback(message,ok=false){
  const el=document.querySelector('#alert');
  if(!el)return;
  el.textContent=message;el.className='feedback'+(ok?' good-feedback':'');
  if(errorTimeout)clearTimeout(errorTimeout);
  errorTimeout=setTimeout(()=>{el.className='hidden';el.textContent='';},6500);
}
function bind(id,event,cb){document.getElementById(id)?.addEventListener(event,cb);}
function setBusy(button,yes){if(button)button.disabled=!!yes;}
function landing(){
  root.innerHTML='<section class="landing"><p class="eyebrow">Chessy · Aula 1 a 1</p>'+
    '<h1>Un profesor, un alumno y el tablero.</h1>'+
    '<p class="muted">Clases de ajedrez con ejercicios sincronizados, cámara, micrófono y pantalla compartida. Sin instalaciones ni servicios de pago.</p>'+
    '<div class="card"><h2>Entrar como profesor</h2><p class="muted small">Acceso privado del piloto. Tu código de profesor lo proporciona el administrador de Chessy.</p>'+
    '<form id="teacher-login"><div class="field"><label for="teacher-code">Código de profesor</label><input id="teacher-code" type="password" autocomplete="off" required minlength="16" placeholder="Introduce tu código"></div>'+
    '<button class="btn primary" type="submit">Abrir mi aula</button></form><div id="alert" class="hidden" role="alert"></div></div>'+
    '<p class="notice">Aula privada para pruebas con adultos. Cámara y micrófono apagados al entrar. No grabamos las llamadas ni almacenamos datos personales.</p>'+ 
    '<p class="notice"><a href="/aula/admin.html">Administrar profesores y códigos de acceso</a></p></section>';
  bind('teacher-login','submit',async ev=>{
    ev.preventDefault();
    const button=ev.currentTarget.querySelector('button');
    setBusy(button,true);
    try{
      await request('login','POST',{code:document.querySelector('#teacher-code').value});
      role='teacher';await teacherHome();
    }catch(e){feedback(e.message==='access-denied'?'Código de profesor incorrecto.':e.message);}
    finally{setBusy(button,false);}
  });
}
function guestLanding(id,inviteToken){
  root.innerHTML='<section class="landing"><p class="eyebrow">Invitación privada</p><h1>Entra a tu clase de ajedrez.</h1>'+
    '<p class="muted">El profesor te espera en un tablero compartido. Solo se permite un alumno adulto por sala.</p>'+
    '<div class="card"><h2>Unirse como alumno</h2><form id="join-form">'+
    '<label class="checkline"><input id="adult" type="checkbox" required><span>Confirmo que soy mayor de 18 años y acepto participar en esta prueba privada sin grabaciones.</span></label>'+
    '<button class="btn primary" type="submit">Entrar al aula</button></form><div id="alert" class="hidden" role="alert"></div></div>'+
    '<p class="notice">Tu cámara y micrófono estarán apagados hasta que decidas activarlos.</p></section>';
  bind('join-form','submit',async ev=>{
    ev.preventDefault();
    const button=ev.currentTarget.querySelector('button');setBusy(button,true);
    try{
      room=await request('join','POST',{roomId:id,inviteToken,adult:document.querySelector('#adult').checked});
      role='student';sessionStorage.setItem('chessy-aula-room',id);
      history.replaceState(null,'','/aula/');
      await openRoom();
    }catch(e){
      const message=e.message==='seat-occupied'?'Esta sala ya tiene un alumno. Pide al profesor una nueva invitación.':
        e.message==='invite-invalid'?'La invitación venció o ya no existe.':e.message;
      feedback(message);
    }finally{setBusy(button,false);}
  });
}
async function teacherHome(){
  const saved=sessionStorage.getItem('chessy-aula-room');
  if(saved){
    try{room=await request('room?id='+encodeURIComponent(saved));role='teacher';await openRoom();return;}
    catch{sessionStorage.removeItem('chessy-aula-room');}
  }
  root.innerHTML='<section class="landing"><p class="eyebrow">Acceso del profesor</p><h1>Prepara tu próxima clase.</h1>'+
    '<p class="muted">Crea un aula privada para un alumno y compártele la invitación. Podrán mover piezas, resolver ejercicios y hablar en tiempo real.</p>'+
    '<div class="card"><h2>Nueva aula en vivo</h2><form id="create-form"><div class="field"><label for="class-title">Nombre de la clase</label>'+
    '<input type="text" id="class-title" placeholder="Primera clase de ajedrez" value="Clase de ajedrez 1:1" minlength="3" maxlength="70" required></div>'+
    '<button class="btn primary" type="submit">Crear aula e invitar al alumno</button></form><div id="alert" class="hidden" role="alert"></div></div>'+
    '<section id="teacher-room-list" class="card soft teacher-room-list" hidden></section>'+ 
    '<p class="notice">Las salas duran hasta 2 horas y son temporales. Sin menores, grabaciones ni facturación.</p>'+ 
    '<p class="notice"><a href="/aula/admin.html">Administrar profesores y códigos de acceso</a></p></section>';
  bind('create-form','submit',async ev=>{
    ev.preventDefault();const button=ev.currentTarget.querySelector('button');setBusy(button,true);
    try{
      room=await request('create','POST',{title:document.querySelector('#class-title').value});
      role='teacher';sessionStorage.setItem('chessy-aula-room',room.id);await openRoom();
    }catch(e){feedback(e.message);}finally{setBusy(button,false);}
  });
  // Room ownership is bound to the teacher identity, not to a browser session.
  try{
    const data=await request('my-rooms');
    const active=data.rooms||[],container=document.querySelector('#teacher-room-list');
    if(container && active.length){
      container.hidden=false;
      container.innerHTML='<h2>Mis aulas activas</h2>'+
        active.map(item=>'<div class="existing-room"><div><strong>'+esc(item.title)+'</strong>'+
          '<p class="muted small">'+(item.present.student?'Alumno conectado':'Esperando alumno')+'</p></div>'+
          '<button class="btn secondary" type="button" data-open-room="'+esc(item.id)+'">Reanudar</button></div>').join('');
      container.querySelectorAll('[data-open-room]').forEach(btn=>btn.addEventListener('click',async()=>{
        btn.disabled=true;
        try{
          room=await request('room?id='+encodeURIComponent(btn.dataset.openRoom));
          sessionStorage.setItem('chessy-aula-room',room.id);await openRoom();
        }catch(e){feedback(e.message);btn.disabled=false;}
      }));
    }
  }catch{}
}
const htmlRoom=()=>{
  const isTeacher=role==='teacher';
  const invite=isTeacher?new URL(room.invite||'/aula/',location.origin).href:'';
  return '<div class="topline"><div><p class="eyebrow">Chessy · Aula compartida</p><h1 id="class-title">'+esc(room.title)+'</h1></div>'+
    '<div class="button-row"><span class="tag" id="seat-status">Esperando…</span>'+
    (isTeacher?'<button id="end-room" class="btn danger" type="button">Terminar clase</button>':'<span class="tag">Alumno</span>')+'</div></div>'+
    '<div class="room-layout"><div class="card board-panel"><div class="board-heading"><div><h2>Tablero interactivo</h2>'+
    '<span class="muted" id="board-status">Movimientos sincronizados</span></div><div class="button-row">'+
    '<button id="flip-board" class="btn quiet small" type="button">Voltear</button>'+
    (isTeacher?'<button id="undo-move" class="btn secondary small" type="button">Deshacer</button>'+
      '<button id="redo-move" class="btn secondary small" type="button">Rehacer</button>':'')+
    '</div></div>'+
    '<div id="board" class="chessboard" role="group" aria-label="Tablero de ajedrez sincronizado"></div>'+
    (isTeacher?'<div id="editor-panel" class="editor-panel" hidden>'+
      '<p class="muted small">Preparar posición: elige una pieza y toca una casilla; para moverla, toca origen y destino. Los movimientos son libres mientras editas.</p>'+
      '<div id="piece-palette" class="piece-palette" role="group" aria-label="Piezas para preparar posición">'+
      Object.entries(glyph).map(([piece,symbol])=>'<button type="button" class="palette-piece" data-piece="'+piece+'" aria-label="'+
        esc(labels[piece.toUpperCase()]+' '+(piece===piece.toUpperCase()?'blanco':'negro'))+'">'+symbol+'</button>').join('')+
      '<button type="button" class="palette-piece palette-remove" data-piece="remove" aria-label="Borrar pieza">×</button></div>'+
      '<div class="button-row editor-actions"><button id="clear-position" class="btn quiet small" type="button">Vaciar tablero</button>'+
      '<label for="board-turn" class="turn-label">Juegan <select id="board-turn"><option value="w">Blancas</option><option value="b">Negras</option></select></label></div>'+
      '<p id="editor-help" role="status" class="muted small">Al terminar debe haber un rey blanco y uno negro.</p></div>':'')+
    '<div class="board-meta"><span id="move-count">Posición inicial</span><span id="exercise-status" class="text-gold">Tablero libre</span></div>'+
    '<div class="board-meta"><span id="turn-status">Turno de las blancas</span><span id="board-permission">Ambos pueden mover</span></div>'+
    '<div id="move-history" class="move-history" role="log" aria-label="Historial de jugadas">Sin jugadas todavía</div>'+
    '<p id="board-feedback" class="muted small" style="margin:12px 0 0" aria-live="polite">Haz clic en una pieza y después en la casilla de destino.</p></div>'+
    '<aside class="side"><section class="card media-card"><h2>Videoclase 1 a 1</h2><div class="videos">'+
    '<div id="local-wrap" class="video-wrap"><span class="fallback">♙</span><video id="local-video" autoplay muted playsinline></video><span class="video-label">Tú</span></div>'+
    '<div id="remote-wrap" class="video-wrap"><span class="fallback">♟</span><video id="remote-video" autoplay playsinline></video><span class="video-label">'+(isTeacher?'Alumno':'Profesor')+'</span></div></div>'+
    '<div class="media-buttons"><button id="toggle-mic" class="btn secondary" type="button" aria-pressed="false">Micrófono</button>'+
    '<button id="toggle-camera" class="btn secondary" type="button" aria-pressed="false">Cámara</button>'+
    (isTeacher?'<button id="toggle-screen" class="btn secondary" type="button" aria-pressed="false">Pantalla</button>':'<button id="resume-audio" class="btn secondary" type="button">Escuchar</button>')+'</div>'+
    '<div class="status-row"><span id="signal-dot" class="dot"></span><span id="call-status" role="status">Esperando conexión…</span></div>'+
    '<p class="notice">WebRTC directo y privado; el navegador pedirá permisos cuando actives tus dispositivos. No hay grabación.</p></section>'+
    (isTeacher?'<section class="card"><h2>Invitar al alumno</h2><p class="muted small">Envía este enlace solo a un adulto. El alumno entra sin crear cuenta.</p>'+
      '<div class="room-invite"><input id="invite-url" type="text" readonly value="'+esc(invite)+'" aria-label="Enlace de invitación del alumno">'+
      '<button id="copy-invite" class="btn secondary" type="button">Copiar</button></div>'+
      '<div class="button-row invite-actions"><button id="rotate-invite" class="btn quiet small" type="button">Regenerar enlace</button>'+
      '<button id="remove-learner" class="btn danger small" type="button">Retirar alumno</button></div>'+
      '<p class="notice">Un profesor + un alumno por sala. Recomendado: Chrome, Edge o Safari actual.</p></section>':'')+
    (isTeacher?'<section class="card board-tools"><h2>Control del tablero</h2>'+
      '<div class="button-row teacher-workbench">'+
      '<button id="toggle-editor" class="btn primary" type="button">Tablero libre · editar</button>'+
      '<button id="annotation-mode" class="btn secondary" type="button" aria-pressed="false">Dibujar flechas</button>'+
      '<button id="clear-annotations" class="btn quiet" type="button">Borrar marcas</button></div>'+
      '<label for="board-controller">Quién puede mover las piezas</label>'+
      '<select id="board-controller"><option value="both">Profesor y alumno</option>'+
      '<option value="teacher">Solo profesor</option><option value="student">Solo alumno</option>'+
      '<option value="student-white">Alumno blancas · profesor negras</option>'+
      '<option value="student-black">Alumno negras · profesor blancas</option></select>'+
      '<div class="field"><label for="fen-editor">Cargar posición (FEN)</label>'+
      '<input id="fen-editor" type="text" placeholder="Pega una posición FEN" maxlength="110" spellcheck="false"></div>'+
      '<div class="button-row"><button id="apply-fen" class="btn secondary" type="button">Cargar FEN</button>'+
      '<button id="copy-fen" class="btn quiet" type="button">Copiar FEN actual</button></div>'+
      '<p class="notice">Arrastra las piezas o pulsa la casilla de origen y después la de destino. Las jugadas ilegales se rechazan automáticamente.</p></section>':'')+
    '<section class="card exercise-card"><h2>Ejercicios con el profesor</h2>'+
    (isTeacher?'<label for="puzzle-picker">Elegir ejercicio</label><select id="puzzle-picker" aria-label="Elegir ejercicio"><option value="rook-file">Torre y columnas</option></select>'+
      '<div class="button-row"><button id="assign-exercise" class="btn primary" type="button">Enviar ejercicio</button>'+
      '<button id="next-exercise" class="btn secondary" type="button">Siguiente</button>'+
      '<button id="reset-board" class="btn quiet" type="button">Nueva partida</button>'+
      '<button id="show-hint" class="btn secondary" type="button">Mostrar pista</button></div>':
      '<p class="muted small">Tu profesor puede asignarte ejercicios. Mueve las piezas para resolverlos.</p>')+
    '<div id="assignment-badge" class="assignment-badge">Sin ejercicio asignado.</div></section>'+
    '<section class="card"><h2>Mensajes rápidos</h2><div id="messages" class="chat-messages" role="log" aria-label="Mensajes del aula"></div>'+
    '<form id="chat-form" class="chat-entry"><input id="chat-input" type="text" maxlength="200" placeholder="Escribe un mensaje…" aria-label="Mensaje" autocomplete="off">'+
    '<button class="btn secondary" type="submit">Enviar</button></form></section></aside></div>'+
    '<div id="alert" class="hidden" role="alert" style="margin-top:16px"></div>';
};
function renderBoard(){
  if(!room)return;
  const board=document.querySelector('#board');if(!board)return;
  const position=room.boardMode==='setup'&&room.editor?room.editor.placement:room.fen.split(' ')[0], ranks=position.split('/'),map={};
  for(let i=0;i<8;i++){
    let file=0;
    for(const ch of ranks[i]){
      if(/[1-8]/.test(ch))file+=Number(ch);
      else{map['abcdefgh'[file]+(8-i)]=ch;file++;}
    }
  }
  const rows=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
  const cols=flipped?[...'hgfedcba']:[...'abcdefgh'];
  const list=[];
  for(const rank of rows)for(const [colIndex,file]of cols.entries()){
    const sq=file+rank, piece=map[sq],dark=((rank+'abcdefgh'.indexOf(file))%2===1);
    const readable=piece?labels[piece.toUpperCase()]+(piece===piece.toUpperCase()?' blanco':' negro'):'vacía';
    const coord=(!flipped?rank===1:rank===8)?file:'';
    list.push('<button type="button" draggable="'+(piece?'true':'false')+'" class="square'+(dark?' dark':'')+(selected===sq?' selected':'')+
      (legalSquares.includes(sq)?' legal':'')+
      (room.lastMove && (room.lastMove.from===sq||room.lastMove.to===sq)?' last-move':'')+
      (room.hint && (room.hint.from===sq||room.hint.to===sq)?' hint-square':'')+
      '" data-square="'+sq+'" data-piece="'+(piece||'')+'" aria-label="'+sq+': '+readable+'">'+
      (piece?'<span class="'+(piece===piece.toUpperCase()?'piece-white':'piece-black')+'">'+glyph[piece]+'</span>':'')+
      (coord?'<span class="coord" aria-hidden="true">'+coord+'</span>':'')+'</button>');
  }
  board.innerHTML=list.join('');
  renderAnnotations();
}
function renderAnnotations(){
  const board=document.querySelector('#board');
  if(!board)return;
  let layer=board.querySelector('.annotation-layer');
  if(!layer){
    layer=document.createElementNS('http://www.w3.org/2000/svg','svg');
    layer.setAttribute('class','annotation-layer');
    layer.setAttribute('viewBox','0 0 800 800');
    layer.setAttribute('aria-hidden','true');
    board.appendChild(layer);
  }
  const center=square=>{
    if(!/^[a-h][1-8]$/.test(square))return null;
    const col='abcdefgh'.indexOf(square[0]),rank=Number(square[1]);
    return [(flipped?7-col:col)*100+50,(flipped?rank-1:8-rank)*100+50];
  };
  const squareMarks=(room?.annotations?.squares||[]).flatMap(square=>{
    const xy=center(square);return xy?['<circle cx="'+xy[0]+'" cy="'+xy[1]+
      '" r="39" fill="#f5d55b" fill-opacity=".23" stroke="#f2cd54" stroke-width="7"/>']:[];
  });
  const arrows=(room?.annotations?.arrows||[]).flatMap(({from,to})=>{
    const a=center(from),b=center(to);
    if(!a||!b)return [];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<1)return [];
    const x=b[0]-dx/length*28,y=b[1]-dy/length*28;
    return ['<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+x+'" y2="'+y+
      '" stroke="#efb947" stroke-opacity=".8" stroke-width="16" stroke-linecap="round" marker-end="url(#chessy-arrow)"/>'];
  });
  layer.innerHTML='<defs><marker id="chessy-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#efb947"/></marker></defs>'+
    [...squareMarks,...arrows].join('');
}
function updateRoom(info){
  const wasPresent=room?.present?.student;
  const previous=room;
  const changed=!document.querySelector('#board .square')||
    previous?.revision!==info.revision||
    previous?.fen!==info.fen||
    previous?.boardMode!==info.boardMode||
    previous?.editor?.placement!==info.editor?.placement||
    previous?.hint?.from!==info.hint?.from||previous?.hint?.to!==info.hint?.to;
  room={...room,...info};
  if(changed){selected=null;legalSquares=[];markSource=null;renderBoard();}
  else renderAnnotations();
  const present=room.present||{teacher:false,student:false};
  const pill=document.querySelector('#seat-status');
  if(pill)pill.textContent=present.teacher&&present.student?'Profesor y alumno conectados':
    (role==='teacher'?'Esperando al alumno':'Esperando al profesor');
  const count=document.querySelector('#move-count');
  if(count)count.textContent=room.history?.length?'Jugadas: '+room.history.length:'Tablero listo para mover';
  const hist=document.querySelector('#move-history');
  if(hist)hist.textContent=room.history?.length?room.history.join('  ·  '):'Sin jugadas todavía';
  const turn=document.querySelector('#turn-status');
  if(turn)turn.textContent=(room.boardMode==='setup'?room.editor?.turn:room.fen.split(' ')[1])==='b'?
    'Turno de las negras':'Turno de las blancas';
  const permissions=document.querySelector('#board-permission');
  if(permissions)permissions.textContent=room.boardMode==='setup'?'El profesor prepara el tablero':
    room.control==='teacher'?'Solo profesor mueve':
    room.control==='student'?'Solo alumno mueve':
    room.control==='student-white'?'Alumno blancas · profesor negras':
    room.control==='student-black'?'Alumno negras · profesor blancas':'Ambos pueden mover';
  const control=document.querySelector('#board-controller');
  if(control && control.value!==room.control)control.value=room.control||'both';
  const undo=document.querySelector('#undo-move');
  if(undo)undo.disabled=!(room.undoCount>0);
  const redo=document.querySelector('#redo-move');
  if(redo)redo.disabled=!(room.redoCount>0);
  const setup=room.boardMode==='setup';
  const editorPanel=document.querySelector('#editor-panel');
  if(editorPanel)editorPanel.hidden=!setup;
  const toggleEditor=document.querySelector('#toggle-editor');
  if(toggleEditor)toggleEditor.textContent=setup?'Finalizar preparación':'Tablero libre · editar';
  const boardStatus=document.querySelector('#board-status');
  if(boardStatus)boardStatus.textContent=setup?'Preparando posición · movimientos libres':'Jugadas legales · posición sincronizada';
  const turnEditor=document.querySelector('#board-turn');
  if(turnEditor&&setup)turnEditor.value=room.editor?.turn||'w';
  const controller=document.querySelector('#board-controller');
  if(controller)controller.disabled=setup;
  const palette=document.querySelector('#piece-palette');
  if(palette)palette.querySelectorAll('[data-piece]').forEach(button=>{
    button.setAttribute('aria-pressed',String(setup&&editorTool===button.dataset.piece));
  });
  const ex=document.querySelector('#exercise-status'),badge=document.querySelector('#assignment-badge');
  if(ex&&badge){
    const e=room.exercise;
    ex.textContent=e?(e.status==='completed'?'Ejercicio resuelto':'Ejercicio en progreso'):'Tablero libre';
    badge.textContent=e?e.id.replace(/-/g,' ')+' · '+(e.status==='completed'?'Resuelto':'Intentos: '+e.attempts):'Sin ejercicio asignado.';
  }
  const messages=document.querySelector('#messages');
  if(messages){
    messages.replaceChildren();
    for(const m of room.chat||[]){
      const p=document.createElement('p'),b=document.createElement('b');
      b.textContent=m.role==='teacher'?'Profesor: ':'Alumno: ';
      p.appendChild(b);p.appendChild(document.createTextNode(m.text));messages.appendChild(p);
    }
    messages.scrollTop=messages.scrollHeight;
  }
  if(info.feedback){
    const label={retry:'Esa no es la jugada del ejercicio. Intenta de nuevo.',
      completed:'¡Ejercicio resuelto! El profesor puede enviar el siguiente.',
      correct:'¡Bien! Continúa el ejercicio.', 'exercise-assigned':'El profesor asignó un ejercicio.',
      move:'Movimiento sincronizado.', 'board-reset':'El tablero está listo.',
      'control-updated':'Permisos del tablero actualizados.',
      'move-undone':'Se deshizo la última jugada.',
      'position-updated':'Nueva posición cargada para ambos.',
      'hint-shown':'Pista visible en el tablero.',
      'move-redone':'Cambio restaurado.',
      'editor-started':'Modo libre: coloca y mueve piezas sin restricciones.',
      'editor-updated':'Posición actualizada para ambos.',
      'editor-finished':'Preparación terminada. Ahora se aplican las reglas legales.',
      'annotation-updated':'Anotación compartida.'};
    const status=document.querySelector('#board-feedback');if(status)status.textContent=label[info.feedback]||'';
  }
  if(room.status==='closed'){resetPeer();socket?.close();root.innerHTML='<section class="landing"><h1>La clase ha terminado.</h1><p class="muted">El profesor cerró el aula. Puedes volver a Chessy.</p><a class="btn primary" href="/#/classes">Volver a Chessy</a></section>';return;}
  if(role==='teacher' && present.student && !wasPresent)void beginOffer();
  if(!present.student && wasPresent && role==='teacher'){resetPeer();setCallStatus('El alumno se desconectó.');}
  if(role==='student' && !present.teacher){resetPeer();setCallStatus('Esperando al profesor…');}
}
function send(obj){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj));else feedback('La sala perdió conexión. Reconectando…');}
function sendMove(from,to){
  send({type:'move',from,to,revision:room.revision,
    ...(/[a-h][27]$/.test(from)&&/[a-h][18]$/.test(to)?{promotion:'q'}:{})});
}
function mayMove(){
  if(!room||room.boardMode==='setup')return false;
  if(room.exercise)return room.exercise.status==='active' && role==='student';
  const turn=room.fen.split(' ')[1];
  if(room.control==='both')return true;
  if(room.control==='student-white')return role===(turn==='w'?'student':'teacher');
  if(room.control==='student-black')return role===(turn==='b'?'student':'teacher');
  return room.control===role;
}
function pieceAt(square){
  return document.querySelector('#board [data-square="'+square+'"]')?.dataset.piece||'';
}
function sendBoardMove(from,to){
  if(room.boardMode==='setup'){
    if(role!=='teacher')return feedback('Solo el profesor puede preparar posiciones.');
    send({type:'edit',action:'move',from,square:to,revision:room.revision});
    return;
  }
  sendMove(from,to);
}
function selectSquare(square){
  if(room.boardMode==='setup'){
    if(role!=='teacher'){feedback('Solo el profesor puede preparar posiciones.');return;}
    selected=square;legalSquares=[];renderBoard();return;
  }
  if(!mayMove()){feedback('El profesor controla quién puede mover las piezas.');return;}
  const piece=pieceAt(square);
  const turn=room.fen.split(' ')[1];
  if(!piece||(piece===piece.toUpperCase())!==(turn==='w')){
    feedback('Elige una pieza del bando al que le toca mover.');return;
  }
  selected=square;legalSquares=[];renderBoard();
  send({type:'legal',square});
}
function clickBoard(ev){
  const square=ev.target.closest('button[data-square]');if(!square||!room)return;
  const target=square.dataset.square;
  if(recentlyDropped){
    const ignore=recentlyDropped.square===target && Date.now()<recentlyDropped.until;
    recentlyDropped=null;if(ignore)return;
  }
  if(marking&&role==='teacher'){
    if(!markSource){markSource=target;selected=target;renderBoard();return;}
    const from=markSource;markSource=null;selected=null;renderBoard();
    send(from===target?{type:'annotate',action:'square',square:target,revision:room.revision}:
      {type:'annotate',action:'arrow',from,to:target,revision:room.revision});
    return;
  }
  if(room.boardMode==='setup'){
    if(role!=='teacher')return feedback('Solo el profesor puede preparar posiciones.');
    if(editorTool){
      send(editorTool==='remove'?{type:'edit',action:'remove',square:target,revision:room.revision}:
        {type:'edit',action:'place',square:target,piece:editorTool,revision:room.revision});
      return;
    }
    if(!selected){
      if(!pieceAt(target)){feedback('Elige una pieza o selecciona una ya colocada.');return;}
      selectSquare(target);return;
    }
    if(selected===target){selected=null;renderBoard();return;}
    const from=selected;selected=null;renderBoard();sendBoardMove(from,target);return;
  }
  if(!selected){selectSquare(target);return;}
  if(selected===target){selected=null;legalSquares=[];renderBoard();return;}
  // As in Chess.com/Lichess, clicking another piece of the same side
  // switches the selection instead of attempting an illegal capture.
  const current=pieceAt(target),turn=room.fen.split(' ')[1];
  if(current&&(current===current.toUpperCase())===(turn==='w')){
    selectSquare(target);return;
  }
  const from=selected;selected=null;legalSquares=[];renderBoard();sendBoardMove(from,target);
}
function dragStartBoard(ev){
  const square=ev.target.closest('button[data-square]');
  const allowed=room?.boardMode==='setup'?role==='teacher':mayMove();
  const piece=square?pieceAt(square.dataset.square):'';
  const correctTurn=room?.boardMode==='setup'||(piece && (piece===piece.toUpperCase())===(room.fen.split(' ')[1]==='w'));
  if(!square||!piece||!allowed||!correctTurn||marking){ev.preventDefault();return;}
  ev.dataTransfer.effectAllowed='move';
  ev.dataTransfer.setData('text/plain',square.dataset.square);
  // Preserve this element until drop: rebuilding here breaks Chromium DnD.
  selected=square.dataset.square;legalSquares=[];
}
function dropBoard(ev){
  ev.preventDefault();
  const square=ev.target.closest('button[data-square]');
  const from=ev.dataTransfer?.getData('text/plain');
  if(!square || !/^[a-h][1-8]$/.test(from||''))return;
  selected=null;legalSquares=[];renderBoard();
  recentlyDropped={square:square.dataset.square,until:Date.now()+250};
  sendBoardMove(from,square.dataset.square);
}
function pointerStartBoard(ev){
  if(ev.pointerType==='mouse'||marking)return;
  const square=ev.target.closest('button[data-square]');
  if(!square)return;
  const allowed=room?.boardMode==='setup'?role==='teacher':mayMove();
  const piece=pieceAt(square.dataset.square);
  if(!allowed||!piece||(room?.boardMode!=='setup'&&
    (piece===piece.toUpperCase())!==(room.fen.split(' ')[1]==='w')))return;
  dragStart={square:square.dataset.square,x:ev.clientX,y:ev.clientY};
  square.setPointerCapture?.(ev.pointerId);
}
function pointerEndBoard(ev){
  if(!dragStart||ev.pointerType==='mouse')return;
  const origin=dragStart;dragStart=null;
  if(Math.hypot(ev.clientX-origin.x,ev.clientY-origin.y)<14)return;
  const square=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('button[data-square]');
  if(!square||square.dataset.square===origin.square)return;
  selected=null;legalSquares=[];renderBoard();
  recentlyDropped={square:square.dataset.square,until:Date.now()+350};
  sendBoardMove(origin.square,square.dataset.square);
}
async function openRoom(){
  root.innerHTML=htmlRoom();
  bind('board','click',clickBoard);
  bind('board','dragstart',dragStartBoard);
  bind('board','dragover',ev=>ev.preventDefault());
  bind('board','drop',dropBoard);
  bind('board','pointerdown',pointerStartBoard);
  bind('board','pointerup',pointerEndBoard);
  bind('flip-board','click',()=>{flipped=!flipped;renderBoard();});
  bind('undo-move','click',()=>send({type:'undo'}));
  bind('redo-move','click',()=>send({type:'redo'}));
  bind('toggle-editor','click',()=>{
    const entering=room.boardMode!=='setup';
    if(entering){
      editorTool=null;marking=false;markSource=null;
      const marker=document.querySelector('#annotation-mode');
      if(marker){marker.setAttribute('aria-pressed','false');marker.textContent='Dibujar flechas';}
    }
    send({type:'mode',value:entering?'setup':'play',revision:room.revision});
  });
  bind('clear-position','click',()=>{
    if(room.boardMode==='setup')send({type:'edit',action:'clear',revision:room.revision});
  });
  bind('board-turn','change',ev=>{
    if(room.boardMode==='setup')send({type:'edit',action:'turn',turn:ev.target.value,revision:room.revision});
  });
  bind('piece-palette','click',ev=>{
    const button=ev.target.closest('[data-piece]');
    if(!button)return;
    editorTool=editorTool===button.dataset.piece?null:button.dataset.piece;
    selected=null;renderBoard();
    document.querySelectorAll('#piece-palette [data-piece]').forEach(item=>{
      item.setAttribute('aria-pressed',String(editorTool===item.dataset.piece));
    });
  });
  bind('annotation-mode','click',ev=>{
    marking=!marking;markSource=null;selected=null;renderBoard();
    ev.currentTarget.setAttribute('aria-pressed',String(marking));
    ev.currentTarget.textContent=marking?'Dejar de dibujar':'Dibujar flechas';
    const help=document.querySelector('#board-feedback');
    if(help&&marking)help.textContent='Toca dos veces la misma casilla para resaltarla, o dos distintas para dibujar una flecha.';
  });
  bind('clear-annotations','click',()=>send({type:'annotate',action:'clear',revision:room.revision}));
  bind('board-controller','change',ev=>send({type:'control',value:ev.target.value}));
  bind('apply-fen','click',()=>{
    const fen=document.querySelector('#fen-editor')?.value?.trim();
    if(fen)send({type:'setup',fen});else feedback('Pega una posición FEN válida.');
  });
  bind('copy-fen','click',async()=>{
    try{await navigator.clipboard.writeText(room.fen);feedback('Posición FEN copiada.',true);}
    catch{feedback('No se pudo copiar la posición.');}
  });
  bind('show-hint','click',()=>send({type:'hint'}));
  bind('chat-form','submit',ev=>{
    ev.preventDefault();const input=document.querySelector('#chat-input');
    const text=input.value.trim();if(text)send({type:'chat',text});input.value='';
  });
  bind('copy-invite','click',async()=>{
    const el=document.querySelector('#invite-url');
    try{await navigator.clipboard.writeText(el.value);feedback('Enlace copiado. Envíalo a tu alumno.',true);}
    catch{el.select();document.execCommand('copy');feedback('Copia el enlace seleccionado.',true);}
  });
  bind('rotate-invite','click',async()=>{
    try{
      const out=await request('invite/rotate','POST',{roomId:room.id});
      room.invite=out.invite;document.querySelector('#invite-url').value=new URL(out.invite,location.origin).href;
      feedback('Enlace regenerado. El anterior ya no permite entrar.',true);
    }catch(e){feedback(e.message);}
  });
  bind('remove-learner','click',async()=>{
    if(!confirm('¿Retirar al alumno y cancelar su acceso a la clase?'))return;
    try{
      const out=await request('learner/remove','POST',{roomId:room.id});
      room.invite=out.invite;document.querySelector('#invite-url').value=new URL(out.invite,location.origin).href;
      feedback('Alumno retirado. Puedes compartir el nuevo enlace.',true);
    }catch(e){feedback(e.message);}
  });
  bind('assign-exercise','click',()=>send({type:'assign',id:document.querySelector('#puzzle-picker').value}));
  bind('next-exercise','click',()=>{
    const el=document.querySelector('#puzzle-picker');if(!el)return;
    el.selectedIndex=(el.selectedIndex+1)%el.options.length;
    send({type:'assign',id:el.value});
  });
  bind('reset-board','click',()=>send({type:'reset'}));
  bind('end-room','click',async()=>{
    if(!confirm('¿Terminar la clase para el profesor y el alumno?'))return;
    try{await request('close','POST',{roomId:room.id});}catch(e){feedback(e.message);}
  });
  bind('toggle-mic','click',()=>void toggleMic());
  bind('toggle-camera','click',()=>void toggleCamera());
  bind('toggle-screen','click',()=>void toggleScreen());
  bind('resume-audio','click',async()=>{try{await document.querySelector('#remote-video')?.play();feedback('Audio habilitado.',true);}catch{feedback('Pulsa el video para activar el audio.');}});
  try{
    const data=await request('puzzles');
    puzzles=data.puzzles||[];
    const picker=document.querySelector('#puzzle-picker');
    if(picker){picker.replaceChildren();
      for(const p of puzzles){
        const option=document.createElement('option');option.value=p.id;
        option.textContent=p.title+' · bloque '+p.block;picker.appendChild(option);
      }
    }
  }catch{}
  updateRoom(room);
  connectSocket();
}
function connectSocket(){
  if(!room || room.status==='closed')return;
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  const ws=new WebSocket(scheme+'//'+location.host+'/aula/ws?room='+encodeURIComponent(room.id));
  socket=ws;
  ws.addEventListener('open',()=>{setCallStatus('Conectado al tablero.');});
  ws.addEventListener('message',ev=>{
    let msg;try{msg=JSON.parse(ev.data);}catch{return;}
    if(msg.type==='state')updateRoom(msg);
    else if(msg.type==='legal' && selected===msg.from){
      legalSquares=Array.isArray(msg.moves)?msg.moves.filter(x=>/^[a-h][1-8]$/.test(x)):[];
      // Do not replace live square buttons while the next pointer/click is in flight.
      document.querySelectorAll('#board button[data-square]').forEach(button=>{
        button.classList.toggle('legal',legalSquares.includes(button.dataset.square));
      });
    }
    else if(msg.type==='signal')void handleSignal(msg);
    else if(msg.type==='error')feedback(msg.message||'No se puede completar la acción');
  });
  ws.addEventListener('close',ev=>{
    if(socket!==ws)return;
    if(ev.code===1008){
      resetPeer();room=null;
      root.innerHTML='<section class="landing"><h1>Acceso al aula revocado.</h1>'+
        '<p class="muted">El profesor cerró tu acceso o tu código venció.</p>'+
        '<a class="btn primary" href="/aula/">Volver al inicio</a></section>';
      return;
    }
    setCallStatus('Reconectando al aula…');
    if(reconnectTimer)clearTimeout(reconnectTimer);
    if(room?.status!=='closed')reconnectTimer=setTimeout(connectSocket,1900);
  });
  ws.addEventListener('error',()=>{setCallStatus('Problema de conexión al tablero.');});
}
function setCallStatus(value,online=false){
  const text=document.querySelector('#call-status');if(text)text.textContent=value;
  document.querySelector('#signal-dot')?.classList.toggle('online',online);
}
function updateLocalVideo(){
  const el=document.querySelector('#local-video'),wrap=document.querySelector('#local-wrap');
  if(!el)return;
  const tracks=[cameraTrack,micTrack].filter(x=>x&&x.readyState==='live');
  el.srcObject=tracks.length?new MediaStream(tracks):null;
  wrap?.classList.toggle('with-video',!!cameraTrack);
}
function resetPeer(){
  try{rtc?.close();}catch{}
  rtc=null;audioSender=null;videoSender=null;offerStarted=false;candidates=[];remoteStream=null;
  const video=document.querySelector('#remote-video');if(video)video.srcObject=null;
  document.querySelector('#remote-wrap')?.classList.remove('with-video');
}
function ensurePeer(){
  if(rtc)return rtc;
  const peer=new RTCPeerConnection({iceServers:[
    {urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}
  ]});
  rtc=peer;
  // The offerer allocates media lines. The answerer must reuse incoming
  // transceivers, otherwise Chrome negotiates sendonly/recvonly and only one
  // participant's camera actually reaches the other browser.
  if(role==='teacher'){
    audioSender=peer.addTransceiver('audio',{direction:'sendrecv'}).sender;
    videoSender=peer.addTransceiver('video',{direction:'sendrecv'}).sender;
    if(micTrack)void audioSender.replaceTrack(micTrack);
    if(cameraTrack||screenTrack)void videoSender.replaceTrack(screenTrack||cameraTrack);
  }
  peer.onicecandidate=ev=>{if(ev.candidate)send({type:'signal',kind:'candidate',payload:ev.candidate.toJSON()});};
  peer.ontrack=ev=>{
    if(!remoteStream)remoteStream=new MediaStream();
    if(!remoteStream.getTracks().some(x=>x.id===ev.track.id))remoteStream.addTrack(ev.track);
    const video=document.querySelector('#remote-video');
    if(video){
      video.srcObject=remoteStream;video.play().catch(()=>{});
      video.addEventListener('loadeddata',()=>document.querySelector('#remote-wrap')?.classList.add('with-video'),{once:true});
    }
    ev.track.onunmute=()=>document.querySelector('#remote-wrap')?.classList.toggle('with-video',ev.track.kind==='video');
  };
  peer.onconnectionstatechange=()=>{
    const state=peer.connectionState;
    if(state==='connected')setCallStatus('Videollamada conectada',true);
    else if(state==='failed')setCallStatus('No se pudo conectar el video. Revisa la red o permisos.');
    else if(state==='disconnected')setCallStatus('Reconectando videollamada…');
    else setCallStatus('Conectando audio y video…');
  };
  return peer;
}
async function beginOffer(force=false){
  if(role!=='teacher'||(!force&&offerStarted)||!room?.present?.student)return;
  const peer=ensurePeer();
  if(peer.signalingState!=='stable'){
    if(force)setTimeout(()=>void beginOffer(true),350);
    return;
  }
  offerStarted=true;
  try{
    const offer=await peer.createOffer();
    await peer.setLocalDescription(offer);
    send({type:'signal',kind:'description',payload:{type:offer.type,sdp:offer.sdp}});
  }catch(e){offerStarted=false;feedback('No se pudo iniciar la conexión de video.');}
}
async function handleSignal(msg){
  try{
    if(msg.kind==='renegotiate'){await beginOffer(true);return;}
    const peer=ensurePeer();
    if(msg.kind==='description'){
      await peer.setRemoteDescription(msg.payload);
      while(candidates.length)await peer.addIceCandidate(candidates.shift()).catch(()=>{});
      if(msg.payload.type==='offer'){
        const transceivers=peer.getTransceivers();
        audioSender=transceivers.find(x=>x.receiver.track.kind==='audio')?.sender||null;
        videoSender=transceivers.find(x=>x.receiver.track.kind==='video')?.sender||null;
        for(const t of transceivers)if(t.direction!=='stopped')t.direction='sendrecv';
        if(audioSender)await audioSender.replaceTrack(micTrack||null);
        if(videoSender)await videoSender.replaceTrack(screenTrack||cameraTrack||null);
        const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
        send({type:'signal',kind:'description',payload:{type:answer.type,sdp:answer.sdp}});
      }
    }else if(msg.kind==='candidate'){
      if(peer.remoteDescription)await peer.addIceCandidate(msg.payload).catch(()=>{});
      else candidates.push(msg.payload);
    }
  }catch(e){setCallStatus('No fue posible negociar la llamada.');}
}
async function notifyMediaChange(){
  if(!room?.present?.teacher || !room?.present?.student)return;
  if(role==='teacher')await beginOffer(true);
  else send({type:'signal',kind:'renegotiate'});
}
function setMediaButton(id,active){
  const el=document.querySelector('#'+id);if(!el)return;
  el.classList.toggle('active',!!active);
  el.setAttribute('aria-pressed',active?'true':'false');
  const names={'toggle-mic':['Micrófono','Silenciar'],'toggle-camera':['Cámara','Apagar cámara'],'toggle-screen':['Pantalla','Dejar de compartir']};
  el.textContent=names[id][active?1:0];
}
async function toggleMic(){
  try{
    if(micTrack){micTrack.stop();micTrack=null;await audioSender?.replaceTrack(null);}
    else{const stream=await navigator.mediaDevices.getUserMedia({audio:true});micTrack=stream.getAudioTracks()[0];ensurePeer();await audioSender?.replaceTrack(micTrack);}
    setMediaButton('toggle-mic',!!micTrack);updateLocalVideo();await notifyMediaChange();
  }catch(e){feedback('No fue posible activar el micrófono. Comprueba sus permisos.');}
}
async function toggleCamera(){
  try{
    if(cameraTrack){cameraTrack.stop();cameraTrack=null;if(!screenTrack)await videoSender?.replaceTrack(null);}
    else{const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:360},audio:false});
      cameraTrack=stream.getVideoTracks()[0];ensurePeer();if(!screenTrack)await videoSender?.replaceTrack(cameraTrack);}
    setMediaButton('toggle-camera',!!cameraTrack);updateLocalVideo();await notifyMediaChange();
  }catch(e){feedback('No fue posible activar la cámara. Comprueba sus permisos.');}
}
async function stopScreen(){
  if(screenTrack){screenTrack.stop();screenTrack=null;}
  try{await videoSender?.replaceTrack(cameraTrack||null);}catch{}
  setMediaButton('toggle-screen',false);await notifyMediaChange();
}
async function toggleScreen(){
  if(screenTrack){await stopScreen();return;}
  try{
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    screenTrack=stream.getVideoTracks()[0];screenTrack.addEventListener('ended',()=>void stopScreen(),{once:true});
    ensurePeer();await videoSender?.replaceTrack(screenTrack);setMediaButton('toggle-screen',true);await notifyMediaChange();
  }catch{feedback('Pantalla no compartida. Comprueba el permiso o selecciona una ventana.');}
}
function cleanup(){
  if(reconnectTimer)clearTimeout(reconnectTimer);
  for(const track of [micTrack,cameraTrack,screenTrack])track?.stop();
  socket?.close();resetPeer();
}
window.addEventListener('pagehide',cleanup);
(async()=>{
  try{
    const join=location.hash.match(/^#\/join\/([a-f0-9]{24})\/([A-Za-z0-9_-]{30,100})$/);
    if(join){guestLanding(join[1],join[2]);return;}
    const me=await request('me');
    if(me.role==='teacher'){role='teacher';await teacherHome();return;}
    if(me.role==='student' && me.roomId){
      role='student';room=await request('room?id='+encodeURIComponent(me.roomId));
      sessionStorage.setItem('chessy-aula-room',room.id);await openRoom();return;
    }
    landing();
  }catch(e){
    root.innerHTML='<section class="landing"><h1>El aula no está disponible.</h1>'+
      '<p class="muted">Verifica la conexión y vuelve a intentarlo.</p><button id="retry" class="btn primary">Reintentar</button></section>';
    bind('retry','click',()=>location.reload());
  }
})();
