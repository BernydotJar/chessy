# Chessy — Graph Engineering: Aula Directa 1:1 (P0)

**User story:** Como profesor de Chessy, quiero abrir un aula visible desde «Clases», invitar a un alumno y practicar ajedrez con tablero, ejercicios, audio, video y pantalla compartida sin contratar Blaze.

**Diseño de ejecución**: Chessy público conserva el modo `public-web` y los antiguos flujos privados basados en Firebase Functions permanecen cerrados. La ruta aislada `/aula/` utiliza un backend Node.js empaquetado junto al mismo servidor HTTP de Chessy; permite WebSockets autenticados y señalización WebRTC *peer-to-peer*. No usa Functions, Firebase Emulator, LiveKit Cloud ni tarjeta de crédito.

## Grafo verificable

`/Clases` → `Entrar al aula 1:1` → `login privado profesor` → `crear sala` → `invitación secreta` → `alumno adulto` → `WS autorizado` → `movimientos validados con chess.js` → `ejercicios del banco de 200` → `WebRTC P2P (cámara/micrófono/pantalla)` → `cerrar/revocar`.

### Gates / evidencias

| Gate | Aserción y seguridad | Comprobante |
| --- | --- | --- |
| G0 | Sitio principal sigue con Permissions-Policy cámara/micrófono desactivados; solo HTML `/aula/` solicita medios | HTTP E2E |
| G1 | Profesor requiere secreto aleatorio en archivo 0600, cookie HttpOnly/Secure, control de Origin y cuotas; anónimo y falsificaciones denegadas | E2E |
| G2 | Invitación solo mediante fragmento, se elimina de la URL después del canje; un único alumno adulto, sin datos de menores | E2E |
| G3 | Dos sesiones independientes sincronizan FEN, jugadas legales, errores y revisiones; servidor es autoridad | E2E |
| G4 | 200 ejercicios existentes, asignación profesor→alumno, intento erróneo, resolución y siguiente ejercicio | E2E |
| G5 | Dos cámaras WebRTC transmiten y decodifican de extremo a extremo; permiso de pantalla solo del profesor; medios inicialmente apagados | Chromium E2E |
| G6 | Layout de móvil 390 px sin overflow ni errores JS; cierre invalida el acceso al aula | Chromium E2E |
| G7 | Build de Vite con flag `VITE_CHESSY_DIRECT_AULA_ENABLED=true` + servidor Node esbuild reproducible; `npm ci`, lint, unit, build, security audit y CI | CI |
| G8 | URL real HTTPS responde, profesor y alumno completan flujo de navegador en producción, sin habilitar antiguos endpoints de salas | QA de despliegue |

## Operación y mantenimiento

- Desarrollo: `VITE_CHESSY_DIRECT_AULA_ENABLED=true VITE_CHESSY_PRIVATE_ROOMS_ENABLED=false VITE_CHESSY_LIVEKIT_ENABLED=false npm run build`, luego `npm run build:server` y `npm run test:aula:direct`.
- Producción: configurar `CHESSY_AULA_TEACHER_SECRET_FILE` apuntando a un archivo **0600**, generado de manera aleatoria y guardado fuera del repositorio y del frontend. Este archivo habilita exclusivamente `/aula/`; si falta, la API del aula rechaza el acceso.
- Runtime: el servidor empaquetado en `progress/runtime/aula-server.mjs` puede publicarse como artefacto inmutable junto con `dist/`. No requiere que `node_modules` exista en la máquina de producción.
- Límites: máximo cinco salas simultáneas por profesor, dos horas de vida por sala, un alumno por invitación, sin almacenamiento de datos personales, sin grabación y estado en memoria (se pierde al reiniciar). No activar para menores.
- Rollback: restituir la configuración de Supervisor anterior y el dist previo; conservar `public-web` y verificar `/health` y política de cámara/micrófono de la ruta principal.
- La conexión media usa servidores STUN públicos y **no incluye TURN**. Entre redes corporativas o NAT simétrico WebRTC puede fallar; en ese caso se debe añadir relay o utilizar LiveKit con backend autorizado, no declarar cobertura universal.

## Criterio de aceptación de profesor

**DONE** únicamente cuando abre desde `https://chessy.textilesdemedellin.com/#/classes`, ve «Entrar al aula 1:1», ingresa su código, crea una clase, comparte la invitación, mueve piezas con un alumno, asigna/avanza ejercicios y consigue audio/video entre ambos navegadores. Los E2E automatizados prueban la técnica; la experiencia en la red real del profesor se valida por separado.
