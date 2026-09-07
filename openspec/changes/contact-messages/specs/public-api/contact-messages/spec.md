## Purpose

Expone un endpoint público de la API REST para que los visitantes del sitio web de una radio o TV (PWA pública multi-tenant) envíen consultas de contacto, con validación, protección anti-spam por IP y persistencia ligada al cliente.

## ADDED Requirements

### Requirement: Un visitante puede enviar una consulta de contacto
El sistema SHALL exponer `POST /api/public/{clientId}/contact-messages` sin autenticación y con CORS habilitado para todos los orígenes, que recibe `name`, `email`, `phone` y `message`, valida los datos, y persiste la consulta ligada al `clientId` de la URL con estado `new` por defecto.

#### Scenario: Consulta válida
- **WHEN** un visitante envía `POST /api/public/{clientId}/contact-messages` con `name`, `email`, `phone` y `message` válidos
- **THEN** el sistema persiste la consulta con estado `new` ligada al cliente de la URL
- **AND** devuelve `201` con `{ "id", "status": "new", "createdAt" }` en formato ISO 8601

#### Scenario: Cliente inexistente
- **WHEN** un visitante envía la consulta con un `clientId` que no existe
- **THEN** el sistema devuelve `404` con un mensaje de error en JSON

#### Scenario: Campos fuera del contrato
- **WHEN** la consulta incluye campos adicionales a `name`, `email`, `phone` y `message`
- **THEN** el sistema ignora los campos adicionales y solo persiste los campos del contrato
- **AND** la respuesta `201` contiene únicamente `id`, `status` y `createdAt`

### Requirement: La API pública valida los campos antes de persistir
El sistema SHALL validar el contenido de la consulta antes de persistirla: `name`, `email`, `phone` y `message` son obligatorios y no vacíos, `email` debe tener formato de email válido, y cada campo debe respetar una longitud máxima (nombre ≤ 120, email ≤ 254, teléfono ≤ 40, mensaje ≤ 2000).

#### Scenario: Campos obligatorios vacíos o faltantes
- **WHEN** un visitante envía la consulta sin `name`, sin `phone`, sin `message` o con `email` vacío
- **THEN** el sistema no persiste nada y devuelve `400` con un mensaje de error en JSON que indica el campo inválido

#### Scenario: Email inválido
- **WHEN** un visitante envía una consulta cuyo `email` no tiene formato de email válido
- **THEN** el sistema no persiste nada y devuelve `400` con un mensaje de error en JSON

#### Scenario: Campo que excede la longitud máxima
- **WHEN** cualquier campo supera su longitud máxima permitida
- **THEN** el sistema no persiste nada y devuelve `400` con un mensaje de error en JSON

### Requirement: La API pública protege contra spam por IP
El sistema SHALL limitar el envío de consultas de contacto a 5 por cada 10 minutos por dirección IP, registrando la IP del visitante en la consulta persistida.

#### Scenario: Se supera el límite por IP
- **WHEN** una misma dirección IP envía más de 5 consultas en una ventana de 10 minutos
- **THEN** el sistema no persiste la consulta y devuelve `429` con un mensaje de error en JSON

#### Scenario: La consulta registra la IP del visitante
- **WHEN** un visitante envía una consulta válida
- **THEN** el sistema persiste la consulta guardando la dirección IP de origen del visitante

### Requirement: El endpoint público de contacto responde con CORS
El sistema SHALL responder al preflight `OPTIONS` y a las respuestas del endpoint `POST /api/public/{clientId}/contact-messages` con cabeceras CORS habilitadas para todos los orígenes.

#### Scenario: Preflight CORS
- **WHEN** un origen externo envía una solicitud `OPTIONS` al endpoint de contacto
- **THEN** el sistema responde `200` con cabeceras `Access-Control-Allow-Origin: *`

#### Scenario: Respuestas de éxito y error con CORS
- **WHEN** el endpoint devuelve `201`, `400`, `404` o `429`
- **THEN** todas las respuestas incluyen cabeceras CORS para todos los orígenes
