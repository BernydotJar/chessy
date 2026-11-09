# Chessy — US-AULA-02 · Gobierno de profesores y tablero didáctico

**Estado de ingeniería:** implementación propuesta en rama de desarrollo, pendiente de merge, despliegue y aceptación del profesor. No equivale a funcionalidad publicada.

## User story

Como administrador de Chessy quiero crear y revocar códigos de profesores individualmente, observar su vigencia y revocar acceso a las aulas. Como profesor quiero controlar la sesión, invitar a un único alumno adulto, enseñar moviendo piezas en ambos tableros, deshacer, cargar una posición y guiar ejercicios sin perder cámara, audio ni pantalla compartida.

### Recorrido

1. **Administrador:** `/aula/admin.html` → ingresa su código administrador distinto del código de profesor → crea un profesor con nombre y vencimiento (7/30/90 días) → recibe el código **una sola vez** → lo envía privadamente → puede revocar el profesor o desactivar el código compartido original.
2. **Profesor:** `/aula/` → inicia sesión con su código → ve aulas activas propias entre sesiones del navegador, o crea una nueva → copia o regenera la invitación → retira a un alumno si es necesario.
3. **Alumno adulto:** abre invitación con secreto en fragmento URL → confirma mayoría de edad (autodeclarada, solo QA) → recibe sesión HttpOnly → interactúa en tiempo real hasta que lo retiran o el profesor termina la sala.
4. **Tablero:** selección de casilla o arrastrar piezas con ratón/táctil, destinos legales resaltados desde el servidor, última jugada, historial, vuelta del tablero, deshacer del profesor, control por rol (ambos, solo profesor o solo alumno), cargar FEN válido, reiniciar y asignar ejercicios; la solución del ejercicio permanece en el backend.
5. **Medios:** WebRTC P2P de 1:1 con cámara/micrófono opt-in y pantalla compartida del profesor, sin grabar medios. STUN no garantiza conectividad en NAT restrictivo; TURN es una mejora futura.

## Contrato y datos

- Archivo exclusivo del administrador: `CHESSY_AULA_ADMIN_SECRET_FILE` (0600) distinto de `CHESSY_AULA_TEACHER_SECRET_FILE` (0600). Deben encontrarse **fuera** de `public/`, `dist/` y Git.
- Persistencia: `CHESSY_AULA_TEACHERS_FILE` (0600). Guarda únicamente hashes SHA-256 salados de códigos aleatorios de alta entropía; metadatos `id`, nombre, creación, expiración y revocación; y hasta 250 eventos de auditoría **sin códigos**.
- Cada código es `CHESSY-T-<token aleatorio>`, 24 bytes aleatorios (base64url), máximo 50 maestros activos, vencimiento entre 1 y 90 días.
- Identidad del profesor (`teacherId`) es independiente de cookies de navegador; cuotas y salas se vinculan a la identidad. Revocar profesor cierra sus salas y sesiones.
- La cookie del administrador está separada de la del profesor. Las mutaciones requieren `Origin` coincidente, cookie Secure + HttpOnly + SameSite=Lax; rate limiting de autenticación.
- La creación de sala devuelve invitación secreta solo al profesor; regenerar invalida el enlace anterior, retirar alumno revoca su sesión y genera invitación nueva.
- Sala en memoria, máximo dos horas, un alumno, sin almacenamiento de medios. No guardar datos personales ni habilitar menores.
- Todas las jugadas, permisos, revisiones y estados FEN son verificados en el servidor usando chess.js. Los clientes muestran **solo** una vista sincronizada. No confiar en eventos enviados desde el navegador.

## Graph Engineering: gates determinísticos

| Gate | Criterio |
|---|---|
| G0 | Modo `public-web` conserva cámara y micrófono deshabilitados fuera de `/aula/`; nunca activar Firebase Rooms/Cloud Functions para esta historia |
| G1 | Credenciales administrador/maestro distintas; código erróneo rechaza; registro 0600, códigos en hash, no volver a mostrar |
| G2 | Alta, vencimiento, revocación, persistencia tras reinicio, auditoría y bloqueo de cookie/WS revocada |
| G3 | Profesor inicia sesión y crea/reanuda salas con su identidad, no con identificador efímero de sesión |
| G4 | Invitación revocable, rechazo del enlace anterior, cupo 1/1, salida/expulsión y entrada de alumno nuevo |
| G5 | Permisos de movimiento enforced servidor, jugadas legales, undo, FEN válido/inválido, legal squares, arrastre escritorio/táctil, tablero idéntico en ambos navegadores |
| G6 | Banco de 200 ejercicios, asignación profesor → alumno, pista, respuesta correcta/incorrecta y avance |
| G7 | Pruebas Playwright profesor + alumno en 1440px / 390px, WebRTC bidireccional, permisos multimedia, pantalla, errores JS 0 |
| G8 | CI verde sobre SHA exacto, merge, despliegue inmutable, salud pública/servidor y prueba desde dispositivos de profesor |

## Despliegue

1. Fusionar rama solo si los dos jobs de CI pasan, incluido `node --test scripts/test/aula-governance.test.mjs` y `npm run test:aula:direct`.
2. Mantener `CHESSY_AULA_TEACHER_SECRET_FILE` original hasta emitir códigos por profesor y completar el cambio. Generar un **segundo** secreto aleatorio administrador (0600) y apuntarlo con `CHESSY_AULA_ADMIN_SECRET_FILE`.
3. Establecer `CHESSY_AULA_TEACHERS_FILE` en directorio persistente con permisos owner-only; hacer backup del registro y de Supervisor.
4. Publicar `dist/` y el `server.mjs` empaquetado del SHA fusionado en un release inmutable; reiniciar únicamente el servicio Chessy.
5. Verificar `/health`, `/aula/api/health`, `/aula/admin.html`, `/aula/`, políticas de medios, administrador → profesor → alumno, WS y movimiento/FEN.
6. Comprobar desde el dispositivo y red reales del profesor antes de cerrar G8. Conservar rollback al bundle y configuración anteriores.

## Riesgos pendientes y próximos incrementos

- **Menores:** el consentimiento actual es autodeclarado, exclusivamente para piloto de adultos.
- **WebRTC:** TURN/relay y observabilidad de calidad son necesarios para redes corporativas restrictivas.
- **Persistencia de salas:** actualmente efímera; si se ofrece a clientes, migrar a almacenamiento transaccional con backups.
- **Retención:** no hay grabaciones; aplicar política de borrado y normas regionales al pasar a usuarios reales.
