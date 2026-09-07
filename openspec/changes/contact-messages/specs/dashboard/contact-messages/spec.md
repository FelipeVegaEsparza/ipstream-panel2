## Purpose

Provee la bandeja de mensajes de contacto dentro del panel de cada cliente: lista las consultas recibidas desde el sitio público, permite cambiar su estado y eliminarlas, siempre aisladas por cliente y solo accesibles con sesión autenticada.

## ADDED Requirements

### Requirement: El operador lista los mensajes de contacto de su cliente
El sistema SHALL exponer `GET /dashboard/contact-messages` solo para sesiones autenticadas, que devuelve los mensajes de contacto del cliente efectivo de la sesión, paginados y ordenados por fecha de creación descendente, incluyendo para cada mensaje su `id`, `name`, `email`, `phone`, `message`, `status`, `ip` y `createdAt`.

#### Scenario: Lista de mensajes del cliente
- **WHEN** un operador autenticado consulta `GET /dashboard/contact-messages` para su cliente
- **THEN** el sistema devuelve una página de mensajes de ese cliente ordenados por fecha descendente
- **AND** la respuesta incluye los datos de contacto (`email`, `phone`, `ip`) de cada mensaje y metadatos de paginación

#### Scenario: Mensajes de otros clientes nunca aparecen
- **WHEN** el cliente efectivo de la sesión tiene mensajes pero existen mensajes de otros clientes
- **THEN** el sistema devuelve solo los mensajes del cliente efectivo, nunca los de otros clientes

#### Scenario: Sin sesión autenticada
- **WHEN** un consumidor no autenticado consulta `GET /dashboard/contact-messages`
- **THEN** el sistema devuelve `401`

### Requirement: El operador cambia el estado de un mensaje
El sistema SHALL exponer `PATCH /dashboard/contact-messages/:id` solo para sesiones autenticadas, que actualiza el `status` del mensaje a uno de los valores válidos (`new`, `read`, `resolved`) y devuelve el mensaje actualizado.

#### Scenario: Cambio de estado válido
- **WHEN** un operador autenticado envía `PATCH /dashboard/contact-messages/:id` con un `status` válido para un mensaje de su cliente
- **THEN** el sistema actualiza el estado del mensaje y devuelve el mensaje con el estado actualizado

#### Scenario: Estado inválido
- **WHEN** un operador envía `PATCH` con un `status` que no es `new`, `read` ni `resolved`
- **THEN** el sistema devuelve `400` sin modificar el mensaje

#### Scenario: Mensaje inexistente o de otro cliente
- **WHEN** un operador envía `PATCH` con el `id` de un mensaje que no existe o que pertenece a otro cliente
- **THEN** el sistema devuelve `404` sin modificar ningún mensaje

### Requirement: El operador elimina un mensaje
El sistema SHALL exponer `DELETE /dashboard/contact-messages/:id` solo para sesiones autenticadas, que elimina el mensaje de contacto del cliente efectivo de la sesión.

#### Scenario: Eliminación exitosa
- **WHEN** un operador autenticado envía `DELETE /dashboard/contact-messages/:id` para un mensaje de su cliente
- **THEN** el sistema elimina el mensaje y devuelve confirmación

#### Scenario: Mensaje inexistente o de otro cliente
- **WHEN** un operador envía `DELETE` con el `id` de un mensaje que no existe o que pertenece a otro cliente
- **THEN** el sistema devuelve `404` sin eliminar ningún mensaje

### Requirement: El panel muestra el número de mensajes pendientes por ver
El sistema SHALL exponer `GET /dashboard/contact-messages/unread-count` solo para sesiones autenticadas, que devuelve la cantidad de mensajes con estado `new` del cliente efectivo de la sesión, para que el panel pueda mostrarla junto a la sección "Mensajes de contacto".

#### Scenario: Hay mensajes nuevos pendientes
- **WHEN** un operador autenticado consulta `GET /dashboard/contact-messages/unread-count` y su cliente tiene mensajes con estado `new`
- **THEN** el sistema devuelve `{ "count": N }` con el número de mensajes `new` de ese cliente

#### Scenario: Sin mensajes nuevos
- **WHEN** un operador autenticado consulta el contador y su cliente no tiene mensajes `new`
- **THEN** el sistema devuelve `{ "count": 0 }`

#### Scenario: El contador se reduce al cambiar el estado
- **WHEN** un operador cambia a `read` o `resolved` un mensaje que estaba `new`
- **THEN** las consultas posteriores al contador no incluyen ese mensaje

#### Scenario: Sin sesión autenticada
- **WHEN** un consumidor no autenticado consulta `GET /dashboard/contact-messages/unread-count`
- **THEN** el sistema devuelve `401`

### Requirement: La bandeja de contacto aísla los mensajes por cliente
El sistema SHALL resolver siempre el cliente de la sesión (incluida la impersonación de administradores) y acotar listar, actualizar y eliminar a los mensajes de ese cliente, de modo que ninguna operación pueda mezclar o afectar mensajes de otros clientes.

#### Scenario: Operación sobre mensaje de otro cliente
- **WHEN** un operador intenta listar, actualizar o eliminar mensajes que pertenecen a un cliente distinto del efectivo en su sesión
- **THEN** el sistema no expone ni modifica esos mensajes y devuelve `404` en las operaciones por `id`
