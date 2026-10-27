# Chessy — Protección infantil y gobernanza de datos

Versión técnica: 2026-10-26. Estado: revisión jurídica y operativa pendiente.
Responsables propuestos: Producto, Seguridad, Privacidad/Jurídico y Operaciones Firebase.

## Decisión de seguridad

Las salas para menores están cerradas por defecto en Firestore. Una casilla de autodeclaración no habilita acceso. Las condiciones obligatorias y simultáneas son: cuenta con correo verificado; invitación privada vigente; cuenta adulta vinculada a solicitud; recibo firmado EdDSA por proveedor externo; aprobación limitada a sala, adulto, edad y versión de política; habilitación global independiente; autorización no vencida.

La solicitud de revisión permanece pendiente hasta que se valide por un proceso confiable fuera de Chessy. La app verifica criptográficamente el comprobante, pero no certifica la identidad del adulto ni los métodos usados por el proveedor. No hay proveedor real conectado ni aprobación jurídica firmada. No habilitar menores reales hasta cerrar esas condiciones.

La app no recopila nombres, fotos, fechas de nacimiento, escuelas, teléfonos, documentos ni direcciones de menores. Mantener por defecto sin chat directo, video, audio, mensajes sociales ni perfiles públicos. Una dirección de correo verificada no demuestra mayoría de edad; revisar la prevención de falsa declaración de edad en los mercados de lanzamiento.

## Inventario de datos

| Recurso | Información | Acceso |
| --- | --- | --- |
| Firebase Auth | Correo de la cuenta adulta, UID, proveedor de acceso | Cuenta y backend de identidad |
| Sala | UID del profesor, título sin PII, idioma, audiencia, vigencia | Profesor y miembros autorizados |
| Invitación | Token impredecible, sala, caducidad | Titular del token y profesor; no enumeración |
| Membresía | UID adulto, rango 6-9/10-12/13-17/18+, declaración, vencimiento | Tutor y profesor |
| Solicitud pendiente | UID del adulto, sala, edad, plazo de revisión | Backend y operadores autorizados |
| Aprobación | UID del adulto, sala, edad, política, digest del JWS, expiración | Backend y operadores autorizados |
| Diagnóstico | UID, rango de edad, objetivo y puntuación global 0-5 | Alumno adulto y profesor |
| Auditoría | Acción, UID seudónimo, sala, fecha, TTL | Operadores administrativos |
| Cuotas | UID, ventana y contador | Backend |
| Progreso en Chessy | Hitos y ejercicios por usuario | Subsistema de progreso existente |

Las respuestas individuales NO se guardan en Firestore. El UID es seudónimo, no anonimización irreversible. No presentarlo como dato anónimo.

## Retención inicial propuesta

| Objeto | Plazo máximo operativo | Mecanismo |
| --- | --- | --- |
| Invitación | 7 días | TTL + revocación |
| Solicitud de verificación | 7 días | TTL |
| Aprobación parental | 30 días | TTL, expiración y revocación |
| Miembro infantil | 30 días o menos que su aprobación | Worker y seguridad por fecha |
| Miembro adulto | 90 días o menos que sala | Worker y seguridad por fecha |
| Diagnóstico | Hasta caducidad del miembro | TTL y worker |
| Sala activa | 90 días | Cierre por worker |
| Sala cerrada | 30 días | Borrado recursivo e índices externos |
| Auditoría, cuotas y digest de recibo | Hasta 90 días | TTL |
| Progreso local | Otra política | No mezclar con datos de salas |

Estos plazos son decisiones iniciales de producto, NO periodos legales universales. Firestore TTL no es instantáneo y no elimina subcolecciones; la limpieza diaria del backend complementa TTL. Deben revisarse también backups, logs y datos del proveedor de verificación.

## Consentimiento y retirada

1. Mostrar al tutor un aviso de privacidad publicado, por mercado e idioma.
2. Permitir solicitar revisión sin recibir datos ni documentos del niño.
3. Verificar identidad y autoridad parental con método aprobado fuera de la app.
4. El tercero emite recibo JWS EdDSA firmado para UID, sala, edad, finalidad, versión de política y expiración.
5. La herramienta operativa verifica firma y reclamaciones, registra solo digest, bloquea replay y conserva ticket.
6. La política global, inicialmente deshabilitada, requiere aprobación independiente de Jurídico y Seguridad.
7. Firestore revisa política y recibo en cada acceso. Revocar o desactivar la política corta el acceso.
8. Retirarse borra índice, membresía y diagnóstico. Revocación administrativa borra también solicitud y aprobación.

El comprobante sintético de QA NO autoriza a una persona real. El contrato firmado reduce el riesgo técnico, pero no sustituye validación del proveedor, DPA, evaluación legal ni procedimientos reales de soporte a padres.

## Revisión regulatoria por mercado

- Estados Unidos: COPPA, incluidas modificaciones de 2025 con cumplimiento general desde el 22 de abril de 2026. Evaluar notificación directa al padre, consentimiento verificable, minimización, acceso/borrado, seguridad, límites de retención y excepciones legales. Fuentes oficiales: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions y https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm
- Unión Europea: GDPR artículo 8 con edad de consentimiento digital de 13 a 16 años según país, cuando la base lícita sea consentimiento; evaluar verificación razonable y reglas nacionales. Fuente oficial: https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- Guatemala: revisar Constitución, Ley de Acceso a la Información Pública, legislación infantil y sectorial, posibles reformas vigentes, transferencias de datos y marco aplicable a entidad privada. No concluir que no hay obligaciones por ausencia de una ley integral. Contexto regional: https://www.ey.com/content/dam/ey-unified-site/ey-com/latam/insights/law/documents/ey-guia-consulta-rapida-proteccion-de-datos-personales-latam-2025.pdf
- Otros países: bloquear menores hasta que exista un inventario de territorialidad, entidad controladora, subencargados, aviso, plazos y derechos.

Se requiere dictamen específico por jurisdicción antes de habilitar público infantil. Esta matriz no constituye asesoría jurídica.

## Respuesta a incidentes

1. Ejecutar policy-disable con IAM autorizado: invalida todas las aprobaciones en el acto.
2. Revocar enlaces comprometidos, cerrar salas y retirar roles de profesor abusivos.
3. Preservar solo evidencia mínima y seudónima para investigación.
4. Determinar obligaciones de comunicación y notificación con responsable legal.
5. Ejecutar borrado controlado y verificar ausencia de registros residuales.
6. Rehabilitar solo tras nueva revisión de riesgos y autorización.

## Condiciones humanas todavía abiertas (NO-GO infantil)

- [ ] Razón social responsable, contacto de privacidad y países objetivo.
- [ ] Evaluación de impacto infantil, amenazas y edad falsa.
- [ ] Aviso publicado ES/EN/PT y método de información directa al tutor.
- [ ] Proveedor verificable contratado, probada su aserción firmada y DPA.
- [ ] Revisiones legal y seguridad con evidencias y responsables.
- [ ] Periodos de retención, acceso/borrado, backup y excepciones auditados.
- [ ] Configuración de App Check, Auth, IAM, presupuestos y monitoreo reales.
- [ ] Piloto supervisado con identidades sintéticas y pruebas de emergencia.
