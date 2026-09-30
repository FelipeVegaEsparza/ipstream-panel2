# Spec Delta

## Purpose

Expone el color destacado configurado por cada radio/TV como campo raíz de la API pública no autenticada, normalizado en formato hexadecimal `#RRGGBB` y consistente con el resto del contrato público, para que el sitio del cliente lo aplique en runtime sin recompilar.

## ADDED Requirements

### Requirement: La API pública expone el color destacado del cliente
El sistema SHALL incluir un campo raíz `accentColor` en `GET /api/public/{clientId}`, hermano de `selectedTemplate`, con valor `null` cuando el cliente no tiene color configurado, nunca cadena vacía, sin modificar ni renombrar los campos existentes.

#### Scenario: Cliente con color configurado
- **WHEN** un consumidor consulta `GET /api/public/{clientId}` para un cliente cuyo color destacado está configurado
- **THEN** la respuesta incluye en la raíz `"accentColor": "#ff6b00"`
- **AND** el valor está en minúsculas y con el prefijo `#`

#### Scenario: Cliente sin color configurado
- **WHEN** un consumidor consulta `GET /api/public/{clientId}` para un cliente sin color destacado
- **THEN** la respuesta incluye en la raíz `"accentColor": null`
- **AND** el valor no es una cadena vacía

#### Scenario: Cliente inexistente
- **WHEN** un consumidor consulta `GET /api/public/{clientId}` con un `clientId` que no existe
- **THEN** el sistema devuelve `404` con mensaje de error en JSON, igual que antes de este cambio

#### Scenario: Compatibilidad del contrato existente
- **WHEN** un consumidor consulta `GET /api/public/{clientId}` para un cliente cualquiera
- **THEN** los campos existentes (`client`, `selectedTemplate`, `oneSignalAppId`, `basicData`, etc.) conservan su nombre, tipo y valor

### Requirement: El color destacado se valida y normaliza en lectura
El sistema SHALL normalizar en lectura el color almacenado: acepta únicamente seis dígitos hexadecimales con prefijo `#` (mayúsculas o minúsculas) y los devuelve en minúsculas; cualquier valor almacenado que no cumpla el formato (incluida la ausencia de valor) SHALL devolverse como `null`.

#### Scenario: Valor almacenado en mayúsculas
- **WHEN** el color almacenado es `#FF6B00`
- **THEN** la API pública devuelve `"accentColor": "#ff6b00"`

#### Scenario: Valor almacenado inválido
- **WHEN** el color almacenado no cumple `#RRGGBB` (por ejemplo `red`, `#fff`, `javascript:alert(1)` o texto arbitrario)
- **THEN** la API pública devuelve `"accentColor": null`

#### Scenario: Sin alpha ni formatos alternativos
- **WHEN** el valor almacenado incluye canal alfa (por ejemplo `#ff6b00cc`)
- **THEN** la API pública devuelve `"accentColor": null`

### Requirement: El endpoint público conserva CORS y respuesta JSON
El sistema SHALL mantener el comportamiento CORS abierto (`*`) y las respuestas en formato JSON para `GET /api/public/{clientId}`, incluyendo el nuevo campo.

#### Scenario: Preflight CORS
- **WHEN** un origen externo envía una solicitud `OPTIONS` a `GET /api/public/{clientId}`
- **THEN** el sistema responde `200` con cabeceras `Access-Control-Allow-Origin: *`

#### Scenario: Respuestas con y sin color incluyen CORS
- **WHEN** el endpoint devuelve `200` para un cliente con o sin color
- **THEN** la respuesta incluye cabeceras CORS para todos los orígenes
