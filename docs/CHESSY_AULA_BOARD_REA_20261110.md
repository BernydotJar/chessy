# Chessy Aula Directa — REA del tablero de enseñanza (10 nov 2026)

## Referencias funcionales, no copia de interfaces

- **Chess.com Classroom:** las clases necesitan un tablero compartido en el que el instructor pueda preparar posiciones, dar turnos o controlar los movimientos y explicar variantes.
- **ChessKid Live Classroom:** prioriza acciones intuitivas de un profesor y alumno, con flechas, casillas destacadas y posiciones de ejercicios.
- **Lichess Study:** ofrece edición de posiciones y análisis, árbol de jugadas y colaboración; para un aula 1:1, priorizamos las operaciones sin introducir toda la complejidad del estudio multiusuario.

Fuentes para verificación UX: https://www.chess.com/classroom/ , https://www.chesskid.com/ y https://lichess.org/study

## Diagnóstico de la versión anterior

El botón "Tablero libre" enviaba simplemente un reset al FEN inicial: nunca habilitaba edición libre. El backend sí validaba jugadas legales, pero no aceptaba composición arbitraria de posiciones, ni flechas ni una lista de deshacer/rehacer de cambios. El frontend re-renderizaba las 64 casillas ante cada mensaje de estado, incluso por un chat o por presencia, por lo que podía perder la pieza seleccionada entre dos clics. La ruta /aula/ publicada el 9/11 ya tenía deshacer, importar FEN y tres permisos; se partió de esa base, no de un commit anterior.

## Implementación

El servidor WebSocket conserva la autoridad sobre los cambios. El modo **partida** valida todos los movimientos mediante chess.js. El modo **preparar posición** permite al profesor mover piezas de cualquier color a cualquier casilla, colocarlas desde una paleta, retirarlas, vaciar el tablero y definir el turno sin exigir un FEN válido durante la composición. No se puede volver a partida hasta obtener un FEN validado. La preparación, las marcas y los cambios son observables para ambos participantes, pero los comandos de edición/controles del profesor se rechazan si proceden del alumno.

El profesor puede alternar entre jugar y editar, dibujar flechas, destacar casillas, asignar quién mueve las piezas o asignar un color al alumno. El historial de cambios del servidor admite deshacer y rehacer; la reconciliación se guía por 'revision', sin aceptar cambios obsoletos. Cada actualización del chat o la presencia **ya no desmonta el DOM de las casillas**, para preservar la selección en curso. Los ejercicios existentes continúan en un modo separado, con movimientos de solución validados y respuesta del motor desde el servidor.

Limitaciones intencionales: las salas son efímeras y exclusivamente para adultos según las restricciones de Aula Directa; no se graban medios ni se cambia WebRTC. No se incorpora árbol de variaciones ni almacenamiento persistente en este incremento.

## Pruebas y aceptación

- `npm run test:aula:free-board`: editor FEN, posiciones parciales, validación, integridad y sincronización autorizada entre dos clientes WebSocket.
- `npm run test:aula:free-board:browser`: dos perfiles reales Chromium, vista escritorio y móvil, clics y paleta, flechas, chat concurrente, jugadas y deshacer/rehacer.
- `npm run test:aula:direct`: regresión 1:1 incluyendo ejercicios, roles, invitaciones y multimedia.

**Criterio de salida:** no basta con que /aula/ abra. Profesor y alumno deben ver los mismos 64 escaques, posición tras preparar, jugadas y anotaciones; los permisos deben impedir escrituras no autorizadas y el historial debe recuperarse. No desplegar interrumpiendo sesiones de producción (el estado de las aulas está en memoria).
