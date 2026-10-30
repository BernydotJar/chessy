# Chessy · Aula de ejercicios guiados profesor–alumno (piloto adulto)

## Objetivo de producto

**Clases** reúne el catálogo y las sesiones del profesor (en vivo o grabadas). **Salas** es el aula de aprendizaje. El mismo profesor puede abrir una sala, invitar a un adulto por un enlace privado, conversar por LiveKit Cloud y resolver ejercicios de ajedrez sobre una posición sincronizada. La videollamada es un canal opcional; el tablero y la enseñanza son la funcionalidad principal.

La sección Clases incorpora acceso directo a Salas, aun si el catálogo remoto falla, junto con opción de reintento. Esto mejora la UX, pero no diagnostica por sí solo el error de Firestore que muestra la captura del usuario.

## Flujo implementado

1. Profesor autorizado y verificado crea una sala **adultos**, envía invitación privada.
2. Alumno adulto verificado acepta y pasa a la lista de la sala. El selector del profesor se actualiza al recibir nuevos miembros.
3. El profesor escoge uno de los **200 retos ya existentes**, organizados en 5 bloques de 40, y elige el alumno al que asignarlo.
4. Firestore notifica de la asignación. Solo el alumno seleccionado (además del profesor) puede leer el ejercicio y mover piezas. Los demás participantes no ven la posición ni los intentos del alumno.
5. El alumno mueve la pieza sobre el tablero. Cloud Functions compara su jugada con la línea permitida, aplica automáticamente la respuesta del adversario cuando corresponde y publica la nueva posición.
6. Una respuesta incorrecta mantiene la misma posición, registra un intento y permite repetir. Tras la solución, el profesor puede pasar directamente al siguiente reto.
7. El tablero libre del profesor sigue disponible para demostraciones. En pantallas pequeñas se prioriza el ejercicio, después LiveKit y finalmente el tablero libre.
8. Al retirar al alumno de la sala se elimina transaccionalmente su asignación e intentos; el worker de retención aplica la misma limpieza a membresías vencidas. Al cerrar la sala, las reglas impiden nuevas lecturas.

## Controles de arquitectura

- Solo salas `audience=adults`; **sin activación de menores**. Los ejercicios exigen membresía adulta activa y correo verificado.
- Las funciones `assignLearningRoomExercise`, `submitLearningRoomExerciseMove` y `endLearningRoomExercise` son callables con App Check obligatorio fuera del emulador. El backend determina identidad/rol, no acepta que el navegador suplante alumnos, profesores ni revisiones.
- La solución de cada ejercicio vive en `functions/classroom-exercise-bank.json` (paquete servidor), regenerado determinísticamente desde la biblioteca Chessy. **No se publica el answer key en Firestore**.
- `learningRooms/{roomId}/exercise/current`: ID seudónimo del alumno, estado, FEN, avance, intentos, revisión y vencimiento. Solo el instructor y alumno asignado pueden leer; ningún cliente escribe.
- `learningRooms/{roomId}/exercise/announcement`: notificación sin solución ni ID de alumno, visible a miembros adultos de esa sala. Permite suscripción tardía sin exponer datos privados.
- `expectedRevision` + transacción Firestore evita aceptar jugadas de un estado viejo. Cuotas de 100 asignaciones/día/profesor y 180 intentos/10 min/alumno. La solución matemática se valida con chess.js.
- Todos los elementos de UI están traducidos a ES/EN/PT; cámara/micrófono apagados al entrar y sin función de grabación implementada.
- Documentos de ejercicio e intentos son datos personales seudónimos y están contemplados en el nuevo borrador de privacidad. La conservación, proveedores y jurisdicciones siguen pendientes de aprobación externa.

## Evidencia — 30/oct/2026

- Frontend: lint, TypeScript, compilación y suite Vitest.
- Backend: tests de funciones, integridad de las 200 soluciones y validación estricta de parámetros.
- Firestore emulator: coach y alumno asignado permiten lectura, terceros/menores/no miembros denegados; ningún cliente escribe progreso o soluciones.
- LiveKit Cloud QA sintético: 33/33 escenarios PASS, incluyendo alumnado con invitación, posición compartida, intento equivocado, corrección, siguiente ejercicio, permisos, video, pantalla compartida, móvil, revocaciones y borrado de intentos al salir.
- Retención y operaciones con emuladores: 12/12 pruebas PASS.
- No hay sesión real de un profesor, mediciones de redes físicas ni evidencia de aprobación de privacidad/App Check de producción. El merge, CI y activación pública se gobiernan por separado.

## Pendientes de aceptación

El sitio público y el catálogo Clases siguen servidos por un SHA anterior. Cloud Functions API está deshabilitada para el proyecto Firebase `chessy-pwa-2026`; falta App Check productivo, publicar aviso de privacidad revisado, Secret Manager de LiveKit dedicado, asignar el rol de profesor y aceptar una sesión humana piloto. **No activar salas reales ni acceso de menores basándose en pruebas de emulador o LiveKit QA.**

Para reproducir en QA aislado:

```sh
node scripts/sync-classroom-exercise-bank.cjs --check
npm run verify
npm --prefix functions run check
node scripts/livekit-qa-run.cjs --existing-qa-project
```

El último comando requiere un entorno de QA previamente autorizado; no utiliza cuentas ni salas reales de Chessy. Ver también `docs/CHESSY_ADULT_LIVEKIT_PILOT_RUNBOOK.md`.
