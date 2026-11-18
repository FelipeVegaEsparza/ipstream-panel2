# Spec Delta

## Purpose

Define un centro de notificaciones dentro del panel para avisar al cliente sobre la actividad de su programa de referidos, sin depender de OneSignal ni de correo, y sin modificar el sistema de push existente.

## ADDED Requirements

### Requirement: Centro de notificaciones del panel

El sistema SHALL mantener notificaciones persistidas por cliente, con tipo, título, mensaje, enlace opcional, clave de evento y fecha de lectura. El dashboard SHALL mostrar una campana con contador de no leídas y una vista donde el cliente puede leer y marcar sus notificaciones.

#### Scenario: Notificación no leída

- **WHEN** el cliente recibe una notificación nueva
- **THEN** la campana muestra el contador incrementado
- **AND** la notificación aparece como no leída en la vista

#### Scenario: Marcar como leída

- **WHEN** el cliente abre o marca una notificación
- **THEN** se registra la fecha de lectura
- **AND** el contador disminuye

#### Scenario: Marcar todas como leídas

- **WHEN** el cliente usa la acción "marcar todas como leídas"
- **THEN** todas sus notificaciones no leídas pasan a leídas
- **AND** el contador queda en cero

#### Scenario: Sin notificaciones

- **WHEN** el cliente no tiene notificaciones
- **THEN** la vista muestra un estado vacío claro
- **AND** la campana no muestra contador

### Requirement: Eventos notificados

El sistema SHALL generar una notificación en el panel al cliente correspondiente cuando ocurra alguno de estos eventos: un nuevo registro con su enlace, la confirmación del primer pago de un referido, la confirmación del segundo pago, la generación de una recompensa, la aplicación de un mes gratis y una modificación administrativa de una recompensa.

#### Scenario: Nuevo registro por enlace

- **WHEN** una persona crea una cuenta usando el código de un cliente
- **THEN** el referente recibe una notificación de nuevo referido registrado

#### Scenario: Primer pago confirmado

- **WHEN** un referido confirma su primer pago válido
- **THEN** el referente recibe una notificación

#### Scenario: Segundo pago y validación

- **WHEN** un referido confirma su segundo pago y pasa a válido
- **THEN** el referente recibe una notificación de referido validado

#### Scenario: Recompensa generada

- **WHEN** se genera una recompensa para el cliente
- **THEN** recibe una notificación con la cantidad de meses y el valor del crédito

#### Scenario: Mes gratis aplicado

- **WHEN** el crédito se aplica a una renovación
- **THEN** el cliente recibe una notificación con el monto cubierto y el saldo restante

#### Scenario: Modificación administrativa

- **WHEN** un administrador anula o revierte una recompensa
- **THEN** el cliente afectado recibe una notificación con el motivo registrado

### Requirement: Idempotencia de notificaciones

Cada evento SHALL generar como máximo una notificación por destinatario. El sistema SHALL usar una clave de evento única para evitar duplicados ante reintentos, webhooks repetidos o ejecuciones concurrentes.

#### Scenario: Evento procesado dos veces

- **WHEN** el mismo evento se procesa nuevamente
- **THEN** no se crea una segunda notificación para el mismo cliente y clave
- **AND** la notificación existente permanece sin cambios

#### Scenario: Eventos distintos con el mismo tipo

- **WHEN** ocurren dos eventos diferentes del mismo tipo para el mismo cliente
- **THEN** cada uno genera su propia notificación
- **AND** ambas son visibles

### Requirement: Aislamiento y privacidad

Cada notificación SHALL pertenecer a un único cliente y SHALL ser accesible solo por el usuario autenticado de ese cliente. La API SHALL derivar el destinatario de la sesión y no SHALL aceptar un identificador de cliente desde el navegador.

#### Scenario: Consulta de notificaciones propias

- **WHEN** un cliente consulta sus notificaciones
- **THEN** recibe solo las suyas
- **AND** puede marcar únicamente las suyas como leídas

#### Scenario: Intento de leer notificaciones ajenas

- **WHEN** una petición intenta acceder a una notificación de otro cliente
- **THEN** el sistema responde como no encontrada o no autorizada
- **AND** no revela el contenido

### Requirement: Integración con los sistemas existentes

El centro de notificaciones del panel SHALL ser independiente de las notificaciones push de OneSignal y de los correos transaccionales. Su incorporación no SHALL alterar el envío de push, las plantillas de correo ni sus requisitos.

#### Scenario: Cliente sin OneSignal

- **WHEN** el cliente no tiene credenciales de OneSignal
- **THEN** recibe igualmente las notificaciones del panel relativas a referidos

#### Scenario: Envío de push existente

- **WHEN** un cliente envía una notificación push a su audiencia
- **THEN** el comportamiento actual se mantiene sin cambios
- **AND** el centro de notificaciones del panel no interfiere con ese envío
