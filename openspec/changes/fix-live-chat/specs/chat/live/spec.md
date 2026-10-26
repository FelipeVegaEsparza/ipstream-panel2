# Spec Delta

## Purpose

Permite que el chat en vivo esté disponible y funcione correctamente en el sitio público y en el dashboard, con permisos coherentes, mensajes incrementales sin pérdidas y moderación desde el panel.

## ADDED Requirements

### Requirement: Disponibilidad del chat en la PWA

La PWA SHALL mostrar el chat en vivo cuando el cliente lo tenga habilitado. En el home de los templates que montan el contenido SHALL aparecer como una sección de contenido; en el resto de páginas SHALL estar disponible mediante un botón flotante. El botón flotante NO SHALL duplicar el chat cuando la sección ya está visible en el home. En templates cuyo home no monta el contenido (minimalista), el chat SHALL quedar disponible mediante el botón flotante.

#### Scenario: Home con sección de chat

- **WHEN** un cliente con chat habilitado abre el home de un template que monta el contenido
- **THEN** ve la sección “Chat en vivo” dentro del contenido

#### Scenario: Otra página de la PWA

- **WHEN** el visitante navega a una página distinta del home
- **THEN** ve el botón flotante del chat y puede abrir el panel sin perder la página

#### Scenario: Home de minimalista

- **WHEN** el visitante abre el home de minimalista con chat habilitado
- **THEN** el chat está disponible mediante el botón flotante

#### Scenario: Chat deshabilitado

- **WHEN** el cliente tiene deshabilitado el ítem de menú Chat en Vivo
- **THEN** la PWA no muestra la sección ni el botón flotante

### Requirement: Contrato incremental de mensajes

Las APIs públicas y del dashboard SHALL devolver mensajes en orden ascendente. Sin `since`, SHALL devolver los últimos N mensajes. Con `since`, SHALL devolver los mensajes posteriores al cursor, junto con `nextCursor` y `hasMore`. El cliente SHALL usar `nextCursor` como siguiente cursor y NO SHALL usar la hora del servidor como cursor de mensajes.

#### Scenario: Carga inicial

- **WHEN** la PWA carga el chat sin cursor y existen más mensajes que el límite
- **THEN** recibe los mensajes más recientes en orden ascendente, no los más antiguos

#### Scenario: Mensajes nuevos

- **WHEN** la PWA consulta con `since` y hay mensajes nuevos
- **THEN** recibe solo los posteriores al cursor, en orden ascendente, con el nuevo `nextCursor`

#### Scenario: Lote lleno

- **WHEN** hay más mensajes nuevos que el límite de la consulta
- **THEN** `hasMore` es verdadero y el cliente continúa desde `nextCursor` hasta drenar los mensajes

#### Scenario: Dashboard incremental

- **WHEN** el dashboard consulta mensajes con `since`
- **THEN** la API aplica el cursor y devuelve mensajes posteriores, no la última página completa

### Requirement: Identidad del oyente

Los mensajes enviados desde la PWA SHALL requerir nombre y email válidos. La PWA SHALL validar el email antes de enviar y NO SHALL enviar una cadena vacía cuando el campo esté incompleto.

#### Scenario: Email válido

- **WHEN** el oyente ingresa nombre, email válido y mensaje
- **THEN** el mensaje se envía y se muestra en el chat

#### Scenario: Email inválido

- **WHEN** el oyente intenta enviar sin email o con un formato inválido
- **THEN** la PWA muestra un error de validación y no llama al POST

### Requirement: Mensajes de staff

Los mensajes creados por el staff del dashboard SHALL identificarse como `staff` y la PWA SHALL mostrarlos con el estilo de staff. La API pública NO SHALL permitir crear mensajes con autor distinto de oyente.

#### Scenario: Mensaje de staff en la PWA

- **WHEN** el staff envía un mensaje desde el dashboard
- **THEN** la PWA lo renderiza como mensaje de staff

#### Scenario: Intento de suplantar staff

- **WHEN** un visitante envía un mensaje con un campo de autor manipulado
- **THEN** la API lo guarda como oyente y no como staff

### Requirement: Permisos de chat

La página y las APIs del dashboard SHALL respetar el permiso del ítem de menú Chat en Vivo. Las APIs públicas de chat SHALL responder bloqueadas cuando el cliente tenga el chat deshabilitado.

#### Scenario: Dashboard con menú deshabilitado

- **WHEN** un cliente sin permiso de Chat intenta abrir `/dashboard/chat` o sus APIs
- **THEN** la página redirige y las APIs responden no autorizado

#### Scenario: API pública bloqueada

- **WHEN** el chat está deshabilitado y un consumidor llama a la API pública de chat
- **THEN** la API responde bloqueada y no devuelve ni acepta mensajes

### Requirement: Conteo de oyentes activos

El conteo de oyentes activos SHALL excluir los mensajes de staff. La PWA y el dashboard SHALL usar el mismo criterio de actividad y no SHALL presentar al staff como oyente.

#### Scenario: Solo staff activo

- **WHEN** en los últimos minutos solo hay mensajes de staff
- **THEN** el conteo de oyentes activos es cero

### Requirement: Retención y limpieza

La limpieza de mensajes mayores a 48 horas SHALL ejecutarse mediante un cron documentado y protegido por `CRON_SECRET`. La documentación SHALL reflejar el comportamiento real del endpoint cuando el secreto no está configurado.

#### Scenario: Limpieza programada

- **WHEN** el cron de chat se ejecuta con el secreto correcto
- **THEN** elimina los mensajes con más de 48 horas

#### Scenario: Cron sin secreto configurado

- **WHEN** `CRON_SECRET` no está configurado
- **THEN** el endpoint rechaza la operación como error de configuración y la documentación lo indica
