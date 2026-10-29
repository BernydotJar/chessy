# Chessy — Salas privadas y aprendizaje desde nivel 0

Estado: PR en Draft. No fusionado ni desplegado. La ruta inicial se construyó en la rama feat/chessy-zero-one-rooms-20261023 y posteriormente se reforzó con backend de privacidad y operaciones.

## Experiencia

- Registro de adulto o tutor, email verificado y acceso privado.
- Profesores autorizados crean salas propias mediante backend protegido, no directamente desde Firestore.
- Invitaciones opacas de siete días, compartibles y revocables.
- Rangos de edad 6–9, 10–12, 13–17, adultos; menores cerrados por defecto mientras no exista comprobante externo firmado, política publicada y habilitación jurídica.
- El cuestionario original de cinco preguntas solo produce un puntaje global de 0–5; no se almacenan respuestas individuales ni se inventa Elo.
- Cinco hitos de nivel 0 → 1: tablero, torre/alfil, caballo/peón, rey y mate. El avance se vincula a actividades verificables del sistema de aprendizaje de Chessy, no al diagnóstico.
- Tablero sincronizado controlado por el profesor, sin chat ni audio/video.
- Retirada y eliminación de membresía/resultado; retención y purga recursiva programada.

## Arquitectura

Cliente React + Firebase Auth + Firestore + Functions v2. Callable Functions con App Check real en producción para crear/cerrar salas, emitir/revocar invitaciones, solicitar revisión y calcular diagnósticos. Firestore Rules bloquea manipulación directa de cuotas, política, aprobaciones y puntuaciones.

La habilitación global para menores requiere manifiesto firmado Ed25519 por dos revisores, vinculado a SHA, proyecto Firebase, versión de política, países y aviso. No basta escribir dos referencias de aprobación. El permiso individual requiere una verificación externa con aserción EdDSA (contrato técnico implementado) emitida para un UID adulto, sala, rango y versión de política concreta. El operador registra solamente un digest de comprobante y debe estar autorizado por IAM. El permiso expira y puede anularse inmediatamente mediante una política global inicialmente deshabilitada.

Límites: 3 salas/24h por profesor; 10 invitaciones/h; 2 solicitudes parentales/día; 15 admisiones/día por cuenta y 50 admisiones acumuladas por sala; membresías hasta 30 días para menores y 90 para adultos. Una sala activa vence en 90 días y se purga recursivamente 30 días después del cierre.

## Evidencia reproducible

    npm run verify
    npm --prefix functions run check
    node scripts/rooms-browser-verify.cjs
    CHESSY_HEADLESS=1 node scripts/browser-verify.cjs
    firebase emulators:exec --project demo-chessy-rooms --config firebase.rooms-emulators.json --only auth,firestore,functions "node scripts/rooms-auth-fixtures.mjs && node scripts/rooms-auth-browser-e2e.cjs"
    firebase emulators:exec --project demo-chessy-rooms --config firebase.rooms-emulators.json --only auth,firestore,functions "node scripts/rooms-auth-fixtures.mjs && node scripts/rooms-ops-e2e.cjs"
    firebase emulators:exec --project demo-chessy-rooms --config firebase.coach-emulators.json --only firestore "node scripts/room-rules-verify.mjs"
    firebase emulators:exec --project demo-chessy --config firebase.coach-emulators.json --only firestore,storage "node scripts/coach-rules-verify.mjs"

Los escenarios con autorizaciones firmadas utilizan proveedores y cuentas sintéticos generados en memoria, nunca datos de menores reales.

## Documentos y decisiones operativas

- docs/CHILD_SAFETY_DATA_GOVERNANCE.md: inventario, riesgos, retención y revisión legal regional.
- docs/ROOMS_PRIVACY_NOTICE_DRAFT_ES.md: borrador público; requiere responsable/contacto y revisión.
- docs/ROOMS_SAFETY_RUNBOOK.md: despliegue, TTL, manifiesto firmado y respuesta a incidentes.
- .github/workflows/github-pages.yml: pruebas de seguridad de salas en CI con aceptación técnica, sin levantar el NO-GO infantil.
- progress/evidence/rooms/safety-release-gate-adults.json y safety-release-gate-minors.json: evaluación local de configuración, sin certificar entorno real.

**No es una integración de Chess.com.** Las referencias externas orientan UX, pero las salas y datos pertenecen a Chessy.

**No activar menores reales con el comprobante sintético o con una casilla de autodeclaración.** El proveedor VPC, la identidad del responsable legal, avisos finales, revisión de jurisdicciones, App Check real y garantías operativas siguen siendo gates externos obligatorios.

## Piloto público protegido (release mode)

- La ruta nivel 0->1 permanece accesible aun cuando VITE_CHESSY_PRIVATE_ROOMS_ENABLED no esté definido o valga false.
- Crear salas, consultar invitaciones, enviar diagnósticos o aprobar tutores no se muestran ni se invocan en ese modo; la vista presenta un estado en preparación.
- Las salas privadas SOLO pueden activarse con VITE_CHESSY_PRIVATE_ROOMS_ENABLED=true tras desplegar y verificar Functions, reglas Firestore, App Check y aviso de privacidad aprobado.
- Si un proyecto tuvo datos de salas alguna vez, mantener VITE_CHESSY_ROOMS_DATA_MAY_EXIST=true incluso al deshabilitar UI. Esto preserva las verificaciones de borrado de cuentas y exige que el backend permanezca disponible.
- No implantar el backend infantil ni habilitar la política global mientras existan bloqueos jurídicos.

- Release sin backend de salas: seguir docs/CHESSY_PUBLIC_PILOT_RELEASE.md para publicar exclusivamente el aprendizaje nivel 0 a 1.
