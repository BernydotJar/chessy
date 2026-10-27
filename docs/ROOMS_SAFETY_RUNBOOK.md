# Chessy — Runbook de salas y protección infantil

## Arquitectura y límites

El frontend usa Firebase Authentication, Firestore y HTTPS Callable Functions v2 en us-central1. La creación, cierre, invitaciones, solicitudes de revisión y cálculo del diagnóstico se realizan en el backend. Firestore Rules impide operaciones sensibles directas desde el navegador. Todas las Functions sensibles requieren App Check en producción; la excepción del emulador es deliberada y no aplica a producción.

Las invitaciones se limitan a 10/hora/profesor. La creación a 3 salas/día/profesor y solicitudes de revisión a 2/día/cuenta. La admisión se limita a 15 ingresos/día/cuenta y 50 admisiones acumuladas por sala; retirarse no restablece la cuota acumulada. No hay cuotas por IP; combinar App Check, Firebase Auth y presupuesto de GCP. Los máximos de retención de salas, membresías, invitaciones y auditorías están en functions/policy.cjs y docs/CHILD_SAFETY_DATA_GOVERNANCE.md.

El sistema no acepta datos personales ni documentos de menores en el diagnóstico. El backend puntúa el cuestionario y solo escribe un resumen. El profesor ve el UID seudónimo, edad por rango y puntuación. No usarlo para publicidad o inferencias ajenas a la enseñanza.

## Preflight obligatorio antes de abrir salas

1. Identificar proyecto Firebase, responsable legal, país y responsables de operación. Evitar usar emuladores con cuentas/credenciales reales.
2. Configurar facturación y presupuestos de GCP, con alertas propuestas de 50/80/100% para Firestore, Functions y Cloud Scheduler.
3. Publicar aviso de privacidad revisado; en el entorno de Functions definir CHESSY_ROOM_PRIVACY_NOTICE_URL (HTTPS) y CHESSY_ROOM_PRIVACY_VERSION (identificador controlado). Sin ellos el backend de producción rechaza crear salas e invitaciones.
4. Configurar en frontend VITE_CHESSY_ROOM_PRIVACY_URL y VITE_FIREBASE_APP_CHECK_SITE_KEY. Registrar dominio y reCAPTCHA Enterprise con App Check; probar permisos reales. Si faltan, las Functions protegidas rechazarán tráfico, no usar un bypass.
5. Confirmar proveedores de Firebase Auth, verificación de correo y dominios autorizados. Los roles coach/admin se asignan únicamente mediante claims del backend.
6. Desplegar funciones, índices/TTL y reglas de Firestore de forma coordinada ANTES de frontend; evitar períodos de reglas permisivas.
7. Confirmar índices compuestos de salas y de collectionGroup rooms, así como TTL de roomInvites, diagnostics, guardianReviewRequests, roomGuardianApprovals, roomConsentReceipts, roomRateLimits y roomAudit.
8. Confirmar que Cloud Scheduler invoca cleanupExpiredLearningRooms cada día. No basta el borrado automático TTL: las subcolecciones no se eliminan con el documento padre.
9. Ejecutar pruebas con identidades sintéticas: reglas, backend, E2E profesor/tutor, PWA, accesibilidad y regresiones. Registrar hash y evidencia.
10. Mantener roomSafety/config.minorEnrollmentEnabled en false durante el lanzamiento de adultos. Esto no requiere crear el documento: ausente también significa DENY.

## Comandos de QA aislado

    npm run verify
    npm --prefix functions run check
    node scripts/rooms-browser-verify.cjs
    CHESSY_HEADLESS=1 node scripts/browser-verify.cjs

    firebase emulators:exec --project demo-chessy-rooms --config firebase.rooms-emulators.json --only auth,firestore,functions "node scripts/rooms-auth-fixtures.mjs && node scripts/rooms-auth-browser-e2e.cjs"
    firebase emulators:exec --project demo-chessy-rooms --config firebase.rooms-emulators.json --only auth,firestore,functions "node scripts/rooms-auth-fixtures.mjs && node scripts/rooms-ops-e2e.cjs"
    firebase emulators:exec --project demo-chessy-rooms --config firebase.coach-emulators.json --only firestore "node scripts/room-rules-verify.mjs"
    firebase emulators:exec --project demo-chessy --config firebase.coach-emulators.json --only firestore,storage "node scripts/coach-rules-verify.mjs"

En el emulador se desactiva la validación App Check porque no existe emisor real de attestation; el código mantiene enforcement en producción. Las cuentas de QA no son personas reales y los recibos de QA NO representan autorizaciones legales.

## Operación manual con IAM autorizado

El CLI functions/ops-admin.cjs es de servidor, no del navegador. El acceso depende de IAM/ADC autorizado. Toda mutación exige proyecto, ticket de revisión y --apply=yes; las acciones de lectura no modifican datos.

Consultar estado:

    node functions/ops-admin.cjs policy-status --project=MI_PROYECTO
    node functions/ops-admin.cjs requests --project=MI_PROYECTO

Deshabilitar inmediatamente las salas infantiles ante incidente:

    node functions/ops-admin.cjs policy-disable --project=MI_PROYECTO --ticket=INCIDENTE-APROBADO --apply=yes

Activarlas SOLO tras dictamen legal y aprobación de Seguridad independientes:

    node functions/ops-admin.cjs policy-enable --project=MI_PROYECTO --ticket=CASO-APROBADO --legalReview=REVISION-LEGAL-REAL --securityReview=REVISION-SEGURIDAD-REAL --legalEvidenceSha256=HASH-DE-64-DIGITOS --apply=yes

Activar la política incrementa su versión; requiere emitir aprobaciones individuales para la nueva versión. No convertir simples textos de referencia en una afirmación de revisión real: verificar evidencia y responsables fuera de la app.

### Registro de autorización individual con comprobante firmado

El responsable legal/operativo debe haber validado un proveedor VPC real y su contrato. El CLI solo acepta un JWS firmado EdDSA con:
- alg EdDSA, typ JWT y key ID reconocido.
- Emisor configurado CHESSY_VPC_ISSUER.
- Finalidad chessy-guardian-consent.
- UID del tutor, ID de sala, rango de edad, versión de política, ID de solicitud, consentimiento verdadero y fechas iat/exp.
- Firma Ed25519 verificable con CHESSY_VPC_ED25519_PUBLIC_KEY_PEM. La clave privada JAMÁS debe estar en Chessy.
- Vigencia válida (máximo 30 días desde expedición del recibo). El CLI conserva solo SHA-256, protege contra reutilización y no persiste el JWS.

En un entorno autorizado, introducir las tres variables confiables en un administrador de secretos/entorno fuera de Git; luego:

    node functions/ops-admin.cjs approve --project=MI_PROYECTO --room=ID-20-CARACTERES --uid=UID-ADULTO --ticket=CASO-APROBADO --assertionFile=/ruta/protegida/recibo.jws --apply=yes

Esta operación prueba firma y vinculación técnica, no acredita por sí sola la idoneidad del proveedor ni la custodia parental. Tras la prueba, borrar el archivo temporal de recibo conforme a política. No incluirlo en logs ni repositorios.

Revocar un tutor elimina la aprobación, solicitud, índice de membresía, miembro y resultado:

    node functions/ops-admin.cjs revoke --project=MI_PROYECTO --room=ID-20-CARACTERES --uid=UID-ADULTO --ticket=INCIDENTE-APROBADO --apply=yes

## Limpieza y recuperación

Worker diario cleanupExpiredLearningRooms: limpia índices de membresías vencidas, cierra salas que superen máximo 90 días y elimina recursivamente salas cerradas cuyo plazo de 30 días pasó, incluyendo invitaciones y permisos de tutor. Se prueba mediante functions/retention.cjs cleanupExpired con dryRun=true antes de borrar datos. Los trabajos son incrementales y reentrantes. Reintentar los errores, verificando Cloud Logging y métricas de SLA interno.

Firestore TTL no es borrado instantáneo ni recursivo; verificar TTL en consola y alertas si se demora. No modificar de manera retrospectiva reglas de retención sin migración auditada. Las copias de seguridad externas y datos de proveedores deben tener cláusulas específicas de conservación.

Monitoreo recomendado: worker sin ejecución correcta durante 30 horas; denegaciones de App Check; picos RESOURCE_EXHAUSTED; costos diarios anómalos de Firestore/Functions; patrones de invitaciones masivas; revocaciones y cambios de versión de política. Los eventos operativos no deben incluir correos, respuestas del diagnóstico, tokens o documentos de menores.

## Incidentes, rollback y recuperación

1. Ejecutar policy-disable y registrar ticket (bloqueo inmediato de permisos infantiles).
2. Revocar invitaciones y cerrar salas comprometidas; retirar claims de profesores comprometidos.
3. Preservar evidencia mínima de auditoría, restringir IAM y evaluar notificaciones con Jurídico.
4. Implementar reparación con tests adversariales, mantener reglas restrictivas aun durante rollback.
5. Ejecutar borrado y verificar ausencia de documentos e índices externos.
6. No reactivar menores sin nueva revisión/versión de política y autorizaciones individualizadas.

La operación requiere plan de contingencia de Cloud Functions, TTL, Firestore y Firebase Auth. No existe certificado legal automatizado.
