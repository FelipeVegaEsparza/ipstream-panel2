## Purpose

Expone la parrilla horaria vigente de una radio o TV a través de la API REST pública, para que el reproductor/sitio web de cada cliente muestre qué playlist suena ahora y cuáles vienen después, sin autenticación.

## ADDED Requirements

### Requirement: La API pública expone la franja vigente de radio
El sistema SHALL exponer `GET /api/public/{clientId}/schedule/current` (radio) sin autenticación, con CORS habilitado para todos los orígenes, que devuelve la franja activa cuyo horario contiene el momento actual, las siguientes 3 franjas activas ordenadas cronológicamente y la zona horaria del cliente.

#### Scenario: Hay franja vigente de radio
- **WHEN** un consumidor sin autenticación consulta `GET /api/public/{clientId}/schedule/current` y existe una franja activa cuyo horario (en la zona horaria del cliente) cubre el momento actual
- **THEN** el sistema devuelve `current` con el id, playlistId, nombre de la playlist, día de la semana, hora inicio y hora fin de esa franja
- **AND** `timezone` contiene la zona horaria del cliente
- **AND** `upcoming` contiene hasta 3 franjas activas que comienzan después del momento actual, ordenadas cronológicamente

#### Scenario: No hay franja vigente de radio
- **WHEN** un consumidor consulta `GET /api/public/{clientId}/schedule/current` y el momento actual no cae en ninguna franja activa
- **THEN** el sistema devuelve `current: null`
- **AND** `upcoming` contiene las siguientes franjas activas en orden cronológico

#### Scenario: Cliente sin parrilla configurada
- **WHEN** un consumidor consulta el endpoint de radio de un cliente que no tiene franjas activas
- **THEN** el sistema devuelve `current: null` y `upcoming: []`

#### Scenario: Cliente inexistente
- **WHEN** un consumidor consulta el endpoint con un `clientId` que no existe
- **THEN** el sistema devuelve `404` con un mensaje de error en JSON

#### Scenario: Franjas que cruzan la medianoche
- **WHEN** la franja vigente tiene hora de inicio posterior a la de fin (cruza medianoche)
- **THEN** el sistema la considera vigente hasta la madrugada del día siguiente y la devuelve como `current`

### Requirement: La API pública expone la franja vigente de TV
El sistema SHALL exponer `GET /api/public/{clientId}/tv/schedule/current` (TV) sin autenticación, con CORS habilitado para todos los orígenes, con la misma forma de respuesta que el endpoint de radio: franja vigente, siguientes 3 franjas y zona horaria del cliente.

#### Scenario: Hay franja vigente de TV
- **WHEN** un consumidor sin autenticación consulta `GET /api/public/{clientId}/tv/schedule/current` y existe una franja de video activa cuyo horario (en la zona horaria del cliente) cubre el momento actual
- **THEN** el sistema devuelve `current` con id, playlistId, nombre de la playlist, día, hora inicio y hora fin
- **AND** `upcoming` contiene hasta 3 franjas de video activas posteriores, ordenadas cronológicamente
- **AND** `timezone` contiene la zona horaria del cliente

#### Scenario: No hay franja vigente de TV
- **WHEN** el momento actual no cae en ninguna franja de video activa
- **THEN** el sistema devuelve `current: null` y `upcoming` con las siguientes franjas de video en orden cronológico

#### Scenario: Cliente inexistente de TV
- **WHEN** un consumidor consulta el endpoint de TV con un `clientId` que no existe
- **THEN** el sistema devuelve `404` con un mensaje de error en JSON

### Requirement: La zona horaria se resuelve en el servidor
El sistema SHALL resolver la franja "actual" y las "siguientes" usando la zona horaria configurada del cliente (campo `timezone`), no la del consumidor.

#### Scenario: Cliente con zona horaria distinta a la del consumidor
- **WHEN** la zona horaria del cliente difiere de la del consumidor que hace la consulta
- **THEN** el sistema determina la franja vigente usando la hora local del cliente en su zona horaria
- **AND** `timezone` en la respuesta refleja esa zona

#### Scenario: Cliente sin zona horaria configurada
- **WHEN** un cliente no tiene zona horaria configurada
- **THEN** el sistema resuelve la franja asumiendo `UTC` y devuelve `timezone: "UTC"`

### Requirement: El endpoint público es de solo lectura y sin caché
El sistema SHALL responder `GET /api/public/{clientId}/schedule/current` y `GET /api/public/{clientId}/tv/schedule/current` como lecturas sin efectos secundarios y con cabecera `Cache-Control: no-store` para que el reproductor vea cambios en vivo.

#### Scenario: Respuesta sin caché
- **WHEN** un consumidor consulta cualquiera de los endpoints de parrilla vigente
- **THEN** la respuesta incluye `Cache-Control: no-store`

### Requirement: La API pública devuelve error si el agente no responde
El sistema SHALL devolver `502` con un error en JSON cuando el agente de streaming no responde o devuelve error, de forma consistente con los endpoints de dashboard.

#### Scenario: Agente de streaming caído
- **WHEN** el agente asignado al cliente no responde al consultar la parrilla vigente
- **THEN** el sistema devuelve `502` con un mensaje de error en JSON y cabeceras CORS

#### Scenario: Cliente sin agente asignado
- **WHEN** un cliente no tiene servidor de streaming asignado para el servicio consultado
- **THEN** el sistema devuelve `502` con un mensaje de error en JSON
