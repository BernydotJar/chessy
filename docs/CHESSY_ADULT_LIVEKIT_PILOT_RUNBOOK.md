# Chessy | LiveKit para clases privadas de adultos: release operativo

**Estado 2026-10-29:** NO-GO para personas reales. PR #19 integrado en main `0bd47f84a06819d827de3ff82410a92af0d4e2b4`; el código de remediación adicional de este runbook aún requiere PR/CI/merge. No confundir un merge con producción habilitada.

## Evidencia del preflight (sin credenciales)

- URL pública: https://chessy.textilesdemedellin.com/health, HTTP 200, SHA publicado `a8736b38fd5407e62c847a8c1f9a02fa69e491da`, `deployment_class=public-web`.
- Proyecto Firebase: `chessy-pwa-2026`. `firebase functions:list` devuelve 403 `SERVICE_DISABLED`: Cloud Functions API deshabilitada. **No desplegar Functions ni activar salas todavía.**
- No se encuentran `VITE_FIREBASE_APP_CHECK_SITE_KEY` ni `VITE_CHESSY_ROOM_PRIVACY_URL` en la configuración del frontend de producción.
- El servidor público envía `Permissions-Policy: camera=(), microphone=()`. Se agregó cambio de política que solo permite `(self)` para documentos HTML cuando `CHESSY_DEPLOYMENT_CLASS=adult-pilot` y `CHESSY_MEDIA_PERMISSIONS_ENABLED=true`. El permiso del navegador sigue siendo necesario.
- El documento `docs/ROOMS_PRIVACY_NOTICE_DRAFT_ES.md` dice que no existen llamadas ni video; no es válido para las videoclases LiveKit. Debe aprobarse un aviso específico.

## Contrato técnico del piloto

**Solo adultos previamente invitados y profesor con rol de backend `coach` o `admin`.** El flag `CHESSY_ADULT_PILOT_ONLY=true` restringe en el backend la creación, invitación, inscripción y sesiones de video a salas `adults`. El flag equivalente de Vite oculta niños y grupos mixtos en los formularios. Ninguna UI es control suficiente por sí sola.

**Infraestructura existente:** Cloudflare/Caddy → Node supervisado (14176) → frontend Vite. Firebase Authentication y Firestore → Callable Functions v2 (App Check obligatorio) → LiveKit Cloud. La pizarra persiste en Firestore; el proveedor de medios solo transporta video/audio/pantalla. No se activa grabación ni chat persistente. El cupo máximo es de 12 identidades, con un cupo reservado al profesor. La duración máxima es 120 minutos. Las altas requieren correo verificado y la pertenencia a la sala. La configuración de menores en `roomSafety/config.minorEnrollmentEnabled` debe mantenerse `false` (o el documento ausente).

## Dependencias externas en orden (requieren operador autorizado)

1. **Responsables, facturación y presupuesto:** confirmar responsable legal, operación de incidentes y proyecto/region. Verificar plan de facturación, políticas de costo y alertas; habilitar Cloud Functions API solo después de aprobar su coste. Comprobar Cloud Scheduler, Cloud Run, Artifact Registry y permisos de despliegue. No crear otro contenedor/Cloudflare tunnel.
2. **Aviso de privacidad:** completar y revisar `docs/ADULT_LIVEKIT_PRIVACY_NOTICE_DRAFT_ES.md` (responsable, contacto, jurisdicción, LiveKit como proveedor, transferencia internacional, conservación y derechos). Publicarlo en HTTPS y comprobar que responde 200 con la versión aprobada. No utilizar ni publicar el borrador con campos sin resolver.
3. **App Check real:** crear clave de reCAPTCHA Enterprise web (score-based, no challenge) para `chessy.textilesdemedellin.com`, registrar la app web Firebase `1:699660302993:web:27074bf277367cd24e5d30` en Security > App Check, y verificar attestation desde el dominio real. Nunca incluir localhost en la clave productiva. La app cliente ya usa `ReCaptchaEnterpriseProvider` y Functions usa `enforceAppCheck` fuera del emulador. Monitorizar métricas antes de cualquier enforcement global de productos existentes.
4. **LiveKit Cloud dedicado:** provisionar un proyecto/URL `wss://...livekit.cloud` de Chessy; almacenar `CHESSY_LIVEKIT_API_KEY` y `CHESSY_LIVEKIT_API_SECRET` en Firebase Secret Manager, no en Vite/Git ni en la configuración pública. No reutilizar el tenant de QA de LUMA.
5. **Backend:** configurar en Functions `CHESSY_LIVEKIT_ENABLED=true`, `CHESSY_ADULT_PILOT_ONLY=true`, `CHESSY_LIVEKIT_URL`, `CHESSY_ROOM_PRIVACY_NOTICE_URL` y `CHESSY_ROOM_PRIVACY_VERSION`. Desplegar Functions, reglas, índices/TTL; verificar tareas de retención y reconciliación, no modificar datos preexistentes. Las operaciones deberán demostrar que no se admite a menores ni a usuarios sin rol/verificación.
6. **Frontend y proceso:** desde el SHA aprobado, build limpio con `VITE_CHESSY_PRIVATE_ROOMS_ENABLED=true`, `VITE_CHESSY_LIVEKIT_ENABLED=true`, `VITE_CHESSY_ADULT_PILOT_ONLY=true`, `VITE_CHESSY_ROOMS_DATA_MAY_EXIST=true`, `VITE_FIREBASE_APP_CHECK_SITE_KEY`, `VITE_CHESSY_ROOM_PRIVACY_URL`. El servicio HTTP que sirva el release debe ejecutar la **nueva versión** de `scripts/serve-production.mjs`, no la versión anterior en el checkout operativo; establecer `CHESSY_DEPLOYMENT_CLASS=adult-pilot` y `CHESSY_MEDIA_PERMISSIONS_ENABLED=true`. Mantener releases inmutables y backup de supervisord.
7. **Profesor y alumnos de prueba:** el administrador asigna un claim de profesor por ruta autorizada (nunca desde cliente). Confirmar correo verificado; usar cuentas adultas de QA y sala de prueba creada por la plataforma. Profesor crea sala, emite invitación y enseña con cámara/micrófono desactivados inicialmente; confirma elección antes de publicar. Alumnos adultos aceptan invitación y se unen a la sesión.
8. **Aceptación:** pruebas en Chromium móvil 390px y escritorio 1440px, otro navegador y red restringida; verificar App Check válido/inválido, aislamiento entre salas, caducidad, saturación 11+profesor, reconexión, retirar/mutar alumno, compartir pantalla, fin de clase, no grabación, cierre y purga. Confirmar SHA público y auditorías sin PII ni tokens. Medir monitoreo, costos y alarmas. Despliegue canario/retroceso en supervisord solo para Chessy.

## Gate de configuración local

En un entorno de release donde los valores se inyecten de forma segura:

```sh
node scripts/adult-pilot-release-gate.cjs --strict
node --test scripts/test/server-media-policy.test.mjs scripts/test/adult-pilot-release-gate.test.cjs
npm --prefix functions run check
npm run verify
```

`NO_GO` significa que faltan flags o valores. `CONFIGURATION_READY_REQUIRES_LIVE_ACCEPTANCE` **no** autoriza uso real: faltan pruebas Cloud/legales/operativas independientes. El gate nunca devuelve `deploymentAllowed:true`. Mantener el sitio público con salas privadas OFF hasta cumplir todos los pasos.

## Rollback seguro

Si falla WebRTC, App Check, IAM, reglas o LiveKit, apagar la entrada de salas y media, pero **conservar `VITE_CHESSY_ROOMS_DATA_MAY_EXIST=true`** una vez que existan datos reales; no cortar rutas de revocación, cierre de medios ni borrado. Restaurar únicamente el release/servicio Chessy, preservar el backend de retención y confirmar `/health` + SHA + eliminación de sesiones. No borrar Firestore, credenciales, cuentas ni tocar las otras apps del edge.

## Evidencia de ingeniería del piloto (29 de octubre de 2026)

- Base: `main` en `0bd47f84a06819d827de3ff82410a92af0d4e2b4`. La rama de remediación es independiente del checkout operativo.
- `npm run lint` y `npm run typecheck`: PASS.
- `npm test -- --run`: 328 pruebas PASS. `npm --prefix functions run check`: 24 pruebas PASS.
- Política HTTP y preflight local: 6 pruebas Node PASS. Variante pública y variante LiveKit + adultos: ambas compilaciones PASS.
- `npm audit --omit=dev --audit-level=low` y `npm audit --prefix functions --audit-level=low`: cero vulnerabilidades reportadas.
- Prueba de Firebase emulators + LiveKit Cloud QA (identidades y medios sintéticos) activando `CHESSY_ADULT_PILOT_ONLY=true` y `VITE_CHESSY_ADULT_PILOT_ONLY=true`: primera corrida **26 PASS / 1 timeout al observar desconexión visual tras cierre**. Se instrumentó el error para distinguir estado del profesor/alumno sin revelar credenciales y se amplió la ventana de observación de 30 a 45 segundos. Repetición final **29 PASS / 0 FAIL**, incluido aislamiento, cámara/audio simulados, pantalla, permiso del instructor, exclusión de menores, capacidad, revocación, cierre, accesibilidad y dispositivo móvil; el escenario de cierre tardó 7.3 segundos en esa repetición. El timeout inicial se conserva como riesgo de variabilidad y requiere seguimiento en piloto de red real.
- Los logs/screenshots crudos de QA permanecen en el sandbox; no se publican tokens, identidades reales ni claves de proveedor. Esta evidencia **no** incluye App Check real de producción, usuarios reales, SLA de latencia ni aceptación jurídica.
- El estado de Graph Harness `CH-LIVE-001` conserva `verification=PASS` pero `acceptance=BLOCKED` y `release=BLOCKED`; estas pruebas no modifican ese gate.
