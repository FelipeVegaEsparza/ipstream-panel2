# Spec Delta

## Purpose

Define los estados de un referido y la validación backend que lo convierte en válido únicamente a partir de pagos reales y confirmados, con idempotencia, controles antifraude y reversión ante reembolsos.

## ADDED Requirements

### Requirement: Estados del referido

El sistema SHALL mantener los estados `registered`, `pending_contract`, `pending_first_payment`, `first_payment_confirmed`, `pending_second_payment`, `valid` y `rejected`, y SHALL exponer a la UI una etiqueta comprensible para cada uno. Las transiciones SHALL producirse por eventos del backend, nunca por valores enviados desde el frontend.

#### Scenario: Registro atribuido

- **WHEN** se crea una cuenta con un código de referido válido
- **THEN** el referido queda en estado `registered`

#### Scenario: Contratación del plan

- **WHEN** el referido recibe un plan y una suscripción
- **THEN** el referido pasa a `pending_contract` mientras no exista un pago emitido
- **AND** pasa a `pending_first_payment` cuando se emite su primer pago

#### Scenario: Primer pago confirmado

- **WHEN** el primer pago válido del referido se confirma
- **THEN** el referido pasa a `first_payment_confirmed` y luego a `pending_second_payment`

#### Scenario: Referido válido

- **WHEN** el referido completa su segundo pago consecutivo confirmado
- **THEN** el referido pasa a `valid`
- **AND** la fecha de validación queda registrada

#### Scenario: Referido rechazado

- **WHEN** se detecta fraude, duplicidad o incumplimiento de las condiciones
- **THEN** el referido pasa a `rejected`
- **AND** se registra el motivo y el actor que lo determinó

### Requirement: Validación desde registros reales de pagos

El sistema SHALL determinar la validez de un referido exclusivamente a partir de los registros de `payments` del referido. No SHALL confiar en estados, montos ni identificadores de pago enviados por el frontend.

#### Scenario: Datos manipulados en la petición

- **WHEN** una petición intenta declarar pagos, montos o estados de validación manualmente
- **THEN** el sistema ignora esos valores
- **AND** recalcula el estado desde la base de datos

#### Scenario: Verificación al confirmar un pago

- **WHEN** un pago del referido cambia a estado confirmado
- **THEN** el sistema reevalúa el referido de forma automática
- **AND** aplica las transiciones que correspondan

### Requirement: Dos pagos consecutivos confirmados

Un referido SHALL considerarse válido solo cuando sus dos primeros pagos del ciclo de facturación estén confirmados y sean consecutivos según el intervalo del plan del referido (mensual o anual). La regla se expresa como "dos pagos consecutivos del ciclo", equivalente a dos mensualidades en planes mensuales y a dos anualidades en planes anuales.

#### Scenario: Un solo pago

- **WHEN** el referido tiene únicamente su primer pago confirmado
- **THEN** el referido no es válido
- **AND** no se genera ninguna recompensa

#### Scenario: Dos pagos consecutivos

- **WHEN** el referido tiene sus dos primeros pagos confirmados, consecutivos y válidos
- **THEN** el referido se marca como válido
- **AND** se dispara la evaluación de recompensas del referente

#### Scenario: Pago intermedio no confirmado

- **WHEN** entre los dos primeros pagos existe un ciclo pendiente, fallido o anulado
- **THEN** los pagos no se consideran consecutivos
- **AND** el referido permanece pendiente hasta completar dos pagos consecutivos

#### Scenario: Plan anual

- **WHEN** el referido tiene un plan anual y completa dos pagos anuales consecutivos confirmados
- **THEN** el referido es válido con la misma regla de dos pagos del ciclo

### Requirement: Exclusión de pagos no válidos

El sistema no SHALL contabilizar pagos pendientes, fallidos, de prueba, duplicados, anulados, reembolsados ni pagos cubiertos total o parcialmente por crédito de referidos como pagos de validación. Un pago SHALL contar solo si está confirmado, tiene importe mayor a cero, tiene fecha de pago y no es un pago de prueba.

#### Scenario: Pago pendiente o fallido

- **WHEN** el referido tiene un pago `pending` o `failed`
- **THEN** ese pago no avanza el estado del referido

#### Scenario: Pago de prueba

- **WHEN** un pago está identificado como prueba por su método o identificador de transacción
- **THEN** el sistema lo excluye del conteo de validación

#### Scenario: Mes cubierto por crédito

- **WHEN** un pago queda cubierto por un crédito de referidos
- **THEN** ese pago no cuenta como pago de validación de otro referido

#### Scenario: Pago duplicado

- **WHEN** el mismo pago se procesa o registra varias veces
- **THEN** cuenta una sola vez para la validación del referido

### Requirement: Idempotencia y concurrencia

La validación SHALL ser idempotente. Ejecuciones repetidas del proceso, webhooks duplicados o confirmaciones concurrentes no SHALL duplicar la validez del referido ni las recompensas asociadas.

#### Scenario: Reevaluación repetida

- **WHEN** el proceso de validación corre varias veces sobre el mismo referido
- **THEN** el estado final es el mismo
- **AND** no se generan recompensas adicionales

#### Scenario: Confirmaciones concurrentes

- **WHEN** dos solicitudes confirman simultáneamente el segundo pago del mismo referido
- **THEN** solo una transición a `valid` tiene efecto
- **AND** el resto se resuelve sin error para el cliente

### Requirement: Revisión y reversión por reembolso o contracargo

El sistema SHALL detectar cuando un pago usado para validar un referido pasa a reembolsado o anulado y SHALL iniciar un procedimiento de revisión que puede revertir la recompensa correspondiente. Toda reversión SHALL quedar auditada y notificada al cliente.

#### Scenario: Reembolso de un pago de validación

- **WHEN** un pago confirmado que validó un referido pasa a `refunded`
- **THEN** el sistema marca el referido para revisión
- **AND** registra la causa y los pagos afectados

#### Scenario: Reversión de la recompensa

- **WHEN** el administrador confirma la reversión tras el reembolso
- **THEN** la recompensa asociada pasa a estado `anulado`
- **AND** si el crédito ya fue consumido, se registra un saldo negativo de crédito para futuras renovaciones
- **AND** el cliente recibe una notificación en el panel

#### Scenario: Reembolso sin recompensa asociada

- **WHEN** el reembolso afecta a un referido que aún no generó recompensa
- **THEN** el referido vuelve al estado pendiente o se rechaza
- **AND** no se altera ninguna recompensa existente

### Requirement: Rechazo administrativo y trazabilidad

El sistema SHALL permitir al administrador rechazar un referido con un motivo obligatorio, y SHALL registrar en la auditoría el estado anterior, el nuevo estado, el motivo, el actor y la fecha.

#### Scenario: Rechazo manual

- **WHEN** un administrador rechaza un referido indicando un motivo
- **THEN** el referido pasa a `rejected`
- **AND** deja de contar para el progreso de recompensas
- **AND** queda registrado en la auditoría

#### Scenario: Intento de rechazo sin motivo

- **WHEN** el administrador intenta rechazar sin justificación
- **THEN** el sistema rechaza la operación con un error de validación
