# Push Specification

## Purpose

Permite a cada cliente enviar notificaciones push a los dispositivos que instalaron la PWA de su radio/TV, de forma inmediata o programada, con seguimiento de entregas y clicks, usando OneSignal por cliente.

## Requirements

### Requirement: Configuración de OneSignal por cliente
El sistema SHALL operar con las credenciales de OneSignal de cada cliente (App ID y REST API Key) almacenadas por cliente, con la API Key encriptada.

#### Scenario: Cliente con OneSignal configurado
- **WHEN** el cliente tiene App ID y API Key cargados
- **THEN** el sistema puede enviar notificaciones en su nombre
- **AND** la API Key se persiste encriptada (no en texto plano)

#### Scenario: Cliente sin OneSignal configurado
- **WHEN** el cliente no tiene App ID o API Key
- **THEN** el sistema rechaza el envío con un error claro ("OneSignal no está configurado")

### Requirement: Envío de notificación inmediata
El sistema SHALL permitir al cliente enviar una notificación push inmediata, dirigida a los suscriptores de su App de OneSignal, y registrar el resultado del envío.

#### Scenario: Envío inmediato exitoso
- **WHEN** el cliente envía una notificación sin fecha programada y OneSignal acepta la petición
- **THEN** la notificación queda con estado `sent`
- **AND** se registra `sentAt`, el ID de OneSignal y la cantidad de destinatarios

#### Scenario: Envío inmediato fallido
- **WHEN** OneSignal rechaza la petición o falla la conexión
- **THEN** la notificación queda con estado `failed`
- **AND** el sistema devuelve un mensaje de error

#### Scenario: Destinatarios de la App del cliente
- **WHEN** se envía una notificación de un cliente
- **THEN** se dirige únicamente a los suscriptores de la App de OneSignal de ese cliente (aislamiento entre clientes)

### Requirement: Notificación programada
El sistema SHALL permitir programar una notificación para una fecha futura y SHALL enviarla automáticamente al cumplirse la fecha mediante un proceso programado (cron).

#### Scenario: Programar notificación
- **WHEN** el cliente envía una notificación con una fecha futura
- **THEN** queda con estado `pending`
- **AND** no se envía en el momento

#### Scenario: Disparo automático al cumplirse la fecha
- **WHEN** el proceso programado corre y existe una notificación `pending` con fecha ≤ ahora
- **THEN** el sistema la envía por OneSignal
- **AND** actualiza su estado a `sent` (o `failed` si falla)

#### Scenario: Proceso programado inexistente
- **WHEN** el proceso programado no está agendado
- **THEN** las notificaciones programadas no se envían (condición a evitar: el despliegue SHALL dejar el cron agendado)

### Requirement: Autenticación de cron y webhook
Los endpoints de cron y de webhook SHALL exigir un secreto (Bearer) y rechazar peticiones sin secreto válido usando comparación de tiempo constante.

#### Scenario: Cron sin secreto válido
- **WHEN** llega una petición al cron sin `Authorization: Bearer <CRON_SECRET>` válido
- **THEN** el sistema responde 401 y no procesa nada

#### Scenario: Webhook sin secreto configurado
- **WHEN** el webhook recibe una petición pero `ONESIGNAL_WEBHOOK_SECRET` no está configurado
- **THEN** el sistema responde error de configuración (no procesa)
- **AND** la operación del webhook requiere que el secreto esté configurado en el entorno

#### Scenario: Webhook con secreto válido
- **WHEN** llega una petición de click con `Authorization: Bearer <ONESIGNAL_WEBHOOK_SECRET>` válido
- **THEN** el sistema la procesa y actualiza el contador de clicks

### Requirement: Seguimiento de clicks
El sistema SHALL incrementar el contador de clicks de una notificación cuando OneSignal reporte un click, atribuyéndolo a la notificación correspondiente por su ID.

#### Scenario: Click registrado por ID de OneSignal
- **WHEN** el webhook recibe el click de una notificación y no incluye el ID propio del panel
- **THEN** el sistema lo atribuye por el ID de OneSignal y incrementa `clicksCount`

#### Scenario: Click registrado por ID propio
- **WHEN** el webhook recibe el click con el ID propio del panel
- **THEN** el sistema incrementa `clicksCount` de esa notificación

### Requirement: Compatibilidad con el modelo de suscripciones de OneSignal
El envío SHALL entregar a las suscripciones creadas por el SDK que use la PWA, y el sistema SHALL registrar la cantidad de envíos exitosos reportada por OneSignal (su respuesta de creación puede reportar 0 aunque la entrega haya sido correcta).

#### Scenario: Verificación de entrega
- **WHEN** se envía una notificación a un dispositivo suscrito
- **THEN** las estadísticas de la notificación en OneSignal reportan al menos un envío exitoso (`successful` ≥ 1)
- **AND** el sistema registra esa cantidad

### Requirement: Autorización del envío desde el dashboard
El envío inmediato/programado SHALL requerir una sesión autenticada con permiso de notificaciones y SHALL estar sujeto a rate limit.

#### Scenario: Usuario sin permiso
- **WHEN** un usuario sin el menú de notificaciones intenta enviar
- **THEN** el sistema responde 403

#### Scenario: Exceso de envíos
- **WHEN** se superan los envíos permitidos por ventana de tiempo
- **THEN** el sistema responde 429

### Requirement: Suscripción de la PWA (opt-in)
La PWA SHALL permitir al oyente suscribirse a las notificaciones mediante una acción explícita, y SHALL usar el App ID de OneSignal del cliente resuelto por dominio.

#### Scenario: Cliente con OneSignal configurado
- **WHEN** el oyente abre la PWA de un cliente que tiene `oneSignalAppId` y pulsa activar notificaciones
- **THEN** el navegador solicita el permiso
- **AND** al aceptarlo, el dispositivo queda suscrito en la App de OneSignal de ese cliente

#### Scenario: Cliente sin OneSignal configurado
- **WHEN** el cliente no tiene `oneSignalAppId`
- **THEN** la PWA no muestra la opción de activar notificaciones y no inicializa el SDK

#### Scenario: Permiso denegado
- **WHEN** el oyente rechaza el permiso
- **THEN** el dispositivo no queda suscrito y la PWA no lo reintenta automáticamente

### Requirement: Recepción de notificaciones y manejo del clic
La PWA SHALL recibir y mostrar las notificaciones aunque esté cerrada, y al hacer clic SHALL abrir la URL de destino configurada.

#### Scenario: Notificación con la PWA cerrada
- **WHEN** el panel envía una notificación a un dispositivo suscrito
- **THEN** el dispositivo la muestra aun con la PWA cerrada

#### Scenario: Clic con URL de destino
- **WHEN** el oyente hace clic en una notificación que tiene `targetUrl`
- **THEN** la PWA abre esa URL

### Requirement: Aislamiento del App ID por cliente
La suscripción y la recepción SHALL usar la App de OneSignal del cliente correspondiente al dominio, sin filtrar suscripciones entre clientes.

#### Scenario: Suscripción en el dominio del cliente correcto
- **WHEN** un oyente se suscribe desde el dominio de un cliente
- **THEN** la suscripción pertenece únicamente a la App de OneSignal de ese cliente
- **AND** no aparece como destinataria de las notificaciones de otro cliente

### Requirement: Compatibilidad con iOS/Safari
La PWA SHALL contemplar la recepción en iOS/Safari cuando la PWA esté instalada y el cliente tenga configurado su Safari Web ID.

#### Scenario: iOS con PWA instalada
- **WHEN** el oyente instala la PWA en su pantalla de inicio (iOS 16.4+) y el cliente configuró su Safari Web ID
- **THEN** el dispositivo puede suscribirse y recibir notificaciones

#### Scenario: iOS sin PWA instalada
- **WHEN** el oyente usa la PWA desde Safari sin instalarla
- **THEN** no recibe notificaciones (limitación de la plataforma)
