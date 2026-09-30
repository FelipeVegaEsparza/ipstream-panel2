# Spec Delta

## Purpose

Permite al operador de una radio/TV elegir y persistir el color destacado de su sitio en el momento de activar (o reconfigurar) la plantilla, desde la sección de plantilla del panel, validando el valor y guardándolo junto a la plantilla de forma atómica.

## ADDED Requirements

### Requirement: La activación de la plantilla permite elegir el color destacado
El sistema SHALL presentar, al seleccionar una plantilla en `/dashboard/template`, un paso de configuración del color destacado que incluye un selector de color, un campo de texto hexadecimal y una acción "Usar color de la plantilla" que representa el valor `null`. La confirmación SHALL persistir la plantilla y el color en una sola operación; la cancelación SHALL no modificar nada.

#### Scenario: Abrir la configuración al seleccionar plantilla
- **WHEN** el operador pulsa "Seleccionar Plantilla" en una tarjeta de plantilla
- **THEN** el sistema abre el paso de configuración del color destacado antes de activar la plantilla

#### Scenario: Confirmar activación con color
- **WHEN** el operador elige un color válido y confirma
- **THEN** el sistema guarda la plantilla seleccionada y el color en una sola operación
- **AND** la tarjeta de la plantilla queda marcada como activa

#### Scenario: Confirmar activación sin color personalizado
- **WHEN** el operador pulsa "Usar color de la plantilla" y confirma
- **THEN** el sistema guarda `accentColor: null` y el sitio usará el color propio de la plantilla

#### Scenario: Cancelar no modifica nada
- **WHEN** el operador cancela el paso de configuración
- **THEN** ni la plantilla ni el color del cliente cambian

#### Scenario: Color inválido no puede confirmarse
- **WHEN** el operador escribe un valor que no cumple `#RRGGBB` en el campo hexadecimal
- **THEN** el sistema impide confirmar la activación hasta que el valor sea válido o se use el color de la plantilla

### Requirement: La tarjeta activa permite reconfigurar el color
El sistema SHALL permitir reabrir la configuración del color desde la tarjeta de la plantilla actualmente activa, manteniendo fija esa plantilla y permitiendo guardar solo un nuevo color (o `null`). Al abrir la configuración, el sistema SHALL precargar el color destacado actual del cliente si existe, o `null` en caso contrario.

#### Scenario: Reabrir configuración de la plantilla activa
- **WHEN** el operador usa la acción de color destacado sobre la tarjeta de la plantilla activa
- **THEN** el sistema abre el paso de configuración con esa plantilla fija

#### Scenario: Precarga del color actual
- **WHEN** el cliente tiene un color destacado configurado y el operador abre la configuración
- **THEN** el campo de color y el campo hexadecimal muestran ese color actual
- **AND** cuando el cliente no tiene color, la configuración arranca en "Usar color de la plantilla" (`null`)

#### Scenario: Guardar solo el color de la plantilla activa
- **WHEN** el operador cambia el color y confirma sobre la tarjeta activa
- **THEN** el sistema guarda el nuevo color reenviando la misma plantilla ya activa, sin cambiarla

### Requirement: El guardado del color se valida y persiste en el servidor
El sistema SHALL aceptar en `POST /api/dashboard/templates` un `accentColor` opcional junto a `templateId`, validando que sea `null` o cumplir `#RRGGBB` (mayúsculas o minúsculas), normalizándolo a minúsculas antes de persistir. La operación SHALL requerir sesión autenticada y permiso de la sección de plantilla, y SHALL ser retrocompatible con payloads que no incluyan `accentColor`.

#### Scenario: Guardado con color válido
- **WHEN** un operador autenticado con permiso envía `{ templateId, accentColor: "#FF6B00" }`
- **THEN** el sistema persiste la plantilla y el color normalizado `#ff6b00` de forma atómica

#### Scenario: Limpiar el color
- **WHEN** el operador envía `{ templateId, accentColor: null }`
- **THEN** el sistema guarda `accentColor: null` para el cliente

#### Scenario: Color inválido en el servidor
- **WHEN** el operador envía un `accentColor` que no es `null` ni cumple `#RRGGBB`
- **THEN** el sistema devuelve `400` y no modifica ni la plantilla ni el color

#### Scenario: Retrocompatibilidad con el payload anterior
- **WHEN** el operador (o cualquier cliente existente) envía `{ templateId }` sin la clave `accentColor`
- **THEN** el sistema actualiza la plantilla y deja el color del cliente sin cambios

#### Scenario: Sin permiso sobre la sección de plantilla
- **WHEN** un operador sin permiso de la sección de plantilla envía el `POST`
- **THEN** el sistema devuelve `403` y no modifica nada

#### Scenario: Sin sesión autenticada
- **WHEN** un consumidor no autenticado envía el `POST`
- **THEN** el sistema no modifica nada y rechaza la petición: el middleware de plataforma redirige a inicio de sesión (la ruta responde `401` si llegara a ejecutarse)
