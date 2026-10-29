# Chessy — Release controlado: aprendizaje nivel 0 a 1

Estado: release candidate. Este runbook NO autoriza el uso de salas por menores reales.

## Qué entra al sitio público

- Registro, autenticación, progreso local y remoto existente, 200 desafíos, temas y clases previamente publicadas.
- Ruta nivel 0 a 1 con cinco hitos y ejercicios existentes, sin recopilar respuestas del diagnóstico de salas.
- Navegación de Salas con un aviso explícito de preparación, sin botones para crear grupos, invitar, unirse ni enviar datos a un backend de salas.
- Código de salas privadas e infraestructura Firebase versionados en GitHub pero sin activar ni desplegar para el público.

## Configuración explícita de release

Para el primer despliegue, cuando nunca se han almacenado datos de salas en el proyecto:

    VITE_CHESSY_PRIVATE_ROOMS_ENABLED=false
    VITE_CHESSY_ROOMS_DATA_MAY_EXIST=false

Estas variables se fijan en la compilación de Vite. La ausencia del flag de salas privadas también significa OFF; el servidor público no debe recibir las credenciales ni secretos de verificación infantil.

**Advertencia importante:** si alguna vez se han creado datos de salas reales, mantener VITE_CHESSY_ROOMS_DATA_MAY_EXIST=true incluso cuando VITE_CHESSY_PRIVATE_ROOMS_ENABLED=false. Así se preservan las comprobaciones de borrado de cuentas y se mantiene el backend disponible para revocación y eliminación de datos.

No desplegar todavía Firebase Functions nuevas ni las reglas/índices de salas en producción: la publicación de infraestructura requiere un release operativo separado, revisión de compatibilidad con datos existentes, App Check, aviso jurídico aprobado, retención y piloto sintético en el proyecto destino. No ejecutar el comando de habilitación de menores ni usar recibos de emulador.

## Preflight técnico

- Trabajar desde el SHA exacto fusionado en main, con checkout limpio. No compilar sobre el checkout operativo modificado del servidor.
- Confirmar GitHub Actions verdes: verify y rooms-safety. Aun verdes, solo autorizan el piloto sin salas.
- Verificar npm audit a nivel low, build, 318 pruebas unitarias, E2E core, 8 pruebas de salas estáticas, PWA y recorrido de registro/eliminación de cuenta.
- Verificar en el navegador renderizado que una URL de invitación no abre formulario y que el aviso de salas privadas en preparación aparece.
- Capturar SHA y health anterior de https://chessy.textilesdemedellin.com/health.
- Confirmar que el proceso supervisado Chessy es el único afectado. No modificar otras aplicaciones del Caddy/túnel.

## Instalación en la infraestructura existente

Infraestructura: Cloudflare/Caddy -> origin del workstation en puerto 14176 -> supervisord del Chessy existente.
Servidor Node: /workspace/projects/chessy/scripts/serve-production.mjs.
Supervisor: /workspace/.deployment-tools/chessy-supervisord.conf.
Los artefactos nuevos deben colocarse en un directorio de releases inmutable, sin modificar el árbol de código local con cambios pendientes.

El entorno del programa supervisado acepta:
- CHESSY_DIST apuntando al directorio dist de ese release.
- CHESSY_RELEASE_SHA indicando el SHA exacto mergeado.
- CHESSY_DEPLOYMENT_CLASS=public-web y puerto existente 14176.

Guardar un backup con timestamp del supervisor antes de modificarlo. Ejecutar reread/update únicamente sobre el programa chessy y comprobar /health local y HTTPS público. El release no debe crear nuevos contenedores, modificar el Caddy o reiniciar otras apps.

## Criterios de aceptación después del despliegue

- /health local y HTTPS público devuelven HTTP 200 y el SHA aprobado.
- Página principal, academia, retos, temas, 200 puzzles, PWA offline y registro adulto disponibles.
- Salas muestran el currículo nivel 0 a 1 y la advertencia "en preparación".
- Cualquier URL /#/rooms/<token> no expone formulario de ingreso, menores ni datos privados.
- Confirmar en dispositivo 390px y escritorio 1440px con Playwright.
- El borrado de una cuenta de prueba creada por el propio QA debe funcionar; prohibido borrar usuarios preexistentes.
- Ningún secreto ni token de verificación infantil se publica en dist.

## Rollback

Ante error, restaurar la configuración anterior de supervisord y reiniciar solamente el programa chessy. Verificar /health y el SHA antiguo. No usar scripts que borren cuentas, colecciones de Firestore, progresos o credenciales.

## GO / NO-GO separados

- Git merge: sujeto a CI verde y protecciones del repositorio.
- Despliegue de frontend para piloto sin salas: permitido tras pruebas y verificación SHA.
- Salas para adultos: NO-GO hasta backend configurado, aviso aprobado y App Check real.
- Salas para menores: NO-GO hasta revisión jurídica y de seguridad independientes, proveedor verificable parental, controles operativos, evaluación por jurisdicción y aprobación sobre release exacto.
