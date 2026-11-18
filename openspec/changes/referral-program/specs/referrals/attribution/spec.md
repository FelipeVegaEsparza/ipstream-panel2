# Spec Delta

## Purpose

Define cómo se captura, valida, persiste y protege la atribución de un nuevo cliente a un código de referido durante el registro público.

## ADDED Requirements

### Requirement: Captura del código en el registro

El sistema SHALL leer el parámetro `ref` del enlace de registro y SHALL conservarlo durante todo el flujo de alta, incluyendo la renderización de la página, el formulario y el envío al backend. La captura en el navegador es solo un transporte: la atribución SHALL persistirse en la base de datos al crear la cuenta.

#### Scenario: Registro con enlace de referido

- **WHEN** una persona abre `/registro?ref=CAST-FELIPE82` y completa el formulario
- **THEN** el formulario envía el código `CAST-FELIPE82` al backend junto con los datos de registro
- **AND** el código no se pierde al cambiar de plan o moneda en el formulario

#### Scenario: Registro sin enlace de referido

- **WHEN** una persona se registra sin el parámetro `ref`
- **THEN** el sistema crea la cuenta sin referente
- **AND** no inventa ni reutiliza una atribución previa

#### Scenario: Código manipulado desde el navegador

- **WHEN** el navegador envía un código inexistente o inactivo
- **THEN** el backend no confía en el valor recibido
- **AND** registra la cuenta sin atribución, informando que el código no fue aplicado

### Requirement: Validación de la atribución en el backend

El sistema SHALL validar el código de referido dentro de la misma transacción que crea el usuario, el cliente y su suscripción inicial, comprobando que el código exista, que pertenezca a un cliente elegible y que el nuevo cliente sea una cuenta nueva.

#### Scenario: Código válido de un referente elegible

- **WHEN** el código existe, pertenece a un cliente elegible y la cuenta es nueva
- **THEN** el sistema registra la atribución en la misma transacción del alta
- **AND** devuelve `referralApplied: true` en la respuesta

#### Scenario: Código de un referente no elegible

- **WHEN** el código pertenece a un cliente que aún no pagó su primera mensualidad o está inactivo
- **THEN** el sistema no registra la atribución
- **AND** completa el registro normalmente
- **AND** devuelve `referralApplied: false` sin exponer datos del referente

#### Scenario: Falla al crear la cuenta

- **WHEN** la transacción de registro falla por cualquier motivo
- **THEN** no queda ninguna atribución parcial ni un referido huérfano

### Requirement: Persistencia e inmutabilidad del referente

El sistema SHALL guardar la atribución como una relación permanente entre el cliente referido y el cliente referente, junto con la fecha y los metadatos de origen del registro. Una vez creada, la atribución no SHALL poder modificarse desde el dashboard, la API pública ni el panel administrativo.

#### Scenario: Atribución persistida

- **WHEN** un cliente se registra con un código válido
- **THEN** queda registrado el cliente referente, el código usado, la fecha del registro y los metadatos de origen
- **AND** la atribución sobrevive al cierre del navegador y a la expiración de cookies

#### Scenario: Intento de cambiar el referente

- **WHEN** el cliente referido, su usuario o un administrador intenta modificar el referente después del registro
- **THEN** el sistema rechaza la operación
- **AND** la atribución original permanece intacta

#### Scenario: Una sola atribución por cuenta

- **WHEN** un cliente ya tiene un referente registrado
- **THEN** un segundo código no reemplaza ni agrega otra atribución
- **AND** el evento queda registrado para revisión administrativa

### Requirement: Prevención de auto-referencia y duplicidad

El sistema SHALL impedir que un cliente se refiera a sí mismo o use su propio código, y SHALL marcar para revisión los registros que compartan datos identificables con el referente, como email normalizado o IP de registro.

#### Scenario: Uso del propio código

- **WHEN** el cliente intenta registrarse con el código de su propia cuenta o con un email ya asociado a esa cuenta
- **THEN** el sistema rechaza la atribución
- **AND** no crea una relación de referido

#### Scenario: Posible cuenta duplicada

- **WHEN** el nuevo registro comparte IP de registro con el referente o usa una variante del mismo email
- **THEN** el sistema registra la atribución pero la marca como sospechosa
- **AND** notifica al administrador para revisión
- **AND** no cuenta como referido válido mientras no se revise

#### Scenario: Referido con cuenta existente

- **WHEN** el email del nuevo registro ya pertenece a un usuario
- **THEN** el registro falla con el error existente de usuario duplicado
- **AND** no se crea ninguna atribución
