# Chessy | Graph Engineering: aula de desarrollo sin facturación

**Identificador:** CH-DEV-LIVE-001 | **Objetivo:** permitir que el desarrollador pruebe profesor → alumno adulto → ejercicios → video sin activar Blaze ni Cloud Functions de producción.

## Grafo de implementación

`UI Chessy aislada` → `HTTPS/Session Gateway` → `Auth/Firestore/Functions emulados` → `Ejercicios y estado de sala`; para video: `Functions de QA` → `LiveKit Cloud QA (solo si hay credenciales explícitas)` → `Media real WebRTC`.

**Rama pública protegida:** producción sigue `public-web` con cámara y micrófono deshabilitados. El modo `VITE_CHESSY_REMOTE_DEV_PILOT` usa host HTTPS de la misma página y se compila solo para QA; jamás modifica Firebase del proyecto `chessy-pwa-2026`. El gateway exige cookie de sesión HttpOnly+Secure y niega endpoints administrativos de los emuladores.

## Gates con evidencia

| Gate | Verificación | Estado |
|---|---|---|
| G0 | PR #19 y #20 integrados; producción SHA `971ceeff3c5866138427ac984a292b94cb235e89` healthy y `public-web` | PASS |
| G1 | Adult-only, rechazo de menores, permisos/aislamiento, ejercicios y estado: LiveKit QA con emuladores: **29/29** (runbook del 29-oct) | PASS en QA |
| G2 | Repetición de smoke en navegador: **12/12**; profesor + dos alumnos, video/audio desde LiveKit Cloud, pantalla, sin JS exceptions | PASS en QA (01-nov) |
| G3 | Gateway privado: sin cookie 401, login autorizado, rutas de administración 404, frontend autenticado | PASS local (04-nov) |
| G4 | Acceso remoto reproducible HTTPS con teléfono y proveedor de video autorizado | PENDIENTE: URL Cloudflare Quick Tunnel no generada en ejecución 04-nov; credenciales QA no montadas en runtime migrado |

## Cierre responsable

Cerrar **la implementación y la verificación técnica de desarrollo** es válido por G0-G3. No cerrar **la entrega de una URL remota reproducible con video** hasta G4. Esto es una dependencia de infraestructura y no justifica bloquear nuevas iteraciones del tablero y del currículo. No confundir este piloto de adultos con aprobación para menores o lanzamiento público.

## Operación

- Build de QA: `VITE_CHESSY_REMOTE_DEV_PILOT=true`, `VITE_CHESSY_PRIVATE_ROOMS_ENABLED=true`, `VITE_CHESSY_LIVEKIT_ENABLED=true`, `VITE_CHESSY_ADULT_PILOT_ONLY=true`, Firebase proyecto `demo-chessy-livekit`.
- Gateway: `CHESSY_PILOT_ACCESS_FILE=/path/owner-only.json node scripts/dev-pilot-gateway.mjs`. Debe estar detrás de HTTPS para cookies Secure, cámara y micrófono.
- Emuladores: `node scripts/dev-pilot-emulators.cjs`. Configurar `CHESSY_DEV_LIVEKIT_CONFIG=/path/qa-provider.json` (0600) **solo** cuando exista un proyecto QA autorizado; sin él las salas/ejercicios funcionan pero video no.
- Fixtures: `CHESSY_PILOT_ACCESS_FILE=/path/owner-only.json node scripts/dev-pilot-fixtures.cjs` con Auth Emulator disponible.
- Gate adversarial: `node --test scripts/test/dev-pilot-gateway.test.mjs`, más `npm run lint`, `npm test -- --run`, `npm run build`, `npm --prefix functions run check`.

**Riesgos conocidos:** los emuladores no son backend productivo, su estado es descartable y los túneles rápidos no tienen SLA. Sin acceso HTTPS funcional y E2E remoto, no se debe publicar una URL como lista para el usuario.
